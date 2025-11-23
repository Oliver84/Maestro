import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'action';
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const duration = toast.duration || 3000;
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(toast.id), 200);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 200);
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle size={16} className="text-emerald-400" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-400" />;
            case 'action':
                return <Zap size={16} className="text-amber-400" />;
            default:
                return <Info size={16} className="text-blue-400" />;
        }
    };

    const getStyles = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100';
            case 'error':
                return 'bg-red-950/90 border-red-500/30 text-red-100';
            case 'action':
                return 'bg-amber-950/90 border-amber-500/30 text-amber-100';
            default:
                return 'bg-blue-950/90 border-blue-500/30 text-blue-100';
        }
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg transition-all duration-200 ${getStyles()} ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
                }`}
        >
            {getIcon()}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
                onClick={handleDismiss}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({
    toasts,
    onDismiss
}) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    );
};
