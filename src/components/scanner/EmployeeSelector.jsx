import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EmployeeSelector({ isOpen, onClose, onSelect, employees }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (employee) => {
        onSelect(employee);
        setSearchTerm('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Qui êtes-vous ?</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Rechercher par nom, code ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 py-6 text-lg"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredEmployees.map((employee) => (
                            <button
                                key={employee.id}
                                onClick={() => handleSelect(employee)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                            >
                                <Avatar className="w-16 h-16 ring-2 ring-blue-100">
                                    <AvatarImage src={employee.profile_picture} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                                        {employee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-lg">{employee.full_name}</p>
                                    <p className="text-sm text-gray-500">{employee.department}</p>
                                    <p className="text-xs text-gray-400">Code: {employee.employee_code}</p>
                                </div>
                            </button>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <p className="text-center text-gray-400 py-8">Aucun employé trouvé</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
