import React, { useState, useRef, useEffect } from 'react';
import { supabaseClient } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, Sparkles } from "lucide-react";
import ChatMessage from "../components/chat/ChatMessage";

export default function Reports() {
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        initConversation();
    }, []);

    const initConversation = async () => {
        try {
            const conv = await supabaseClient.agents.createConversation({
                agent_name: 'attendance_analyst',
                metadata: {
                    name: 'Analyse de Présence',
                    description: 'Session d\'analyse des données de présence'
                }
            });
            setCurrentConversation(conv);
            setMessages(conv.messages || []);

            const unsubscribe = supabaseClient.agents.subscribeToConversation(conv.id, (data) => {
                setMessages(data.messages);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error initializing conversation:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentConversation || isLoading) return;

        setIsLoading(true);
        const userMessage = inputMessage;
        setInputMessage('');

        try {
            await supabaseClient.agents.addMessage(currentConversation, {
                role: 'user',
                content: userMessage
            });
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const suggestedQuestions = [
        "Montre-moi les employés en retard cette semaine",
        "Quel est le taux de présence global ?",
        "Qui a le plus d'absences ?",
        "Combien d'heures ont été travaillées ce mois-ci ?"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Rapports IA</h1>
                            <p className="text-gray-500">Posez vos questions sur les données de présence</p>
                        </div>
                    </div>
                </div>

                <Card className="border-0 shadow-2xl mb-6">
                    <CardContent className="p-0">
                        <div
                            className="h-[500px] overflow-y-auto p-6 space-y-4"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.2) 1px, transparent 0)',
                                backgroundSize: '20px 20px'
                            }}
                        >
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full space-y-6">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <Sparkles className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                            Assistant RH Intelligent
                                        </h3>
                                        <p className="text-gray-500 max-w-md">
                                            Posez n'importe quelle question sur les présences, retards, absences ou statistiques.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                                        {suggestedQuestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInputMessage(q)}
                                                className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-sm"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <ChatMessage key={idx} message={msg} />
                            ))}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t p-4 bg-white">
                            <div className="flex gap-3">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Posez votre question..."
                                    className="flex-1 py-6 text-base"
                                    disabled={isLoading || !currentConversation}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputMessage.trim() || !currentConversation}
                                    className="px-6 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
