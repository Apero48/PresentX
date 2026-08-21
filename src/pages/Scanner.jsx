import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/api/supabaseClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import QRScanner from '../components/qr/QRScanner';
import SuccessAnimation from '../components/notifications/SuccessAnimation';
import ActionModal from '../components/scanner/ActionModal';
import InterventionModal from '../components/scanner/InterventionModal';
import EmployeeSelector from '../components/scanner/EmployeeSelector';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { getTodayAttendanceForEmployee, calculateHoursWorked } from '@/services/attendanceService';
import { callAttendanceEdgeFunction } from '@/services/attendanceEdgeFunctionService';
import {
    cacheOfflineSession,
    getCachedOfflineEmployee,
    getOfflineAttendanceForToday,
    enqueueOfflineAttendance,
    flushOfflineAttendanceQueue,
} from '@/services/offlineAttendanceStore';

export default function Scanner() {
    const [scanResult, setScanResult] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const [showInterventionModal, setShowInterventionModal] = useState(false);
    const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
    const [interventionType, setInterventionType] = useState(null);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [currentAttendance, setCurrentAttendance] = useState(null);
    const [employeeProfile, setEmployeeProfile] = useState(null);
    const [employeeLoading, setEmployeeLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

    const queryClient = useQueryClient();

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.list()
    });

    useEffect(() => {
        const loadEmployeeData = async () => {
            try {
                const currentUser = await supabaseClient.auth.me();
                let employee = null;
                try {
                    const employeeRecords = await supabaseClient.entities.Employee.filter({ user_id: currentUser.id });
                    employee = employeeRecords?.[0] || null;
                } catch {
                    employee = getCachedOfflineEmployee();
                }
                employee = employee || getCachedOfflineEmployee();
                setEmployeeProfile(employee);

                if (employee) {
                    cacheOfflineSession(currentUser, employee);
                    const today = format(new Date(), 'yyyy-MM-dd');
                    try {
                        const attendances = await supabaseClient.entities.Attendance.filter({ employee_id: employee.id, date: today });
                        setCurrentAttendance(attendances?.[0] || null);
                    } catch {
                        setCurrentAttendance(getOfflineAttendanceForToday(employee.id, today));
                    }
                }
            } catch (error) {
                console.error('Erreur chargement employé:', error);
            } finally {
                setEmployeeLoading(false);
            }
        };

        loadEmployeeData();

        const syncQueuedScans = async () => {
            try {
                const result = await flushOfflineAttendanceQueue(callAttendanceEdgeFunction);
                if (result.synced > 0) {
                    toast.success(`${result.synced} pointage(s) hors connexion synchronisé(s)`);
                    queryClient.invalidateQueries(['attendances']);
                    queryClient.invalidateQueries(['todayAttendances']);
                }
            } catch (error) {
                console.warn('Synchronisation hors connexion impossible:', error);
            }
        };

        const handleOnline = () => {
            setIsOnline(true);
            syncQueuedScans();
        };
        const handleOffline = () => setIsOnline(false);
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') syncQueuedScans();
        };
        const retryTimer = window.setInterval(syncQueuedScans, 15000);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibility);
        syncQueuedScans();
        return () => {
            window.clearInterval(retryTimer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [queryClient]);

    const arrivalTime = currentAttendance?.check_in || '--:--';
    const departureTime = currentAttendance?.check_out || '--:--';
    const workedHours = currentAttendance?.hours_worked ? `${Number(currentAttendance.hours_worked).toFixed(1)}h` : '0h';
    const dayStatus = currentAttendance?.status === 'late' ? 'En retard' : currentAttendance?.status === 'present' ? 'Présent' : 'Pas encore pointé';

    const updateAttendanceMutation = useMutation({
        mutationFn: ({ id, actionKey, data }) => callAttendanceEdgeFunction({
            action: 'update-attendance',
            payload: { id, actionKey, data }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendances'] });
            queryClient.invalidateQueries({ queryKey: ['todayAttendances'] });
            queryClient.invalidateQueries({ queryKey: ['allAttendances'] });
            queryClient.invalidateQueries({ queryKey: ['allHistory'] });
            queryClient.invalidateQueries({ queryKey: ['recentAttendances'] });
        },
        onError: (error) => {
            toast.error('Action non enregistrée', {
                description: error?.message || 'Le serveur n’a pas pu mettre à jour le pointage.'
            });
        }
    });

    const handleScan = async (qrData) => {
        if (qrData !== "ATTENDANCE-CHECK-IN") {
            toast.error("❌ QR Code non valide");
            setIsProcessing(false);
            return;
        }

        toast.success('QR code détecté');

        if (employeeProfile?.role === 'admin') {
            setShowEmployeeSelector(true);
        } else if (employeeProfile) {
            await handleEmployeeSelect(employeeProfile);
        } else {
            toast.error('Profil employé introuvable');
        }
        setIsProcessing(false);
    };

    const handleEmployeeSelect = async (employee) => {
        setShowEmployeeSelector(false);
        setIsProcessing(true);
        setCurrentEmployee(employee);

        try {
            const now = new Date();
            const today = format(now, 'yyyy-MM-dd');
            const currentTime = format(now, 'HH:mm');
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const openingMinutes = 8 * 60;
            const closingMinutes = 19 * 60;

            if (currentMinutes > closingMinutes) {
                toast.error('Pointage fermé', {
                    description: 'Le pointage est disponible jusqu’à 19:00.'
                });
                setIsProcessing(false);
                return;
            }

            let todayAttendance = null;
            let offlineFallback = !navigator.onLine;
            if (!offlineFallback) {
                try {
                    todayAttendance = await Promise.race([
                        getTodayAttendanceForEmployee(employee.id),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), 350)),
                    ]);
                } catch (error) {
                    offlineFallback = true;
                }
            }
            if (offlineFallback && !todayAttendance) {
                todayAttendance = getOfflineAttendanceForToday(employee.id, today);
            }

            if (!todayAttendance && offlineFallback) {
                const startTime = employee.start_time || '08:00';
                const [startHour, startMinute] = startTime.split(':').map(Number);
                const [currentHour, currentMinute] = currentTime.split(':').map(Number);
                const status = (currentHour * 60 + currentMinute) > (startHour * 60 + startMinute + 15) ? 'late' : 'present';
                const queuedAttendance = enqueueOfflineAttendance({
                    employee_id: employee.id,
                    employee_name: employee.full_name,
                    date: today,
                    check_in: currentTime,
                    attendance_status: status,
                    interventions: [],
                });
                setCurrentAttendance({ ...queuedAttendance, check_in: currentTime, status });
                setSuccessMessage(`✅ Pointage enregistré hors connexion\\nArrivée: ${currentTime}\\nSynchronisation automatique dès le retour du réseau.`);
                setShowSuccess(true);
                toast.success('Pointage enregistré hors connexion', {
                    description: 'Il sera envoyé automatiquement dès que la connexion revient.'
                });
                setTimeout(() => setShowSuccess(false), 3000);
                setIsProcessing(false);
                return;
            }

            if (!todayAttendance) {
                // Premier scan = Arrivée
                const startTime = employee.start_time || '08:00';
                const [startHour, startMinute] = startTime.split(':').map(Number);
                const [currentHour, currentMinute] = currentTime.split(':').map(Number);

                const startTotalMinutes = startHour * 60 + startMinute;
                const currentTotalMinutes = currentHour * 60 + currentMinute;
                const toleranceMinutes = 15;

                let status = 'present';
                if (currentTotalMinutes > startTotalMinutes + toleranceMinutes) {
                    status = 'late';
                }

                // L’Edge Function est la seule source d’écriture pour éviter
                // les doublons créés par un insert frontend + backend.
                await callAttendanceEdgeFunction({
                    action: 'create-attendance',
                    payload: {
                        employee_id: employee.id,
                        employee_name: employee.full_name,
                        date: today,
                        check_in: currentTime,
                        status: status,
                        interventions: []
                    }
                });

                setSuccessMessage(`✅ Bienvenue ${employee.full_name}!\nArrivée: ${currentTime}`);
                setShowSuccess(true);

                if (status === 'late') {
                    toast.error(`⏰ Retard enregistré pour ${employee.full_name}`, {
                        description: `Arrivée à ${currentTime} (Heure prévue: ${startTime})`
                    });
                } else {
                    toast.success(`✅ Arrivée confirmée - ${currentTime}`);
                }

                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                // Scan suivant - montrer le menu d'actions
                setCurrentAttendance(todayAttendance);
                setShowActionModal(true);
            }

            setIsProcessing(false);
        } catch (error) {
            console.error('Erreur traitement pointage:', error);
            toast.error('Erreur lors du traitement', {
                description: error?.message || 'Impossible de créer ou récupérer le pointage.'
            });
            setIsProcessing(false);
        }
    };

    const handleAction = async (actionKey) => {
        setShowActionModal(false);
            const now = new Date();
            const currentTime = format(now, 'HH:mm');
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (currentMinutes > 19 * 60) {
                toast.error('Pointage fermé', { description: 'Le pointage est disponible jusqu’à 19:00.' });
                return;
            }

        if (actionKey === 'lunch_start') {
            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                actionKey: 'lunch_start',
                data: { lunch_start: currentTime }
            });
            setCurrentAttendance((previous) => ({ ...previous, lunch_start: currentTime }));
            setSuccessMessage(`☕ Bonne pause déjeuner!\nDébut: ${currentTime}`);
            setShowSuccess(true);
            toast.success(`☕ Pause déjeuner - ${currentTime}`);
            setTimeout(() => setShowSuccess(false), 3000);
        } else if (actionKey === 'lunch_end') {
            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                actionKey: 'lunch_end',
                data: { lunch_end: currentTime }
            });
            setCurrentAttendance((previous) => ({ ...previous, lunch_end: currentTime }));
            setSuccessMessage(`🍽️ Bon retour!\nReprise: ${currentTime}`);
            setShowSuccess(true);
            toast.success(`🍽️ Retour de pause - ${currentTime}`);
            setTimeout(() => setShowSuccess(false), 3000);
        } else if (actionKey === 'intervention_start') {
            setInterventionType('start');
            setShowInterventionModal(true);
        } else if (actionKey === 'intervention_end') {
            setInterventionType('end');
            setShowInterventionModal(true);
        } else if (actionKey === 'check_out') {
            const checkInTime = currentAttendance.check_in;
            const hoursWorked = calculateHoursWorked(checkInTime, currentTime, currentAttendance.lunch_start, currentAttendance.lunch_end);

            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                actionKey: 'check_out',
                data: { check_out: currentTime, hours_worked: hoursWorked.toFixed(2) }
            });

            setSuccessMessage(`👋 Bonne soirée ${currentEmployee.full_name}!\nDépart: ${currentTime}\nHeures: ${hoursWorked.toFixed(1)}h`);
            setShowSuccess(true);
            toast.success(`👋 Départ enregistré - ${currentTime}`, {
                description: `${hoursWorked.toFixed(1)} heures travaillées`
            });
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const handleInterventionConfirm = async (data) => {
        setShowInterventionModal(false);
        const currentTime = format(new Date(), 'HH:mm');

        const interventions = currentAttendance.interventions || [];

        if (interventionType === 'start') {
            interventions.push({
                departure_time: currentTime,
                reason: data.reason,
                location: data.location
            });

            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                actionKey: 'interventions',
                data: { interventions }
            });
            setCurrentAttendance((previous) => ({ ...previous, interventions: [...interventions] }));

            setSuccessMessage(`🚗 Intervention enregistrée\nDépart: ${currentTime}\n${data.location}`);
            setShowSuccess(true);
            toast.success(`🚗 Départ en intervention - ${currentTime}`, {
                description: data.location
            });
            setTimeout(() => setShowSuccess(false), 3000);
        } else {
            const lastIntervention = interventions[interventions.length - 1];
            if (lastIntervention) {
                lastIntervention.return_time = currentTime;
            }

            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                actionKey: 'interventions',
                data: { interventions }
            });
            setCurrentAttendance((previous) => ({ ...previous, interventions: [...interventions] }));

            setSuccessMessage(`✅ Retour d'intervention\nRetour: ${currentTime}`);
            setShowSuccess(true);
            toast.success(`✅ Retour d'intervention - ${currentTime}`);
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const hasActiveIntervention = () => {
        if (!currentAttendance?.interventions) return false;
        const lastIntervention = currentAttendance.interventions[currentAttendance.interventions.length - 1];
        return lastIntervention && !lastIntervention.return_time;
    };

    return (
        <div className="min-h-screen msa-gradient-soft p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Bonjour,</p>
                            <h1 className="text-3xl font-bold text-slate-900">{employeeProfile?.full_name || 'Bienvenue'}</h1>
                            <p className="mt-2 text-sm text-slate-500">Voici un aperçu de votre activité du jour.</p>
                        </div>
                        <div className="rounded-3xl bg-blue-600 p-4 text-white shadow-lg">
                            <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Pointage</p>
                            <p className="mt-2 text-2xl font-bold">{dayStatus}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Arrivée</p>
                        <p className="mt-3 text-3xl font-bold text-slate-900">{arrivalTime}</p>
                        <p className="mt-2 text-sm text-slate-500">Heure de pointage</p>
                    </div>
                    <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Départ</p>
                        <p className="mt-3 text-3xl font-bold text-slate-900">{departureTime}</p>
                        <p className="mt-2 text-sm text-slate-500">Heure prévue ou à venir</p>
                    </div>
                    <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Heures travaillées</p>
                        <p className="mt-3 text-3xl font-bold text-slate-900">{workedHours}</p>
                        <p className="mt-2 text-sm text-slate-500">Aujourd'hui</p>
                    </div>
                    <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Statut du jour</p>
                        <p className="mt-3 text-3xl font-bold text-slate-900">{dayStatus}</p>
                        <p className="mt-2 text-sm text-slate-500">Pointage en cours</p>
                    </div>
                </div>

                <Card className="border-0 shadow-2xl bg-white">
                    <CardContent className="p-6">
                        <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                            {isOnline ? 'Connexion active — les pointages sont envoyés immédiatement.' : 'Hors connexion — les scans sont enregistrés sur cet appareil et seront synchronisés automatiquement.'}
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-slate-500">QR Code pointage</p>
                                <h2 className="text-2xl font-bold text-slate-900">Scannez pour pointer</h2>
                            </div>
                            <div className="rounded-2xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700">Rapide</div>
                        </div>
                        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-50">
                            <QRScanner onScan={handleScan} />
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Scannez le QR code affiché dans votre entreprise ou sur votre badge.</p>
                    </CardContent>
                </Card>

                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="border-0 shadow-lg bg-blue-50">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <Loader2 className="w-6 h-6 text-[#1458B8] animate-spin" />
                                        <p className="text-lg font-semibold text-blue-900">Traitement en cours...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SuccessAnimation show={showSuccess} message={successMessage} />

                <ActionModal
                    isOpen={showActionModal}
                    onClose={() => setShowActionModal(false)}
                    onAction={handleAction}
                    currentState={{
                        lunch_start: currentAttendance?.lunch_start,
                        lunch_end: currentAttendance?.lunch_end,
                        hasActiveIntervention: hasActiveIntervention()
                    }}
                />

                <InterventionModal
                    isOpen={showInterventionModal}
                    onClose={() => setShowInterventionModal(false)}
                    onConfirm={handleInterventionConfirm}
                    isReturn={interventionType === 'end'}
                />

                {employeeProfile?.role === 'admin' && (
                    <EmployeeSelector
                        isOpen={showEmployeeSelector}
                        onClose={() => setShowEmployeeSelector(false)}
                        onSelect={handleEmployeeSelect}
                        employees={employees}
                    />
                )}
            </div>
        </div>
    );
}
