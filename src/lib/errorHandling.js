export const handleApiError = (error, fallbackMessage = 'Une erreur est survenue') => {
    const message = error?.message || fallbackMessage;
    console.error(message);
    return message;
};
