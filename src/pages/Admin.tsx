import React, { useState, useEffect, useRef } from 'react';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from '../components/ui/Button';
import { LayoutDashboard, Bus, Users, Settings, LogOut, Plus, Edit2, Trash2, Star, HelpCircle, Database, X, Moon, Sun, MessageCircle, Mail, Search, CloudSun, CreditCard, TrendingUp, ShieldCheck, User, Copy, Clock, Menu, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, setDoc, query, orderBy, onSnapshot, increment, where, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { isValidPhone } from '../utils/validation';
import { ThemeToggle } from '../components/ThemeToggle';
import { WeatherWidget } from '../components/WeatherWidget';
import { SafeImage } from '../components/SafeImage';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import * as XLSX from 'xlsx';

export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rides' | 'drivers' | 'faqs' | 'users' | 'messages' | 'newsletter' | 'chats' | 'notifications' | 'settings' | 'reviews' | 'payments'>((tab as any) || 'dashboard');

  useEffect(() => {
    if (tab) {
      const validTabs = ['dashboard', 'rides', 'drivers', 'faqs', 'users', 'messages', 'newsletter', 'chats', 'notifications', 'settings', 'reviews', 'payments'];
      if (validTabs.includes(tab)) {
        setActiveTab(tab as any);
      } else {
        navigate('/administrator/dashboard', { replace: true });
      }
    } else {
      navigate('/administrator/dashboard', { replace: true });
    }
  }, [tab, navigate]);

  const handleTabChange = (newTab: string) => {
    navigate(`/administrator/${newTab}`);
    setIsSidebarOpen(false);
  };
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [adminCardNumber, setAdminCardNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://imagehosting-hulf.onrender.com/uploads/743d26dac03143284afd0f450db04d85.png');
  const [adminCardOwner, setAdminCardOwner] = useState('');
  const [adminSupportPhone, setAdminSupportPhone] = useState('');
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [manualEnabled, setManualEnabled] = useState(true);
  const [siteDescription, setSiteDescription] = useState("TezChipta - O'zbekiston bo'ylab avtobus qatnovlari uchun chiptalarni onlayn sotib olish tizimi. Bizning platformamiz orqali siz uyingizdan chiqmasdan turib, o'zingizga qulay vaqt va yo'nalishni tanlashingiz, chiptalarni Stripe yoki karta orqali to'lov qilib xarid qilishingiz mumkin. Xavfsiz va qulay sayohat TezChipta bilan boshlanadi!");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [newsletterSearchQuery, setNewsletterSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '', target: 'all' as 'all' | 'newcomers' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [myDriverId, setMyDriverId] = useState<string | null>(null);
  const [selectedRideForBookings, setSelectedRideForBookings] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSubmittingNotifRef = useRef(false);
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [showNewsletterForm, setShowNewsletterForm] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({ subject: '', content: '' });

  // Form states
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '' });

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ id: '', name: '', rating: 5.0, experience: 0, phone: '', photo: '', bio: '', email: '', password: '' });

  const [showRideForm, setShowRideForm] = useState(false);
  const [rideForm, setRideForm] = useState({ id: '', driverId: '', date: 'today', departureTime: '', arrivalTime: '', price: 0, busType: 'Standard', from: 'Toshkent', to: 'Samarqand', duration: '', rating: 5.0, images: [], status: 'active', totalSeats: 40, seatLayout: '2x2' });

  const [rideFilters, setRideFilters] = useState({ from: '', to: '', status: 'all', date: '' });
  const [rideSort, setRideSort] = useState<{ key: string, order: 'asc' | 'desc' }>({ key: 'departureTime', order: 'asc' });

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, collectionName: string, id: string }>({ isOpen: false, collectionName: '', id: '' });
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const DEFAULT_DRIVER_PHOTO = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  const seedData = async () => {
    setSeeding(true);
    try {
      const sampleDrivers = [
        { name: 'Sherzod Karimov', rating: 4.9, experience: 12, phone: '+998 90 123 45 67', photo: 'https://picsum.photos/seed/driver1/200/200', bio: '12 yillik tajribaga ega professional haydovchi. Toshkent-Urganch yo\'nalishida 500 dan ortiq muvaffaqiyatli qatnovlar.' },
        { name: 'Jasur Ahmedov', rating: 4.8, experience: 8, phone: '+998 91 234 56 78', photo: 'https://picsum.photos/seed/driver2/200/200', bio: 'Xavfsiz haydash bo\'yicha mutaxassis. Yo\'lovchilar qulayligi uchun barcha sharoitlarni yaratib beradi.' },
        { name: 'Rustam Ergashev', rating: 5.0, experience: 15, phone: '+998 93 345 67 89', photo: 'https://picsum.photos/seed/driver3/200/200', bio: 'Eng tajribali haydovchilarimizdan biri. Har doim o\'z vaqtida va xavfsiz manzilga yetkazadi.' }
      ];

      const sampleFaqs = [
        { question: "Chiptani qanday bekor qilish mumkin?", answer: "Profilingizdagi 'Faol chiptalar' bo'limiga kirib, kerakli chiptani tanlang va 'Bekor qilish' tugmasini bosing. Mablag'ingiz 3 ish kunida qaytariladi." },
        { question: "Bagaj qoidalari qanday?", answer: "Har bir yo'lovchi uchun 20 kg gacha bepul bagaj ruxsat etiladi. Qo'shimcha yuk uchun alohida to'lov amalga oshiriladi." },
        { question: "Haydovchi bilan qanday bog'lanish mumkin?", answer: "Chipta sotib olganingizdan so'ng, haydovchining telefon raqami profilingizdagi chipta ma'lumotlarida ko'rinadi." }
      ];

      // Add drivers first to get their IDs
      const driverIds: string[] = [];
      for (const d of sampleDrivers) {
        const docRef = await addDoc(collection(db, 'drivers'), d);
        driverIds.push(docRef.id);
      }

      // Add FAQs
      for (const f of sampleFaqs) {
        await addDoc(collection(db, 'faqs'), f);
      }

      // Add rides
      const sampleRides = [
        { driverId: driverIds[0], date: 'today', departureTime: '08:00', arrivalTime: '20:00', price: 250000, busType: 'VIP', from: 'Urganch', to: 'Toshkent', duration: '12 soat', rating: 4.9, images: ['https://picsum.photos/seed/bus1/800/600', 'https://picsum.photos/seed/bus2/800/600'], status: 'active', totalSeats: 30, seatLayout: '2x1' },
        { driverId: driverIds[1], date: 'today', departureTime: '10:00', arrivalTime: '22:00', price: 200000, busType: 'Lux', from: 'Urganch', to: 'Toshkent', duration: '12 soat', rating: 4.8, images: ['https://picsum.photos/seed/bus3/800/600'], status: 'active', totalSeats: 40, seatLayout: '2x2' },
        { driverId: driverIds[2], date: 'tomorrow', departureTime: '07:00', arrivalTime: '19:00', price: 250000, busType: 'VIP', from: 'Urganch', to: 'Toshkent', duration: '12 soat', rating: 5.0, images: ['https://picsum.photos/seed/bus4/800/600'], status: 'active', totalSeats: 30, seatLayout: '2x1' }
      ];

      for (const r of sampleRides) {
        await addDoc(collection(db, 'rides'), r);
      }

      await fetchFirestoreData();
      toast.success("Data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("An error occurred while seeding data.");
    } finally {
      setSeeding(false);
    }
  };

  const fetchFirestoreData = async () => {
    if (!auth.currentUser) {
      console.warn("fetchFirestoreData called but auth.currentUser is null. Waiting...");
      return;
    }
    console.log("Fetching Firestore data. Current user:", auth.currentUser?.uid, "Email:", auth.currentUser?.email);
    try {
      const ridesCol = collection(db, 'rides');
      const driversCol = collection(db, 'drivers');
      const faqsCol = collection(db, 'faqs');
      const usersCol = collection(db, 'users');
      const messagesCol = collection(db, 'messages');
      const bookingsCol = collection(db, 'bookings');
      const reviewsCol = collection(db, 'reviews');
      const settingsCol = collection(db, 'settings');
      const notificationsCol = collection(db, 'notifications');

      let ridesSnapshot, driversSnapshot, faqsSnapshot, usersSnapshot, messagesSnapshot, bookingsSnapshot, reviewsSnapshot, settingsSnapshot, notificationsSnapshot;
      try {
        const promises = [
          getDocs(ridesCol),
          getDocs(driversCol),
          getDocs(faqsCol),
          getDocs(bookingsCol),
          getDocs(settingsCol)
        ];

        if (user?.role === 'admin') {
          promises.push(getDocs(usersCol));
          promises.push(getDocs(messagesCol));
          promises.push(getDocs(reviewsCol));
        } else {
          // Drivers only need approved reviews, or maybe no reviews at all. Let's fetch approved reviews for them if needed, or just empty.
          promises.push(Promise.resolve({ docs: [] } as any)); // users
          promises.push(Promise.resolve({ docs: [] } as any)); // messages
          promises.push(getDocs(query(reviewsCol, where('status', '==', 'approved')))); // reviews
        }

        const results = await Promise.all(promises);
        ridesSnapshot = results[0];
        driversSnapshot = results[1];
        faqsSnapshot = results[2];
        bookingsSnapshot = results[3];
        settingsSnapshot = results[4];
        usersSnapshot = results[5];
        messagesSnapshot = results[6];
        reviewsSnapshot = results[7];

      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'multiple collections');
        return;
      }

      const ridesData = ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const faqsData = faqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const messagesData = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const reviewsData = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const paymentSettings = settingsSnapshot.docs.find(d => d.id === 'payment')?.data();
      if (paymentSettings) {
        setAdminCardNumber(paymentSettings.adminCardNumber || '');
        setAdminCardOwner(paymentSettings.adminCardOwner || '');
        setAdminSupportPhone(paymentSettings.adminSupportPhone || '');
        setStripeEnabled(paymentSettings.stripeEnabled !== false);
        setManualEnabled(paymentSettings.manualEnabled !== false);
        if (paymentSettings.siteDescription) {
          setSiteDescription(paymentSettings.siteDescription);
        }
        if (paymentSettings.logoUrl) {
          setLogoUrl(paymentSettings.logoUrl);
        }
      }

      setRides(ridesData);
      setDrivers(driversData);
      setFaqs(faqsData);
      setUsersList(usersData);
      setMessages(messagesData);
      setBookings(bookingsData);
      setReviews(reviewsData);

      if (user?.role === 'admin') {
        try {
          const newsletterSnapshot = await getDocs(
            query(collection(db, 'newsletter_subscribers'), orderBy('createdAt', 'desc'))
          );
          const newsletterData = newsletterSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setNewsletterSubscribers(newsletterData);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'newsletter_subscribers');
        }
      } else {
        setNewsletterSubscribers([]);
      }

      // If user is a driver, find their driver document ID
      if (user?.role === 'driver') {
        const myDriver = driversData.find(d => d.uid === user.id);
        if (myDriver) {
          setMyDriverId(myDriver.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data from Firestore", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin' && user.role !== 'driver') {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }

    fetchFirestoreData();
  }, [user, authLoading, navigate, activeTab]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Use a Map with a content-based key to filter out identical notifications
      // found in the last 50 entries (even if they have different IDs).
      const uniqueDocs = new Map();

      snapshot.docs.forEach(doc => {
        const d = doc.data();
        // Create a unique key based on content. We include a rounded timestamp (e.g. 1 minute) 
        // if we want to allow repeats after some time, but for now strict content dedup is safer.
        const contentKey = `${d.title}|${d.message}|${d.target}`;

        if (!uniqueDocs.has(contentKey)) {
          uniqueDocs.set(contentKey, { id: doc.id, ...d });
        }
      });

      const data = Array.from(uniqueDocs.values());
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [user?.role]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const filteredNewsletterSubscribers = newsletterSubscribers.filter((subscriber) => {
    const queryValue = newsletterSearchQuery.trim().toLowerCase();
    if (!queryValue) return true;
    const email = (subscriber.email || '').toLowerCase();
    const userId = (subscriber.userId || '').toLowerCase();
    const source = (subscriber.source || '').toLowerCase();
    return email.includes(queryValue) || userId.includes(queryValue) || source.includes(queryValue);
  });

  const handleDownloadNewsletterExcel = () => {
    if (filteredNewsletterSubscribers.length === 0) {
      toast.error("Eksport qilish uchun obunachilar topilmadi.");
      return;
    }

    const rows = filteredNewsletterSubscribers.map((subscriber: any, index: number) => ({
      '#': index + 1,
      Email: subscriber.email || '',
      'Obuna sanasi': subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleString('uz-UZ') : '',
      Manba: subscriber.source || '',
      'User ID': subscriber.userId || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Newsletter');
    const fileName = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleDelete = async (collectionName: string, id: string) => {
    setDeleteConfirm({ isOpen: true, collectionName, id });
  };

  const confirmDelete = async () => {
    const { collectionName, id } = deleteConfirm;
    setFormLoading(true);
    try {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      }
      if (collectionName === 'rides') setRides(rides.filter(r => r.id !== id));
      if (collectionName === 'drivers') setDrivers(drivers.filter(d => d.id !== id));
      if (collectionName === 'faqs') setFaqs(faqs.filter(f => f.id !== id));
      if (collectionName === 'users') setUsersList(usersList.filter(u => u.id !== id));
      if (collectionName === 'messages') setMessages(messages.filter(m => m.id !== id));
      setDeleteConfirm({ isOpen: false, collectionName: '', id: '' });
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    try {
      const { id, ...data } = faqForm;
      if (id) {
        // Update existing FAQ
        try {
          await updateDoc(doc(db, 'faqs', id), data);
          setFaqs(faqs.map(f => f.id === id ? { id, ...data } : f));
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `faqs/${id}`);
          setFormLoading(false);
          return;
        }
      } else {
        // Add new FAQ
        try {
          const docRef = await addDoc(collection(db, 'faqs'), data);
          setFaqs([...faqs, { id: docRef.id, ...data }]);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'faqs');
          setFormLoading(false);
          return;
        }
      }
      setShowFaqForm(false);
      setFaqForm({ id: '', question: '', answer: '' });
    } catch (err: any) {
      console.error("Error saving FAQ:", err);
      try {
        const parsed = JSON.parse(err.message);
        setError(`Error: ${parsed.error}`);
      } catch {
        setError(err.message || "An error occurred while saving FAQ");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditFaq = (faq: any) => {
    setFaqForm({ ...faq });
    setShowFaqForm(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // If deleting, just update state
    if (value.length < driverForm.phone.length) {
      setDriverForm({ ...driverForm, phone: value });
      return;
    }

    // Always ensure it starts with +998
    if (!value.startsWith('+998')) {
      value = '+998' + value.replace(/\D/g, '');
    }

    // Extract only digits after +998
    let onlyDigits = value.slice(4).replace(/\D/g, '');

    // Limit to 9 digits
    onlyDigits = onlyDigits.slice(0, 9);

    // Apply mask: +998-XX-XXX-XX-XX
    let formatted = '+998';
    if (onlyDigits.length > 0) {
      formatted += '-' + onlyDigits.slice(0, 2);
    }
    if (onlyDigits.length > 2) {
      formatted += '-' + onlyDigits.slice(2, 5);
    }
    if (onlyDigits.length > 5) {
      formatted += '-' + onlyDigits.slice(5, 7);
    }
    if (onlyDigits.length > 7) {
      formatted += '-' + onlyDigits.slice(7, 9);
    }

    setDriverForm({ ...driverForm, phone: formatted });
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.substring(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    setAdminCardNumber(formatted);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);

    if (driverForm.phone && !isValidPhone(driverForm.phone)) {
      setError("Please enter a valid phone number (+998-XX-XXX-XX-XX)");
      setFormLoading(false);
      return;
    }

    let normalizedPhone = driverForm.phone;
    // Normalize masked phone to +998XXXXXXXXX for storage if needed, 
    // but user asked for mask, so maybe keep it or normalize.
    // Let's normalize it for consistency in DB if we want, 
    // but the user asked for mask, so maybe they want to see it masked.
    // Actually, Firestore rules might expect a certain format.
    // Let's normalize it to +998XXXXXXXXX for the DB.
    if (normalizedPhone && normalizedPhone.includes('-')) {
      normalizedPhone = normalizedPhone.replace(/-/g, '');
    } else if (normalizedPhone && /^\d{9}$/.test(normalizedPhone)) {
      normalizedPhone = `+998${normalizedPhone}`;
    }

    const finalDriverData = {
      name: driverForm.name || '',
      rating: driverForm.rating || 5.0,
      experience: driverForm.experience || 0,
      phone: normalizedPhone || '',
      photo: driverForm.photo || DEFAULT_DRIVER_PHOTO,
      bio: driverForm.bio || '',
      email: driverForm.email || ''
    };

    try {
      if (driverForm.id) {
        // Update existing driver
        try {
          await updateDoc(doc(db, 'drivers', driverForm.id), finalDriverData);
          setDrivers(drivers.map(d => d.id === driverForm.id ? { id: driverForm.id, ...finalDriverData } : d));
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `drivers/${driverForm.id}`);
          setFormLoading(false);
          return;
        }
      } else {
        // Add new driver via backend API to create Auth account
        try {
          if (!auth.currentUser) {
            throw new Error("Sessiya muddati tugagan yoki siz tizimga kirmagansiz. Iltimos, qayta kiring.");
          }
          const idToken = await auth.currentUser.getIdToken(true);
          if (!idToken) throw new Error("An error occurred while getting session token. Please log in again.");

          const response = await fetch('/api/admin/create-driver', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              ...finalDriverData,
              password: driverForm.password
            })
          });

          const result = await response.json();
          if (!response.ok) {
            const errorMessage = result.details ? `${result.error}: ${result.details}` : (result.error || "An error occurred while creating driver");
            throw new Error(errorMessage);
          }

          setDrivers([...drivers, { id: result.driverId, ...finalDriverData }]);
          toast.success("Driver created successfully with login/password.");
        } catch (err: any) {
          setError(err.message);
          setFormLoading(false);
          return;
        }
      }
      setShowDriverForm(false);
      setDriverForm({ id: '', name: '', rating: 5.0, experience: 0, phone: '', photo: '', bio: '', email: '', password: '' });
    } catch (err: any) {
      console.error("Error saving driver:", err);
      setError(err.message || "An error occurred while saving driver");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditDriver = (driver: any) => {
    setDriverForm({
      id: driver.id || '',
      name: driver.name || '',
      rating: driver.rating || 5.0,
      experience: driver.experience || 0,
      phone: driver.phone || '',
      photo: driver.photo || '',
      bio: driver.bio || '',
      email: driver.email || '',
      password: ''
    });
    setShowDriverForm(true);
  };

  const handleDriverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverForm({ ...driverForm, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    try {
      if (!rideForm.driverId) {
        setError("Please select a driver");
        setFormLoading(false);
        return;
      }

      const { id, ...data } = rideForm;

      if (id) {
        // Update existing ride
        try {
          await updateDoc(doc(db, 'rides', id), data);
          setRides(rides.map(r => r.id === id ? { id, ...data } : r));
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `rides/${id}`);
          setFormLoading(false);
          return;
        }
      } else {
        // Add new ride
        try {
          const newRideData = {
            ...data,
            bookedSeats: [] // Initialize with empty booked seats
          };
          const docRef = await addDoc(collection(db, 'rides'), newRideData);
          setRides([...rides, { id: docRef.id, ...newRideData }]);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'rides');
          setFormLoading(false);
          return;
        }
      }
      setShowRideForm(false);
      setRideForm({ id: '', driverId: '', date: 'today', departureTime: '', arrivalTime: '', price: 0, busType: 'Standard', from: 'Toshkent', to: 'Samarqand', duration: '', rating: 5.0, images: [], status: 'active', totalSeats: 40, seatLayout: '2x2' });
    } catch (err: any) {
      console.error("Error saving ride:", err);
      try {
        const parsed = JSON.parse(err.message);
        setError(`Error: ${parsed.error}`);
      } catch {
        setError(err.message || "An error occurred while saving route");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleRidePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);

      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRideForm(prev => {
            const currentImages = prev.images || [];
            if (currentImages.length >= 10) return prev;
            return { ...prev, images: [...currentImages, reader.result as string] };
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleEditRide = (ride: any) => {
    setRideForm({ ...ride, images: ride.images || [], totalSeats: ride.totalSeats || 40, seatLayout: ride.seatLayout || '2x2' });
    setShowRideForm(true);
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("No authentication token");
        return;
      }

      const endpoint = newRole === 'admin' 
        ? '/api/admin/promote-to-admin'
        : newRole === 'driver'
        ? '/api/admin/promote-to-driver'
        : null;

      if (!endpoint) {
        // For regular user role, update directly in Firestore
        try {
          await updateDoc(doc(db, 'users', userId), { role: newRole });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
          return;
        }
        setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
        return;
      }

      // Use server endpoint for admin and driver roles
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user role");
      }

      const result = await response.json();
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Foydalanuvchi ${newRole === 'admin' ? 'admin' : 'haydovchi'} qilib belgilandi`);
    } catch (error) {
      console.error("Error updating user role:", error);
      setError(error instanceof Error ? error.message : "An error occurred while changing user role");
      toast.error("Rol o'zgartirilmadi. Qayta urinib ko'ring.");
    }
  };

  const handleMarkMessageRead = async (messageId: string) => {
    setMessageLoading(messageId);
    try {
      try {
        await updateDoc(doc(db, 'messages', messageId), { status: 'read' });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
        return;
      }
      setMessages(messages.map(m => m.id === messageId ? { ...m, status: 'read' } : m));
    } catch (error) {
      console.error("Error marking message as read:", error);
      setError("An error occurred while marking message as read");
    } finally {
      setMessageLoading(null);
    }
  };

  const handleReviewStatus = async (reviewId: string, newStatus: 'approved' | 'rejected') => {
    try {
      try {
        await updateDoc(doc(db, 'reviews', reviewId), { status: newStatus });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        return;
      }
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error("Error updating review status:", error);
      setError("An error occurred while changing review status");
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("Are you sure you want to clear the database? This action cannot be undone!")) return;

    setClearing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("An error occurred while getting session token. Please log in again.");

      const response = await fetch('/api/admin/clear-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message);
        fetchFirestoreData();
      } else {
        toast.error(result.error);
      }
    } catch (error: any) {
      console.error("Clear database error:", error);
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setClearing(false);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdatingSettings(true);
    try {
      try {
        await setDoc(doc(db, 'settings', 'payment'), {
          adminCardNumber,
          adminCardOwner,
          adminSupportPhone,
          stripeEnabled,
          manualEnabled,
          siteDescription,
          logoUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/payment');
      }

      toast.success("Sozlamalar muvaffaqiyatli saqlandi");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleConfirmManualPayment = async (bookingId: string, status: 'paid' | 'cancelled') => {
    setPaymentActionLoading(bookingId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/confirm-manual-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ bookingId, status })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(status === 'paid' ? "To'lov tasdiqlandi va chipta generatsiya qilindi" : "To'lov bekor qilindi");
        fetchFirestoreData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error("An error occurred while performing the action");
    } finally {
      setPaymentActionLoading(null);
    }
  };

  const handleToggleReviewFeatured = async (reviewId: string, currentFeatured: boolean) => {
    try {
      const newFeatured = !currentFeatured;
      try {
        await updateDoc(doc(db, 'reviews', reviewId), { isFeatured: newFeatured });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        return;
      }
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, isFeatured: newFeatured } : r));
      toast.success(newFeatured ? "Fikr tanlanganlar ro'yxatiga qo'shildi" : "Fikr tanlanganlar ro'yxatidan olib tashlandi");
    } catch (error) {
      console.error("Error toggling review featured status:", error);
      setError("An error occurred while adding review to featured list");
    }
  };

  const handleSendAdminChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim() || !selectedChatId || !user) return;

    setChatLoading(true);
    const text = adminChatInput.trim();
    setAdminChatInput('');

    try {
      const messageData = {
        chatId: selectedChatId,
        senderId: user.id,
        text,
        isAdmin: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), messageData);

      await updateDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        userUnreadCount: increment(1)
      });
    } catch (error) {
      console.error("Error sending admin message:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message || !user || isSubmittingNotifRef.current) return;

    isSubmittingNotifRef.current = true;
    setFormLoading(true);
    try {
      const notificationData = {
        title: notificationForm.title,
        message: notificationForm.message,
        target: notificationForm.target,
        createdAt: new Date().toISOString(),
        senderId: user.id
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      setShowNotificationForm(false);
      setNotificationForm({ title: '', message: '', target: 'all' });
      toast.success("Bildirishnoma muvaffaqiyatli yuborildi");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Bildirishnoma yuborishda xatolik yuz berdi");
    } finally {
      setFormLoading(false);
      isSubmittingNotifRef.current = false;
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletterForm.subject || !newsletterForm.content || filteredNewsletterSubscribers.length === 0) return;

    setFormLoading(true);
    try {
      // In a real-world scenario, you would call a backend API or a Cloud Function here.
      // For this implementation, we'll simulate the broadcast by creating a 'newsletter_history' entry.
      const broadcastData = {
        subject: newsletterForm.subject,
        content: newsletterForm.content,
        sentAt: new Date().toISOString(),
        subscriberCount: filteredNewsletterSubscribers.length,
        recipients: filteredNewsletterSubscribers.map(s => s.email).filter(Boolean)
      };

      await addDoc(collection(db, 'newsletter_history'), broadcastData);

      toast.success(`${filteredNewsletterSubscribers.length} ta obunachiga xabar yuborildi!`);
      setShowNewsletterForm(false);
      setNewsletterForm({ subject: '', content: '' });
    } catch (error) {
      console.error("Error sending newsletter:", error);
      toast.error("Xabar yuborishda xatolik yuz berdi");
    } finally {
      setFormLoading(false);
    }
  };

  const handleStartChatWithUser = async (targetUser: any) => {
    const existingChat = chats.find(c => c.userId === targetUser.id);

    if (existingChat) {
      setSelectedChatId(existingChat.id);
      handleTabChange('chats');
    } else {
      try {
        const newChat = {
          userId: targetUser.id,
          userName: targetUser.name || 'Foydalanuvchi',
          userEmail: targetUser.email || '',
          lastMessage: 'Suhbat boshlandi',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          userUnreadCount: 0,
          status: 'active'
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        setSelectedChatId(docRef.id);
        handleTabChange('chats');
      } catch (error) {
        console.error("Error creating chat:", error);
        toast.error(t('admin.chats.create_error') || "Chat yaratishda xatolik yuz berdi");
      }
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const chatsRef = collection(db, 'chats');
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedChatId) return;

    // Reset unread count when admin opens the chat or new messages arrive
    const currentChat = chats.find(c => c.id === selectedChatId);
    if (currentChat && currentChat.unreadCount > 0) {
      updateDoc(doc(db, 'chats', selectedChatId), { unreadCount: 0 });
    }
  }, [selectedChatId, chats]);

  useEffect(() => {
    if (!selectedChatId) return;

    const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (authLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200 dark:border-white/5">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kirish taqiqlangan</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sizda ushbu sahifaga kirish uchun yetarli huquqlar yo'q.
            Siz 3 soniyadan so'ng asosiy sahifaga yo'naltirilasiz.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            Asosiy sahifaga qaytish
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !rides.length) {
    return <LoadingScreen message="Loading data..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-white/5 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold text-emerald-500">Tezchipta Admin</h1>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 h-auto border-0"
            leftIcon={<X className="w-5 h-5" />}
          />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Button
            variant="secondary"
            onClick={() => handleTabChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            leftIcon={<LayoutDashboard className="w-5 h-5" />}
          >
            {t('admin.dashboard')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleTabChange('rides')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'rides' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            leftIcon={<Bus className="w-5 h-5" />}
          >
            {t('admin.rides')}
          </Button>
          {user?.role === 'admin' && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('drivers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'drivers' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<Users className="w-5 h-5" />}
              >
                {t('admin.drivers')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('faqs')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'faqs' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<HelpCircle className="w-5 h-5" />}
              >
                {t('admin.faqs')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'users' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<Users className="w-5 h-5" />}
              >
                {t('admin.users')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('messages')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'messages' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<MessageCircle className="w-5 h-5" />}
              >
                {t('admin.messages')}
                {messages.filter(m => m.status === 'unread').length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {messages.filter(m => m.status === 'unread').length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('newsletter')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'newsletter' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<Mail className="w-5 h-5" />}
              >
                Newsletter
                {newsletterSubscribers.length > 0 && (
                  <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {newsletterSubscribers.length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('chats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'chats' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<MessageCircle className="w-5 h-5" />}
              >
                {t('admin.chats')}
                {chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0) > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'notifications' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<Mail className="w-5 h-5" />}
              >
                Bildirishnomalar
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('reviews')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'reviews' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<Star className="w-5 h-5" />}
              >
                {t('admin.reviews')}
                {reviews.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {reviews.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTabChange('payments')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'payments' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                leftIcon={<CreditCard className="w-5 h-5" />}
              >
                {t('admin.payments')}
                {bookings.filter(b => b.paymentMethod === 'manual' && b.paymentStatus === 'pending_review').length > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {bookings.filter(b => b.paymentMethod === 'manual' && b.paymentStatus === 'pending_review').length}
                  </span>
                )}
              </Button>
            </>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="secondary"
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors border-0 justify-start h-auto ${activeTab === 'settings' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              leftIcon={<Settings className="w-5 h-5" />}
            >
              {t('admin.settings')}
            </Button>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-white/5">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Asosiy saytga qaytish
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-0 justify-start h-auto"
            leftIcon={<LogOut className="w-5 h-5" />}
          >
            {t('admin.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-white/5 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg border-0 h-9 w-9 flex items-center justify-center"
              leftIcon={<Menu className="w-5 h-5" />}
            />
            <div className="flex items-center gap-2">
              <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
              <h1 className="text-lg font-bold text-emerald-500 tracking-tight">Tezchipta Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg border-0 h-9 w-9 flex items-center justify-center"
              leftIcon={<LogOut className="w-4 h-4" />}
            />
          </div>
        </header>

        {/* Global Header */}
        <header className="hidden md:flex bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-white/5 p-4 sm:p-6 items-center justify-between sticky top-0 z-20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {activeTab === 'dashboard' ? 'Dashboard' :
              activeTab === 'rides' ? 'Qatnovlar' :
                activeTab === 'drivers' ? 'Haydovchilar' :
                  activeTab === 'faqs' ? 'FAQlar' :
                    activeTab === 'users' ? 'Foydalanuvchilar' :
                      activeTab === 'messages' ? 'Xabarlar' :
                        activeTab === 'newsletter' ? 'Newsletter' :
                          activeTab === 'chats' ? 'Chatlar' :
                            activeTab === 'notifications' ? 'Bildirishnomalar' :
                              activeTab === 'reviews' ? 'Fikrlar' :
                                activeTab === 'payments' ? "To'lovlar" :
                                  'Sozlamalar'}
          </h2>
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Button
                variant="secondary"
                onClick={() => navigate('/statistics')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 h-auto text-sm sm:text-base"
                leftIcon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
              >
                <span className="hidden sm:inline">Statistika</span>
              </Button>
              <Button
                variant="secondary"
                onClick={seedData}
                loading={seeding}
                className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 h-auto text-sm sm:text-base"
                leftIcon={<Database className="w-4 h-4 sm:w-5 sm:h-5" />}
              >
                <span className="hidden sm:inline">To'ldirish</span>
              </Button>
            </div>
          )}
        </header>

        <div className={`flex-1 ${activeTab === 'chats' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} p-4 sm:p-8`}>
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 flex-shrink-0" />
                <div className="flex flex-col">
                  <p className="font-medium text-sm">{error}</p>
                  <Link to="/errors" className="text-xs underline hover:opacity-80 mt-1">
                    Check Error Help Center for solutions
                  </Link>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setError(null)}
                className="hover:opacity-70 border-0 p-1 h-auto bg-transparent"
                leftIcon={<X className="w-4 h-4" />}
              />
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Weather Widget */}
              <WeatherWidget />

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-6">
                <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <Bus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                    {(user?.role as string) === 'driver' ? rides.filter(r => r.driverId === myDriverId).length : rides.length}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {(user?.role as string) === 'driver' ? 'Mening qatnovlarim' : 'Jami qatnovlar'}
                  </div>
                </div>
                {(user?.role as string) === 'admin' && (
                  <>
                    <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{drivers.length}</div>
                      <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Jami haydovchilar</div>
                    </div>
                    <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{usersList.length}</div>
                      <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Jami foydalanuvchilar</div>
                    </div>
                    <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{messages.length}</div>
                      <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Jami xabarlar</div>
                    </div>
                    <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{faqs.length}</div>
                      <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Jami FAQlar</div>
                    </div>
                  </>
                )}
                {(user?.role as string) === 'driver' && (
                  <div className="bg-white dark:bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                      <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                      {bookings.filter(b => rides.filter(r => r.driverId === myDriverId).map(r => r.id).includes(b.rideId)).length}
                    </div>
                    <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Mening yo'lovchilarim</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="hidden md:block" /> {/* Spacer for global header */}
                <Button
                  onClick={() => {
                    if (showRideForm) {
                      setShowRideForm(false);
                    } else {
                      setRideForm({ id: '', driverId: '', date: 'today', departureTime: '', arrivalTime: '', price: 0, busType: 'Standard', from: 'Toshkent', to: 'Samarqand', duration: '', rating: 5.0, images: [], status: 'active', totalSeats: 40, seatLayout: '2x2' });
                      setShowRideForm(true);
                    }
                  }}
                  className="flex items-center gap-2 w-fit"
                  leftIcon={showRideForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                >
                  {showRideForm ? t('admin.common.cancel') : t('admin.rides.new')}
                </Button>
              </div>

              {showRideForm && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                    {rideForm.id ? t('admin.rides.edit') : t('admin.rides.add')}
                  </h3>
                  <form onSubmit={handleAddRide} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qayerdan</label>
                      <input type="text" required value={rideForm.from} onChange={e => setRideForm({ ...rideForm, from: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qayerga</label>
                      <input type="text" required value={rideForm.to} onChange={e => setRideForm({ ...rideForm, to: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sana</label>
                      <select required value={rideForm.date} onChange={e => setRideForm({ ...rideForm, date: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="today">Bugun</option>
                        <option value="tomorrow">Ertaga</option>
                        <option value="weekly">Haftalik</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ketish vaqti</label>
                      <input type="time" required value={rideForm.departureTime} onChange={e => setRideForm({ ...rideForm, departureTime: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yetib borish vaqti</label>
                      <input type="time" required value={rideForm.arrivalTime} onChange={e => setRideForm({ ...rideForm, arrivalTime: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Narx (so'm)</label>
                      <input type="number" required value={rideForm.price} onChange={e => setRideForm({ ...rideForm, price: Number(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avtomobil turi</label>
                      <input type="text" required value={rideForm.busType} onChange={e => setRideForm({ ...rideForm, busType: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">O'rindiqlar soni</label>
                      <input type="number" required min="1" value={rideForm.totalSeats} onChange={e => setRideForm({ ...rideForm, totalSeats: Number(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">O'rindiqlar joylashuvi</label>
                      <select required value={rideForm.seatLayout || '2x2'} onChange={e => setRideForm({ ...rideForm, seatLayout: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="2x2">2x2 (Standart)</option>
                        <option value="2x1">2x1 (VIP)</option>
                        <option value="1x2">1x2 (VIP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Davomiyligi (masalan, 4 soat 30 daq)</label>
                      <input type="text" required value={rideForm.duration} onChange={e => setRideForm({ ...rideForm, duration: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reyting</label>
                      <input type="number" step="0.1" required value={rideForm.rating} onChange={e => setRideForm({ ...rideForm, rating: Number(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Haydovchi</label>
                      <select required value={rideForm.driverId} onChange={e => setRideForm({ ...rideForm, driverId: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="">Haydovchini tanlang</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select required value={rideForm.status} onChange={e => setRideForm({ ...rideForm, status: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="active">Faol</option>
                        <option value="completed">Yakunlangan</option>
                        <option value="cancelled">Bekor qilingan</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avtomobil rasmlari (maks. 10 ta)</label>
                      <div className="flex flex-wrap gap-4 mb-4">
                        {(rideForm.images || []).map((img, idx) => (
                          <div key={idx} className="relative w-24 h-24 group">
                            <img src={img} alt={`Bus ${idx}`} className="w-full h-full object-cover rounded-xl border border-gray-200 dark:border-white/10" />
                            <Button
                              type="button"
                              onClick={() => setRideForm({ ...rideForm, images: (rideForm.images || []).filter((_, i) => i !== idx) })}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center shadow-lg border-0"
                              variant="secondary"
                              size="sm"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {(rideForm.images || []).length < 10 && (
                          <label className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors bg-gray-50 dark:bg-white/5">
                            <Plus className="w-6 h-6 text-gray-400" />
                            <span className="text-[10px] text-gray-400 mt-1">Rasm</span>
                            <input type="file" accept="image/*" multiple onChange={handleRidePhotoChange} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Button type="submit" loading={formLoading} className="h-auto">Saqlash</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Filtering and Sorting */}
              <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Qayerdan</label>
                  <input
                    type="text"
                    placeholder="Toshkent..."
                    value={rideFilters.from}
                    onChange={e => setRideFilters({ ...rideFilters, from: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Qayerga</label>
                  <input
                    type="text"
                    placeholder="Samarqand..."
                    value={rideFilters.to}
                    onChange={e => setRideFilters({ ...rideFilters, to: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sana</label>
                  <select
                    value={rideFilters.date}
                    onChange={e => setRideFilters({ ...rideFilters, date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Barchasi</option>
                    <option value="today">Bugun</option>
                    <option value="tomorrow">Ertaga</option>
                    <option value="weekly">Haftalik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                  <select
                    value={rideFilters.status}
                    onChange={e => setRideFilters({ ...rideFilters, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="all">Barchasi</option>
                    <option value="active">Faol</option>
                    <option value="completed">Yakunlangan</option>
                    <option value="cancelled">Bekor qilingan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Saralash</label>
                  <select
                    value={`${rideSort.key}-${rideSort.order}`}
                    onChange={e => {
                      const [key, order] = e.target.value.split('-');
                      setRideSort({ key, order: order as 'asc' | 'desc' });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="departureTime-asc">Vaqt (oldinroq)</option>
                    <option value="departureTime-desc">Vaqt (kechroq)</option>
                    <option value="price-asc">Narx (arzonroq)</option>
                    <option value="price-desc">Narx (qimmatroq)</option>
                    <option value="rating-desc">Reyting (yuqori)</option>
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Yo'nalish</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Haydovchi</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.date')} / Vaqt</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.status')}</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Turi / {t('admin.common.price')}</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {rides
                        .filter(ride => {
                          if (user?.role === 'driver' && ride.driverId !== myDriverId) return false;
                          const from = ride.from || '';
                          const to = ride.to || '';
                          const status = ride.status || 'active';
                          const matchesFrom = from.toLowerCase().includes(rideFilters.from.toLowerCase());
                          const matchesTo = to.toLowerCase().includes(rideFilters.to.toLowerCase());
                          const matchesStatus = rideFilters.status === 'all' || status === rideFilters.status;
                          const matchesDate = !rideFilters.date || ride.date === rideFilters.date;
                          return matchesFrom && matchesTo && matchesStatus && matchesDate;
                        })
                        .sort((a, b) => {
                          const valA = a[rideSort.key] ?? '';
                          const valB = b[rideSort.key] ?? '';

                          if (typeof valA === 'number' && typeof valB === 'number') {
                            return rideSort.order === 'asc' ? valA - valB : valB - valA;
                          }

                          const strA = String(valA).toLowerCase();
                          const strB = String(valB).toLowerCase();

                          if (rideSort.order === 'asc') {
                            return strA > strB ? 1 : -1;
                          } else {
                            return strA < strB ? 1 : -1;
                          }
                        })
                        .map(ride => {
                          const driver = drivers.find(d => d.id === ride.driverId);
                          return (
                            <tr key={ride.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{ride.from} → {ride.to}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{ride.duration}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{driver?.name || 'Noma\'lum'}</div>
                                <div className="flex items-center text-amber-500 text-xs">
                                  <Star className="w-3 h-3 fill-current mr-1" />
                                  {ride.rating}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{ride.date}</div>
                                <div className="text-xs text-gray-500">{ride.departureTime} - {ride.arrivalTime}</div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ride.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                  ride.status === 'completed' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                    'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                  }`}>
                                  {ride.status === 'active' ? 'Faol' : ride.status === 'completed' ? 'Yakunlangan' : 'Bekor qilingan'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(ride.price)}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">{ride.busType}</div>
                              </td>
                              <td className="p-4 text-sm flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditRide(ride)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                  leftIcon={<Edit2 className="w-4 h-4" />}
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setSelectedRideForBookings(ride)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  leftIcon={<Users className="w-4 h-4" />}
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleDelete('rides', ride.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                  leftIcon={<Trash2 className="w-4 h-4" />}
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="hidden md:block" />
                <Button
                  onClick={() => {
                    if (!showDriverForm) {
                      setDriverForm({ id: '', name: '', rating: 5.0, experience: 0, phone: '', photo: '', bio: '', email: '', password: '' });
                    }
                    setShowDriverForm(!showDriverForm);
                  }}
                  className="flex items-center gap-2 w-fit"
                  leftIcon={showDriverForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                >
                  {showDriverForm ? t('admin.common.cancel') : t('admin.drivers.new')}
                </Button>
              </div>

              {showDriverForm && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                    {driverForm.id ? t('admin.drivers.edit') : t('admin.drivers.add')}
                  </h3>
                  <form onSubmit={handleAddDriver} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism</label>
                      <input type="text" required value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    {!driverForm.id && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Login)</label>
                          <input type="email" required value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parol</label>
                          <input type="password" required value={driverForm.password} onChange={e => setDriverForm({ ...driverForm, password: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon (+998-XX-XXX-XX-XX)</label>
                      <input
                        type="text"
                        required
                        value={driverForm.phone}
                        onChange={handlePhoneChange}
                        placeholder="+998-90-123-45-67"
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rasm</label>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10">
                          {driverForm.photo ? (
                            <img src={driverForm.photo} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDriverPhotoChange}
                          className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-500/10 dark:file:text-emerald-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tajriba (yil)</label>
                      <input type="number" required value={driverForm.experience} onChange={e => setDriverForm({ ...driverForm, experience: Number(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reyting</label>
                      <input type="number" step="0.1" required value={driverForm.rating} onChange={e => setDriverForm({ ...driverForm, rating: Number(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                      <textarea required value={driverForm.bio} onChange={e => setDriverForm({ ...driverForm, bio: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"></textarea>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Button type="submit" loading={formLoading} className="h-auto">{t('admin.common.save')}</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.drivers')}</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Reyting</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Tajriba</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Telefon</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {drivers.map(driver => (
                        <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={driver.photo} alt={driver.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center text-amber-500 font-medium">
                              <Star className="w-4 h-4 fill-current mr-1" />
                              {driver.rating}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{driver.experience} yil</td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{driver.phone}</td>
                          <td className="p-4 text-sm flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditDriver(driver)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                              leftIcon={<Edit2 className="w-4 h-4" />}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete('drivers', driver.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="hidden md:block" />
                <Button
                  onClick={() => setShowFaqForm(!showFaqForm)}
                  className="flex items-center gap-2 w-fit h-auto"
                  leftIcon={showFaqForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                >
                  {showFaqForm ? t('admin.common.cancel') : t('admin.faqs.new')}
                </Button>
              </div>

              {showFaqForm && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                    {faqForm.id ? t('admin.faqs.edit') : t('admin.faqs.add')}
                  </h3>
                  <form onSubmit={handleAddFaq} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Savol</label>
                      <input
                        type="text"
                        required
                        value={faqForm.question}
                        onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Javob</label>
                      <textarea
                        required
                        value={faqForm.answer}
                        onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                      ></textarea>
                    </div>
                    <Button type="submit" loading={formLoading} className="h-auto">
                      {t('admin.common.save')}
                    </Button>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Savol</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Javob</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {faqs.map(faq => (
                        <tr key={faq.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white w-1/3">{faq.question}</td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400 w-1/2">{faq.answer}</td>
                          <td className="p-4 text-sm flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditFaq(faq)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                              leftIcon={<Edit2 className="w-4 h-4" />}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete('faqs', faq.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="hidden md:block" />
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.users.search') || "Foydalanuvchi qidirish..."}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.users')}</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Email</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Telefon</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Rol</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">{t('admin.common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {usersList
                        .filter(u =>
                          (u.name?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
                          (u.email?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
                          (u.phone || '').includes(userSearchQuery)
                        )
                        .map(u => (
                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center font-bold">
                                  {u.name ? u.name[0].toUpperCase() : 'U'}
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name || 'Noma\'lum'}</div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{u.phone || '-'}</td>
                            <td className="p-4">
                              <select
                                value={u.role || 'user'}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                className="bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-lg text-xs font-medium px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="user">{t('admin.users.role_user') || 'Foydalanuvchi'}</option>
                                <option value="driver">{t('admin.users.role_driver') || 'Haydovchi'}</option>
                                <option value="admin">{t('admin.users.role_admin') || 'Admin'}</option>
                              </select>
                            </td>
                            <td className="p-4 text-sm flex items-center gap-2">
                              {u.id !== user?.id && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleStartChatWithUser(u)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  leftIcon={<MessageCircle className="w-4 h-4" />}
                                  title={t('admin.users.send_message') || "Xabar yozish"}
                                />
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDelete('users', u.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                title="O'chirish"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between md:hidden">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Xabarlar</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(m => (
                  <div key={m.id} className={`bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border transition-all ${m.status === 'unread' ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-gray-100 dark:border-white/5'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center font-bold">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{m.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(m.createdAt).toLocaleString('uz-UZ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.status === 'unread' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={messageLoading === m.id}
                            onClick={() => handleMarkMessageRead(m.id)}
                            className="text-xs font-medium text-emerald-500 hover:text-emerald-600 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 transition-colors"
                          >
                            O'qilgan deb belgilash
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDelete('messages', m.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{m.contact}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-[#0B1120] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                        {m.message}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Hozircha xabarlar yo'q.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'newsletter' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Jami: <span className="font-bold text-gray-900 dark:text-white">{filteredNewsletterSubscribers.length} ta</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Email yoki user ID..."
                      value={newsletterSearchQuery}
                      onChange={(e) => setNewsletterSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    onClick={() => setShowNewsletterForm(!showNewsletterForm)}
                    className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-xl h-auto"
                    leftIcon={showNewsletterForm ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  >
                    {showNewsletterForm ? "Bekor qilish" : "Xabar yozish"}
                  </Button>
                  <Button
                    onClick={handleDownloadNewsletterExcel}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl h-auto"
                    leftIcon={<Mail className="w-4 h-4" />}
                  >
                    Excel yuklab olish
                  </Button>
                </div>
              </div>

              {showNewsletterForm && (
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yangi xabar yaratish</h3>
                        <p className="text-xs text-gray-500">{filteredNewsletterSubscribers.length} ta obunachiga yuboriladi</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      {/* Subject */}
                      <div className="relative group">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block ml-1">Subject / Mavzu</label>
                        <input
                          type="text"
                          value={newsletterForm.subject}
                          onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                          placeholder="Gmail kabi mavzu kiriting..."
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400"
                        />
                      </div>

                      {/* Content */}
                      <div className="relative group">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block ml-1">Context / Xabar matni</label>
                        <textarea
                          value={newsletterForm.content}
                          onChange={(e) => setNewsletterForm({ ...newsletterForm, content: e.target.value })}
                          placeholder="Xabar matnini bu yerga yozing..."
                          rows={8}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="secondary"
                        onClick={() => setShowNewsletterForm(false)}
                        className="px-6 py-3 rounded-xl border-gray-200 dark:border-white/10"
                      >
                        Bekor qilish
                      </Button>
                      <Button
                        onClick={handleSendNewsletter}
                        loading={formLoading}
                        disabled={!newsletterForm.subject || !newsletterForm.content}
                        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                        leftIcon={<Plus className="w-5 h-5 rotate-45" />}
                      >
                        Yuborish
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Email</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Sana</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">Manba</th>
                        <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 text-sm">User ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {filteredNewsletterSubscribers.map((subscriber: any) => (
                        <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{subscriber.email || '-'}</td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleString('uz-UZ') : '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{subscriber.source || '-'}</td>
                          <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{subscriber.userId || '-'}</td>
                        </tr>
                      ))}
                      {filteredNewsletterSubscribers.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                            Hozircha obunachilar yo'q.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between md:hidden flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.chats.title') || "Foydalanuvchilar bilan chat"}</h2>
              </div>

              <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Chat List */}
                <div className="w-1/3 bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('admin.chats.search') || "Chatlarni qidirish..."}
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                    {chats
                      .filter(chat =>
                        (chat.userName || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                        (chat.userEmail || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
                      )
                      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                      .map(chat => (
                        <Button
                          key={chat.id}
                          variant="secondary"
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-0 border-b border-gray-50 dark:border-white/5 rounded-none h-auto justify-start ${selectedChatId === chat.id ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                        >
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {chat.userName ? chat.userName[0].toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900 dark:text-white truncate">{chat.userName || 'Foydalanuvchi'}</h4>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                              {chat.unreadCount}
                            </div>
                          )}
                        </Button>
                      ))}
                    {chats.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Hozircha chatlar yo'q.
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col overflow-hidden min-h-0">
                  {selectedChatId ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold">
                            {chats.find(c => c.id === selectedChatId)?.userName?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {chats.find(c => c.id === selectedChatId)?.userName || t('admin.users.role_user')}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {chats.find(c => c.id === selectedChatId)?.userEmail || t('admin.chats.email_not_found') || 'Email mavjud emas'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-medium">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {t('admin.chats.online') || 'Onlayn'}
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#0B1120]/20">
                        {chatMessages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className="flex flex-col max-w-[80%]">
                                <span className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${isMe ? 'text-emerald-600 dark:text-emerald-400 justify-end mr-1' : 'text-gray-500 ml-1'}`}>
                                  {isMe ? (
                                    <>
                                      <ShieldCheck className="w-3 h-3" />
                                      {t('admin.chats.you_admin') || 'Siz (Admin)'}
                                    </>
                                  ) : (
                                    <>
                                      <User className="w-3 h-3" />
                                      {chats.find(c => c.id === selectedChatId)?.userName || t('admin.users.role_user')}
                                    </>
                                  )}
                                </span>
                                <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe
                                  ? 'bg-emerald-500 text-white rounded-tr-none'
                                  : 'bg-white dark:bg-[#1F2937] text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-white/5'
                                  }`}>
                                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                  <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input */}
                      <form onSubmit={handleSendAdminChatMessage} className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-2 bg-white dark:bg-[#111827] flex-shrink-0">
                        <input
                          type="text"
                          value={adminChatInput}
                          onChange={(e) => setAdminChatInput(e.target.value)}
                          placeholder={t('admin.chats.input_placeholder') || "Xabar yozing..."}
                          className="flex-1 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                        />
                        <Button
                          type="submit"
                          disabled={!adminChatInput.trim()}
                          loading={chatLoading}
                          className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors border-0 h-auto"
                          leftIcon={<Plus className="w-5 h-5 rotate-45" />}
                        />
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-gray-50/30 dark:bg-[#0B1120]/10">
                      <div className="w-20 h-20 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-full flex items-center justify-center mb-6">
                        <MessageCircle className="w-12 h-12 text-emerald-500 opacity-40" />
                      </div>
                      <p className="text-sm max-w-xs text-gray-500 dark:text-gray-400">{t('admin.chats.select_user') || "Suhbatni boshlash uchun chap tomondan foydalanuvchini tanlang"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="hidden md:block" />
                <Button
                  onClick={() => setShowNotificationForm(!showNotificationForm)}
                  className="flex items-center gap-2 w-fit"
                  leftIcon={showNotificationForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                >
                  {showNotificationForm ? t('admin.notifications.cancel') : t('admin.notifications.new')}
                </Button>
              </div>

              {showNotificationForm && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{t('admin.notifications.form_title')}</h3>
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.notifications.title_label')}</label>
                      <input
                        type="text"
                        required
                        value={notificationForm.title}
                        onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        placeholder={t('admin.notifications.title_label')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.notifications.message_label')}</label>
                      <textarea
                        required
                        value={notificationForm.message}
                        onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        placeholder={t('admin.notifications.message_label')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.notifications.target_label')}</label>
                      <select
                        value={notificationForm.target}
                        onChange={e => setNotificationForm({ ...notificationForm, target: e.target.value as 'all' | 'newcomers' })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">{t('admin.notifications.target_all')}</option>
                        <option value="newcomers">{t('admin.notifications.target_newcomers')}</option>
                      </select>
                    </div>
                    <Button type="submit" loading={formLoading} className="h-auto">{t('admin.notifications.send')}</Button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {notifications.map((notif) => (
                  <div key={notif.id} className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{notif.title}</h4>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${notif.target === 'all' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10'}`}>
                        {notif.target === 'all' ? 'Hamma' : 'Yangi kelganlar'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{notif.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{new Date(notif.createdAt).toLocaleString('uz-UZ')}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeleteConfirm({ isOpen: true, collectionName: 'notifications', id: notif.id })}
                        className="p-1 text-gray-400 hover:text-red-500 border-0 h-auto"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                    <Mail className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-500 dark:text-gray-400">{t('admin.notifications.empty')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between md:hidden">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fikr-mulohazalar</h2>
                <div className="flex gap-2">
                  <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-medium">{reviews.filter(r => r.status === 'pending').length} kutilmoqda</span>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-medium">{reviews.filter(r => r.status === 'approved').length} tasdiqlangan</span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-end gap-2 mb-6">
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-sm font-medium">{reviews.filter(r => r.status === 'pending').length} kutilmoqda</span>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm font-medium">{reviews.filter(r => r.status === 'approved').length} tasdiqlangan</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((review) => (
                  <div key={review.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold">
                          {review.userName?.[0].toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{review.userName}</h4>
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${review.status === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        review.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                        {review.status === 'approved' ? 'Tasdiqlangan' : review.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-6 flex-grow">
                      "{review.comment}"
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                      <span className="text-[10px] text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                      <div className="flex gap-2">
                        {review.status === 'approved' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleToggleReviewFeatured(review.id, review.isFeatured)}
                            className={`p-2 rounded-lg transition-colors ${review.isFeatured ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                            title={review.isFeatured ? "Tanlanganlardan olib tashlash" : "Tanlanganlarga qo'shish"}
                            leftIcon={<Star className={`w-4 h-4 ${review.isFeatured ? 'fill-current' : ''}`} />}
                          />
                        )}
                        {review.status !== 'approved' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleReviewStatus(review.id, 'approved')}
                            className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            title="Tasdiqlash"
                            leftIcon={<ShieldCheck className="w-4 h-4" />}
                          />
                        )}
                        {review.status !== 'rejected' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleReviewStatus(review.id, 'rejected')}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Rad etish"
                            leftIcon={<X className="w-4 h-4" />}
                          />
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => setDeleteConfirm({ isOpen: true, collectionName: 'reviews', id: review.id })}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="O'chirish"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                    <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-500 dark:text-gray-400">Hozircha fikrlar mavjud emas.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Main Settings Card */}
              <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex flex-col gap-8">
                  {/* Card Settings Collapsible */}
                  <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-[#0B1120]/10">
                    <button
                      onClick={() => setShowCardSettings(!showCardSettings)}
                      className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-0 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Karta sozlamalari</h3>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showCardSettings ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showCardSettings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                          <div className="p-6 border-t border-gray-100 dark:border-white/5 space-y-6">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Karta raqami</label>
                              <input
                                type="text"
                                value={adminCardNumber}
                                onChange={handleCardNumberChange}
                                maxLength={19}
                                placeholder="0000 0000 0000 0000"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Karta egasi</label>
                              <input
                                type="text"
                                value={adminCardOwner}
                                onChange={(e) => setAdminCardOwner(e.target.value)}
                                placeholder="Masalan: ALISHER UZAKOV"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Other Settings */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Sayt Logotipi (URL)</label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ushbu URL orqali saytdagi barcha logotiplar va favicon o'zgaradi.</p>
                      {logoUrl && (
                        <div className="mt-2 p-2 border border-gray-200 dark:border-white/10 rounded-lg inline-block bg-gray-50 dark:bg-[#0B1120]">
                          <img src={logoUrl} alt="Logo Preview" className="h-10 object-contain" onError={(e) => (e.currentTarget.src = 'https://placehold.co/512x512/10b981/ffffff/png?text=Xato')} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Qo'llab-quvvatlash telefoni</label>
                      <input
                        type="text"
                        value={adminSupportPhone}
                        onChange={(e) => setAdminSupportPhone(e.target.value)}
                        placeholder="+998 90 000 00 00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Sayt tavsifi</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(siteDescription);
                            toast.success("Tavsif nusxalandi");
                          }}
                          className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 text-xs font-medium"
                        >
                          <Copy className="w-3 h-3" />
                          Nusxa olish
                        </button>
                      </div>
                      <textarea
                        value={siteDescription}
                        onChange={(e) => setSiteDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Payment Toggles */}
                    <div className="pt-4 space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#0B1120]/50 border border-gray-100 dark:border-white/5">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">Stripe (Onlayn to'lov)</div>
                          <div className="text-xs text-gray-500">Kredit/debit karta orqali onlayn to'lash</div>
                        </div>
                        <button
                          onClick={() => setStripeEnabled(!stripeEnabled)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${stripeEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stripeEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#0B1120]/50 border border-gray-100 dark:border-white/5">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">Karta orqali (Manual)</div>
                          <div className="text-xs text-gray-500">O'tkazma qilib chek yuborish orqali to'lash</div>
                        </div>
                        <button
                          onClick={() => setManualEnabled(!manualEnabled)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${manualEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${manualEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={handleUpdateSettings}
                      loading={updatingSettings}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-2xl"
                    >
                      Saqlash
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dangerous Zone */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Ma'lumotlar bazasini tozalash</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Barcha qatnovlar, haydovchilar, xabarlar va boshqa ma'lumotlarni o'chirib tashlash.</p>
                  </div>
                  <Button
                    onClick={handleClearDatabase}
                    loading={clearing}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold text-sm h-auto"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Tozalash
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">To'lovlarni tasdiqlash</h2>
              </div>

              <div className="grid gap-4">
                {bookings.filter(b => b.paymentMethod === 'manual' && b.paymentStatus === 'pending_review').length > 0 ? (
                  bookings.filter(b => b.paymentMethod === 'manual' && b.paymentStatus === 'pending_review').map((booking) => {
                    const passenger = usersList.find(u => u.id === booking.userId);
                    const ride = rides.find(r => r.id === booking.rideId);
                    return (
                      <div key={booking.id} className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl">
                            {passenger?.name?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{passenger?.name || 'Noma\'lum'}</h4>
                            <p className="text-sm text-gray-500">{passenger?.phone || passenger?.email}</p>
                            <div className="mt-1 text-xs text-gray-400">
                              {ride?.from} → {ride?.to} | {ride?.departureTime} | {booking.seatNumber}-o'rindiq
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex justify-center">
                          <a
                            href={booking.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 hover:border-emerald-500 transition-all"
                          >
                            <img src={booking.receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <Search className="w-5 h-5 text-white" />
                            </div>
                          </a>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <div className="text-lg font-bold text-emerald-500">{formatPrice(booking.price)}</div>
                            <div className="flex items-center gap-1 justify-end text-[10px] text-amber-500 uppercase font-bold">
                              <Clock className="w-3 h-3" />
                              Kutilmoqda
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => handleConfirmManualPayment(booking.id, 'cancelled')}
                            loading={paymentActionLoading === booking.id}
                            className="px-4 py-2 text-red-500 hover:bg-red-500/10 border-red-500/20 h-auto"
                          >
                            Rad etish
                          </Button>
                          <Button
                            onClick={() => handleConfirmManualPayment(booking.id, 'paid')}
                            loading={paymentActionLoading === booking.id}
                            className="px-4 py-2 bg-emerald-500 text-white h-auto"
                          >
                            Tasdiqlash
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-[#111827] p-12 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tasdiqlanishi kutilayotgan to'lovlar yo'q</h3>
                    <p className="text-gray-500">Hozircha barcha manual to'lovlar ko'rib chiqilgan.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bookings Modal */}
      {
        selectedRideForBookings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Yo'lovchilar ro'yxati</h3>
                  <p className="text-sm text-gray-500">{selectedRideForBookings.from} → {selectedRideForBookings.to} ({selectedRideForBookings.departureTime})</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRideForBookings(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  leftIcon={<X className="w-6 h-6 text-gray-500" />}
                />
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {bookings.filter(b => b.rideId === selectedRideForBookings.id).length > 0 ? (
                    bookings.filter(b => b.rideId === selectedRideForBookings.id).map((booking, idx) => {
                      const passenger = usersList.find(u => u.id === booking.userId);
                      return (
                        <div key={booking.id || idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold">
                              {passenger?.name?.[0].toUpperCase() || 'U'}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">{passenger?.name || 'Noma\'lum foydalanuvchi'}</h4>
                              <p className="text-xs text-gray-500">{passenger?.email || 'Email mavjud emas'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-500">{booking.seatNumber}-o'rindiq</div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold">{booking.status}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Bu qatnov uchun hali chiptalar sotilmagan.
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Jami: <span className="font-bold text-gray-900 dark:text-white">{bookings.filter(b => b.rideId === selectedRideForBookings.id).length} ta yo'lovchi</span>
                </div>
                <Button
                  onClick={() => setSelectedRideForBookings(null)}
                  className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm"
                >
                  Yopish
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">O'chirishni tasdiqlaysizmi?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Bu amalni ortga qaytarib bo'lmaydi.</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm({ isOpen: false, collectionName: '', id: '' })}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={confirmDelete}
                  loading={formLoading}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors h-auto"
                >
                  O'chirish
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
