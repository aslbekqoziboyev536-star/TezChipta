import { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { auth } from '../../../firebase';
import { AnalyticsData } from '../types';

export function useAIAnalysis(data: AnalyticsData) {
  const { language } = useLanguage();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    // PRO FIX: Only run when we have actual data
    if (data.users.length === 0 && data.bookings.length === 0) return;

    const fetchAnalysis = async () => {
      // PRO FIX: Cache check
      const cacheKey = `ai_analysis_${new Date().toISOString().split('T')[0]}_${language}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setAiAnalysis(cached);
        return;
      }

      setAiLoading(true);
      setAiError(false);

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("No auth token");

        const response = await fetch('/api/admin/ai-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            usersCount: data.users.length,
            bookingsCount: data.bookings.length,
            ridesCount: data.rides.length,
            language
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || "Failed to generate analysis");
        }

        const analysisText = result.analysis || 'Tahlil mavjud emas.';
        setAiAnalysis(analysisText);
        
        // Cache the result for today
        localStorage.setItem(cacheKey, analysisText);
      } catch (error) {
        console.error("AI Analysis error:", error);
        setAiError(true);
      } finally {
        setAiLoading(false);
      }
    };

    fetchAnalysis();
  }, [data, language]);

  return { aiAnalysis, aiLoading, aiError };
}
