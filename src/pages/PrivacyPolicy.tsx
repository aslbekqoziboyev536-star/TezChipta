import { useSettings } from '../context/SettingsContext';
import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, ArrowLeft, Shield, Lock, Eye, FileText, Bell } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';

export default function PrivacyPolicy() {
  const { logoUrl } = useSettings();
  const { t } = useLanguage();
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
            {t('menu.home')}
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('terms.last_update')}: 19-mart, 2026-yil</p>
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('privacy.section1.title')}</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                {t('privacy.section1.content')}
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>{t('privacy.section1.list1')}</li>
                <li>{t('privacy.section1.list2')}</li>
                <li>{t('privacy.section1.list3')}</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('privacy.section2.title')}</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>{t('privacy.section2.content')}</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>{t('privacy.section2.list1')}</li>
                <li>{t('privacy.section2.list2')}</li>
                <li>{t('privacy.section2.list3')}</li>
                <li>{t('privacy.section2.list4')}</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('privacy.section3.title')}</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                {t('privacy.section3.content')}
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('privacy.section4.title')}</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                {t('privacy.section4.content')}
              </p>
            </div>
          </section>

          <section className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy.contact.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('privacy.contact.desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="mailto:info@tezchipta.uz" className="text-emerald-600 dark:text-emerald-500 font-medium hover:underline">info@tezchipta.uz</a>
              <span className="hidden sm:inline text-gray-300">|</span>
              <a href="tel:+998910000000" className="text-emerald-600 dark:text-emerald-500 font-medium hover:underline">+998 91 000 00 00</a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-[#0B1120] border-t border-gray-100 dark:border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; 2026 TezChipta. {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
