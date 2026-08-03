import { supabaseClient } from '@/api/supabaseClient';
import { logError } from '@/lib/logger';

export const createReportConversation = async () => {
    try {
        return await supabaseClient.agents.createConversation({
            agent_name: 'attendance_analyst',
            metadata: {
                name: 'Analyse de Présence',
                description: 'Session d’analyse des données de présence'
            }
        });
    } catch (error) {
        logError(error, 'reports.createReportConversation');
        throw error;
    }
};

export const sendReportMessage = async (conversation, message) => {
    try {
        return await supabaseClient.agents.addMessage(conversation, {
            role: 'user',
            content: message
        });
    } catch (error) {
        logError(error, 'reports.sendReportMessage');
        throw error;
    }
};
