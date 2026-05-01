import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Download } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Button } from '../../components/ui/Button';

// Hooks
import { useAnalytics } from './hooks/useAnalytics';
import { useAIAnalysis } from './hooks/useAIAnalysis';

// Components
import { StatsCards } from './components/StatsCards';
import { AIBox } from './components/AIBox';
import { Chart } from './components/Chart';
import { EmptyState } from './components/EmptyState';
import { exportToCSV } from './utils/export';

export default function StatisticsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // PRO FIX: Extracted logic to custom hooks
  const { data, loading, authLoading } = useAnalytics();
  const { aiAnalysis, aiLoading, aiError } = useAIAnalysis(data);

  if (loading || authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate('/administrator/dashboard')}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors border-0 h-auto"
            leftIcon={<ArrowLeft className="w-6 h-6 text-emerald-500" />}
          />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">{t('stats.title')}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="hidden sm:flex items-center gap-2 border-white/10 hover:bg-white/5 h-auto py-2"
            onClick={() => exportToCSV(data)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Excel
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* PRO FIX: Empty State Handling */}
      {data.users.length === 0 && data.bookings.length === 0 ? (
        <EmptyState message={t('stats.no_data')} />
      ) : (
        <>
          <StatsCards data={data} />
          <AIBox aiLoading={aiLoading} aiError={aiError} aiAnalysis={aiAnalysis} />
          <Chart data={data} />
        </>
      )}
    </div>
  );
}
