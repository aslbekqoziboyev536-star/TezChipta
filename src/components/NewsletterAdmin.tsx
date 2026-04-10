import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, History, AlertCircle, CheckCircle, Loader, Copy } from 'lucide-react';
import { Button } from './ui/Button';

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  status: string;
}

interface Newsletter {
  id: string;
  subject: string;
  message: string;
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  status: string;
}

interface NewsletterAdminProps {
  idToken: string;
}

const NewsletterAdmin: React.FC<NewsletterAdminProps> = ({ idToken }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'subscribers' | 'history'>('send');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/subscribers', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
      } else {
        setResponseMessage('Obunachilarni yuklashda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      setResponseMessage('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const fetchNewsletterHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/history', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNewsletters(data.newsletters || []);
      } else {
        setResponseMessage('Newsletter tarixini yuklashda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setResponseMessage('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !message) {
      setStatus('error');
      setResponseMessage('Sarlavha va xabar talab qilinadi');
      return;
    }

    setStatus('loading');
    setResponseMessage('');

    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subject,
          message,
          htmlContent: htmlContent || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setResponseMessage(data.message || "Newsletter muvaffaqiyatli jo'natildi!");
        setSubject('');
        setMessage('');
        setHtmlContent('');
        
        // Refresh subscribers list
        await fetchNewsletterHistory();
        
        setTimeout(() => {
          setStatus('idle');
          setResponseMessage('');
        }, 3000);
      } else {
        setStatus('error');
        setResponseMessage(data.error || 'Newsletter jo\'natishda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Error sending newsletter:', error);
      setStatus('error');
      setResponseMessage('Xatolik yuz berdi');
    }
  };

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    } else if (activeTab === 'history') {
      fetchNewsletterHistory();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center gap-2 justify-center transition-colors ${
              activeTab === 'send'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Send size={20} />
            Newsletter Jo'nat
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center gap-2 justify-center transition-colors ${
              activeTab === 'subscribers'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Users size={20} />
            Obunachilar ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center gap-2 justify-center transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <History size={20} />
            Tarix
          </button>
        </div>

        <div className="p-6">
          {/* Send Newsletter Tab */}
          {activeTab === 'send' && (
            <form onSubmit={handleSendNewsletter} className="space-y-4 max-w-2xl">
              <h3 className="text-xl font-bold dark:text-white mb-6">Newsletter Jo'nat</h3>
              
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                  Sarlavha (Subject)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Newsletter sarlavhasini kiriting"
                  disabled={status === 'loading'}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                  Xabar
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Newsletter xabarini kiriting"
                  disabled={status === 'loading'}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                  HTML Tarkibi (ixtiyoriy)
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Ixtiyoriy HTML tarkibi"
                  disabled={status === 'loading'}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 dark:text-white font-mono text-sm"
                />
              </div>

              {responseMessage && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  status === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                    : status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                    : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                }`}>
                  {status === 'success' ? (
                    <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  ) : status === 'error' ? (
                    <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  ) : (
                    <Loader className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" size={20} />
                  )}
                  <p className={
                    status === 'success' 
                      ? 'text-green-700 dark:text-green-100' 
                      : status === 'error'
                      ? 'text-red-700 dark:text-red-100'
                      : 'text-blue-700 dark:text-blue-100'
                  }>
                    {responseMessage}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={status === 'loading' || !subject || !message}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Jo'natilmoqda...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Newsletter Jo'nat
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Subscribers Tab */}
          {activeTab === 'subscribers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">Obunachilar ({subscribers.length})</h3>
                <Button
                  onClick={fetchSubscribers}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader size={18} className="animate-spin" /> : 'Yangilash'}
                </Button>
              </div>

              {loading && !subscribers.length ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin dark:text-white" size={24} />
                </div>
              ) : subscribers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Hali obunachilar yo'q
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Obuna qilgan sana</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {subscribers.map((subscriber) => (
                        <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm dark:text-gray-300">
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm break-all">{subscriber.email}</code>
                          </td>
                          <td className="px-4 py-3 text-sm dark:text-gray-400">
                            {new Date(subscriber.subscribedAt).toLocaleDateString('uz-UZ')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              subscriber.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            }`}>
                              {subscriber.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(subscriber.email);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              title="Emailni nusxalash"
                            >
                              <Copy size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">Newsletter Tarix</h3>
                <Button
                  onClick={fetchNewsletterHistory}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader size={18} className="animate-spin" /> : 'Yangilash'}
                </Button>
              </div>

              {loading && !newsletters.length ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin dark:text-white" size={24} />
                </div>
              ) : newsletters.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Hali newsletter jo'natilmagan
                </div>
              ) : (
                <div className="space-y-4">
                  {newsletters.map((newsletter) => (
                    <div key={newsletter.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold dark:text-white text-lg">{newsletter.subject}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(newsletter.sentAt).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                          {newsletter.recipientCount} obunachilar
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
                        {newsletter.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Jo'natgan: {newsletter.sentBy}</span>
                        <span>Status: {newsletter.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsletterAdmin;
