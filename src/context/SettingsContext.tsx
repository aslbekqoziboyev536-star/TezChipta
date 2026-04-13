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
        setSettings({
          logoUrl: defaultLogo,
          adminCardNumber: data.adminCardNumber || '8600 0000 0000 0000',
          adminCardOwner: data.adminCardOwner || '',
          adminSupportPhone: data.adminSupportPhone || '',
          stripeEnabled: data.stripeEnabled !== false,
          manualEnabled: data.manualEnabled !== false,
          siteDescription: data.siteDescription || ''
        });
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
