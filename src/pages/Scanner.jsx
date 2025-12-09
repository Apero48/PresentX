import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import QRScanner from "../components/qr/QRScanner";
import SuccessAnimation from "../components/notifications/SuccessAnimation";
import ActionModal from "../components/scanner/ActionModal";
import InterventionModal from "../components/scanner/InterventionModal";
import EmployeeSelector from "../components/scanner/EmployeeSelector";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

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

    const queryClient = useQueryClient();

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.list()
    });

    const createAttendanceMutation = useMutation({
        mutationFn: (data) => supabaseClient.entities.Attendance.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['attendances']);
            queryClient.invalidateQueries(['todayAttendances']);
        }
    });

    const updateAttendanceMutation = useMutation({
        mutationFn: ({ id, data }) => supabaseClient.entities.Attendance.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['attendances']);
            queryClient.invalidateQueries(['todayAttendances']);
        }
    });

    const handleScan = async (qrData) => {
        if (qrData === "ATTENDANCE-CHECK-IN") {
            setShowEmployeeSelector(true);
            setIsProcessing(false);
        } else {
            toast.error("❌ QR Code non valide");
            setIsProcessing(false);
        }
    };

    const handleEmployeeSelect = async (employee) => {
        setShowEmployeeSelector(false);
        setIsProcessing(true);
        setCurrentEmployee(employee);

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const currentTime = format(new Date(), 'HH:mm');

            const todayAttendances = await supabaseClient.entities.Attendance.filter({
                employee_id: employee.id,
                date: today
            });

            if (todayAttendances.length === 0) {
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

                await createAttendanceMutation.mutateAsync({
                    employee_id: employee.id,
                    employee_name: employee.full_name,
                    date: today,
                    check_in: currentTime,
                    status: status,
                    interventions: []
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
                setCurrentAttendance(todayAttendances[0]);
                setShowActionModal(true);
            }

            setIsProcessing(false);
        } catch (error) {
            toast.error("Erreur lors du traitement");
            setIsProcessing(false);
        }
    };

    const handleAction = async (actionKey) => {
        setShowActionModal(false);
        const currentTime = format(new Date(), 'HH:mm');

        if (actionKey === 'lunch_start') {
            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                data: { ...currentAttendance, lunch_start: currentTime }
            });
            setSuccessMessage(`☕ Bonne pause déjeuner!\nDébut: ${currentTime}`);
            setShowSuccess(true);
            toast.success(`☕ Pause déjeuner - ${currentTime}`);
            setTimeout(() => setShowSuccess(false), 3000);
        } else if (actionKey === 'lunch_end') {
            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                data: { ...currentAttendance, lunch_end: currentTime }
            });
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
            const [inHour, inMinute] = checkInTime.split(':').map(Number);
            const [outHour, outMinute] = currentTime.split(':').map(Number);

            let hoursWorked = (outHour * 60 + outMinute - inHour * 60 - inMinute) / 60;

            if (currentAttendance.lunch_start && currentAttendance.lunch_end) {
                const [lunchStartHour, lunchStartMinute] = currentAttendance.lunch_start.split(':').map(Number);
                const [lunchEndHour, lunchEndMinute] = currentAttendance.lunch_end.split(':').map(Number);
                const lunchDuration = (lunchEndHour * 60 + lunchEndMinute - lunchStartHour * 60 - lunchStartMinute) / 60;
                hoursWorked -= lunchDuration;
            }

            await updateAttendanceMutation.mutateAsync({
                id: currentAttendance.id,
                data: {
                    ...currentAttendance,
                    check_out: currentTime,
                    hours_worked: Math.max(0, hoursWorked).toFixed(2)
                }
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
                data: { ...currentAttendance, interventions }
            });

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
                data: { ...currentAttendance, interventions }
            });

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Scanner QR Code</h1>
                    <p className="text-gray-600">Scannez votre code pour pointer</p>
                </div>

                <QRScanner onScan={handleScan} />

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
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
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

                <EmployeeSelector
                    isOpen={showEmployeeSelector}
                    onClose={() => setShowEmployeeSelector(false)}
                    onSelect={handleEmployeeSelect}
                    employees={employees}
                />
            </div>
        </div>
    );
}
