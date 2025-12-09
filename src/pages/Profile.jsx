import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Briefcase, Clock, LogOut, Shield, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [employee, setEmployee] = useState(null);

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.list(),
        enabled: user?.role === 'admin'
    });

    useEffect(() => {
        const fetchData = async () => {
            const currentUser = await supabaseClient.auth.me();
            setUser(currentUser);

            const employees = await supabaseClient.entities.Employee.list();
            const emp = employees.find(e => e.email === currentUser.email);
            setEmployee(emp);
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        supabaseClient.auth.logout();
    };

    const generateUniversalQR = () => {
        const universalQRCode = "ATTENDANCE-CHECK-IN";
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(universalQRCode)}`;

        const printWindow = window.open('', '', 'width=900,height=900');

        printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Universel - Pointage</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px;
            }
            .qr-container {
              background: white;
              border-radius: 30px;
              padding: 50px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 700px;
            }
            h1 {
              color: #1f2937;
              font-size: 42px;
              margin-bottom: 15px;
              font-weight: bold;
            }
            .subtitle {
              color: #6b7280;
              font-size: 20px;
              margin-bottom: 40px;
            }
            .qr-code {
              background: white;
              padding: 30px;
              border-radius: 20px;
              display: inline-block;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              margin: 30px 0;
            }
            .qr-code img {
              width: 400px;
              height: 400px;
              display: block;
            }
            .instructions {
              background: #f3f4f6;
              padding: 25px;
              border-radius: 15px;
              margin-top: 30px;
              text-align: left;
            }
            .instructions h3 {
              color: #1f2937;
              margin-bottom: 15px;
              font-size: 20px;
            }
            .instructions ol {
              color: #4b5563;
              font-size: 16px;
              line-height: 1.8;
              margin-left: 20px;
            }
            .footer {
              margin-top: 30px;
              color: #9ca3af;
              font-size: 14px;
            }
            @media print {
              body { 
                background: white;
                padding: 20px;
              }
              .no-print { display: none; }
            }
            .print-button {
              position: fixed;
              top: 30px;
              right: 30px;
              background: linear-gradient(to right, #3b82f6, #8b5cf6);
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 12px;
              font-size: 18px;
              font-weight: bold;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
              z-index: 1000;
            }
            .print-button:hover {
              transform: scale(1.05);
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Imprimer ce QR Code</button>
          <div class="qr-container">
            <h1>🏢 QR Code Pointage</h1>
            <p class="subtitle">Scannez ce code pour pointer votre présence</p>
            
            <div class="qr-code">
              <img src="${qrImageUrl}" alt="QR Code Universel Pointage" />
            </div>

            <div class="instructions">
              <h3>📋 Instructions :</h3>
              <ol>
                <li>Scannez ce QR code avec l'application</li>
                <li>Sélectionnez votre nom</li>
                <li>Validez votre pointage</li>
              </ol>
            </div>

            <div class="footer">
              PresenceX - Système de gestion de présence
            </div>
          </div>
        </body>
      </html>
    `);

        printWindow.document.close();
        toast.success("✅ QR Code universel généré!");
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Mon Profil</h1>

                <Card className="border-0 shadow-2xl">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <Avatar className="w-32 h-32 ring-4 ring-blue-100 mb-4">
                                <AvatarImage src={employee?.profile_picture} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl font-bold">
                                    {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.full_name}</h2>
                            <div className="flex gap-2 mb-4">
                                <Badge className="bg-blue-100 text-blue-800 text-base px-4 py-1">
                                    {user.role === 'admin' ? 'Administrateur' : 'Employé'}
                                </Badge>
                                {employee?.is_active && (
                                    <Badge className="bg-green-100 text-green-800 text-base px-4 py-1">
                                        Actif
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{user.email}</p>
                                </div>
                            </div>

                            {employee?.phone && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Téléphone</p>
                                        <p className="font-medium text-gray-900">{employee.phone}</p>
                                    </div>
                                </div>
                            )}

                            {employee?.department && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Département</p>
                                        <p className="font-medium text-gray-900">{employee.department}</p>
                                    </div>
                                </div>
                            )}

                            {employee?.position && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Poste</p>
                                        <p className="font-medium text-gray-900">{employee.position}</p>
                                    </div>
                                </div>
                            )}

                            {employee?.start_time && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Heure de début</p>
                                        <p className="font-medium text-gray-900">{employee.start_time}</p>
                                    </div>
                                </div>
                            )}

                            {employee?.employee_code && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <Badge variant="outline" className="text-sm">
                                        Code: {employee.employee_code}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="w-full mt-8 py-6 text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <LogOut className="w-5 h-5 mr-2" />
                            Se déconnecter
                        </Button>
                    </CardContent>
                </Card>

                {user?.role === 'admin' && (
                    <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 to-purple-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="w-6 h-6 text-blue-600" />
                                Gestion des QR Codes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Générez le QR code universel que tous les employés utiliseront pour pointer leur présence.
                            </p>
                            <Button
                                onClick={generateUniversalQR}
                                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                <QrCode className="w-5 h-5 mr-2" />
                                Générer le QR Code Universel
                            </Button>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                                À imprimer et coller dans l'entreprise
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
