import React, { useState } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import EmployeeCard from "../components/employees/EmployeeCard";
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

export default function Employees() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        employee_code: '',
        start_time: '09:00',
        is_active: true
    });

    const queryClient = useQueryClient();

    const { data: employees = [], isLoading } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.list('-created_date')
    });

    const createMutation = useMutation({
        mutationFn: (data) => supabaseClient.entities.Employee.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            setIsDialogOpen(false);
            resetForm();
            toast.success('Employé créé avec succès');
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Create without QR code first to get the ID
        const dataToSave = {
            ...formData,
            employee_code: formData.employee_code || `EMP${Date.now().toString().slice(-6)}`
        };

        try {
            const newEmployee = await supabaseClient.entities.Employee.create(dataToSave);
            // Update with unique QR code based on employee ID
            await supabaseClient.entities.Employee.update(newEmployee.id, {
                qr_code: `QR-${newEmployee.id}`
            });
            queryClient.invalidateQueries(['employees']);
            setIsDialogOpen(false);
            resetForm();
            toast.success('Employé créé avec succès');
        } catch (error) {
            toast.error('Erreur lors de la création');
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '',
            email: '',
            phone: '',
            department: '',
            position: '',
            employee_code: '',
            start_time: '09:00',
            is_active: true
        });
    };

    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Employés</h1>
                        <p className="text-gray-500">Gérer les employés et générer les QR codes</p>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsDialogOpen(true);
                        }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        size="lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nouvel Employé
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Rechercher un employé..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 py-6 bg-white border-0 shadow-lg"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredEmployees.map(employee => (
                        <Link key={employee.id} to={createPageUrl(`EmployeeDetails?id=${employee.id}`)}>
                            <EmployeeCard
                                employee={employee}
                                onClick={() => { }}
                            />
                        </Link>
                    ))}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">Aucun employé trouvé</p>
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nouvel employé</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nom complet *</Label>
                                    <Input
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email *</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Téléphone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code employé</Label>
                                    <Input
                                        value={formData.employee_code}
                                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                                        placeholder="Auto-généré si vide"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Département *</Label>
                                    <Select
                                        value={formData.department}
                                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir..." />
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
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Heure de début</Label>
                                    <Input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                                    Créer
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
