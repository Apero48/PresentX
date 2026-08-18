import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock } from "lucide-react";

export default function InterventionModal({ isOpen, onClose, onConfirm, isReturn }) {
    const [reason, setReason] = useState('');
    const [location, setLocation] = useState('');

    const handleSubmit = () => {
        onConfirm({ reason, location });
        setReason('');
        setLocation('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#1458B8]" />
                        {isReturn ? 'Retour d\'intervention' : 'Départ en intervention'}
                    </DialogTitle>
                </DialogHeader>

                {!isReturn && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Motif de l'intervention *</Label>
                            <Textarea
                                placeholder="Ex: Intervention client, réunion externe..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-24"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lieu</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Ex: Bureau client, site chantier..."
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isReturn && (
                    <div className="text-center py-4">
                        <p className="text-gray-600">
                            Confirmez votre retour d'intervention
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isReturn && !reason}
                        className="msa-gradient"
                    >
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
