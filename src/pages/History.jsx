import React, { useState } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function History() {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const { data: attendances = [], isLoading } = useQuery({
        queryKey: ['allHistory'],
        queryFn: () => supabaseClient.entities.Attendance.list('-created_date', 200)
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

    const filteredAttendances = attendances.filter(att => {
        const matchesSearch = att.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !dateFilter || att.date === dateFilter;
        return matchesSearch && matchesDate;
    });

    const exportToCSV = () => {
        const headers = ['Date', 'Employé', 'Arrivée', 'Départ', 'Heures', 'Statut'];
        const rows = filteredAttendances.map(att => [
            att.date,
            att.employee_name,
            att.check_in,
            att.check_out || '-',
            att.hours_worked?.toFixed(2) || '-',
            getStatusBadge(att.status).label
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historique-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Historique</h1>
                        <p className="text-gray-500">Consulter tous les enregistrements de présence</p>
                    </div>
                    <Button
                        onClick={exportToCSV}
                        variant="outline"
                        className="border-2"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exporter CSV
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            placeholder="Rechercher un employé..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 py-6 bg-white border-0 shadow-lg"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-10 py-6 bg-white border-0 shadow-lg"
                        />
                    </div>
                </div>

                <Card className="border-0 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            {filteredAttendances.length} enregistrements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Arrivée</TableHead>
                                        <TableHead>Départ</TableHead>
                                        <TableHead>Heures</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAttendances.map((attendance) => {
                                        const statusInfo = getStatusBadge(attendance.status);
                                        return (
                                            <TableRow key={attendance.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(attendance.date), 'dd MMM yyyy', { locale: fr })}
                                                </TableCell>
                                                <TableCell>{attendance.employee_name}</TableCell>
                                                <TableCell>{attendance.check_in}</TableCell>
                                                <TableCell>{attendance.check_out || '-'}</TableCell>
                                                <TableCell>
                                                    {attendance.hours_worked ? `${attendance.hours_worked.toFixed(1)}h` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${statusInfo.className} border`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {filteredAttendances.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                Aucun enregistrement trouvé
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
