import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center msa-gradient-soft p-6">
                    <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <h2 className="mt-4 text-xl font-semibold text-gray-900">Une erreur inattendue est survenue</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            La page a rencontré un problème. Vous pouvez réessayer ou recharger l’application.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="mt-6 inline-flex items-center justify-center rounded-xl msa-gradient px-4 py-2 text-sm font-medium text-white shadow-md"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Réessayer
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
