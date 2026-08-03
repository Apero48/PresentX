export const logError = (error, context = 'app') => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${context}]`, message);
};

export const logInfo = (message, context = 'app') => {
    console.info(`[${context}]`, message);
};
