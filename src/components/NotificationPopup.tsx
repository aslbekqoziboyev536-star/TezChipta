import React from 'react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Bell } from 'lucide-react';

interface NotificationPopupProps {
    notification: {
        id: string;
        title: string;
        message: string;
    } | null;
    onClose: () => void;
}

export function NotificationPopup({ notification, onClose }: NotificationPopupProps) {
    if (!notification) return null;

    return (
        <Modal
            isOpen={!!notification}
            onClose={onClose}
            title={notification.title}
        >
            <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-emerald-500">
                    <Bell className="w-8 h-8 animate-bounce" />
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    {notification.message}
                </p>

                <Button
                    onClick={onClose}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
                >
                    Tushunarli
                </Button>
            </div>
        </Modal>
    );
}
