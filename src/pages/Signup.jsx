import React, { useState } from 'react';
import { supabaseClient, supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Signup() {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        // Validation
        if (formData.password !== formData.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Créer l'utilisateur dans Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        full_name: formData.full_name
                    }
                }
            });

            if (authError) {
                console.error('Auth error:', authError);

                // Gérer les différents types d'erreurs
                if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                    toast.error('Cet email est déjà utilisé');
                } else if (authError.message.includes('invalid') || authError.message.includes('Invalid')) {
                    toast.error('Email invalide. Utilisez un vrai email (ex: votre.nom@gmail.com)');
                } else if (authError.message.includes('rate limit')) {
                    toast.error('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
                } else {
                    toast.error(`Erreur: ${authError.message}`);
                }
                setIsLoading(false);
                return;
            }

            const userId = authData.user?.id;

            if (!userId) {
                toast.error('Erreur lors de la création du compte');
                setIsLoading(false);
                return;
            }

            // 2. Créer l'enregistrement employé avec valeurs par défaut
            const employeeData = {
                full_name: formData.full_name,
                email: formData.email,
                phone: '',
                department: 'Non défini',
                position: 'Employé',
                employee_code: `EMP${Date.now().toString().slice(-6)}`,
                qr_code: `QR-${userId}`,
                is_active: true,
                user_id: userId
            };

            const { error: employeeError } = await supabase
                .from('employees')
                .insert([employeeData]);

            if (employeeError) {
                console.error('Employee creation error:', employeeError);
                toast.error('Erreur lors de la création du profil employé');
                setIsLoading(false);
                return;
            }

            // Succès !
            toast.success('Compte créé avec succès ! 🎉', {
                description: 'Vous pouvez maintenant vous connecter'
            });

            // Redirection vers login après 2 secondes
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('Signup error:', error);
            toast.error('Une erreur est survenue lors de l\'inscription');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-2xl backdrop-blur-xl bg-white/95">
                        <CardHeader className="text-center pb-6 pt-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="relative"
                            >
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                    PX
                                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
                                </div>
                            </motion.div>

                            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Créer un Compte
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Rejoignez PresenceX en quelques secondes
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleSignup} className="space-y-5">
                                <div className="space-y-2">
                                    <Label>Nom complet *</Label>
                                    <Input
                                        placeholder="Jean Dupont"
                                        value={formData.full_name}
                                        onChange={(e) => handleChange('full_name', e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Email professionnel *</Label>
                                    <Input
                                        type="email"
                                        placeholder="jean.dupont@gmail.com"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Mot de passe *</Label>
                                    <Input
                                        type="password"
                                        placeholder="Minimum 6 caractères"
                                        value={formData.password}
                                        onChange={(e) => handleChange('password', e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Confirmer le mot de passe *</Label>
                                    <Input
                                        type="password"
                                        placeholder="Répétez le mot de passe"
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all mt-6"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Création du compte...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <UserPlus className="w-5 h-5" />
                                            S'inscrire
                                        </div>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6">
                                <Link to="/login">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-gray-600 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Retour à la connexion
                                    </Button>
                                </Link>
                            </div>

                            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                                <p className="text-xs text-gray-600 text-center">
                                    En vous inscrivant, vous rejoignez l'équipe PresenceX
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center text-white/80 mt-6 text-sm"
                    >
                        © 2024 PresenceX - Gestion de présence intelligente
                    </motion.p>
                </motion.div>
            </div>

            <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
        </div>
    );
}
