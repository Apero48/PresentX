import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Bell, X, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function NotificationCenter({ user }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastCheck, setLastCheck] = useState(new Date());

    const { data: recentAttendances = [] } = useQuery({
        queryKey: ['recentAttendances'],
        queryFn: () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            return supabaseClient.entities.Attendance.filter({ date: today }, '-date', 50);
        },
        refetchInterval: 10000 // Refresh every 10 seconds
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.filter({ is_active: true }),
        refetchInterval: 30000
    });

    useEffect(() => {
        if (user?.role !== 'admin') return;

        const newNotifications = [];
        const currentTime = new Date();
        const today = format(currentTime, 'yyyy-MM-dd');

        // Check for late arrivals
        recentAttendances.forEach(attendance => {
            const attendanceTimestamp = attendance.created_at || attendance.created_date;
            if (attendance.status === 'late' && attendanceTimestamp && new Date(attendanceTimestamp) > lastCheck) {
                newNotifications.push({
                    id: `late-${attendance.id}`,
                    type: 'late',
                    title: 'Retard détecté',
                    message: `${attendance.employee_name} est arrivé en retard à ${attendance.check_in}`,
                    timestamp: attendanceTimestamp,
                    icon: Clock,
                    color: 'orange'
                });
            }
        });

        // Check for absences (employees who haven't checked in)
        const currentHour = currentTime.getHours();
        if (currentHour >= 10) { // After 10 AM, check for absences
            const presentEmployeeIds = recentAttendances.map(a => a.employee_id);
            const absentEmployees = employees.filter(emp => !presentEmployeeIds.includes(emp.id));

            absentEmployees.forEach(emp => {
                const existingNotif = notifications.find(n => n.id === `absent-${emp.id}-${today}`);
                if (!existingNotif) {
                    newNotifications.push({
                        id: `absent-${emp.id}-${today}`,
                        type: 'absent',
                        title: 'Absence',
                        message: `${emp.full_name} n'a pas encore pointé aujourd'hui`,
                        timestamp: new Date().toISOString(),
                        icon: AlertCircle,
                        color: 'red'
                    });
                }
            });
        }

        if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + newNotifications.length);

            // Show toast for the most recent notification
            const latest = newNotifications[0];
            if (latest.type === 'late') {
                toast.warning(latest.message, {
                    icon: '⏰',
                    duration: 5000
                });
            } else if (latest.type === 'absent') {
                toast.error(latest.message, {
                    icon: '❌',
                    duration: 5000
                });
            }
        }

        setLastCheck(currentTime);
    }, [recentAttendances, employees, user]);

    const handleMarkAllRead = () => {
        setUnreadCount(0);
    };

    const handleClearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    if (user?.role !== 'admin') return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <Card className="border-0 shadow-none">
                    <CardHeader className="border-b msa-gradient-soft">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notifications
                                {unreadCount > 0 && (
                                    <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                                )}
                            </CardTitle>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleMarkAllRead}
                                        className="text-xs"
                                    >
                                        Tout marquer lu
                                    </Button>
                                )}
                                {notifications.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClearAll}
                                        className="h-6 w-6"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">Aucune notification</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {notifications.map((notif) => {
                                        const Icon = notif.icon;
                                        const colorClasses = {
                                            orange: 'bg-orange-100 text-orange-600',
                                            red: 'bg-red-100 text-red-600',
                                            green: 'bg-green-100 text-green-600'
                                        };

                                        return (
                                            <div
                                                key={notif.id}
                                                className="p-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`w-10 h-10 rounded-lg ${colorClasses[notif.color]} flex items-center justify-center flex-shrink-0`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm">
                                                            {notif.title}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notif.message}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-2">
                                                            {format(new Date(notif.timestamp), "HH:mm", { locale: fr })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
