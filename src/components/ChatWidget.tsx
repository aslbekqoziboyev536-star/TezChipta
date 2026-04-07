import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, ShieldCheck, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;

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

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Reset unread count if open
      if (isOpen) {
        updateDoc(doc(db, 'chats', chatId), { userUnreadCount: 0 });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chatId, isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText.trim();
    setInputText('');

    try {
      let currentChatId = chatId;

      if (!currentChatId) {
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

      const messageData = {
        chatId: currentChatId,
        senderId: user.id,
        text,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'chats', currentChatId, 'messages'), messageData);
      
      // Update chat metadata and increment unread count for admin
      await updateDoc(doc(db, 'chats', currentChatId), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
        unreadCount: increment(1)
      });
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
            className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-500 p-4 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Qo'llab-quvvatlash</h3>
                  <p className="text-[10px] opacity-80">Biz sizga yordam berishga tayyormiz</p>
                </div>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors border-0 h-auto"
                leftIcon={<X className="w-5 h-5" />}
              />
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0B1120]/50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Sizning suhbatingiz shu yerda boshlanadi</p>
                </div>
              ) : (
                messages
                  .filter(msg => msg.senderId === user.id || msg.isAdmin === true)
                  .map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col max-w-[80%]">
                      {msg.isAdmin && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 ml-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                      <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                        msg.senderId === user.id 
                          ? 'bg-emerald-500 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <div className={`text-[10px] mt-1 opacity-60 ${msg.senderId === user.id ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-white/5 flex gap-2 flex-shrink-0">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Xabaringizni yozing..."
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
              />
              <Button 
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 h-auto border-0"
                size="icon"
                leftIcon={<Send className="w-5 h-5" />}
              />
            </form>
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
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B1120]">
            {unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};
