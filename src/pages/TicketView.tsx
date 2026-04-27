import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bus, MapPin, Calendar, Clock, User, Phone, CreditCard, ArrowLeft, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useSettings } from '../context/SettingsContext';

export default function TicketView() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { logoUrl } = useSettings();

  useEffect(() => {
    const fetchTicket = async () => {
      if (!id) return;
      try {
        const q = query(collection(db, 'bookings'), where('ticketUrl', '==', id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError('Chipta topilmadi yoki yaroqsiz.');
          return;
        }

        const bookingData = snapshot.docs[0].data();
        
        // Also fetch ride details if not fully embedded
        // Wait, ride details are usually in the rides collection
        let rideData = bookingData.ride;
        if (!rideData && bookingData.rideId) {
          const { getDoc, doc } = await import('firebase/firestore');
          const rideDoc = await getDoc(doc(db, 'rides', bookingData.rideId));
          if (rideDoc.exists()) {
            rideData = rideDoc.data();
          }
        }

        setTicket({
          id: snapshot.docs[0].id,
          ...bookingData,
          ride: rideData || bookingData.ride
        });
      } catch (err: any) {
        console.error(err);
        setError('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-500">Chipta ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Xatolik</h1>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  const { passengerDetails, ride } = ticket;
  const isConfirmed = ticket.status === 'confirmed';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* Header */}
          <div className="bg-emerald-500 p-6 text-center text-white relative">
            <SafeImage src={logoUrl} alt="TezChipta" className="h-8 mx-auto mb-4 object-contain brightness-0 invert" />
            <h1 className="text-2xl font-bold mb-1">Chipta Ma'lumotlari</h1>
            <p className="text-emerald-100 text-sm opacity-90">ID: {id}</p>
            
            {isConfirmed ? (
              <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tasdiqlangan
              </div>
            ) : (
              <div className="absolute top-4 right-4 bg-amber-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm border border-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Kutilmoqda
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Passenger Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Yo'lovchi</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Ism Familiya</div>
                    <div className="font-bold text-gray-900">{passengerDetails?.firstName} {passengerDetails?.lastName}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Pasport / ID</div>
                    <div className="font-bold text-gray-900">{passengerDetails?.passportId}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Telefon</div>
                    <div className="font-bold text-gray-900">{passengerDetails?.phone}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200"></div>

            {/* Ride Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Qatnov</h3>
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-gray-900">{ride?.departureTime}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">{ride?.from}</div>
                </div>
                <div className="flex-1 flex flex-col items-center px-2">
                  <Bus className="w-5 h-5 text-emerald-500 mb-1" />
                  <div className="w-full border-t-2 border-dashed border-gray-200"></div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-gray-900">{ride?.arrivalTime}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">{ride?.to}</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-[10px] text-gray-500">Sana</div>
                    <div className="font-bold text-gray-900 text-sm">{ride?.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-[10px] text-gray-500">O'rindiq</div>
                    <div className="font-bold text-gray-900 text-sm">{ticket.seatNumber}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {!isConfirmed && (
               <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl border border-amber-200 text-center">
                 To'lov holati: {ticket.paymentStatus === 'pending_review' ? "Admin tasdiqlashi kutilmoqda" : "To'lanmagan"}
               </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
