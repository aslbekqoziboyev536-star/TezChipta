import React from 'react';
import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../../../context/LanguageContext';

interface AIBoxProps {
  aiLoading: boolean;
  aiError: boolean;
  aiAnalysis: string;
}

export function AIBox({ aiLoading, aiError, aiAnalysis }: AIBoxProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[#111827]/50 border border-emerald-500/10 p-6 rounded-2xl mb-8 transition-colors hover:border-emerald-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">
          {t('stats.ai_analysis_title')}
        </h2>
      </div>
      
      <div className="min-h-[60px] flex items-center">
        {aiLoading ? (
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{t('stats.ai_loading')}</p>
          </div>
        ) : aiError ? (
          <div className="text-gray-400 text-sm">
            {t('stats.ai_error')}
          </div>
        ) : (
          <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
