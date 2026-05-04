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
import { doc, setDoc, getDoc, getDocFromServer, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db, requestForToken } from '../firebase';
import { supabase } from '../lib/supabase';

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
  isProfileComplete?: boolean;
  createdAt?: string;
  lastSeenNotificationAt?: string;
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
            // Trust the flag from Firestore if it exists
            const storedIsProfileComplete = data.isProfileComplete || false;
            
            const hasAllFields = !!(
              name && 
              email && 
              phoneNumber && 
              birthDate && 
              passport && 
              address && 
              gender
            );
            
            // If Firestore says it's complete, or we have all fields, consider it complete
            isProfileComplete = storedIsProfileComplete || hasAllFields;

            // In case Firestore says it's incomplete but we have all fields, 
            // we might want to auto-update it, but for now we just allow the user to proceed.
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
            isProfileComplete,
            createdAt: doc.data()?.createdAt || ''
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
            role: firebaseUser.email === 'qoziboyevaslbek359@gmail.com' ? 'admin' : 'user'
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Let Firebase handle the user state.
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && user.id) {
      // Small timeout to not block UI rendering right away
      setTimeout(() => {
        requestForToken().then(token => {
          if (token) {
            updateDoc(doc(db, 'users', user.id), {
              fcmToken: token
            }).catch(err => console.error("Error saving FCM token:", err));
          }
        });
      }, 2000);
    }
  }, [user?.id]);

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
      // Try Supabase first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error("Iltimos, avval elektron pochtangizni tasdiqlang!");
        }
        // If Supabase fails, try Firebase fallback for older users
        console.log("Supabase login failed, trying Firebase fallback...");
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        // If Supabase login succeeds, we MUST also login to Firebase
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      // 1. Firebase Auth Registration
      let firebaseUid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        firebaseUid = userCredential.user.uid;
        await updateProfile(userCredential.user, { displayName: name });
      } catch (fbError: any) {
        if (fbError.code === 'auth/email-already-in-use') {
          throw new Error("Ushbu email allaqachon ro'yxatdan o'tgan.");
        }
        throw fbError;
      }

      // 2. Set Firestore document using Firebase UID
      try {
        await setDoc(doc(db, 'users', firebaseUid), {
          name,
          email,
          role: 'user',
          isProfileComplete: false,
          createdAt: new Date().toISOString()
        });
      } catch (dbError) {
        console.error("Firestore user doc creation failed:", dbError);
      }

      // 3. Supabase Auth Registration for Email Link
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/login?confirmedemail`
        }
      });

      if (error) throw error;
      
      // 4. Log out of Firebase immediately so they are forced to confirm via email first
      await signOut(auth);
      
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
      await Promise.all([
        signOut(auth),
        supabase.auth.signOut()
      ]);
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
