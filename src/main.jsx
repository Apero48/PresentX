import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary.jsx'

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=3').catch((error) => {
            console.warn('Service worker indisponible:', error)
        })
    })
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <BrowserRouter>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
                        <App />
                    </Suspense>
                    <Toaster position="top-right" richColors />
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    </React.StrictMode>,
)
