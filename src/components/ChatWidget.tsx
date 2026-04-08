import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, ShieldCheck, Loader2, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, getDocs, limit, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from './ui/Button';

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Admin specific states
  const [isAdminView, setIsAdminView] = useState(false);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    if (user?.role === 'admin') {
      setIsAdminView(true);
    } else {
      setIsAdminView(false);
      setView('chat');
    }
  }, [user]);

  // Regular user chat listener
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('userId', '==', user.id), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const chatData = snapshot.docs[0].data();
        setChatId(snapshot.docs[0].id);
        setUnreadCount(chatData.userUnreadCount || 0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Admin all chats listener
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(chat => chat.userId !== user?.id);
      setAllChats(chatsData);

      const totalUnread = chatsData.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user]);

  // Messages listener (both user and admin)
  const activeChatId = isAdminView ? selectedAdminChatId : chatId;

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Reset unread count if open
      if (isOpen && (view === 'chat' || !isAdminView)) {
        const chatRef = doc(db, 'chats', activeChatId);
        if (isAdminView) {
          updateDoc(chatRef, { unreadCount: 0 });
        } else {
          updateDoc(chatRef, { userUnreadCount: 0 });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [activeChatId, isOpen, view, isAdminView]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText.trim();
    const targetChatId = isAdminView ? selectedAdminChatId : chatId;
    setInputText('');

    try {
      let currentChatId = targetChatId;

      if (!currentChatId && !isAdminView) {
        const chatsRef = collection(db, 'chats');
        const newChat = {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          lastMessage: text,
          lastMessageAt: new Date().toISOString(),
          unreadCount: 1,
          userUnreadCount: 0,
          status: 'active'
        };
        const docRef = await addDoc(chatsRef, newChat);
        currentChatId = docRef.id;
        setChatId(currentChatId);
      }

      if (!currentChatId) return;

      const messageData = {
        chatId: currentChatId,
        senderId: user.id,
        text,
        createdAt: new Date().toISOString(),
        isAdmin: isAdminView
      };

      await addDoc(collection(db, 'chats', currentChatId, 'messages'), messageData);

      // Update chat metadata
      const updateData: any = {
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
      };

      if (isAdminView) {
        updateData.userUnreadCount = increment(1);
      } else {
        updateData.unreadCount = increment(1);
      }

      await updateDoc(doc(db, 'chats', currentChatId), updateData);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] h-[550px] bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-500 p-4 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                {isAdminView && view === 'chat' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView('list')}
                    className="p-1 hover:bg-white/10 rounded-lg border-0 h-auto"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </Button>
                )}
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {isAdminView ? (view === 'list' ? "Chatlar ro'yxati" : "Suhbat") : "Qo'llab-quvvatlash"}
                  </h3>
                  <p className="text-[10px] opacity-80">
                    {isAdminView ? "Mijozlar bilan aloqa" : "Biz sizga yordam berishga tayyormiz"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors border-0 h-auto"
              >
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-[#0B1120]/50">
              {isAdminView && view === 'list' ? (
                /* Admin: Chat List */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#111827]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Mijozni qidirish..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                    {allChats
                      .filter(chat =>
                        (chat.userName || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                        (chat.userEmail || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
                      )
                      .map(chat => (
                        <button
                          key={chat.id}
                          onClick={() => {
                            setSelectedAdminChatId(chat.id);
                            setView('chat');
                          }}
                          className="w-full p-4 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm">
                            {(chat.userName || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{chat.userName || 'Foydalanuvchi'}</h4>
                              <span className="text-[9px] text-gray-400 whitespace-nowrap">
                                {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {chat.unreadCount}
                            </div>
                          )}
                        </button>
                      ))}
                    {allChats.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Hozircha suhbatlar mavjud emas.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Common: Messages View */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-10">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {isAdminView ? "Suhbat hali boshlanmagan" : "Sizning suhbatingiz shu yerda boshlanadi"}
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex flex-col max-w-[85%]">
                              {msg.isAdmin && !isMe && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 ml-1 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                              <div className={`p-3 rounded-2xl text-xs shadow-sm ${isMe
                                ? 'bg-emerald-500 text-white rounded-tr-none'
                                : 'bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 rounded-tl-none'
                                }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                <div className={`text-[9px] mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-white/5 flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Xabaringizni yozing..."
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                    />
                    <Button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-10 h-10 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 p-0 border-0 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center relative hover:bg-emerald-600 transition-colors p-0 border-0"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B1120] px-1">
            {unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};
