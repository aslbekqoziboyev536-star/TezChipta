import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { User, Calendar, CreditCard, MapPin, Mail, Phone } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, withRetry } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';

export const OnboardingModal: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    birthDate: user?.birthDate || '',
    passport: user?.passport || '',
    address: user?.address || '',
    gender: user?.gender || ''
  });

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
        phoneNumber: user.phoneNumber || prev.phoneNumber,
        birthDate: user.birthDate || prev.birthDate,
        passport: user.passport || prev.passport,
        address: user.address || prev.address,
        gender: user.gender || prev.gender
      }));
    }
  }, [user]);

  if (!user || user.isProfileComplete) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = ['fullName', 'birthDate', 'passport', 'address', 'gender'];
    if (!user.email) requiredFields.push('email');
    if (!user.phoneNumber) requiredFields.push('phoneNumber');

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error("Please fill in all required fields");
        return;
      }
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const updateData: any = {
        name: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        passport: formData.passport,
        address: formData.address,
        gender: formData.gender,
        isProfileComplete: true,
        updatedAt: new Date().toISOString()
      };

      // Use the withRetry utility for better resilience
      await withRetry(() => updateDoc(userRef, updateData));
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Onboarding failed:", error);
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Prevent closing until complete
      title="Complete Your Profile"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please provide the following details to access all features of TezChipta.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name (Same as in Document)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ali Valiyev"
              />
            </div>
          </div>

          {!user.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="example@mail.com"
                />
              </div>
            </div>
          )}

          {!user.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="+998901234567"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passport or ID Card Number
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="passport"
                required
                value={formData.passport}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="AA 1234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Residential Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="City, district, street, house"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gender
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange as any}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
        >
          Save and Continue
        </Button>
      </form>
    </Modal>
  );
};
