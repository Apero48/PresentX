import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Coffee,
    Download,
    Edit,
    MapPin,
    QrCode,
    Mail,
    Phone,
    Briefcase,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import QRCode from 'qrcode';

export default function EmployeeDetails() {
    const [employeeId, setEmployeeId] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [formData, setFormData] = useState({});

    const queryClient = useQueryClient();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        setEmployeeId(id);
    }, []);

    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const employees = await supabaseClient.entities.Employee.list();
            return employees.find(e => e.id === employeeId);
        },
        enabled: !!employeeId
    });

    const { data: allAttendances = [] } = useQuery({
        queryKey: ['employeeAttendances', employeeId],
        queryFn: () => supabaseClient.entities.Attendance.filter({ employee_id: employeeId }, '-date', 500),
        enabled: !!employeeId
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => supabaseClient.entities.Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employee']);
            queryClient.invalidateQueries(['employees']);
            setIsEditDialogOpen(false);
            toast.success('Employé modifié avec succès');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => supabaseClient.auth.deleteEmployeeAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            toast.success('Compte supprimé avec succès');
            window.location.href = '/employees';
        },
        onError: (error) => {
            toast.error(error?.message || 'Erreur lors de la suppression du compte');
            setIsDeleteDialogOpen(false);
        }
    });

    const handleDeleteEmployee = () => {
        deleteMutation.mutate(employeeId);
    };

    const handleEdit = () => {
        setFormData(employee);
        setIsEditDialogOpen(true);
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        updateMutation.mutate({ id: employeeId, data: formData });
    };

    const handleGenerateQR = async () => {
        try {
            const qrData = employee.qr_code || `EMP-${employee.employee_code}`;
            const qrImageUrl = await QRCode.toDataURL(qrData, {
                width: 800,
                margin: 4,
                errorCorrectionLevel: 'H',
                color: { dark: '#000000', light: '#FFFFFF' },
            });

            const link = document.createElement('a');
            link.href = qrImageUrl;
            link.download = `QR-${employee.full_name}.png`;
            link.target = '_blank';
            link.click();

            toast.success('QR Code téléchargé');
        } catch (error) {
            toast.error('Erreur lors de la génération du QR Code');
        }
    };

    const filteredAttendances = allAttendances.filter(att => {
        if (startDate && att.date < startDate) return false;
        if (endDate && att.date > endDate) return false;
        return true;
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

    const exportToPDF = () => {
        const printWindow = window.open('', '', 'height=900,width=1200');
        if (!printWindow) {
            toast.error('La fenêtre d’impression a été bloquée par le navigateur.');
            return;
        }

        const department = employee?.department || 'Non défini';
        const totalHoursValue = filteredAttendances.reduce((sum, att) => sum + (Number(att.hours_worked) || 0), 0);
        const startLabel = startDate ? format(new Date(startDate), 'dd/MM/yyyy') : '—';
        const endLabel = endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Aujourd\'hui';

        const summaryRows = filteredAttendances.map((attendance) => {
            const hours = Number(attendance.hours_worked);
            const statusLabel = attendance.status === 'late' ? 'Retard' : attendance.status === 'present' ? 'Présent' : attendance.status === 'absent' ? 'Absent' : 'Partiel';
            const interventions = Array.isArray(attendance.interventions) && attendance.interventions.length > 0
                ? attendance.interventions.map((item) => `${item.departure_time || '--:--'} → ${item.return_time || 'en cours'}`).join('<br>')
                : '-';

            return `
                <tr>
                    <td>${format(new Date(attendance.date), 'dd MMMM yyyy', { locale: fr })}</td>
                    <td>${attendance.check_in || '-'}</td>
                    <td>${attendance.check_out || '-'}</td>
                    <td>${attendance.lunch_start ? `${attendance.lunch_start} → ${attendance.lunch_end || 'en cours'}` : '-'}</td>
                    <td>${interventions}</td>
                    <td>${Number.isFinite(hours) ? `${hours.toFixed(1)}h` : '-'}</td>
                    <td>${statusLabel}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
      <html>
        <head>
          <title>Historique - ${employee?.full_name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            :root { color-scheme: light; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
            }
            .page {
              width: 100%;
              min-height: 100vh;
              box-sizing: border-box;
              padding: 16mm 12mm;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #dbeafe;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .brand {
              width: 118px;
              height: auto;
            }
            .brand-text {
              flex: 1;
              text-align: right;
              color: #1d4ed8;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-size: 12px;
            }
            .title {
              text-align: center;
              font-size: 27px;
              font-weight: 800;
              margin: 12px 0 8px;
              color: #111827;
            }
            .employee-name {
              text-align: center;
              font-size: 30px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .subtitle {
              text-align: center;
              font-size: 14px;
              color: #374151;
              margin-bottom: 10px;
            }
            .meta {
              text-align: center;
              font-size: 13px;
              color: #4b5563;
              margin-bottom: 10px;
            }
            .period {
              text-align: center;
              font-size: 19px;
              font-weight: 700;
              color: #111827;
              margin: 8px 0 18px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, minmax(120px, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            }
            .summary-box {
              border: 1px solid #d1d5db;
              background: #f8fafc;
              border-radius: 10px;
              padding: 10px 12px;
              text-align: center;
            }
            .summary-box strong {
              display: block;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .summary-box span {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 6px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #eff6ff;
              color: #111827;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 10px;
            }
            td {
              background: #ffffff;
            }
            .muted {
              color: #6b7280;
            }
            @media print {
              body, .page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <img class="brand" src="/assets/msa-inter-logo.png" alt="Logo MSA" />
              <div class="brand-text">Presence Management</div>
            </div>

            <div class="title">Historique de Présence</div>
            <div class="employee-name">${employee?.full_name || 'Employé'}</div>
            <div class="subtitle">Département: ${department}</div>
            <div class="meta">Date d'impression: ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</div>
            <div class="period">Période: ${startLabel} - ${endLabel}</div>

            <div class="summary">
              <div class="summary-box">
                <strong>Présences</strong>
                <span>${presentCount}</span>
              </div>
              <div class="summary-box">
                <strong>Retards</strong>
                <span>${lateCount}</span>
              </div>
              <div class="summary-box">
                <strong>Heures totales</strong>
                <span>${totalHoursValue.toFixed(1)}h</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Pause</th>
                  <th>Interventions</th>
                  <th>Heures</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRows || '<tr><td colspan="7" class="muted">Aucun enregistrement pour cette période</td></tr>'}
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();
    };

    const totalHours = filteredAttendances.reduce((sum, att) => sum + (att.hours_worked || 0), 0);
    const presentCount = filteredAttendances.filter(a => a.status === 'present').length;
    const lateCount = filteredAttendances.filter(a => a.status === 'late').length;

    if (!employee) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen msa-gradient-soft p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Link to={createPageUrl('Employees')}>
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à la liste
                    </Button>
                </Link>

                <Card className="border-0 shadow-2xl">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            <Avatar className="w-32 h-32 ring-4 ring-blue-100">
                                <AvatarImage src={employee.profile_picture} />
                                <AvatarFallback className="msa-gradient text-white text-4xl font-bold">
                                    {employee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{employee.full_name}</h1>
                                        <p className="text-lg text-gray-600">{employee.position || 'Employé'}</p>
                                    </div>
                                    <Badge className={employee.is_active ? 'bg-green-100 text-green-800 text-base px-4 py-2' : 'bg-gray-100 text-gray-800'}>
                                        {employee.is_active ? 'Actif' : 'Inactif'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Mail className="w-5 h-5 text-blue-500" />
                                        <span>{employee.email}</span>
                                    </div>
                                    {employee.phone && (
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <Phone className="w-5 h-5 text-blue-500" />
                                            <span>{employee.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Briefcase className="w-5 h-5 text-blue-500" />
                                        <span>{employee.department}</span>
                                    </div>
                                    {employee.start_time && (
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <Clock className="w-5 h-5 text-blue-500" />
                                            <span>Début: {employee.start_time}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={handleEdit} variant="outline">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Modifier
                                    </Button>
                                    <Button onClick={handleGenerateQR} variant="outline">
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Télécharger QR Code
                                    </Button>
                                    <Button
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer le compte
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-1">Total Présences</p>
                                <p className="text-4xl font-bold text-[#1458B8]">{presentCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-1">Retards</p>
                                <p className="text-4xl font-bold text-orange-600">{lateCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-1">Heures Totales</p>
                                <p className="text-4xl font-bold text-green-600">{totalHours.toFixed(1)}h</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-2xl">
                    <CardHeader className="border-b msa-gradient-soft">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Historique des Pointages
                            </CardTitle>
                            <div className="flex flex-col md:flex-row gap-3">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    placeholder="Date début"
                                    className="bg-white"
                                />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    placeholder="Date fin"
                                    className="bg-white"
                                />
                                <Button onClick={exportToPDF} className="msa-gradient">
                                    <Download className="w-4 h-4 mr-2" />
                                    Exporter PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div id="attendance-table">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
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
                                                    {format(new Date(attendance.date), 'dd MMMM yyyy', { locale: fr })}
                                                </TableCell>
                                                <TableCell>{attendance.check_in}</TableCell>
                                                <TableCell>{attendance.check_out || '-'}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {attendance.lunch_start ? (
                                                        <div className="flex items-center gap-1 text-orange-600">
                                                            <Coffee className="w-3 h-3" />
                                                            <span className="text-sm">{attendance.lunch_start} → {attendance.lunch_end || 'en cours'}</span>
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="min-w-[180px]">
                                                    {Array.isArray(attendance.interventions) && attendance.interventions.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {attendance.interventions.map((intervention, index) => (
                                                                <div key={index} className="flex items-start gap-1 text-blue-700">
                                                                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                    <div className="text-sm">
                                                                        <span>{intervention.departure_time || '--:--'} → {intervention.return_time || 'en cours'}</span>
                                                                        {intervention.location && <span className="block text-xs text-slate-400">{intervention.location}</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {attendance.hours_worked ? `${Number(attendance.hours_worked).toFixed(1)}h` : '-'}
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
                            {filteredAttendances.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    Aucun enregistrement pour cette période
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Modifier l'employé</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom complet</Label>
                                <Input
                                    value={formData.full_name || ''}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <Input
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Département</Label>
                                <Select
                                    value={formData.department || ''}
                                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Direction">Direction</SelectItem>
                                        <SelectItem value="Ressources Humaines">Ressources Humaines</SelectItem>
                                        <SelectItem value="IT">IT</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Operations">Operations</SelectItem>
                                        <SelectItem value="Ventes">Ventes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Poste</Label>
                                <Input
                                    value={formData.position || ''}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Heure de début</Label>
                                <Input
                                    type="time"
                                    value={formData.start_time || ''}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" className="msa-gradient">
                                Sauvegarder
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmation de suppression */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Supprimer le compte
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-gray-700">
                            Vous êtes sur le point de supprimer définitivement le compte de :
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="font-bold text-gray-900 text-lg">{employee?.full_name}</p>
                            <p className="text-gray-500 text-sm">{employee?.email}</p>
                        </div>
                        <p className="text-sm text-red-600 font-medium">
                            ⚠️ Cette action est irréversible. Tout l'historique de présence sera également supprimé.
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={deleteMutation.isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteEmployee}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteMutation.isPending ? 'Suppression...' : 'Oui, supprimer définitivement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
