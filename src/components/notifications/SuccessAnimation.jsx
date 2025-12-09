import React, { useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";

export default function SuccessAnimation({ show, message, onComplete }) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        className="bg-white rounded-3xl p-12 shadow-2xl max-w-md mx-4"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="relative mb-6"
                        >
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                                <CheckCircle className="w-12 h-12 text-white" strokeWidth={3} />
                            </div>

                            {/* Sparkles animation */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        opacity: [0, 1, 0],
                                        x: Math.cos((i * Math.PI) / 3) * 60,
                                        y: Math.sin((i * Math.PI) / 3) * 60,
                                    }}
                                    transition={{
                                        delay: 0.3 + i * 0.1,
                                        duration: 1,
                                        ease: "easeOut"
                                    }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                >
                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-center"
                        >
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">
                                Succès !
                            </h2>
                            <p className="text-lg text-gray-600 whitespace-pre-line">
                                {message}
                            </p>
                        </motion.div>

                        {/* Confetti effect */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, x: Math.random() * 400, opacity: 1 }}
                                    animate={{
                                        y: 600,
                                        rotate: Math.random() * 360,
                                        opacity: 0
                                    }}
                                    transition={{
                                        delay: 0.2 + Math.random() * 0.5,
                                        duration: 2 + Math.random(),
                                        ease: "linear"
                                    }}
                                    className="absolute w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)]
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
