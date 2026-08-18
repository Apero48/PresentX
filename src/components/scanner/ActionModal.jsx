import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, LogOut, MapPin } from "lucide-react";

export default function ActionModal({ isOpen, onClose, onAction, currentState }) {
    const actions = [];

    if (!currentState.lunch_start) {
        actions.push({
            key: 'lunch_start',
            label: 'Pause Déjeuner',
            icon: Coffee,
            color: 'from-orange-500 to-yellow-500'
        });
    } else if (currentState.lunch_start && !currentState.lunch_end) {
        actions.push({
            key: 'lunch_end',
            label: 'Retour de Pause',
            icon: Coffee,
            color: 'from-green-500 to-emerald-500'
        });
    }

    if (!currentState.hasActiveIntervention) {
        actions.push({
            key: 'intervention_start',
            label: 'Intervention Extérieure',
            icon: MapPin,
            color: 'from-[#1458B8] to-[#0D3B7A]'
        });
    } else {
        actions.push({
            key: 'intervention_end',
            label: 'Retour d\'Intervention',
            icon: MapPin,
            color: 'from-green-500 to-teal-500'
        });
    }

    actions.push({
        key: 'check_out',
        label: 'Départ Final',
        icon: LogOut,
        color: 'from-red-500 to-pink-500'
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#1458B8]" />
                        Que souhaitez-vous faire ?
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.key}
                                onClick={() => onAction(action.key)}
                                className={`w-full h-16 text-lg font-semibold bg-gradient-to-r ${action.color} hover:opacity-90 transition-all`}
                            >
                                <Icon className="w-6 h-6 mr-3" />
                                {action.label}
                            </Button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
