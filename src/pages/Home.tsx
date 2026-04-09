import { useSettings } from '../context/SettingsContext';
import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
import { SafeImage } from '../components/SafeImage';
import { db, auth, handleFirestoreError, OperationType, withRetry } from '../firebase';
import { isValidContact, isValidEmail } from '../utils/validation';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LoadingScreen } from '../components/LoadingScreen';
import { WeatherWidget } from '../components/WeatherWidget';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import {
  Bus,
  MapPin,
  Clock,
  Star,
  Phone,
  MessageCircle,
  CreditCard,
  ShieldCheck,
  Zap,
  Camera,
  ChevronDown,
  ChevronUp,
  Armchair,
  User,
  Search,
  ThumbsUp,
  Calendar,
  Users,
  Headphones,
  Plus,
  Minus,
  Instagram,
  Facebook,
  Send,
  Mail,
  Menu,
  X as CloseIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const { logoUrl } = useSettings();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'weekly'>('today');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Modals state
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedRideForSeat, setSelectedRideForSeat] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ ride: any, seat: number } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentMethodLoading, setPaymentMethodLoading] = useState<'stripe' | 'manual' | null>(null);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [adminCardNumber, setAdminCardNumber] = useState('');
  const [adminCardOwner, setAdminCardOwner] = useState('');
  const [adminSupportPhone, setAdminSupportPhone] = useState('');
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [manualEnabled, setManualEnabled] = useState(true);
  const [timer, setTimer] = useState(30); // Reduced to 30 seconds
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rideBookings, setRideBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todaySales: 120,
    satisfaction: 95,
    experience: 10,
    driversCount: 50
  });

  // Data state
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [faqsList, setFaqsList] = useState<any[]>([
    {
      question: t('home.faq.q1'),
      answer: t('home.faq.a1')
    },
    {
      question: t('home.faq.q2'),
      answer: t('home.faq.a2')
    },
    {
      question: t('home.faq.q3'),
      answer: t('home.faq.a3')
    },
    {
      question: t('home.faq.q4'),
      answer: t('home.faq.a4')
    },
    {
      question: t('home.faq.q5'),
      answer: t('home.faq.a5')
    },
    {
      question: t('home.faq.q6'),
      answer: t('home.faq.a6')
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [messageForm, setMessageForm] = useState({ name: '', contact: '', message: '' });
  const [messageSending, setMessageSending] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchFirestoreData = async () => {
      try {
        const ridesCol = collection(db, 'rides');
        const driversCol = collection(db, 'drivers');
        const faqsCol = collection(db, 'faqs');
        const reviewsCol = collection(db, 'reviews');
        const settingsCol = collection(db, 'settings');

        let ridesSnapshot, driversSnapshot, faqsSnapshot, reviewsSnapshot, settingsSnapshot;
        try {
          [ridesSnapshot, driversSnapshot, faqsSnapshot, reviewsSnapshot, settingsSnapshot] = await withRetry(() => Promise.all([
            getDocs(ridesCol),
            getDocs(driversCol),
            getDocs(faqsCol),
            getDocs(query(reviewsCol, where('status', '==', 'approved'))),
            getDocs(settingsCol)
          ]));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'multiple collections');
          return;
        }

        const ridesData = ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const faqsData = faqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const reviewsData = reviewsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((r: any) => r.isFeatured === true);

        // Calculate real stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const bookingsCol = collection(db, 'bookings');
        const todayBookingsQuery = query(bookingsCol, where('createdAt', '>=', todayStr));
        const todayBookingsSnapshot = await getDocs(todayBookingsQuery);

        const allApprovedReviews = reviewsSnapshot.docs.map(doc => doc.data() as any);
        const avgRating = allApprovedReviews.length > 0
          ? allApprovedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / allApprovedReviews.length
          : 4.8;
        const satisfactionRate = Math.round((avgRating / 5) * 100);

        setStats({
          todaySales: todayBookingsSnapshot.size || 120, // Fallback to 120 if 0 for demo feel, or just use real
          satisfaction: satisfactionRate || 95,
          experience: 10, // Hardcoded as brand age
          driversCount: driversData.length || 50
        });

        const paymentSettings = settingsSnapshot.docs.find(d => d.id === 'payment')?.data();
        if (paymentSettings) {
          setAdminCardNumber(paymentSettings.adminCardNumber || '');
          setAdminCardOwner(paymentSettings.adminCardOwner || '');
          setAdminSupportPhone(paymentSettings.adminSupportPhone || '');
          setStripeEnabled(paymentSettings.stripeEnabled !== false);
          setManualEnabled(paymentSettings.manualEnabled !== false);
        }

        setRides(ridesData);
        setDrivers(driversData);
        setReviews(reviewsData);
        if (faqsData.length > 0) {
          setFaqsList(faqsData);
        }
      } catch (error) {
        console.error("Failed to fetch data from Firestore", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFirestoreData();
  }, []);

  useEffect(() => {
    if (!selectedRideForSeat) {
      setRideBookings([]);
      return;
    }

    const fetchBookings = async () => {
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('rideId', '==', selectedRideForSeat)
        );
        const snapshot = await getDocs(bookingsQuery);
        const bookings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(b => b.status === 'pending' || b.status === 'confirmed');
        setRideBookings(bookings);
      } catch (error) {
        console.error("Error fetching ride bookings:", error);
      }
    };

    fetchBookings();
  }, [selectedRideForSeat]);

  useEffect(() => {
    let interval: any;
    if (showManualPayment && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showManualPayment, timer]);

  const uniqueFromCities = Array.from(new Set(rides.map(r => r.from))).filter(Boolean).sort();
  const uniqueToCities = Array.from(new Set(rides.map(r => r.to))).filter(Boolean).sort();

  const filteredRides = rides.filter(ride => {
    const matchesDate = ride.date === selectedDate;
    const matchesFrom = !searchFrom || ride.from === searchFrom;
    const matchesTo = !searchTo || ride.to === searchTo;
    return matchesDate && matchesFrom && matchesTo;
  });
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedRide = rides.find(r => r.id === selectedRideForSeat);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const handleSeatSelect = async (seatNumber: number) => {
    if (user?.role === 'admin' && selectedRide) {
      const isTaken = rideBookings.some(b => b.seatNumber === seatNumber);
      if (isTaken) {
        // Free the seat
        if (!window.confirm(`${seatNumber}-o'rinni bo'shatmoqchimisiz?`)) return;
        setBookingLoading(true);
        try {
          const bookingToCancel = rideBookings.find(b => b.seatNumber === seatNumber);
          if (bookingToCancel) {
            const bookingRef = doc(db, 'bookings', bookingToCancel.id);
            await updateDoc(bookingRef, { status: 'cancelled', updatedAt: new Date().toISOString() });
            toast.success("O'rin bo'shatildi");
            // Refresh ride bookings locally
            setRideBookings(prev => prev.filter(b => b.id !== bookingToCancel.id));
          }
        } catch (error) {
          console.error("Error freeing seat:", error);
          toast.error("Xatolik yuz berdi");
        } finally {
          setBookingLoading(false);
        }
      } else {
        // Reserve the seat
        if (!window.confirm(`${seatNumber}-o'rinni band qilmoqchimisiz?`)) return;
        setBookingLoading(true);
        try {
          const bookingData = {
            userId: user.id,
            userName: "Admin (Band)",
            rideId: selectedRide.id,
            seatNumber: seatNumber,
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'manual',
            createdAt: new Date().toISOString(),
            price: selectedRide.price,
            passengerGender: 'male', // Default for admin reservation
            isAdminReservation: true
          };
          const docRef = await addDoc(collection(db, 'bookings'), bookingData);
          toast.success("O'rin band qilindi");
          setRideBookings(prev => [...prev, { id: docRef.id, ...bookingData }]);
        } catch (error) {
          console.error("Error reserving seat:", error);
          toast.error("Xatolik yuz berdi");
        } finally {
          setBookingLoading(false);
        }
      }
      return;
    }
    setSelectedSeat(seatNumber);
  };

  const proceedToPayment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedSeat || !selectedRide) return;

    setPendingBooking({ ride: selectedRide, seat: selectedSeat });
    setSelectedRideForSeat(null);
    setShowPaymentSelection(true);
  };

  const handleStripePayment = async () => {
    if (!pendingBooking || !user) return;

    setPaymentMethodLoading('stripe');
    setBookingLoading(true);
    try {
      const bookingData = {
        userId: user.id,
        rideId: pendingBooking.ride.id,
        seatNumber: pendingBooking.seat,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
        price: pendingBooking.ride.price,
        passengerGender: user.gender || 'male'
      };

      const bookingDoc = await addDoc(collection(db, 'bookings'), bookingData);

      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          bookingId: bookingDoc.id,
          rideName: `${pendingBooking.ride.from} - ${pendingBooking.ride.to} (${pendingBooking.ride.busType})`,
          price: pendingBooking.ride.price
        })
      });

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error(session.error || "Stripe session creation failed");
      }
    } catch (error) {
      console.error("Stripe payment failed:", error);
      toast.error("An error occurred during Stripe payment.");
      setPaymentMethodLoading(null);
      setBookingLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!pendingBooking || !user) return;

    setPaymentMethodLoading('manual');
    setBookingLoading(true);
    try {
      const bookingData = {
        userId: user.id,
        rideId: pendingBooking.ride.id,
        seatNumber: pendingBooking.seat,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'manual',
        createdAt: new Date().toISOString(),
        price: pendingBooking.ride.price,
        passengerGender: user.gender || 'male'
      };

      const bookingDoc = await addDoc(collection(db, 'bookings'), bookingData);
      setCurrentBookingId(bookingDoc.id);
      setShowPaymentSelection(false);
      setShowManualPayment(true);
      setTimer(30);
    } catch (error) {
      console.error("Manual booking failed:", error);
      toast.error("An error occurred during booking.");
    } finally {
      setPaymentMethodLoading(null);
      setBookingLoading(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) { // 800KB limit to stay under Firestore 1MB doc limit after base64
      toast.error("Rasm hajmi juda katta (maksimum 800KB). Iltimos, kichikroq rasm yuklang.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitReceipt = async () => {
    if (!currentBookingId || !receiptFile) return;

    setUploadingReceipt(true);
    try {
      const bookingRef = doc(db, "bookings", currentBookingId);
      await updateDoc(bookingRef, {
        paymentStatus: "pending_review",
        paymentMethod: "manual",
        receiptUrl: receiptFile,
        receiptUploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setShowManualPayment(false);
      setPaymentSuccess(true);
      toast.success("Chek muvaffaqiyatli yuklandi. Admin tasdiqlashini kuting.");
    } catch (error) {
      console.error("Receipt upload failed:", error);
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${currentBookingId}`);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      setLogoClickCount(1);
    } else {
      const newCount = logoClickCount + 1;
      setLogoClickCount(newCount);
      if (newCount >= 5) {
        navigate('/administrator/dashboard');
        setLogoClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.name || !messageForm.contact || !messageForm.message) return;

    if (!isValidContact(messageForm.contact)) {
      toast.error("Please enter a valid email or phone number (+998XXXXXXXXX)");
      return;
    }

    setMessageSending(true);
    try {
      const messageData = {
        ...messageForm,
        createdAt: new Date().toISOString(),
        status: 'unread'
      };

      try {
        await addDoc(collection(db, 'messages'), messageData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'messages');
        return;
      }

      setMessageSuccess(true);
      setMessageForm({ name: '', contact: '', message: '' });
      setTimeout(() => setMessageSuccess(false), 5000);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("An error occurred while sending the message.");
    } finally {
      setMessageSending(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReviewLoading(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        userName: user.name || 'Foydalanuvchi',
        userPhoto: user.picture || '',
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user.id
      });
      setShowReviewModal(false);
      setReviewForm({ rating: 5, comment: '' });
      toast.success("Your review has been submitted and will be published after admin approval.");
    } catch (error) {
      console.error("Error submitting review:", error);
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = newsletterEmail.trim();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      toast.error("Iltimos, to'g'ri email kiriting.");
      return;
    }

    setNewsletterLoading(true);
    try {
      const emailLower = normalizedEmail.toLowerCase();
      const subscribersRef = collection(db, 'newsletter_subscribers');
      const existingQuery = query(subscribersRef, where('emailLower', '==', emailLower));
      const existingSnapshot = await withRetry(() => getDocs(existingQuery));
      if (!existingSnapshot.empty) {
        toast.success("Siz allaqachon obuna bo'lgansiz.");
        return;
      }

      const payload: any = {
        email: normalizedEmail,
        emailLower,
        createdAt: new Date().toISOString(),
        source: 'footer'
      };
      if (user?.id) {
        payload.userId = user.id;
      }

      await withRetry(() => addDoc(subscribersRef, payload));
      setNewsletterEmail('');
      toast.success("Obuna muvaffaqiyatli yakunlandi!");
    } catch (error) {
      console.error("Newsletter subscribe failed:", error);
      handleFirestoreError(error, OperationType.CREATE, 'newsletter_subscribers');
      toast.error("Obuna bo'lishda xatolik yuz berdi.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <div id="home" className="min-h-screen bg-white dark:bg-[#0B1120] font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header / Hero */}
      <header className="bg-gray-50 dark:bg-[#0B1120] text-gray-900 dark:text-white relative overflow-hidden min-h-[90vh] flex flex-col transition-colors duration-300">
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_rgba(16,185,129,0.15)_0%,_transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_rgba(16,185,129,0.1)_0%,_transparent_50%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(11,17,32,0)_0%,_#0B1120_100%)]" />

          {/* Subtle grid pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center transition-all duration-300">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div
                className="flex items-center space-x-2 text-emerald-500 cursor-pointer select-none"
                onClick={handleLogoClick}
              >
                <img src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tez<span className="text-emerald-500">Chipta</span></span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600 dark:text-gray-300">
              <a href="#home" className="hover:text-emerald-500 dark:hover:text-white transition-colors">Bosh sahifa</a>
              <Link to="/blog" className="hover:text-emerald-500 dark:hover:text-white transition-colors">Blog</Link>
              <a href="#rides" className="hover:text-emerald-500 dark:hover:text-white transition-colors">Reyslar</a>
              <a href="#buses" className="hover:text-emerald-500 dark:hover:text-white transition-colors">Avtobuslar</a>
              <a href="#help" className="hover:text-emerald-500 dark:hover:text-white transition-colors">Yordam</a>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              <div className="hidden md:flex items-center space-x-6">
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link to="/profile" className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/administrator/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-white transition-colors">
                        Admin Panel
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={logout}
                      className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-white transition-colors"
                    >
                      Chiqish
                    </Button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 px-6 py-2.5 rounded-full transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    Kirish / Ro'yxatdan o'tish
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors border-0 h-auto"
              >
                {isMobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-[#111827] z-50 md:hidden shadow-2xl flex flex-col p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2 text-emerald-500">
                    <img src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">TezChipta</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg border-0 h-auto"
                  >
                    <CloseIcon className="w-6 h-6" />
                  </Button>
                </div>

                <div className="flex flex-col space-y-4 mb-8">
                  <a href="#home" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-gray-900 dark:text-white hover:text-emerald-500 transition-colors">Bosh sahifa</a>
                  <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-gray-900 dark:text-white hover:text-emerald-500 transition-colors">Blog</Link>
                  <a href="#rides" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-gray-900 dark:text-white hover:text-emerald-500 transition-colors">Reyslar</a>
                  <a href="#buses" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-gray-900 dark:text-white hover:text-emerald-500 transition-colors">Avtobuslar</a>
                  <a href="#help" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-gray-900 dark:text-white hover:text-emerald-500 transition-colors">Yordam</a>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Mavzu</span>
                    <ThemeToggle />
                  </div>

                  {user ? (
                    <div className="space-y-4">
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                      >
                        <User className="w-5 h-5 text-emerald-500" />
                        <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/administrator/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block w-full text-center py-3 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl font-medium"
                        >
                          Admin Panel
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full py-3 text-red-600 dark:text-red-400 font-medium border-0 h-auto hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Chiqish
                      </Button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20"
                    >
                      Kirish / Ro'yxatdan o'tish
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 text-gray-900 dark:text-white leading-tight"
            >
              {t('home.hero.title')}
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2 }}
              className="w-12 sm:w-16 h-1 bg-emerald-500 dark:bg-white mx-auto mb-6 sm:mb-8 rounded-full opacity-80"
            />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
            >
              <span className="text-amber-500">{t('home.hero.highlight')}</span>{' '}
              <span className="text-gray-900 dark:text-white">{t('home.hero.action')}</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium mt-4 sm:mt-8 px-4"
            >
              {t('home.hero.subtitle')}
            </motion.p>
          </div>

          {/* Statistics Bar */}
          <div className="w-full max-w-5xl mx-auto mt-10 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white/60 dark:bg-[#0B1120]/60 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.todaySales}+</div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">Bugun</div>
            </div>
            <div className="bg-white/60 dark:bg-[#0B1120]/60 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <ThumbsUp className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.satisfaction}%</div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">Mamnun</div>
            </div>
            <div className="bg-white/60 dark:bg-[#0B1120]/60 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.experience} yil</div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">Tajriba</div>
            </div>
            <div className="bg-white/60 dark:bg-[#0B1120]/60 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.driversCount}+</div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">Haydovchi</div>
            </div>
          </div>

          <div className="w-full max-w-5xl mx-auto mt-10 sm:mt-12 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('home.search.from_label')}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  <select
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="">{t('home.search.all_cities')}</option>
                    {uniqueFromCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('home.search.to_label')}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <select
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="">{t('home.search.all_cities')}</option>
                    {uniqueToCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('home.search.date_label')}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value as 'today' | 'tomorrow' | 'weekly')}
                    className="w-full bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="today">{t('home.search.today')}</option>
                    <option value="tomorrow">{t('home.search.tomorrow')}</option>
                    <option value="weekly">{t('home.search.weekly')}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <Button
                onClick={() => {
                  const element = document.getElementById('rides');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                leftIcon={<Search className="w-5 h-5" />}
              >
                {t('home.search.btn')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Weather Widget for Admins/Drivers */}
      {(user?.role === 'admin' || user?.role === 'driver') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WeatherWidget />
        </div>
      )}

      <section id="rides" className="bg-white dark:bg-[#0B1120] py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search / Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{t('home.rides.title')}</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('home.rides.subtitle')}</p>
            </div>
            <div className="flex bg-gray-100 dark:bg-[#111827] rounded-xl p-1 border border-gray-200 dark:border-white/5 overflow-x-auto scrollbar-hide">
              {(['today', 'tomorrow', 'weekly'] as const).map((date) => {
                const availableCount = rides.filter(r => r.date === date && (r.totalSeats || 40) > (r.bookedSeats?.length || 0)).length;
                return (
                  <Button
                    key={date}
                    variant="secondary"
                    onClick={() => setSelectedDate(date)}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all border-0 h-auto whitespace-nowrap flex-1 sm:flex-none ${selectedDate === date
                      ? 'bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-white/10'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{date === 'today' ? t('home.search.today') : date === 'tomorrow' ? t('home.search.tomorrow') : t('home.search.weekly')}</span>
                      {availableCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                          {availableCount}
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <LoadingScreen fullScreen={false} message={t('home.rides.loading')} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRides.map((ride) => {
                  const driver = drivers.find(d => d.id === ride.driverId);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={ride.id}
                      className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-md relative group"
                    >
                      {ride.busType === 'VIP' && (
                        <div className="absolute top-0 right-6 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-b-lg uppercase tracking-wider z-10">{t('home.rides.recommended')}</div>
                      )}
                      <div className="p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
                          <div className="w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                {ride.busType === 'VIP' ? 'Urganch VIP Express' : ride.busType === 'Lux' ? 'Grand Tour Urganch' : 'Xorazm Comfort'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border uppercase tracking-wider ${ride.busType === 'VIP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                ride.busType === 'Lux' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                  'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20'
                                }`}>
                                {ride.busType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                              <div className="flex items-center text-amber-500 font-bold">
                                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current mr-1" />
                                {ride.rating}
                              </div>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-emerald-600 dark:text-emerald-500 font-bold">{ride.from} → {ride.to}</span>
                            </div>
                          </div>
                          <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end bg-gray-50 dark:bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold mb-0 sm:mb-1">{t('home.rides.price')}</div>
                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-amber-500">
                              {formatPrice(ride.price)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-6 sm:mb-10 bg-gray-50/50 dark:bg-white/5 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                          <div className="text-left">
                            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-0.5 sm:mb-1">{ride.departureTime}</div>
                            <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">{t('home.rides.departure')}</div>
                            <div className="text-[10px] text-emerald-500 font-medium mt-1">{ride.from}</div>
                          </div>

                          <div className="flex-1 flex items-center justify-center px-2 sm:px-6 relative">
                            <div className="absolute top-1/2 left-0 w-full flex items-center -translate-y-1/2 px-2 sm:px-6">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <div className="flex-1 border-t-2 border-dashed border-gray-300 dark:border-gray-700"></div>
                              <div className="px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 z-10 shadow-sm">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                {ride.duration}
                              </div>
                              <div className="flex-1 border-t-2 border-dashed border-gray-300 dark:border-gray-700"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-0.5 sm:mb-1">{ride.arrivalTime}</div>
                            <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Yetib borish</div>
                            <div className="text-[10px] text-gray-500 font-medium mt-1">{ride.to}</div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-100 dark:border-white/5">
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedDriverId(ride.driverId)}
                            className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold rounded-xl"
                            leftIcon={<Phone className="w-4 h-4" />}
                          >
                            {t('home.rides.driver')}
                          </Button>
                          <Button
                            onClick={() => setSelectedRideForSeat(ride.id)}
                            className="flex-1 sm:flex-none px-4 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-base font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                          >
                            {t('home.rides.book_btn')}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredRides.length === 0 && (
                <div className="col-span-1 lg:col-span-2 text-center py-12 text-gray-500">
                  Bu sanada qatnovlar topilmadi.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="buses" className="bg-gray-50 dark:bg-[#0B1120] py-24 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.features.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition-all shadow-sm">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('home.features.f1_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{t('home.features.f1_desc')}</p>
            </div>

            <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition-all shadow-sm">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-6">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('home.features.f2_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{t('home.features.f2_desc')}</p>
            </div>

            <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition-all shadow-sm">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-6">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('home.features.f3_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{t('home.features.f3_desc')}</p>
            </div>

            <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition-all shadow-sm">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('home.features.f4_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{t('home.features.f4_desc')}</p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-xl">
              <ShieldCheck className="w-6 h-6" />
              100% Xavfsiz
            </div>
            <div className="text-gray-900 dark:text-white font-black text-2xl tracking-wider">UZCARD</div>
            <div className="text-gray-900 dark:text-white font-black text-2xl tracking-wider">HUMO</div>
            <div className="text-gray-900 dark:text-white font-black text-2xl tracking-wider">CLICK</div>
            <div className="text-gray-900 dark:text-white font-black text-2xl tracking-wider">PAYME</div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Reviews Section */}
        <div id="reviews" className="mt-12 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.reviews.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('home.reviews.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.length > 0 ? (
              reviews.map((review) => {
                const initials = review.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                return (
                  <div key={review.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5 p-6 hover:border-emerald-500/30 transition-all shadow-sm flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      {review.userPhoto ? (
                        <img
                          src={review.userPhoto}
                          alt={review.userName}
                          className="w-12 h-12 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{review.userName}</h3>
                        <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic leading-relaxed flex-grow">
                      "{review.comment}"
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                      {new Date(review.createdAt).toLocaleDateString('uz-UZ')}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-[#111827] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('home.reviews.empty') || 'Hozircha fikrlar mavjud emas.'}</p>
              </div>
            )}
          </div>

          <div className="mt-12 text-center">
            {user ? (
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(true)}
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >{t('home.reviews.add')}</Button>
            ) : (
              <div className="inline-flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <p className="text-gray-600 dark:text-gray-400 font-medium">{t('home.reviews.login_to_review') || 'Fikr qoldirish uchun tizimga kiring'}</p>
                <Link to="/login">
                  <Button variant="outline" size="sm" leftIcon={<User className="w-4 h-4" />}>
                    {t('menu.login')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Help Center & Contact */}
        <div id="help" className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          {/* Left: FAQ */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.faq.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
              {t('home.faq.subtitle') || "Eng ko'p beriladigan savollarga javoblar. Agar o'zingizni qiziqtirgan savolga javob topmasangiz, biz bilan bog'laning."}
            </p>
            <div className="space-y-4">
              {faqsList.map((faq, idx) => (
                <FAQItem key={idx} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('home.contact.title')}</h3>
            {messageSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-6 rounded-2xl text-center">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
                <h4 className="text-lg font-bold mb-2">{t('home.contact.success')}</h4>
                <p className="text-sm">{t('home.contact.success_desc') || "Tez orada siz bilan bog'lanamiz."}</p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSendMessage}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('home.contact.name')}</label>
                  <input
                    type="text"
                    required
                    value={messageForm.name}
                    onChange={e => setMessageForm({ ...messageForm, name: e.target.value })}
                    placeholder="Falonchi Pistonchiyev"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('home.contact.contact') || 'Email yoki Telefon'}</label>
                  <input
                    type="text"
                    required
                    value={messageForm.contact}
                    onChange={e => setMessageForm({ ...messageForm, contact: e.target.value })}
                    placeholder="info@example.com yoki +998..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Xabar</label>
                  <textarea
                    required
                    value={messageForm.message}
                    onChange={e => setMessageForm({ ...messageForm, message: e.target.value })}
                    placeholder="Qanday yordam bera olamiz?"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-600 resize-none"
                  ></textarea>
                </div>
                <Button
                  loading={messageSending}
                  className="w-full"
                  size="lg"
                >
                  Xabarni yuborish
                </Button>
              </form>
            )}

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-[#0B1120] text-gray-500 dark:text-gray-400">Yoki WhatsApp orqali tezkor javob oling</span>
              </div>
            </div>

            <a
              href="https://wa.me/998878118917"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-xl font-medium transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp orqali yozish
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-[#0B1120] border-t border-gray-200 dark:border-white/10 text-gray-900 dark:text-white pt-16 pb-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Logo & Info */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-500">
                <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tez<span className="text-emerald-600 dark:text-emerald-500">Chipta</span></span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {t('home.footer.desc') || "Xorazmdan Toshkentga va qaytish yo'nalishida eng qulay, tez va xavfsiz avtobus qatnovlari."}
              </p>
              <div className="flex items-center space-x-4">
                <a href="https://instagram.com/cognifycompany" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group">
                  <Instagram className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                </a>
                <a href="https://t.me/cognifycompany" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group">
                  <Send className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                </a>
                <a href="https://www.facebook.com/profile.php?id=61577544324897" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group">
                  <Facebook className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">{t('home.footer.links')}</h3>
              <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#home" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('menu.home')}</a></li>
                <li><a href="#rides" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('home.hero.search')}</a></li>
                <li><a href="#reviews" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('home.reviews.title')}</a></li>
                <li><a href="#help" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('home.faq.title')}</a></li>
                <li><Link to="/privacy-policy" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('home.footer.privacy') || 'Maxfiylik siyosati'}</Link></li>
                <li><Link to="/termsofservice" className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">{t('home.footer.terms') || 'Foydalanish shartlari'}</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold mb-6">{t('home.footer.contact')}</h3>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Xorazm viloyati, Urganch shahri, Avtovokzal binosi</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>+998 87 811 89 17</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>aslbekqoziboyev536@gmail.com</span>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-bold mb-6">{t('home.footer.newsletter')}</h3>
              <p className="text-gray-400 text-sm mb-6">
                {t('home.footer.newsletter_desc') || "Chegirmalar va yangi reyslar haqida birinchilardan bo'lib xabardor bo'ling."}
              </p>
              <div className="relative">
                <form onSubmit={handleNewsletter}>
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Email manzilingiz"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Button
                    type="submit"
                    loading={newsletterLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 rounded-lg h-auto border-0"
                    leftIcon={<Send className="w-4 h-4 text-white" />}
                  />
                </form>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} TezChipta. {t('home.footer.rights') || 'Barcha huquqlar himoyalangan.'}</p>
            <div className="flex items-center space-x-6">
              <a href="#" className="hover:text-emerald-500 transition-colors">{t('home.footer.privacy') || 'Maxfiylik siyosati'}</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">{t('home.footer.terms') || 'Ommaviy oferta'}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Driver Modal */}
      <Modal
        isOpen={!!selectedDriverId}
        onClose={() => setSelectedDriverId(null)}
        title="Haydovchi ma'lumotlari"
      >
        {selectedDriver && (
          <div className="text-center">
            <img
              src={selectedDriver.photo}
              alt={selectedDriver.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white/10"
              referrerPolicy="no-referrer"
            />
            <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{selectedDriver.name}</h3>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="flex items-center text-amber-500 font-medium">
                <Star className="w-4 h-4 fill-current mr-1" />
                {selectedDriver.rating}
              </span>
              <span>•</span>
              <span>{selectedDriver.experience} yil tajriba</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {selectedDriver.bio}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => window.location.href = `tel:${selectedDriver.phone}`}
                className="flex-1"
                leftIcon={<Phone className="w-5 h-5" />}
              >
                Qo'ng'iroq
              </Button>
              <Button
                onClick={() => window.open("https://wa.me/998878118917", "_blank")}
                className="flex-1"
                leftIcon={<MessageCircle className="w-5 h-5" />}
              >
                WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Seat Selection Modal */}
      <Modal
        isOpen={!!selectedRideForSeat}
        onClose={() => {
          setSelectedRideForSeat(null);
          setSelectedSeat(null);
        }}
        title={t('home.rides.select_seat')}
      >
        {selectedRide && (
          <div>
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Avtobus suratlari</h4>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {selectedRide.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="Bus interior"
                    className="w-48 h-32 object-cover rounded-xl flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/5 p-4 sm:p-6 rounded-2xl mb-8 relative">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('home.rides.driver')}</div>
              <div className={`mt-8 grid gap-2 sm:gap-3 max-w-[320px] mx-auto ${(selectedRide.seatLayout || '2x2') === '2x2' ? 'grid-cols-5' : 'grid-cols-4'
                }`}>
                {Array.from({ length: Math.ceil((selectedRide.totalSeats || 40) / ((selectedRide.seatLayout || '2x2') === '2x2' ? 4 : 3)) * ((selectedRide.seatLayout || '2x2') === '2x2' ? 5 : 4) }).map((_, i) => {
                  const layout = selectedRide.seatLayout || '2x2';
                  const cols = layout === '2x2' ? 5 : 4;
                  const col = i % cols;

                  let isAisle = false;
                  if (layout === '2x2' && col === 2) isAisle = true;
                  if (layout === '2x1' && col === 2) isAisle = true;
                  if (layout === '1x2' && col === 1) isAisle = true;

                  if (isAisle) {
                    return <div key={`aisle-${i}`} className="w-full h-full"></div>;
                  }

                  const row = Math.floor(i / cols);
                  let seatInRow = col;
                  if (layout === '2x2' && col > 2) seatInRow = col - 1;
                  if (layout === '2x1' && col > 2) seatInRow = col - 1;
                  if (layout === '1x2' && col > 1) seatInRow = col - 1;

                  const seatsPerRow = layout === '2x2' ? 4 : 3;
                  const seatNum = row * seatsPerRow + seatInRow + 1;

                  if (seatNum > (selectedRide.totalSeats || 40)) {
                    return <div key={`empty-${i}`} className="w-full h-full"></div>;
                  }

                  const bookingForSeat = rideBookings.find(b => b.seatNumber === seatNum);
                  const isTaken = !!bookingForSeat;
                  const passengerGender = bookingForSeat?.passengerGender;
                  const isSelected = selectedSeat === seatNum;

                  return (
                    <Button
                      key={seatNum}
                      disabled={isTaken && user?.role !== 'admin'}
                      onClick={() => handleSeatSelect(seatNum)}
                      variant={isSelected ? 'primary' : 'secondary'}
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all p-0 h-auto border-2 ${isTaken
                        ? passengerGender === 'female'
                          ? 'bg-red-500 border-red-500 text-white cursor-not-allowed opacity-90'
                          : 'bg-blue-500 border-blue-500 text-white cursor-not-allowed opacity-90'
                        : isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm'
                        }`}
                    >
                      {seatNum}
                    </Button>
                  );
                })}
              </div>
              <div className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 rounded shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400">Bo'sh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400">Tanlangan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400">Erkak</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400">Ayol</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-6">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Jami summa:</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {selectedSeat ? formatPrice(selectedRide.price) : '0 so\'m'}
                </div>
              </div>
              <Button
                disabled={!selectedSeat}
                loading={bookingLoading}
                onClick={proceedToPayment}
                className="px-8 py-3"
              >{t('home.rides.continue')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        isOpen={paymentSuccess}
        onClose={() => setPaymentSuccess(false)}
        title="Muvaffaqiyatli band qilindi!"
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tabriklaymiz!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sizning o'rindig'ingiz muvaffaqiyatli band qilindi. Chipta ma'lumotlarini profilingizda ko'rishingiz mumkin.
          </p>
          <Button
            onClick={() => setPaymentSuccess(false)}
            className="w-full py-3"
          >
            Tushunarli
          </Button>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Fikr-mulohaza qoldirish"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baholang</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  key={star}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  className="focus:outline-none transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${star <= reviewForm.rating ? 'text-amber-500 fill-current' : 'text-gray-300 dark:text-gray-700'}`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sizning fikringiz</label>
            <textarea
              required
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder="Xizmat haqida o'z fikringizni yozing..."
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 min-h-[120px] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReviewModal(false)}
              className="flex-1 py-3"
            >{t('home.rides.cancel')}</Button>
            <Button
              type="submit"
              loading={reviewLoading}
              className="flex-1 py-3"
            >{t('home.contact.send')}</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Selection Modal */}
      <Modal
        isOpen={showPaymentSelection}
        onClose={() => setShowPaymentSelection(false)}
        title={t('home.payment.title')}
      >
        <div className="space-y-4">
          {stripeEnabled && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStripePayment}
              disabled={paymentMethodLoading !== null}
              className="w-full flex items-center justify-between p-6 rounded-2xl bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 hover:border-emerald-500 transition-all group h-auto disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-white">Stripe</div>
                  <div className="text-xs text-gray-500">Onlayn karta orqali to'lov</div>
                </div>
              </div>
              {paymentMethodLoading === 'stripe' ? (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
              )}
            </motion.button>
          )}

          {manualEnabled && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleManualPayment}
              disabled={paymentMethodLoading !== null}
              className="w-full flex items-center justify-between p-6 rounded-2xl bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 hover:border-emerald-500 transition-all group h-auto disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Armchair className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-white">Karta orqali (Manual)</div>
                  <div className="text-xs text-gray-500">Karta raqamiga o'tkazma va chek yuklash</div>
                </div>
              </div>
              {paymentMethodLoading === 'manual' ? (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
              )}
            </motion.button>
          )}

          {!stripeEnabled && !manualEnabled && (
            <div className="p-8 text-center text-gray-500">
              Hozircha to'lov usullari mavjud emas.
            </div>
          )}
        </div>
      </Modal>

      {/* Manual Payment Modal */}
      <Modal
        isOpen={showManualPayment}
        onClose={() => setShowManualPayment(false)}
        title="Karta orqali to'lov"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
              Quyidagi karta raqamiga {pendingBooking && formatPrice(pendingBooking.ride.price)} o'tkazing va chekni yuklang.
            </p>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Karta raqami</div>
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider mb-1">
              {adminCardNumber || '8600 0000 0000 0000'}
            </div>
            {adminCardOwner && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {adminCardOwner}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(adminCardNumber);
                toast.success("Karta raqami nusxalandi!");
              }}
              className="mt-2 text-emerald-500 hover:bg-emerald-500/10"
            >
              Nusxa olish
            </Button>
          </div>

          {adminSupportPhone && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Savollar bo'yicha:</p>
              <a href={`tel:${adminSupportPhone}`} className="text-sm font-bold text-emerald-500 hover:underline">
                {adminSupportPhone}
              </a>
            </div>
          )}

          {timer > 0 ? (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500 mb-1">Chek yuklash imkoniyati ochilishiga:</div>
              <div className="text-3xl font-bold text-emerald-500">
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To'lov cheki (rasm)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all bg-gray-50 dark:bg-[#111827]"
                  >
                    {receiptFile ? (
                      <img src={receiptFile} alt="Receipt" className="h-full w-full object-contain p-2" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Chekni tanlang</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <Button
                disabled={!receiptFile}
                loading={uploadingReceipt}
                onClick={submitReceipt}
                className="w-full py-4"
              >
                Tasdiqlash uchun yuborish
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        isOpen={paymentSuccess}
        onClose={() => {
          setPaymentSuccess(false);
          setSelectedSeat(null);
        }}
        title="Muvaffaqiyatli!"
      >
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {currentBookingId ? "Chek yuborildi!" : "Chipta xarid qilindi!"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {currentBookingId
              ? "To'lov cheki adminga yuborildi. Tasdiqlangandan so'ng chiptangiz tayyor bo'ladi."
              : "To'lov muvaffaqiyatli amalga oshirildi. Chipta ma'lumotlari profilingizda mavjud."}
          </p>
          <Button
            onClick={() => {
              setPaymentSuccess(false);
              setSelectedSeat(null);
              setCurrentBookingId(null);
              setReceiptFile(null);
            }}
            className="w-full py-3"
          >
            Tushunarli
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function FAQItem({ question, answer }: { key?: number | string, question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${isOpen
      ? 'border-emerald-500/30 bg-white dark:bg-[#111827]'
      : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0B1120]'
      }`}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none h-auto border-0 rounded-none hover:bg-transparent"
      >
        <span className={`font-medium transition-colors ${isOpen ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-white/5 mt-2">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
