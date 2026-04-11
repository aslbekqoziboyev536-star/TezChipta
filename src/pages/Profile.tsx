import { useSettings } from '../context/SettingsContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from '../components/ui/Button';
import { Bus, Calendar, Clock, MapPin, User, Mail, ShieldCheck, ArrowLeft, LogOut, Edit2, Check, X, Download, Phone, CreditCard, Navigation, Map, Bell } from 'lucide-react';
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [newsletterHistory, setNewsletterHistory] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [trackingRideId, setTrackingRideId] = useState<string | null>(null);
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [sharingLocationId, setSharingLocationId] = useState<string | null>(null);
  const watchIdRef = React.useRef<number | null>(null);

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

  const handleSubscribe = async () => {
    if (!user) return;
    setSubscribing(true);
    try {
      const subscribersRef = collection(db, 'subscribers');
      const q = query(subscribersRef, where('email', '==', user.email), where('status', '==', 'active'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setIsSubscribed(true);
        toast.info(t('profile.newsletter.already_subscribed'));
        return;
      }

      await addDoc(collection(db, 'subscribers'), {
        email: user.email,
        userId: user.id,
        subscribedAt: new Date().toISOString(),
        status: 'active'
      });

      setIsSubscribed(true);
      toast.success(t('profile.newsletter.success'));
    } catch (error) {
      console.error("Subscription error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'subscribers');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    setSubscribing(true);
    try {
      const subscribersRef = collection(db, 'subscribers');
      const q = query(subscribersRef, where('email', '==', user.email), where('status', '==', 'active'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const subDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'subscribers', subDoc.id), { status: 'unsubscribed' });
        setIsSubscribed(false);
        toast.success(t('profile.newsletter.unsubscribed'));
      }
    } catch (error) {
      console.error("Unsubscription error:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'subscribers');
    } finally {
      setSubscribing(false);
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

    const fetchNewsletterInfo = async () => {
      if (!user?.email) return;
      try {
        const subscribersRef = collection(db, 'subscribers');
        const q = query(subscribersRef, where('email', '==', user.email), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        setIsSubscribed(!snapshot.empty);

        if (!snapshot.empty) {
          const newslettersRef = collection(db, 'newsletters');
          const nq = query(newslettersRef, orderBy('sentAt', 'desc'));
          const nSnapshot = await getDocs(nq);
          setNewsletterHistory(nSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error("Error fetching newsletter info:", error);
      }
    };

    const fetchNotifications = async () => {
      if (!user) return;
      try {
        // Check if user has bookings
        const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.id));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const hasNoBookings = bookingsSnapshot.empty;

        // Check registration date
        const registrationDate = user.createdAt ? new Date(user.createdAt) : new Date();
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const isRecentlyJoined = registrationDate > twoDaysAgo;
        const isNew = hasNoBookings || isRecentlyJoined;

        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const filtered = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(n => n.target === 'all' || (n.target === 'new' && isNew));
          
        setUserNotifications(filtered);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNewsletterInfo();
    fetchNotifications();
  }, [user, authLoading, navigate]);

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

            {/* Newsletter Section */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('profile.newsletter')}</h3>
              </div>

              {isSubscribed ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Siz obuna bo'lgansiz</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUnsubscribe}
                      loading={subscribing}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-0 h-auto py-1"
                    >
                      Bekor qilish
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t('profile.newsletter.history')}</h4>
                    {newsletterHistory.length > 0 ? (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {newsletterHistory.map((nl) => (
                          <div key={nl.id} className="p-4 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-bold text-sm text-gray-900 dark:text-white">{nl.subject}</h5>
                              <span className="text-[10px] text-gray-400">{new Date(nl.sentAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{nl.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Hozircha xabarlar yo'q.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Yangi chegirmalar va yangiliklardan xabardor bo'lish uchun obuna bo'ling.
                  </p>
                  <Button
                    onClick={handleSubscribe}
                    loading={subscribing}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                    leftIcon={<Mail className="w-5 h-5" />}
                  >
                    {t('profile.newsletter.subscribe_btn')}
                  </Button>
                </div>
              )}
            </div>

            {/* Notifications Section */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.notifications')}</h3>
              </div>

              <div className="space-y-4">
                {userNotifications.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {userNotifications.map((n) => (
                      <div key={n.id} className="p-4 bg-gray-50 dark:bg-[#0B1120] rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-bold text-sm text-gray-900 dark:text-white">{n.title}</h5>
                          <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            n.type === 'alert' ? 'bg-red-100 text-red-600' :
                            n.type === 'promo' ? 'bg-amber-100 text-amber-600' :
                            n.type === 'update' ? 'bg-blue-100 text-blue-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {n.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{n.details}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('notifications.empty')}</p>
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

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <SafeImage src={logoUrl} alt="Tez Chipta" className="w-6 h-6 object-contain" />
                Mening chiptalarim
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
                            <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider ${
                              booking.status === 'confirmed' 
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
