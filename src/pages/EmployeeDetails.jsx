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
    Download,
    Edit,
    QrCode,
    Mail,
    Phone,
    Briefcase
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
        const printContent = document.getElementById('attendance-table');
        const printWindow = window.open('', '', 'height=600,width=800');

        printWindow.document.write(`
      <html>
        <head>
          <title>Historique - ${employee?.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .info { margin-bottom: 20px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .present { color: #059669; }
            .late { color: #d97706; }
            .absent { color: #dc2626; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Historique de Présence</h1>
            <div class="info">
              <p><strong>Employé:</strong> ${employee?.full_name}</p>
              <p><strong>Département:</strong> ${employee?.department}</p>
              <p><strong>Date d'impression:</strong> ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
              ${startDate ? `<p><strong>Période:</strong> ${format(new Date(startDate), 'dd/MM/yyyy', { locale: fr })} - ${endDate ? format(new Date(endDate), 'dd/MM/yyyy', { locale: fr }) : 'Aujourd\'hui'}</p>` : ''}
            </div>
          </div>
          ${printContent.innerHTML}
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

                                <div className="flex gap-3">
                                    <Button onClick={handleEdit} variant="outline">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Modifier
                                    </Button>
                                    <Button onClick={handleGenerateQR} variant="outline">
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Télécharger QR Code
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
        </div>
    );
}
