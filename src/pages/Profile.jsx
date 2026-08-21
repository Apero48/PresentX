import React, { useState, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Briefcase, Clock, LogOut, Shield, QrCode, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getCachedOfflineEmployee } from '@/services/offlineAttendanceStore';
import QRCode from 'qrcode';
import { getOfflinePinStatus, setOfflinePin, clearOfflinePin } from '@/services/offlinePinService';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [offlinePinStatus, setOfflinePinStatus] = useState(() => getOfflinePinStatus());

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => supabaseClient.entities.Employee.list(),
        enabled: user?.role === 'admin'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const currentUser = await supabaseClient.auth.me();
                setUser(currentUser);

                let emp = null;
                try {
                    const employees = await supabaseClient.entities.Employee.filter({ user_id: currentUser.id });
                    emp = employees?.[0] || null;
                } catch {
                    emp = getCachedOfflineEmployee();
                }
                setEmployee(emp || getCachedOfflineEmployee());
            } catch (error) {
                console.error('Erreur chargement profil:', error);
                toast.error('Profil indisponible hors connexion', {
                    description: 'Reconnectez-vous au réseau pour actualiser vos informations.'
                });
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        supabaseClient.auth.logout();
    };

    const handleOfflinePinSetup = async () => {
        const pin = window.prompt('Définissez un PIN hors connexion de 4 à 6 chiffres :');
        if (pin === null) return;
        const confirmation = window.prompt('Confirmez le PIN hors connexion :');
        if (pin !== confirmation) {
            toast.error('Les deux PIN ne correspondent pas.');
            return;
        }
        try {
            await setOfflinePin(pin);
            setOfflinePinStatus(getOfflinePinStatus());
            toast.success('Accès hors connexion activé', {
                description: 'Vous pourrez déverrouiller l’application avec ce PIN sans Internet.'
            });
        } catch (error) {
            toast.error(error?.message || 'Impossible d’activer le mode hors connexion.');
        }
    };

    const handleOfflinePinDisable = () => {
        clearOfflinePin();
        setOfflinePinStatus(getOfflinePinStatus());
        toast.success('Accès hors connexion désactivé');
    };

    const generateUniversalQR = async () => {
        const universalQRCode = 'ATTENDANCE-CHECK-IN';
        try {
            // Generate locally so every company computer displays the same QR code.
            const qrImageUrl = await QRCode.toDataURL(universalQRCode, {
                width: 800,
                margin: 4,
                errorCorrectionLevel: 'H',
                color: { dark: '#000000', light: '#FFFFFF' },
            });

            const printWindow = window.open('', '', 'width=900,height=900');
            if (!printWindow) {
                throw new Error('La fenêtre d’impression a été bloquée par le navigateur.');
            }

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
            toast.success('✅ QR Code universel généré localement!');
        } catch (error) {
            console.error('Erreur génération QR universel:', error);
            toast.error('Impossible de générer le QR Code', {
                description: error?.message || 'Réessayez après avoir autorisé les fenêtres popup.'
            });
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center msa-gradient-soft">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen msa-gradient-soft p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="rounded-3xl bg-white/95 border border-slate-200 p-6 shadow-xl">
                    <div className="flex flex-col items-center text-center gap-4">
                        <Avatar className="w-28 h-28 ring-4 ring-blue-100">
                            <AvatarImage src={employee?.profile_picture} />
                            <AvatarFallback className="msa-gradient text-white text-4xl font-bold">
                                {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">{user.full_name}</h2>
                            <p className="text-sm text-slate-500">{employee?.position || 'Employé'}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 text-base px-4 py-1">
                                {user.role === 'admin' ? 'Administrateur' : 'Employé'}
                            </Badge>
                            {employee?.is_active && (
                                <Badge className="bg-emerald-100 text-emerald-800 text-base px-4 py-1">
                                    Actif
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card className="border-0 shadow-lg">
                        <CardTitle className="px-6 pt-6 text-xl font-semibold text-slate-900">Informations</CardTitle>
                        <CardContent className="space-y-4 px-6 pb-6">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-3xl">
                                <Mail className="w-5 h-5 text-[#1458B8]" />
                                <div>
                                    <p className="text-xs text-slate-500">Email</p>
                                    <p className="font-medium text-slate-900">{user.email}</p>
                                </div>
                            </div>
                            {employee?.department && (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-3xl">
                                    <Briefcase className="w-5 h-5 text-[#1458B8]" />
                                    <div>
                                        <p className="text-xs text-slate-500">Département</p>
                                        <p className="font-medium text-slate-900">{employee.department}</p>
                                    </div>
                                </div>
                            )}
                            {employee?.start_time && (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-3xl">
                                    <Clock className="w-5 h-5 text-[#1458B8]" />
                                    <div>
                                        <p className="text-xs text-slate-500">Horaires</p>
                                        <p className="font-medium text-slate-900">{employee.start_time} - {employee.end_time || '17:00'}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                                <KeyRound className="w-5 h-5 text-[#1458B8]" />
                                Accès hors connexion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 px-6 pb-6">
                            <p className="text-sm text-slate-600">
                                Activez cette option une fois avec Internet pour pouvoir déverrouiller l’application et scanner sans réseau.
                            </p>
                            <Button
                                onClick={offlinePinStatus.configured ? handleOfflinePinDisable : handleOfflinePinSetup}
                                variant={offlinePinStatus.configured ? 'outline' : 'default'}
                                className="w-full py-5"
                            >
                                <KeyRound className="w-5 h-5 mr-2" />
                                {offlinePinStatus.configured ? 'Désactiver le PIN hors connexion' : 'Activer le PIN hors connexion'}
                            </Button>
                            {offlinePinStatus.configured && (
                                <p className="text-xs text-emerald-700">PIN activé sur cet appareil. Ne partagez pas ce téléphone.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardTitle className="px-6 pt-6 text-xl font-semibold text-slate-900">Actions</CardTitle>
                        <CardContent className="space-y-4 px-6 pb-6">
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="w-full py-5 text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Déconnexion
                            </Button>
                            <Button
                                onClick={() => toast('Fonctionnalité non disponible')}
                                className="w-full py-5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Modifier le mot de passe
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {user?.role === 'admin' && (
                    <Card className="border-0 shadow-2xl msa-gradient-soft">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="w-6 h-6 text-[#1458B8]" />
                                Gestion des QR Codes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 mb-4">
                                Générez le QR code universel que tous les employés utiliseront pour pointer leur présence.
                            </p>
                            <Button
                                onClick={generateUniversalQR}
                                className="w-full py-5 text-lg font-semibold msa-gradient hover:opacity-95"
                            >
                                <QrCode className="w-5 h-5 mr-2" />
                                Générer le QR Code Universel
                            </Button>
                            <p className="text-xs text-slate-500 mt-3 text-center">
                                À imprimer et coller dans l'entreprise
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
