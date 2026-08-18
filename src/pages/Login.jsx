import React, { useState } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { normalizeRole } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const user = await supabaseClient.auth.login(email, password);
            toast.success('Connexion réussie !');
            const role = normalizeRole(user);
            if (role === 'admin') {
                navigate('/Dashboard');
            } else {
                navigate('/Scanner');
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorCode = error?.code || error?.error_code;
            const errorMessage = (error?.message || '').toLowerCase();

            if (errorCode === 'email_not_confirmed' || errorMessage.includes('email not confirmed')) {
                toast.error('Email non confirmé', {
                    description: 'Consultez votre boîte mail et confirmez votre adresse avant de vous connecter.'
                });
            } else if (errorCode === 'invalid_credentials' || errorMessage.includes('invalid login credentials')) {
                toast.error('Email ou mot de passe incorrect', {
                    description: 'Vérifiez l’adresse utilisée lors de la création du compte et le mot de passe initial.'
                });
            } else {
                toast.error('Connexion impossible', {
                    description: error?.message || 'Vérifiez la configuration Supabase et réessayez.'
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#C51A1F] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1458B8] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C51A1F] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-2xl backdrop-blur-xl bg-white/95">
                        <CardHeader className="text-center pb-8 pt-10">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="relative"
                            >
                                <div className="w-full max-w-[260px] h-24 mx-auto mb-6 rounded-2xl bg-white flex items-center justify-center shadow-lg relative p-3">
                                    <img src="/assets/msa-inter-logo.png" alt="MSA INTER" className="max-h-full w-full object-contain" />
                                    <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                                </div>
                            </motion.div>

                            <CardTitle className="text-4xl font-bold text-[#1458B8] mb-2">
                                MSA INTER
                            </CardTitle>
                            <CardDescription className="text-gray-600 text-lg">
                                Gestion intelligente de présence pour votre entreprise
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-10">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="nom@entreprise.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12 px-4 border-2 border-gray-200 focus:border-[#1458B8] transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-12 px-4 border-2 border-gray-200 focus:border-[#1458B8] transition-all"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 msa-gradient hover:opacity-95 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Connexion...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <LogIn className="w-5 h-5" />
                                            Se connecter
                                        </div>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-8 text-center">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500">Pas encore de compte ?</span>
                                    </div>
                                </div>

                                <Link to="/signup">
                                    <Button
                                        variant="outline"
                                        className="w-full mt-6 h-12 border-2 border-[#1458B8] text-[#1458B8] hover:bg-blue-50 font-semibold transition-all group"
                                    >
                                        Créer un compte employé
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="mt-8 p-4 msa-gradient-soft rounded-xl border border-blue-100">
                                <p className="text-xs text-gray-600 text-center">
                                    <span className="font-semibold">Démo Admin :</span> admin@presencex.com
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
