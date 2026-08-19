import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Coffee, Car } from "lucide-react";

export default function RecentAttendance({ attendances }) {
    const getStatusBadge = (status) => {
        const variants = {
            present: { className: "bg-green-100 text-green-800 border-green-200", label: "Présent" },
            late: { className: "bg-orange-100 text-orange-800 border-orange-200", label: "Retard" },
            absent: { className: "bg-red-100 text-red-800 border-red-200", label: "Absent" },
            partial: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Partiel" }
        };
        return variants[status] || variants.present;
    };

    return (
        <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Pointages Récents</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {attendances.map((attendance) => {
                        const statusInfo = getStatusBadge(attendance.status);
                        return (
                            <div key={attendance.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                <Avatar>
                                    <AvatarFallback className="msa-gradient text-white font-semibold">
                                        {attendance.employee_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{attendance.employee_name}</p>
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
                                    {(attendance.lunch_start || attendance.lunch_end) && (
                                        <div className="mt-1 flex items-center gap-2 text-xs text-amber-700">
                                            <Coffee className="w-3 h-3" />
                                            <span>
                                                Pause : {attendance.lunch_start || '--:--'} → {attendance.lunch_end || 'en cours'}
                                            </span>
                                        </div>
                                    )}
                                    {Array.isArray(attendance.interventions) && attendance.interventions.length > 0 && (
                                        <div className="mt-1 space-y-1 text-xs text-blue-700">
                                            {attendance.interventions.map((intervention, index) => (
                                                <div key={`${attendance.id}-intervention-${index}`} className="flex items-center gap-2">
                                                    <Car className="w-3 h-3 shrink-0" />
                                                    <span>
                                                        Intervention : {intervention.departure_time || '--:--'} → {intervention.return_time || 'en cours'}
                                                        {intervention.location ? ` · ${intervention.location}` : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Badge className={`${statusInfo.className} border`}>
                                    {statusInfo.label}
                                </Badge>
                            </div>
                        );
                    })}
                    {attendances.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Aucun pointage récent</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
