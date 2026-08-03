import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }) {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-600",
        green: "bg-green-500/10 text-green-600",
        orange: "bg-orange-500/10 text-orange-600",
        red: "bg-red-500/10 text-red-600",
        purple: "bg-purple-500/10 text-purple-600"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="border-0 shadow-lg shadow-gray-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                            <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                            {subtitle && (
                                <p className="text-xs text-gray-400">{subtitle}</p>
                            )}
                            {trend && (
                                <div className="flex items-center gap-1 mt-2">
                                    <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                        {trend.isPositive ? '↑' : '↓'} {trend.value}
                                    </span>
                                    <span className="text-xs text-gray-400">{trend.label}</span>
                                </div>
                            )}
                        </div>
                        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
