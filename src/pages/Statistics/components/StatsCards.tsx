import React, { useMemo } from 'react';
import { Ticket, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { AnalyticsData } from '../types';

interface StatsCardsProps {
  data: AnalyticsData;
}

export function StatsCards({ data }: StatsCardsProps) {
  const { t } = useLanguage();

  const mostPurchasedTicket = useMemo(() => {
    if (!data.bookings || data.bookings.length === 0) return t('stats.no_data');
    const counts: { [key: string]: number } = {};
    data.bookings.forEach(b => {
      counts[b.rideId] = (counts[b.rideId] || 0) + 1;
    });
    const topRideId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const topRide = data.rides.find(r => r.id === topRideId);
    return topRide ? `${topRide.from} - ${topRide.to}` : t('stats.no_data');
  }, [data.bookings, data.rides, t]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
          <Ticket className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{t('stats.top_ticket')}</p>
          <h3 className="text-lg font-bold">{mostPurchasedTicket}</h3>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4 hover:border-amber-500/30 transition-colors">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{t('stats.active_time')}</p>
          <h3 className="text-lg font-bold">{t('stats.no_data')}</h3>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4 hover:border-purple-500/30 transition-colors">
        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
          <MapPin className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{t('stats.top_location')}</p>
          <h3 className="text-lg font-bold">{t('stats.no_data')}</h3>
        </div>
      </div>
    </div>
  );
}
