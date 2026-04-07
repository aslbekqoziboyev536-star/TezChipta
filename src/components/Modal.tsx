import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-2xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors border-0 h-auto"
                leftIcon={<X className="w-5 h-5" />}
              />
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
