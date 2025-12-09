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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
                <div className="text-center">
                    <p className="text-gray-500">Chargement de vos données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Mon Historique</h1>
                    <p className="text-gray-500">Consultez votre historique de présence</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Ce mois-ci</p>
                                    <p className="text-3xl font-bold text-gray-900">{currentMonth.length}</p>
                                    <p className="text-xs text-gray-400">jours travaillés</p>
                                </div>
                                <Calendar className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Total Heures</p>
                                    <p className="text-3xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
                                    <p className="text-xs text-gray-400">cumulées</p>
                                </div>
                                <Clock className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Retards</p>
                                    <p className="text-3xl font-bold text-gray-900">{lateCount}</p>
                                    <p className="text-xs text-gray-400">au total</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-2xl">
                    <CardHeader>
                        <CardTitle>Historique Détaillé</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {myAttendances.map((attendance) => {
                                const statusInfo = getStatusBadge(attendance.status);
                                return (
                                    <div
                                        key={attendance.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {format(new Date(attendance.date), 'd')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(attendance.date), 'MMM', { locale: fr })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {format(new Date(attendance.date), 'EEEE', { locale: fr })}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{attendance.check_in}</span>
                                                    {attendance.check_out && (
                                                        <>
                                                            <span>→</span>
                                                            <span>{attendance.check_out}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={`${statusInfo.className} border mb-2`}>
                                                {statusInfo.label}
                                            </Badge>
                                            {attendance.hours_worked && (
                                                <p className="text-sm font-medium text-gray-600">
                                                    {attendance.hours_worked.toFixed(1)}h
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {myAttendances.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    Aucun enregistrement pour le moment
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
