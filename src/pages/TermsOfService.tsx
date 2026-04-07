import { useSettings } from '../context/SettingsContext';
import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, ArrowLeft, FileText, CheckCircle, AlertCircle, HelpCircle, Scale } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SafeImage } from '../components/SafeImage';

export default function TermsOfService() {
  const { logoUrl } = useSettings();
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1120] transition-colors duration-300">
      {/* Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
        <Link to="/" className="flex items-center space-x-2 text-emerald-500">
          <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tez<span className="text-emerald-500">Chipta</span></span>
        </Link>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link to="/" className="flex items-center text-sm font-medium text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Bosh sahifa
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Foydalanish Shartlari</h1>
          <p className="text-gray-600 dark:text-gray-400">Oxirgi yangilanish: 19-mart, 2026-yil</p>
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Shartlarni qabul qilish</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                "TezChipta" platformasidan foydalanish orqali siz ushbu Foydalanish shartlariga to'liq rozilik bildirasiz. Agar siz ushbu shartlarga rozi bo'lmasangiz, iltimos, xizmatdan foydalanmang.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Xizmat tavsifi</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                "TezChipta" — bu avtobus chiptalarini onlayn bron qilish va sotib olish xizmatidir. Biz tashuvchilar va yo'lovchilar o'rtasida vositachilik qilamiz.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Xizmatdan faqat qonuniy maqsadlarda foydalanish mumkin.</li>
                <li>Foydalanuvchi taqdim etgan ma'lumotlarning to'g'riligi uchun o'zi mas'uldir.</li>
                <li>Chiptalarni qaytarish va almashtirish tashuvchining qoidalariga muvofiq amalga oshiriladi.</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Mas'uliyatni cheklash</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                "TezChipta" tashuvchilar tomonidan sodir etilgan kechikishlar, reyslarning bekor qilinishi yoki yo'ldagi boshqa ko'ngilsiz hodisalar uchun bevosita javobgar emas. Biz faqat chipta sotish jarayoni va ma'lumotlarning to'g'ri yetkazilishi uchun mas'ulmiz.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. To'lovlar va qaytarish</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Barcha to'lovlar O'zbekiston Respublikasi milliy valyutasida amalga oshiriladi. Chiptani bekor qilishda xizmat haqi ushlab qolinishi mumkin. Qaytarish muddati to'lov tizimi qoidalariga bog'liq.
              </p>
            </div>
          </section>

          <section className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Savollaringiz bormi?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Foydalanish shartlari bo'yicha qo'shimcha ma'lumot olish uchun biz bilan bog'laning:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <span className="text-emerald-600 dark:text-emerald-500 font-medium">Telegram: @tezchipta_support</span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="text-emerald-600 dark:text-emerald-500 font-medium">Tel: +998 91 000 00 00</span>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-[#0B1120] border-t border-gray-100 dark:border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; 2026 TezChipta. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
