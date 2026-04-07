import React, { useState } from 'react';
import { Ticket, Download, User, Phone, Calendar, CreditCard, Bus, Hash, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';

const TicketGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    passport: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    confirmed: 'Yes',
    busNumber: '',
    seatNumber: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/generate-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generating ticket');
      }

      // Get the blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${formData.fullName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Ticket successfully created and downloaded!');
    } catch (error: any) {
      console.error('Ticket generation error:', error);
      toast.error(error.message || 'An error occurred while creating the ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl mb-4"
          >
            <Ticket className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ticket Generator</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter passenger details and download a professional PDF ticket.
          </p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-[#111827] shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5"
        >
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Example: Ali Valiyev"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="birthDate"
                    required
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Passport / ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport or ID (Series + Number)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="passport"
                    required
                    value={formData.passport}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="AA 1234567"
                  />
                </div>
              </div>

              {/* Bus Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bus Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Bus className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="busNumber"
                    required
                    value={formData.busNumber}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Example: 01 A 777 AA"
                  />
                </div>
              </div>

              {/* Seat Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seat Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="seatNumber"
                    required
                    value={formData.seatNumber}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Example: 12"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Purchase Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="purchaseDate"
                    required
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Confirmed Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {formData.confirmed === 'Yes' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <select
                    name="confirmed"
                    value={formData.confirmed}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                  >
                    <option value="Yes">Confirmed</option>
                    <option value="No">Unconfirmed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                loading={loading}
                className="w-full py-4 text-lg font-semibold rounded-2xl flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Download Ticket as PDF
              </Button>
            </div>
          </form>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>All information is processed securely.</p>
          <p className="mt-1">© 2026 TezChipta. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default TicketGenerator;
