import React, { useState } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import EmployeeCard from "../components/employees/EmployeeCard";
import { StatePanel } from "@/components/ui/StatePanel";
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
        initial_password: '',
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
        queryFn: () => supabaseClient.entities.Employee.list('-created_at')
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

        if (formData.initial_password.length < 8) {
            toast.error('Le mot de passe initial doit contenir au moins 8 caractères');
            return;
        }

        const dataToSave = {
            full_name: formData.full_name,
            email: formData.email,
            password: formData.initial_password,
            phone: formData.phone,
            department: formData.department,
            position: formData.position,
            employee_code: formData.employee_code,
            start_time: formData.start_time
        };

        try {
            await supabaseClient.auth.createEmployeeAccount(dataToSave);
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            setIsDialogOpen(false);
            resetForm();
            toast.success('Compte employé créé avec succès', {
                description: 'L’employé peut maintenant se connecter avec son email et son mot de passe initial.'
            });
        } catch (error) {
            toast.error(error?.message || 'Erreur lors de la création du compte');
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '',
            email: '',
            initial_password: '',
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
        <div className="min-h-screen msa-gradient-soft p-6">
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
                        className="msa-gradient hover:opacity-95"
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

                {isLoading ? (
                    <StatePanel
                        type="loading"
                        title="Chargement des employés"
                        description="Nous récupérons la liste des employés en cours..."
                    />
                ) : filteredEmployees.length > 0 ? (
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
                ) : (
                    <StatePanel
                        type="empty"
                        title="Aucun employé trouvé"
                        description="Ajoutez un employé pour commencer à gérer les présences."
                        icon={Users2}
                        action={
                            <Button onClick={() => setIsDialogOpen(true)} className="msa-gradient">
                                <Plus className="mr-2 h-4 w-4" />
                                Ajouter un employé
                            </Button>
                        }
                    />
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
                                    <Label>Mot de passe initial *</Label>
                                    <Input
                                        type="password"
                                        value={formData.initial_password}
                                        onChange={(e) => setFormData({ ...formData, initial_password: e.target.value })}
                                        placeholder="8 caractères minimum"
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                    <p className="text-xs text-gray-500">À transmettre à l’employé de manière sécurisée.</p>
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
                                <Button type="submit" className="msa-gradient">
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
