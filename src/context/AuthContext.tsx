import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  picture?: string;
  role: string;
  birthDate?: string;
  passport?: string;
  address?: string;
  gender?: string;
  createdAt: string;
  lastSeenNotificationAt?: string;
  isProfileComplete?: boolean;
  newsletterSoundEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: { phoneAuthEnabled: boolean };
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: { phoneAuthEnabled: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ phoneAuthEnabled: false });

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        // Use onSnapshot for real-time updates
        unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          let role = firebaseUser.email === 'qoziboyevaslbek359@gmail.com' ? 'admin' : 'user';
          let name = firebaseUser.displayName || (firebaseUser.phoneNumber ? `User ${firebaseUser.phoneNumber.slice(-4)}` : 'User');
          let email = firebaseUser.email || '';
          let phoneNumber = firebaseUser.phoneNumber || '';
          let birthDate = '';
          let passport = '';
          let address = '';
          let gender = '';
          let createdAt = new Date().toISOString();
          let lastSeenNotificationAt = '';
          let isProfileComplete = false;

          if (doc.exists()) {
            const data = doc.data();
            role = data.role || role;
            name = data.name || name;
            email = data.email || email;
            phoneNumber = data.phoneNumber || phoneNumber;
            birthDate = data.birthDate || '';
            passport = data.passport || '';
            address = data.address || '';
            gender = data.gender || '';
            createdAt = data.createdAt || createdAt;
            lastSeenNotificationAt = data.lastSeenNotificationAt || '';
            const newsletterSoundEnabled = data.newsletterSoundEnabled;

            const hasAllFields =
              name &&
              email &&
              phoneNumber &&
              birthDate &&
              passport &&
              address &&
              gender;

            isProfileComplete = (data.isProfileComplete || false) && !!hasAllFields;
          } else {
            // Initial profile creation if doc doesn't exist
            setDoc(userDocRef, {
              name,
              email,
              phoneNumber,
              role,
              isProfileComplete: false,
              createdAt: new Date().toISOString()
            }).catch(err => console.error("Initial profile creation failed:", err));
          }

          setUser({
            id: firebaseUser.uid,
            name,
            email,
            phoneNumber,
            picture: firebaseUser.photoURL || undefined,
            role,
            birthDate,
            passport,
            address,
            gender,
            createdAt,
            lastSeenNotificationAt,
            isProfileComplete,
            newsletterSoundEnabled: doc.exists() ? (doc.data()?.newsletterSoundEnabled ?? true) : true
          });
          setLoading(false);
        }, (error) => {
          console.error("User document snapshot error:", error);
          // Fallback if snapshot fails
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || undefined,
            role: firebaseUser.email === 'qoziboyevaslbek359@gmail.com' ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
            lastSeenNotificationAt: new Date().toISOString()
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // Perform profile update and Firestore write in parallel for speed
      await Promise.all([
        updateProfile(firebaseUser, { displayName: name }),
        setDoc(doc(db, 'users', firebaseUser.uid), {
          name,
          email,
          role: 'user',
          isProfileComplete: false,
          createdAt: new Date().toISOString(),
          lastSeenNotificationAt: new Date().toISOString()
        })
      ]);

      // Manually set the user state to avoid waiting for onAuthStateChanged to sync
      setUser({
        id: firebaseUser.uid,
        name,
        email,
        picture: firebaseUser.photoURL || undefined,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastSeenNotificationAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string) => {
    try {
      let recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        recaptchaContainer = document.createElement('div');
        recaptchaContainer.id = 'recaptcha-container';
        recaptchaContainer.style.display = 'none';
        document.body.appendChild(recaptchaContainer);
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
      return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    } catch (error) {
      console.error("Phone login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateSettings = async (newSettings: { phoneAuthEnabled: boolean }) => {
    setSettings(newSettings);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      settings,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      loginWithPhone,
      logout,
      updateSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
