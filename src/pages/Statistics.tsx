import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Ticket, 
  Clock, 
  MapPin, 
  Sparkles, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from '../components/ui/Button';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

export default function Statistics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    users: any[];
    bookings: any[];
    rides: any[];
  }>({
    users: [],
    bookings: [],
    rides: []
  });
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      if (!auth.currentUser) {
        console.warn("fetchData called but auth.currentUser is null. Waiting...");
        return;
      }
      console.log("Fetching Statistics data. Current user:", auth.currentUser?.uid, "Email:", auth.currentUser?.email);
      try {
        const [usersSnap, bookingsSnap, ridesSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'rides'))
        ]);

        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const rides = ridesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setData({ users, bookings, rides });
        generateAIAnalysis(users, bookings, rides);
      } catch (error) {
        console.error("Error fetching statistics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, navigate]);

  const generateAIAnalysis = async (users: any[], bookings: any[], rides: any[]) => {
    setAiLoading(true);
    setAiError(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const statsSummary = `
        Platform Statistics:
        - Total Users: ${users.length}
        - Total Bookings: ${bookings.length}
        - Total Rides: ${rides.length}
        - User growth: ${users.length} users registered.
        
        Please provide a short, professional analysis in Uzbek about these statistics. 
        Focus on growth and potential improvements. Keep it concise (2-3 sentences).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: statsSummary,
      });

      setAiAnalysis(response.text || 'Tahlil mavjud emas.');
    } catch (error) {
      console.error("AI Analysis error:", error);
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = useMemo(() => {
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

  const mostPurchasedTicket = useMemo(() => {
    if (data.bookings.length === 0) return "Hali sotuv yo'q";
    const counts: { [key: string]: number } = {};
    data.bookings.forEach(b => {
      counts[b.rideId] = (counts[b.rideId] || 0) + 1;
    });
    const topRideId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const topRide = data.rides.find(r => r.id === topRideId);
    return topRide ? `${topRide.from} - ${topRide.to}` : "Hali sotuv yo'q";
  }, [data.bookings, data.rides]);

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
            <h1 className="text-xl font-bold tracking-tight">Platforma Statistikasi</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Eng ko'p sotib olingan chipta</p>
            <h3 className="text-lg font-bold">{mostPurchasedTicket}</h3>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Eng ko'p faol bo'lingan vaqt</p>
            <h3 className="text-lg font-bold">Hali ma'lumot yo'q</h3>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Eng ko'p kirilgan joylashuv</p>
            <h3 className="text-lg font-bold">Hali ma'lumot yo'q</h3>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-[#111827]/50 border border-emerald-500/10 p-6 rounded-2xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">
            Foydalanuvchilar statistikasi AI tahlili
          </h2>
        </div>
        
        <div className="min-h-[60px] flex items-center">
          {aiLoading ? (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">AI tahlil tayyorlanmoqda...</p>
            </div>
          ) : aiError ? (
            <div className="text-gray-400 text-sm">
              AI analizni yuklashda xatolik yuz berdi.
            </div>
          ) : (
            <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#111827] border border-white/5 p-8 rounded-2xl">
        <h2 className="text-lg font-bold mb-8">Foydalanuvchilar o'sish dinamikasi</h2>
        
        <div className="h-[400px] w-full">
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
    </div>
  );
}
