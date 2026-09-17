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
import { StatePanel } from "@/components/ui/StatePanel";

export default function History() {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const { data: attendances = [], isLoading } = useQuery({
        queryKey: ['allHistory'],
        queryFn: () => supabaseClient.entities.Attendance.list('-date', 200)
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
        const headers = ['Date', 'Employé', 'Arrivée', 'Départ', 'Pause', 'Interventions', 'Heures', 'Statut'];
        const rows = filteredAttendances.map(att => [
            att.date,
            att.employee_name,
            att.check_in,
            att.check_out || '-',
            att.lunch_start ? `${att.lunch_start} → ${att.lunch_end || 'en cours'}` : '-',
            Array.isArray(att.interventions) && att.interventions.length > 0
                ? att.interventions.map(item => `${item.departure_time || '--:--'} → ${item.return_time || 'en cours'}${item.location ? ` (${item.location})` : ''}`).join(' | ')
                : '-',
            Number.isFinite(Number(att.hours_worked)) ? Number(att.hours_worked).toFixed(2) : '-',
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

    const totalHours = filteredAttendances.reduce((sum, attendance) => sum + (Number(attendance.hours_worked) || 0), 0);
    const presentCount = filteredAttendances.filter((attendance) => attendance.status === 'present').length;
    const lateCount = filteredAttendances.filter((attendance) => attendance.status === 'late').length;

    const exportToPDF = () => {
        const printWindow = window.open('', '', 'height=900,width=1200');
        if (!printWindow) return;

        const rows = filteredAttendances.map((attendance) => `
            <tr>
                <td>${attendance.date || '-'}</td>
                <td>${attendance.employee_name || '-'}</td>
                <td>${attendance.check_in || '-'}</td>
                <td>${attendance.check_out || '-'}</td>
                <td>${Number.isFinite(Number(attendance.hours_worked)) ? `${Number(attendance.hours_worked).toFixed(2)} h` : '-'}</td>
                <td>${getStatusBadge(attendance.status).label}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html><head><title>Historique de présence</title>
            <style>
                @page { size: A4 landscape; margin: 12mm; }
                body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
                .page { padding: 12mm; }
                .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #dbeafe; padding-bottom: 12px; margin-bottom: 18px; }
                .logo { width: 125px; }
                .brand { color: #1d4ed8; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
                h1 { text-align: center; font-size: 27px; margin: 12px 0 8px; }
                p { text-align: center; color: #6b7280; margin: 0 0 8px; }
                .period { text-align: center; font-size: 14px; color: #374151; margin-bottom: 18px; }
                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
                .summary-box { border: 1px solid #d1d5db; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
                .summary-box strong { display: block; color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; }
                .summary-box span { font-size: 20px; font-weight: 800; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; vertical-align: top; }
                th { background: #eff6ff; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            </style></head>
            <body>
                <div class="page">
                    <div class="header"><img class="logo" src="/assets/msa-inter-logo.png" alt="Logo MSA" /><div class="brand">Presence Management</div></div>
                    <h1>Historique de Présence</h1>
                    <p>Date d'impression : ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
                    <div class="period">${dateFilter ? `Journée du ${format(new Date(dateFilter), 'dd MMMM yyyy', { locale: fr })}` : 'Toutes les dates filtrées'}</div>
                    <div class="summary">
                        <div class="summary-box"><strong>Présences</strong><span>${presentCount}</span></div>
                        <div class="summary-box"><strong>Retards</strong><span>${lateCount}</span></div>
                        <div class="summary-box"><strong>Heures totales</strong><span>${totalHours.toFixed(1)} h</span></div>
                    </div>
                    <table><thead><tr>
                        <th>Date</th><th>Employé</th><th>Arrivée</th><th>Départ</th><th>Heures</th><th>Statut</th>
                    </tr></thead><tbody>
                        ${rows || '<tr><td colspan="6">Aucun enregistrement</td></tr>'}
                    </tbody></table>
                </div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); printWindow.close(); };
    };

    return (
        <div className="min-h-screen msa-gradient-soft p-6">
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
                    <Button onClick={exportToPDF} className="msa-gradient">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter PDF
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
                        {isLoading ? (
                            <div className="py-8">
                                <StatePanel
                                    type="loading"
                                    title="Chargement de l’historique"
                                    description="Nous récupérons les enregistrements de présence..."
                                />
                            </div>
                        ) : filteredAttendances.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Employé</TableHead>
                                            <TableHead>Arrivée</TableHead>
                                            <TableHead>Départ</TableHead>
                                            <TableHead>Pause</TableHead>
                                            <TableHead>Interventions</TableHead>
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
                                                    <TableCell className="whitespace-nowrap">
                                                        {attendance.lunch_start ? `${attendance.lunch_start} → ${attendance.lunch_end || 'en cours'}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="min-w-[240px]">
                                                        {Array.isArray(attendance.interventions) && attendance.interventions.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {attendance.interventions.map((intervention, index) => (
                                                                    <div key={`${attendance.id}-history-intervention-${index}`} className="text-sm">
                                                                        <span className="font-medium">{intervention.departure_time || '--:--'} → {intervention.return_time || 'en cours'}</span>
                                                                        {intervention.location && <span className="text-slate-500"> · {intervention.location}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {Number.isFinite(Number(attendance.hours_worked)) ? `${Number(attendance.hours_worked).toFixed(1)}h` : '-'}
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
                        ) : (
                            <div className="py-8">
                                <StatePanel
                                    type="empty"
                                    title="Aucun enregistrement trouvé"
                                    description="Essayez un autre filtre de date ou de recherche."
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
