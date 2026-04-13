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
import { auth, googleProvider, db } from '../firebase';
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
            gender = data.gender || '';
            
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
      if (event === 'SIGNED_IN' && session?.user) {
        const sbUser = session.user;
        const userDocRef = doc(db, 'users', sbUser.id);
        
        // Parallel fetch/sync for Supabase users
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            name: sbUser.user_metadata.full_name || 'User',
            email: sbUser.email,
            role: 'user',
            isProfileComplete: false,
            createdAt: new Date().toISOString()
          });
        }
        
        // Update state
        setUser({
          id: sbUser.id,
          name: sbUser.user_metadata.full_name || 'User',
          email: sbUser.email || '',
          role: 'user', // Default or fetch from doc
          isProfileComplete: docSnap.exists() ? docSnap.data().isProfileComplete : false
        } as User);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      subscription.unsubscribe();
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
      // Try Supabase first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        // If Supabase fails, try Firebase fallback for older users
        console.log("Supabase login failed, trying Firebase fallback...");
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      // Use Supabase for registration to support email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/successful`
        }
      });

      if (error) throw error;
      
      // Still create a document in Firestore to keep the app functional
      if (data.user) {
        await setDoc(doc(db, 'users', data.user.id), {
          name,
          email,
          role: 'user',
          isProfileComplete: false,
          createdAt: new Date().toISOString()
        });
      }
      
      // If email confirmation is enabled, Supabase won't sign in the user immediately.
      // We will show a success message in the component.
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
