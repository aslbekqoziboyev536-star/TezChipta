import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from './ui/Button';

interface NewsletterSubscriptionProps {
  variant?: 'default' | 'compact' | 'modal';
  onSuccess?: () => void;
  showMessage?: boolean;
}

const NewsletterSubscription: React.FC<NewsletterSubscriptionProps> = ({
  variant = 'default',
  onSuccess,
  showMessage = true
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage("To'g'ri email manzilini kiriting");
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || "Muvaffaqiyatli obuna qildingiz!");
        setEmail('');
        onSuccess?.();
        
        // Reset after 3 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring");
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setMessage('Obunalashda xatolik yuz berdi');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubscribe} className="flex gap-2">
          <input
            type="email"
            placeholder="Emailingizni kiriting"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={status === 'loading' || !email}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'loading' ? <Loader size={18} className="animate-spin" /> : <Mail size={18} />}
          </Button>
        </form>
        {showMessage && status !== 'idle' && (
          <div className={`mt-2 text-sm p-2 rounded ${
            status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
          }`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold dark:text-white">Newsletter</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Eng so'nggi yangilandilar va takliflar uchun obuna qiling
        </p>
        <form onSubmit={handleSubscribe} className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={status === 'loading' || !email}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader size={18} className="animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Mail size={18} />
                Obuna qil
              </>
            )}
          </Button>
          {showMessage && message && (
            <div className={`p-3 rounded flex items-start gap-2 ${
              status === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={18} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
              )}
              <p className={status === 'success' ? 'text-green-700 dark:text-green-100' : 'text-red-700 dark:text-red-100'}>
                {message}
              </p>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-xl border border-blue-200 dark:border-gray-700">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Mail className="text-white" size={24} />
          </div>
          <h3 className="text-xl font-bold dark:text-white">Newsletter</h3>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Bizdagi eng so'nggi yangilandilar, takliflar va eksklyuziv informasiya uchun obuna qiling.
        </p>

        <form onSubmit={handleSubscribe} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Emailingizni kiriting"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <Button
              type="submit"
              disabled={status === 'loading' || !email}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
            >
              {status === 'loading' ? <Loader size={18} className="animate-spin" /> : <Mail size={18} />}
              {status === 'loading' ? 'Yuborilmoqda' : 'Obuna'}
            </Button>
          </div>

          {showMessage && message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              status === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              )}
              <p className={status === 'success' ? 'text-green-700 dark:text-green-100' : 'text-red-700 dark:text-red-100'}>
                {message}
              </p>
            </div>
          )}
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Biz sizning ma'lumotlaringizni obunan chiqishuna qadar saqlaimiz.
        </p>
      </div>
    </div>
  );
};

export default NewsletterSubscription;
