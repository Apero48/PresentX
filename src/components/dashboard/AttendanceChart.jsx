import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AttendanceChart({ data }) {
    return (
        <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Présences - 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Legend />
                        <Bar dataKey="present" fill="#10B981" name="Présents" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="late" fill="#F59E0B" name="Retards" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="absent" fill="#EF4444" name="Absents" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
