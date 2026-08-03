import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

export function StatePanel({
    type = 'empty',
    title,
    description,
    icon: Icon,
    action,
    className = ''
}) {
    const resolvedIcon = Icon || (type === 'error' ? AlertTriangle : type === 'loading' ? Loader2 : Inbox);

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white/80 p-8 text-center shadow-sm ${className}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                {type === 'loading' ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    React.createElement(resolvedIcon, { className: 'h-6 w-6' })
                )}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
            {action && <div className="mt-6 flex justify-center">{action}</div>}
        </div>
    );
}
