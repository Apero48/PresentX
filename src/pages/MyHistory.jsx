import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function MyHistory() {
    const [user, setUser] = useState(null);
    const [employee, setEmployee] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await supabaseClient.auth.me();
            setUser(currentUser);

            const employees = await supabaseClient.entities.Employee.filter({ email: currentUser.email });
            if (employees.length > 0) {
                setEmployee(employees[0]);
            }
        };
        fetchUser();
    }, []);

    const { data: myAttendances = [] } = useQuery({
        queryKey: ['myAttendances', employee?.id],
        queryFn: () => employee ? supabaseClient.entities.Attendance.filter({ employee_id: employee.id }, '-created_date', 100) : [],
        enabled: !!employee
    });

    const getStatusBadge = (status) => {
        const variants = {
            present: { className: "bg-green-100 text-green-800 border-green-200", label: "Présent" },
            late: { className: "bg-orange-100 text-orange-800 border-orange-200", label: "Retard" },
            absent: { className: "bg-red-100 text-red-800 border-red-200", label: "Absent" },
            partial: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Partiel" }
        };
        return variants[status] || variants.present;
    };

    const currentMonth = myAttendances.filter(att => {
        const attDate = new Date(att.date);
        return attDate >= startOfMonth(new Date()) && attDate <= endOfMonth(new Date());
    });

    const totalHours = myAttendances.reduce((sum, att) => sum + (att.hours_worked || 0), 0);
    const lateCount = myAttendances.filter(att => att.status === 'late').length;

    if (!employee) {
        return (
            <div className="min-h-screen flex items-center justify-center msa-gradient-soft p-6">
                <div className="text-center">
                    <p className="text-gray-500">Chargement de vos données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen msa-gradient-soft p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-xl">
                    <p className="text-sm text-slate-500">Historique</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Mes pointages</h1>
                    <p className="mt-2 text-sm text-slate-500">Récapitulatif de vos heures et de vos retards.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                            <p className="text-sm text-slate-500">Ce mois-ci</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{currentMonth.length}</p>
                            <p className="mt-2 text-xs text-slate-400">jours travaillés</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                            <p className="text-sm text-slate-500">Heures</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
                            <p className="mt-2 text-xs text-slate-400">cumulées</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                            <p className="text-sm text-slate-500">Retards</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{lateCount}</p>
                            <p className="mt-2 text-xs text-slate-400">au total</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-2xl">
                    <CardHeader>
                        <CardTitle>Mes derniers pointages</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {myAttendances.length > 0 ? myAttendances.map((attendance) => {
                            const statusInfo = getStatusBadge(attendance.status);
                            return (
                                <div key={attendance.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500">{format(new Date(attendance.date), 'EEEE d MMMM', { locale: fr })}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-lg font-semibold text-slate-900">{attendance.check_in || '--:--'}</span>
                                                <span className="text-slate-400">→</span>
                                                <span className="text-lg font-semibold text-slate-900">{attendance.check_out || '--:--'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusInfo.className} border`}> {statusInfo.label} </div>
                                            {attendance.hours_worked && (
                                                <p className="mt-2 text-sm font-medium text-slate-600">{attendance.hours_worked.toFixed(1)}h</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
                                Aucun enregistrement pour le moment.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
