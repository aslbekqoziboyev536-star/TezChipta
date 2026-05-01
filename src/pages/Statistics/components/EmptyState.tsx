import React from 'react';
import { Database } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function EmptyState({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        <Database className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-200 mb-2">
        {message || t('stats.no_data') || "Ma'lumot topilmadi"}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Hozircha tahlil qilish uchun yetarli ma'lumot yo'q. Dasturdan foydalanuvchilar soni ortgach statistika shu yerda paydo bo'ladi.
      </p>
    </div>
  );
}
