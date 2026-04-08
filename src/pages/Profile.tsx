import { useSettings } from '../context/SettingsContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, withRetry } from '../firebase';
import { isValidEmail } from '../utils/validation';
import { useNavigate, Link } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from '../components/ui/Button';
import { Bus, Calendar, Clock, MapPin, User, Mail, ShieldCheck, ArrowLeft, LogOut, Edit2, Check, X, Download, Phone, CreditCard, Navigation, Map } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { WeatherWidget } from '../components/WeatherWidget';
import { SafeImage } from '../components/SafeImage';
import { BusTracker } from '../components/BusTracker';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

export default function Profile() {
  const { logoUrl } = useSettings();
  const { user, logout, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newGender, setNewGender] = useState(user?.gender || 'male');
  const [savingName, setSavingName] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [trackingRideId, setTrackingRideId] = useState<string | null>(null);
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [sharingLocationId, setSharingLocationId] = useState<string | null>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'newsletter'>('bookings');

  const handleDownloadTicket = async (bookingId: string) => {
    setDownloadingId(bookingId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/generate-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ bookingId })
      });

      if (!response.ok) throw new Error("Chiptani yuklab olishda xatolik");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TezChipta_${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Chipta yuklab olindi!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred while downloading the ticket");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      setNewName(user.name);
      setNewGender(user.gender || 'male');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { name: newName, gender: newGender });
      toast.success("Profil muvaffaqiyatli o'zgartirildi");
      setIsEditingName(false);
      // AuthContext will pick up the change via onAuthStateChanged or we can reload
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating the profile");
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchBookings = async () => {
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', user.id)
        );

        let bookingsSnapshot;
        try {
          bookingsSnapshot = await getDocs(bookingsQuery);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'bookings');
          return;
        }

        const bookingsData = (await Promise.all(
          bookingsSnapshot.docs.map(async (bookingDoc) => {
            const data = bookingDoc.data();
            // Fetch ride details
            const rideDoc = await getDoc(doc(db, 'rides', data.rideId));
            return {
              id: bookingDoc.id,
              ...data,
              ride: rideDoc.exists() ? { id: rideDoc.id, ...rideDoc.data() } : null
            };
          })
        )).filter((b: any) => b.status === 'confirmed' || b.paymentStatus === 'pending_review');

        setBookings(bookingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    if (user?.role === 'driver') {
      const fetchDriverRides = async () => {
        try {
          const ridesQuery = query(
            collection(db, 'rides'),
            where('driverId', '==', user.id)
          );
          const ridesSnapshot = await getDocs(ridesQuery);
          setDriverRides(ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Error fetching driver rides:", error);
        }
      };
      fetchDriverRides();
    }
  }, [user, authLoading, navigate]);

  // Newsletter auto-subscription
  useEffect(() => {
    if (authLoading || !user || !user.email) return;

    const autoSubscribe = async () => {
      try {
        const emailLower = user.email.toLowerCase();
        const subscribersRef = collection(db, 'newsletter_subscribers');
        const existingQuery = query(subscribersRef, where('emailLower', '==', emailLower));
        const existingSnapshot = await withRetry(() => getDocs(existingQuery));

        if (existingSnapshot.empty) {
          await withRetry(() => addDoc(subscribersRef, {
            email: user.email,
            emailLower,
            createdAt: new Date().toISOString(),
            source: 'profile_entry',
            userId: user.id
          }));
          console.log("Automatically subscribed to newsletter from profile entry.");
        }
      } catch (error) {
        console.error("Auto-subscription failed:", error);
      }
    };

    autoSubscribe();
  }, [user, authLoading]);

  const toggleLocationSharing = (rideId: string) => {
    if (sharingLocationId === rideId) {
      // Stop sharing
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocationId(null);
      toast.info("Manzil ulashish to'xtatildi");
    } else {
      // Start sharing
      if (!navigator.geolocation) {
        toast.error("Your browser does not support geolocation");
        return;
      }

      setSharingLocationId(rideId);
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            const { latitude, longitude, speed } = position.coords;
            await fetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bus_id: rideId,
                lat: latitude,
                lng: longitude,
                speed: speed || 0
              })
            });
          } catch (error) {
            console.error("Error sending location to backend:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Permission to access location was denied");
          setSharingLocationId(null);
        },
        { enableHighAccuracy: true }
      );
      toast.success("Manzil ulashish boshlandi!");
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] transition-colors duration-300">
      {/* Header */}
      <nav className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-white/5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              leftIcon={<LogOut className="w-5 h-5" />}
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Weather Widget for Admins/Drivers */}
        {(user?.role === 'admin' || user?.role === 'driver') && (
          <div className="mb-6 sm:mb-8">
            <WeatherWidget />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-white/5 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg shadow-emerald-500/20">
                {user?.name[0].toUpperCase()}
              </div>

              {isEditingName ? (
                <div className="flex flex-col gap-3 mb-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-gray-900 dark:text-white"
                    placeholder="Ism Familiya"
                    autoFocus
                  />
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center text-gray-900 dark:text-white appearance-none"
                  >
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                  </select>
                  <div className="flex justify-center gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateProfile}
                      loading={savingName}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      leftIcon={<Check className="w-4 h-4" />}
                    >{t('profile.settings.save')}</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setIsEditingName(false);
                        setNewName(user?.name || '');
                        setNewGender(user?.gender || 'male');
                      }}
                      className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                      leftIcon={<X className="w-4 h-4" />}
                    >{t('profile.ticket.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-emerald-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {user?.gender === 'female' ? 'Ayol' : 'Erkak'}
                  </span>
                </div>
              )}

              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">{user?.email || user?.phoneNumber}</p>

              <div className="space-y-2 sm:space-y-3 text-left">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <div>
                    <div className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wider">Status</div>
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {user?.role === 'admin' ? 'Admin' : user?.role === 'driver' ? 'Haydovchi' : 'Foydalanuvchi'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <div>
                    <div className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wider">{user?.email ? t('profile.settings.email') : 'Telefon'}</div>
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">{user?.email || user?.phoneNumber}</div>
                  </div>
                </div>
                {user?.phoneNumber && user?.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                    <Phone className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Telefon</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.phoneNumber}</div>
                    </div>
                  </div>
                )}
                {user?.birthDate && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tug'ilgan sana</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.birthDate}</div>
                    </div>
                  </div>
                )}
                {user?.passport && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pasport / ID</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.passport}</div>
                    </div>
                  </div>
                )}
                {user?.address && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                    <MapPin className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Manzil</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.address}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="lg:col-span-2 space-y-8">
            {/* Driver Controls */}
            {user?.role === 'driver' && driverRides.length > 0 && (
              <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-500" />
                  {t('profile.driver_controls')}
                </h3>
                <div className="space-y-4">
                  {driverRides.map(ride => (
                    <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{ride.from} → {ride.to}</div>
                        <div className="text-xs text-gray-500">{ride.departureTime} | {ride.busType}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => toggleLocationSharing(ride.id)}
                        className={sharingLocationId === ride.id ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}
                        leftIcon={sharingLocationId === ride.id ? <X className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      >
                        {sharingLocationId === ride.id ? t('profile.driver.stop_sharing') : t('profile.share_location')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {/* Tabs */}
              <div className="flex p-1 bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab('bookings')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all h-auto border-0 ${activeTab === 'bookings' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  <Bus className="w-5 h-5" />
                  <span className="font-bold">{t('profile.tabs.tickets')}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab('newsletter')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all h-auto border-0 ${activeTab === 'newsletter' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-bold">{t('profile.tabs.newsletter')}</span>
                </Button>
              </div>

              {activeTab === 'bookings' ? (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 ml-2">
                    <SafeImage src={logoUrl} alt="Tez Chipta" className="w-6 h-6 object-contain" />
                    {t('profile.tabs.tickets')}
                  </h3>

                  {bookings.length === 0 ? (
                    <div className="bg-white dark:bg-[#111827] rounded-2xl p-12 text-center border border-gray-200 dark:border-white/5 shadow-sm">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bus className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hali chiptalar yo'q</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">Siz hali birorta ham reysga chipta xarid qilmagansiz.</p>
                      <Button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors h-auto"
                      >
                        Reyslarni qidirish
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="space-y-4 flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider ${booking.status === 'confirmed'
                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                                    : booking.paymentStatus === 'pending_review'
                                      ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                      : booking.status === 'cancelled'
                                        ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500'
                                    }`}>
                                    {booking.status === 'confirmed' ? (
                                      <>
                                        <ShieldCheck className="w-3.5 h-3.5" />{t('profile.ticket.status.confirmed')}</>
                                    ) : booking.paymentStatus === 'pending_review' ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5" />
                                        To'lov tekshirilmoqda
                                      </>
                                    ) : booking.status === 'cancelled' ? (
                                      <>
                                        <X className="w-3.5 h-3.5" />{t('profile.ticket.status.cancelled')}</>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5" />{t('profile.ticket.status.pending')}</>
                                    )}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-gray-400 font-mono">ID: {booking.id.slice(0, 8)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-6">
                                <div className="text-left">
                                  <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{booking.ride?.departureTime}</div>
                                  <div className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{booking.ride?.from}</div>
                                </div>
                                <div className="flex-1 flex items-center justify-center px-2 sm:px-4 relative">
                                  <div className="w-full border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white dark:bg-[#111827] px-2">
                                      <Bus className="w-4 h-4 text-emerald-500" />
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{booking.ride?.arrivalTime}</div>
                                  <div className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{booking.ride?.to}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-50 dark:border-white/5">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                                  <span>{booking.ride?.date === 'today' ? 'Bugun' : booking.ride?.date === 'tomorrow' ? 'Ertaga' : booking.ride?.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                                  <span>{booking.seatNumber}-o'rindiq</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Clock className="w-4 h-4 text-emerald-500" />
                                  <span>{t('profile.ticket.date')}: {booking.createdAt.split('T')[0]}</span>
                                </div>
                              </div>
                            </div>

                            <div className="sm:text-right flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-white/5 pt-4 sm:pt-0 sm:pl-6">
                              <div className="text-sm text-gray-500 dark:text-gray-400">To'langan:</div>
                              <div className="text-xl font-bold text-emerald-500 mb-2">{formatPrice(booking.price)}</div>
                              {booking.status === 'confirmed' && (
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleDownloadTicket(booking.id)}
                                    loading={downloadingId === booking.id}
                                    className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-0"
                                    leftIcon={<Download className="w-4 h-4" />}
                                  >
                                    Chipta
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setTrackingRideId(booking.rideId)}
                                    className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 border-0"
                                    leftIcon={<Map className="w-4 h-4" />}
                                  >
                                    {t('profile.track_bus')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111827] rounded-2xl p-8 sm:p-12 text-center border border-gray-200 dark:border-white/5 shadow-sm space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Newsletter</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                      {t('home.footer.newsletter_desc') || "Siz bizning yangiliklar byulletenimizga muvaffaqiyatli obuna bo'lgansiz. Endi siz barcha yangiliklar va maxsus takliflardan xabardor bo'lib turasiz."}
                    </p>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl inline-flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Holat: Faol obunachi</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {trackingRideId && (
          <BusTracker
            rideId={trackingRideId}
            onClose={() => setTrackingRideId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
