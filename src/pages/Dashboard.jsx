import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Clock, AlertCircle, Bell } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import StatsCard from "../components/dashboard/StatsCard";
import AttendanceChart from "../components/dashboard/AttendanceChart";
import RecentAttendance from "../components/dashboard/RecentAttendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Dashboard() {
    const [chartData, setChartData] = useState([]);
    const [lastAttendanceCount, setLastAttendanceCount] = useState(0);

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.filter({ is_active: true })
    });

    const { data: todayAttendances = [] } = useQuery({
        queryKey: ['todayAttendances'],
        queryFn: () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            return supabaseClient.entities.Attendance.filter({ date: today }, '-created_date');
        },
        refetchInterval: 5000 // Refresh every 5 seconds for real-time updates
    });

    const { data: allAttendances = [] } = useQuery({
        queryKey: ['allAttendances'],
        queryFn: () => supabaseClient.entities.Attendance.list('-created_date', 100),
        refetchInterval: 10000
    });

    // Monitor new attendances and show notifications
    useEffect(() => {
        if (todayAttendances.length > lastAttendanceCount && lastAttendanceCount > 0) {
            const newAttendances = todayAttendances.slice(0, todayAttendances.length - lastAttendanceCount);

            newAttendances.forEach(attendance => {
                if (attendance.status === 'late') {
                    toast.warning(`⏰ ${attendance.employee_name} est en retard`, {
                        description: `Arrivée à ${attendance.check_in}`,
                        duration: 5000
                    });
                } else if (attendance.status === 'present') {
                    toast.success(`✅ ${attendance.employee_name} est arrivé`, {
                        description: `Pointage à ${attendance.check_in}`,
                        duration: 3000
                    });
                }
            });
        }
        setLastAttendanceCount(todayAttendances.length);
    }, [todayAttendances]);

    useEffect(() => {
        const generateChartData = () => {
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
                const dayName = format(subDays(new Date(), i), 'EEE', { locale: fr });

                const dayAttendances = allAttendances.filter(a => a.date === date);

                last7Days.push({
                    day: dayName,
                    present: dayAttendances.filter(a => a.status === 'present').length,
                    late: dayAttendances.filter(a => a.status === 'late').length,
                    absent: dayAttendances.filter(a => a.status === 'absent').length
                });
            }
            setChartData(last7Days);
        };

        if (allAttendances.length > 0) {
            generateChartData();
        }
    }, [allAttendances]);

    const totalEmployees = employees.length;
    const presentToday = todayAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const lateToday = todayAttendances.filter(a => a.status === 'late').length;
    const absentToday = totalEmployees - presentToday;

    return (
        <div className="min-h-screen msa-gradient-soft p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Tableau de Bord
                    </h1>
                    <p className="text-gray-500">
                        {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Employés"
                        value={totalEmployees}
                        icon={Users}
                        color="blue"
                    />
                    <StatsCard
                        title="Présents Aujourd'hui"
                        value={presentToday}
                        subtitle={`${totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0}% du personnel`}
                        icon={UserCheck}
                        color="green"
                    />
                    <StatsCard
                        title="Retards"
                        value={lateToday}
                        icon={Clock}
                        color="orange"
                    />
                    <StatsCard
                        title="Absents"
                        value={absentToday}
                        icon={AlertCircle}
                        color="red"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <AttendanceChart data={chartData} />
                    </div>
                    <div>
                        <RecentAttendance attendances={todayAttendances.slice(0, 5)} />
                    </div>
                </div>

                {/* Real-time alerts */}
                {lateToday > 0 && (
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-900">
                                <Bell className="w-5 h-5" />
                                Alertes du jour
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {todayAttendances
                                    .filter(a => a.status === 'late')
                                    .slice(0, 3)
                                    .map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{att.employee_name}</p>
                                                <p className="text-sm text-gray-500">Arrivé à {att.check_in}</p>
                                            </div>
                                            <Badge className="bg-orange-100 text-orange-800">Retard</Badge>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
