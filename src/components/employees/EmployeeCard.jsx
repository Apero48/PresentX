import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";

export default function EmployeeCard({ employee, onClick }) {
    return (
        <Card
            className="border-0 shadow-lg shadow-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => onClick(employee)}
        >
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20 ring-4 ring-blue-50 group-hover:ring-blue-100 transition-all">
                        <AvatarImage src={employee.profile_picture} />
                        <AvatarFallback className="msa-gradient text-white text-2xl font-bold">
                            {employee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-xl mb-1 group-hover:text-[#1458B8] transition-colors">
                            {employee.full_name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className={employee.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {employee.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {employee.department}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{employee.position || 'Employé'}</p>
                    </div>

                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#1458B8] group-hover:translate-x-1 transition-all" />
                </div>
            </CardContent>
        </Card>
    );
}
