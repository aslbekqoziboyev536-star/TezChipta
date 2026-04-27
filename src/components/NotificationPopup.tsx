import React from 'react';
import { X } from 'lucide-react';

interface NotificationPopupProps {
    notification: any;
    onClose: () => void;
}

export function NotificationPopup({ notification, onClose }: NotificationPopupProps) {
    if (!notification) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full transform transition-all duration-300 translate-y-0 opacity-100">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {notification.title || 'Yangi xabarnoma'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {notification.message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                    aria-label="Yopish"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
