import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface SettingsContextType {
  logoUrl: string;
  adminCardNumber: string;
  adminCardOwner: string;
  adminSupportPhone: string;
  stripeEnabled: boolean;
  manualEnabled: boolean;
  siteDescription: string;
}

const defaultLogo = '/icon.png';

const SettingsContext = createContext<SettingsContextType>({
  logoUrl: defaultLogo,
  adminCardNumber: '8600 0000 0000 0000',
  adminCardOwner: '',
  adminSupportPhone: '',
  stripeEnabled: true,
  manualEnabled: true,
  siteDescription: ''
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsContextType>({
    logoUrl: defaultLogo,
    adminCardNumber: '8600 0000 0000 0000',
    adminCardOwner: '',
    adminSupportPhone: '',
    stripeEnabled: true,
    manualEnabled: true,
    siteDescription: ''
  });

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'payment'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newLogoUrl = data.logoUrl || defaultLogo;
        setSettings({
          logoUrl: newLogoUrl,
          adminCardNumber: data.adminCardNumber || '8600 0000 0000 0000',
          adminCardOwner: data.adminCardOwner || '',
          adminSupportPhone: data.adminSupportPhone || '',
          stripeEnabled: data.stripeEnabled !== false,
          manualEnabled: data.manualEnabled !== false,
          siteDescription: data.siteDescription || ''
        });

        // Update favicon dynamically
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = newLogoUrl;

        let shortcutLink: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
        if (shortcutLink) shortcutLink.href = newLogoUrl;

        let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
        if (appleLink) appleLink.href = newLogoUrl;
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
