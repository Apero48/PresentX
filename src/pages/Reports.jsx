import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, ShieldCheck, Clock3 } from 'lucide-react';

export default function Reports() {
    const stats = [
        {
            title: 'Présences du jour',
            value: 'À venir',
            description: 'Connexion directe aux données d’attendance',
            icon: Clock3
        },
        {
            title: 'Sécurité',
            value: 'RLS activée',
            description: 'Accès contrôlé côté base de données',
            icon: ShieldCheck
        },
        {
            title: 'Rapports',
            value: 'Version simple',
            description: 'Cette version ne contient pas de module IA',
            icon: BarChart3
        }
    ];

    return (
        <div className="min-h-screen msa-gradient-soft p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Rapports</h1>
                    <p className="text-gray-500">Vue simple et sécurisée pour la gestion des présences.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {stats.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Card key={index} className="border-0 shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="rounded-xl msa-gradient p-3 text-white">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                                    <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900">Prochaine évolution</h2>
                        <p className="mt-2 text-gray-600">
                            Les rapports pourront ensuite être enrichis avec des tableaux de bord métier et des exports PDF/CSV.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
