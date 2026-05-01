import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { 
  Users, TrendingUp, CreditCard, Activity, 
  AlertCircle, Clock, Globe, MousePointer2,
  ChevronRight, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface Metrics {
  onlineUsers: number;
  todaySales: number;
  todayRevenue: number;
  avgResponseTime: number;
  endpointStats: Record<string, { count: number, totalTime: number }>;
  errors: { timestamp: string, message: string, endpoint?: string }[];
  conversions: {
    home: number;
    search: number;
    booking: number;
    success: number;
  };
}

export const AdminAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? 'http://localhost:5174' : '/';
    socketRef.current = io(socketUrl);

    socketRef.current.on('admin_metrics_update', (data: Metrics) => {
      setMetrics(data);
      // Keep a small history for the chart
      setHistoryData(prev => {
        const newData = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          users: data.onlineUsers,
          responseTime: Math.round(data.avgResponseTime)
        }];
        return newData.slice(-20); // Keep last 20 data points
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Calculate funnel data
  const funnelData = [
    { name: 'Home', value: metrics.conversions.home || 0 },
    { name: 'Search', value: metrics.conversions.search || 0 },
    { name: 'Booking', value: metrics.conversions.booking || 0 },
    { name: 'Success', value: metrics.conversions.success || 0 },
  ];

  const maxFunnelValue = Math.max(1, funnelData[0].value);

  // Calculate endpoint data
  const endpointData = Object.entries(metrics.endpointStats)
    .map(([path, stats]) => ({
      path,
      avgTime: Math.round(stats.totalTime / stats.count),
      count: stats.count
    }))
    .sort((a, b) => b.avgTime - a.avgTime);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Real-time Overview (Top Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Online Users" 
          value={metrics.onlineUsers} 
          icon={<Users className="w-6 h-6" />}
          color="blue"
          trend="Live"
        />
        <MetricCard 
          title="Bugungi sotuvlar" 
          value={metrics.todaySales} 
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
          trend="Today"
        />
        <MetricCard 
          title="Bugungi tushum" 
          value={`${metrics.todayRevenue.toLocaleString()} so'm`} 
          icon={<CreditCard className="w-6 h-6" />}
          color="amber"
          trend="Today"
        />
        <MetricCard 
          title="Avg Latency" 
          value={`${Math.round(metrics.avgResponseTime)}ms`} 
          icon={<Clock className="w-6 h-6" />}
          color={metrics.avgResponseTime > 500 ? 'red' : 'emerald'}
          trend="Real-time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Traffic + Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Real-time Performance
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-blue-500 font-bold"><div className="w-2 h-2 rounded-full bg-blue-500" /> Users</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Latency (ms)</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                <Area type="monotone" dataKey="responseTime" stroke="#10b981" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Conversion Funnel */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MousePointer2 className="w-5 h-5 text-purple-500" />
            Conversion Funnel
          </h3>
          <div className="space-y-4">
            {funnelData.map((item, index) => {
              const percentage = Math.round((item.value / maxFunnelValue) * 100);
              return (
                <div key={item.name} className="relative">
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{item.name}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{item.value} <span className="text-[10px] opacity-50">({percentage}%)</span></span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-indigo-500' : 
                        index === 2 ? 'bg-purple-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="flex justify-center -my-1 opacity-20">
                      <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 5. Errors & System Health */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Recent System Errors
            </h3>
            {metrics.errors.length > 0 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black rounded-lg animate-pulse uppercase tracking-widest">
                Action Required
              </span>
            )}
          </div>
          <div className="space-y-3">
            {metrics.errors.length > 0 ? metrics.errors.slice(0, 8).map((err, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 transition-all hover:bg-red-100/50 dark:hover:bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{err.message}</div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                    <span className="font-mono bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase">{err.endpoint}</span>
                    <span>•</span>
                    <span>{new Date(err.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white">System Healthy</p>
                <p className="text-xs">All services are running normally.</p>
              </div>
            )}
          </div>
        </div>

        {/* 6. Performance Deep Dive */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Latency by Endpoint
          </h3>
          <div className="space-y-4">
            {endpointData.length > 0 ? endpointData.slice(0, 6).map((item) => (
              <div key={item.path} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-amber-500/20 transition-all">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">{item.path}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{item.count} total requests</div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-sm font-black tracking-tight ${item.avgTime > 1000 ? 'text-red-500' : item.avgTime > 300 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {item.avgTime}ms
                  </div>
                  <div className="h-1.5 w-24 bg-gray-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${item.avgTime > 1000 ? 'bg-red-500' : item.avgTime > 300 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, item.avgTime / 10)}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-gray-500 text-sm italic">Waiting for traffic data...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'red';
  trend: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/10',
    red: 'bg-red-500/10 text-red-500 border-red-500/10',
  };

  return (
    <div className={`bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border ${colorClasses[color]} transition-all hover:shadow-xl hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]} border shadow-inner`}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              color === 'red' ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{trend}</span>
          </div>
        </div>
      </div>
      <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold uppercase tracking-wide opacity-60">
        {title}
      </div>
    </div>
  );
};
