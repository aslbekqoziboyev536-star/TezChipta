import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, Home, Calendar, Download, ShieldCheck } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { useAnalytics } from '../hooks/useAnalytics';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useAnalytics('success');
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTicket = async () => {
    if (!bookingId) return;
    setDownloading(true);
    try {
      const response = await fetch('/api/generate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });

      if (!response.ok) throw new Error("Error downloading ticket");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TezChipta_${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Ticket downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred while downloading the ticket");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Payment session ID not found.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setBookingId(data.bookingId);
        } else {
          setError(data.error || "An error occurred while verifying payment.");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("An error occurred while connecting to the server.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return <LoadingScreen message="Verifying payment..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] rounded-3xl p-8 shadow-xl text-center border border-gray-200 dark:border-white/5">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-red-500 rotate-45" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">An error occurred</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{error}</p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            Return to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-white dark:bg-[#111827] rounded-3xl p-8 sm:p-12 shadow-2xl text-center border border-gray-200 dark:border-white/5 relative overflow-hidden"
      >
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">To'lov muvaffaqiyatli!</h1>
          
          <div className="flex justify-center mb-6">
            <span className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-sm font-bold rounded-full uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Tasdiqlangan
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg">
            Tabriklaymiz! Chiptangiz muvaffaqiyatli band qilindi va to'lov tasdiqlandi.
          </p>

          <div className="space-y-4">
            <Button 
              onClick={handleDownloadTicket} 
              loading={downloading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white"
              leftIcon={<Download className="w-5 h-5" />}
            >
              Chiptani yuklab olish
            </Button>

            <Button 
              onClick={() => navigate('/profile')} 
              variant="secondary"
              className="w-full py-4"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Chiptalarimni ko'rish
            </Button>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="secondary"
                onClick={() => navigate('/')} 
                className="py-4"
                leftIcon={<Home className="w-5 h-5" />}
              >
                Asosiy
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/blog')} 
                className="py-4"
                leftIcon={<Calendar className="w-5 h-5" />}
              >
                Blog
              </Button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sizga chipta ma'lumotlari ko'rsatilgan xabar yuborildi. 
              Savollar bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
