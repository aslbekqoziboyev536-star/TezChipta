import React, { useMemo } from 'react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../../../context/LanguageContext';
import { AnalyticsData } from '../types';

interface ChartProps {
  data: AnalyticsData;
}

export function Chart({ data }: ChartProps) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    if (!data.users || data.users.length === 0) return [];
    
    // Group users by registration date
    const groups: { [key: string]: number } = {};
    data.users.forEach(u => {
      const date = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + 1;
    });

    const sortedDates = Object.keys(groups).sort();
    let cumulative = 0;
    return sortedDates.map(date => {
      cumulative += groups[date];
      return { date, count: cumulative };
    });
  }, [data.users]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-white/5 p-8 rounded-2xl">
      <h2 className="text-lg font-bold mb-8">{t('stats.growth_chart')}</h2>
      
      <div className="w-full h-[400px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#4b5563" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#4b5563" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff'
              }}
              itemStyle={{ color: '#10b981' }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCount)" 
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#111827' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
