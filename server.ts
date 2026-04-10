import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as getClientDoc, updateDoc as updateClientDoc, collection as clientCollection, addDoc as addClientDoc, setDoc as setClientDoc, query as clientQuery, where as clientWhere, getDocs as getClientDocs, deleteDoc as deleteClientDoc } from "firebase/firestore";
import fs from "fs";
import axios from "axios";
import Stripe from "stripe";
import { logToSupabase } from "./src/lib/supabaseServer.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || APP_URL)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    const message = `Missing required environment variable: ${name}`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(message);
  }
  return value || "";
}

const JWT_SECRET = requireEnv("JWT_SECRET") || "dev-jwt-secret";
const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "112463836858-l7fl8k7omm1n4dn1clva5uskd5vtc601.apps.googleusercontent.com";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "qoziboyevaslbek359@gmail.com,admin@tezchipta.uz")
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const stripe = new Stripe(STRIPE_SECRET_KEY || "");

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
}

// Initialize Firebase Admin
let firebaseApp: admin.app.App;
try {
  // Prioritize projectId from config file as it's what the client uses
  const projectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
  
  if (!admin.apps.length) {
    if (projectId) {
      firebaseApp = admin.initializeApp({
        projectId: projectId
      });
      console.log("Firebase Admin initialized with Project ID:", projectId);
    } else {
      console.warn("Firebase Project ID not found. Attempting default initialization...");
      firebaseApp = admin.initializeApp();
    }
  } else {
    firebaseApp = admin.app();
    console.log("Firebase Admin already initialized, using existing app.");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  firebaseApp = admin.apps.length ? admin.app() : (null as any);
}

// Use the correct database ID if provided
let db: any;
let auth: any;
let clientDb: any;

try {
  // Initialize Client SDK for Firestore (works with apiKey)
  const clientApp = initializeClientApp(firebaseConfig);
  clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
  console.log("Client Firestore initialized successfully.");

  if (firebaseApp) {
    // If we have a named database ID, use it. Otherwise use default.
    const databaseId = firebaseConfig.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID;
    
    if (databaseId) {
      db = getAdminFirestore(firebaseApp, databaseId);
      console.log("Using named Firestore database (Admin):", databaseId);
    } else {
      db = getAdminFirestore(firebaseApp);
      console.log("Using default Firestore database (Admin)");
    }
    auth = getAdminAuth(firebaseApp);
    console.log("Firebase Auth (Admin) initialized successfully.");
  } else {
    console.error("Firebase App not initialized. Admin Auth will be unavailable.");
    db = null;
    auth = null;
  }
} catch (error) {
  console.error("Firestore/Auth initialization error:", error);
  db = null;
  auth = null;
}

// Log the project ID being used by the Admin SDK
try {
  if (admin.apps.length) {
    console.log("Firebase Admin Project ID:", admin.app().options.projectId || "Default");
    console.log("Firebase Admin Database ID:", firebaseConfig.firestoreDatabaseId || "(default)");
  }
} catch (error) {
  console.warn("Could not log Firebase Admin info:", error);
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// In-memory store for bus locations
const busLocations: Record<string, { lat: number, lng: number, speed?: number, timestamp: string }> = {};

// Helper to verify Firebase ID Token with fallback to REST API
const verifyFirebaseIdToken = async (idToken: string) => {
  try {
    if (auth) {
      return await auth.verifyIdToken(idToken);
    }
  } catch (error: any) {
    console.warn("Firebase Admin verifyIdToken failed, falling back to REST API:", error.message);
  }

  // Fallback to REST API
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase API Key not found for verification fallback.");
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      { idToken }
    );

    const user = response.data.users?.[0];
    if (!user) {
      throw new Error("Invalid token: User not found.");
    }

    return {
      uid: user.localId,
      email: user.email,
      email_verified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoUrl
    };
  } catch (error: any) {
    const errorData = error.response?.data?.error;
    console.error("Auth verification REST API error:", errorData || error.message);
    throw new Error(`Auth verification failed: ${errorData?.message || error.message}`);
  }
};

// Middleware to verify Firebase ID Token for any user
const verifyUser = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await verifyFirebaseIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error("User verification failed:", error.message);
    res.status(401).json({ error: "Invalid token", details: error.message });
  }
};

// Middleware to verify Firebase ID Token
const verifyAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn("Missing or invalid Authorization header:", authHeader);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken || idToken === 'undefined' || idToken === 'null') {
    console.warn("Invalid token value received:", idToken);
    return res.status(401).json({ error: "Invalid token value" });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(idToken);
    console.log("Admin Verification - Decoded Token:", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    });

    // Check email FIRST - this is the most reliable check and doesn't require Firestore
      const email = String(decodedToken.email || '').toLowerCase();
    const isEmailAdmin = email && ADMIN_EMAILS.includes(email);

    if (isEmailAdmin) {
      console.log("Admin verified by email:", email);
      req.user = decodedToken;
      return next();
    }

    // Then check Firestore for role
    if (!clientDb) {
      console.error("verifyAdmin: Client Firestore not initialized");
      throw new Error("Firestore not initialized");
    }

    const userDocRef = clientDoc(clientDb, 'users', decodedToken.uid);
    const userDoc = await getClientDoc(userDocRef);
    const userData = userDoc.data();
    console.log("Admin Verification - User Data from Firestore:", userData);

    if (userData?.role === 'admin') {
      console.log("Admin verified by role in Firestore:", decodedToken.uid);
      req.user = decodedToken;
      return next();
    } else {
      console.warn("Access denied for user:", decodedToken.email || decodedToken.uid);
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
  } catch (error: any) {
    console.error("Admin verification failed:", error.message);
    res.status(401).json({ error: "Admin verification failed", details: error.message });
  }
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const allowedOrigins = CORS_ORIGINS;
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });
  const PORT = process.env.PORT || 3000;

  // Security headers for all responses
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https://identitytoolkit.googleapis.com https://www.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com https://qrcode.to; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none';");
    next();
  });

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    },
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/ping", (req, res) => {
    res.json({ status: "pong", timestamp: new Date().toISOString() });
  });

  // Stripe Checkout Session Creation
  app.post("/api/create-checkout-session", verifyUser, async (req, res) => {
    const { bookingId, rideName, price } = req.body;

    if (!bookingId || !rideName || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "uzs",
              product_data: {
                name: rideName,
                description: `Booking ID: ${bookingId}`,
              },
              unit_amount: price * 100, // Stripe expects amounts in cents/smallest unit
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        client_reference_id: bookingId,
        success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/`,
      });

      // Log checkout session creation to Supabase
      try {
        await logToSupabase('payment_logs', {
          booking_id: bookingId,
          user_id: (req as any).user.uid,
          event: 'checkout_session_created',
          status: 'pending',
          stripe_session_id: session.id,
          amount: price,
          currency: 'uzs'
        });
      } catch (supabaseError) {
        console.warn("Error logging to Supabase:", supabaseError);
      }

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe session creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Stripe Session and Confirm Booking
  app.get("/api/verify-session", async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      const bookingId = session.client_reference_id;

      if (session.payment_status === "paid" && bookingId) {
        // Update booking status in Firestore
        const bookingRef = clientDoc(clientDb, "bookings", bookingId);
        await updateClientDoc(bookingRef, {
          status: "confirmed",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          updatedAt: new Date().toISOString(),
        });

        // Log payment confirmation to Supabase
        try {
          await logToSupabase('payment_logs', {
            booking_id: bookingId,
            user_id: session.customer_email || 'unknown',
            event: 'payment_completed',
            status: 'paid',
            stripe_session_id: session.id,
            confirmed_at: new Date().toISOString()
          });
        } catch (supabaseError) {
          console.warn("Error logging to Supabase:", supabaseError);
        }

        res.json({ success: true, bookingId });
      } else {
        res.status(400).json({ success: false, error: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Stripe session verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Driver Account (Admin Only)
  app.post("/api/admin/create-driver", verifyAdmin, async (req, res) => {
    const { email, password, name, phone, photo, bio, experience, rating } = req.body;
    console.log("Creating driver with email:", email);

    if (!email || !password || !name) {
      console.warn("Missing required fields for driver creation:", { email, name, password: password ? 'provided' : 'missing' });
      return res.status(400).json({ error: "Email, password and name are required" });
    }

    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      if (!db) throw new Error("Firestore not initialized");

      // 1. Create User in Firebase Auth using REST API (to avoid credential issues)
      console.log("Attempting to create user in Firebase Auth via REST API...");
      
      if (!firebaseConfig.apiKey) {
        throw new Error("Firebase API Key not found in config. Cannot create user.");
      }

      let uid: string;
      try {
        const signUpResponse = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            email,
            password,
            returnSecureToken: true
          }
        );
        
        uid = signUpResponse.data.localId;
        const idToken = signUpResponse.data.idToken;
        
        // Update profile (displayName, photoUrl)
        await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`,
          {
            idToken,
            displayName: name,
            photoUrl: photo || undefined,
            deleteAttribute: []
          }
        );
        console.log("User created in Firebase Auth with UID:", uid);
      } catch (authError: any) {
        const errorData = authError.response?.data?.error;
        if (errorData?.message === 'EMAIL_EXISTS') {
          // If user exists, we might want to get their UID, but without admin SDK we can't easily.
          // For now, throw a clear error.
          throw new Error("Ushbu email bilan foydalanuvchi allaqachon mavjud.");
        }
        console.error("Auth REST API error:", errorData || authError.message);
        throw new Error(`Auth xatoligi: ${errorData?.message || authError.message}`);
      }

      // 2. Create User Document in Firestore
      console.log("Creating user document in Firestore...");
      const userDocRef = clientDoc(clientDb, 'users', uid);
      await setClientDoc(userDocRef, {
        name,
        email,
        role: 'driver',
        createdAt: new Date().toISOString()
      });
      console.log("User document created in Firestore.");

      // 3. Create Driver Document in Firestore
      console.log("Creating driver document in Firestore...");
      const driverCollectionRef = clientCollection(clientDb, 'drivers');
      const driverDoc = await addClientDoc(driverCollectionRef, {
        uid: uid,
        name,
        email,
        phone: phone || '',
        photo: photo || '',
        bio: bio || '',
        experience: experience || 0,
        rating: rating || 5.0,
        createdAt: new Date().toISOString()
      });
      console.log("Driver document created in Firestore with ID:", driverDoc.id);

      res.json({ success: true, driverId: driverDoc.id, uid: uid });
    } catch (error: any) {
      console.error("Error creating driver:", error);
      res.status(500).json({ error: error.message || "Failed to create driver", details: error.code });
    }
  });

  // Promote a user to admin
  app.post("/api/admin/promote-to-admin", verifyAdmin, async (req, res) => {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: "Either userId or email is required" });
    }

    try {
      if (!db) throw new Error("Firestore not initialized");
      if (!auth) throw new Error("Firebase Auth not initialized");

      let targetUid = userId;

      // If email is provided, find the user by email
      if (!targetUid && email) {
        try {
          const userRecord = await getAdminAuth(firebaseApp).getUserByEmail(email);
          targetUid = userRecord.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: "User not found with this email" });
          }
          throw error;
        }
      }

      if (!targetUid) {
        return res.status(400).json({ error: "Could not determine user ID" });
      }

      // Update user role in Firestore
      const userDocRef = admin.firestore().collection('users').doc(targetUid);
      const userDoc = await userDocRef.get();

      if (!(userDoc as any).exists()) {
        return res.status(404).json({ error: "User document not found in Firestore" });
      }

      await userDocRef.update({ role: 'admin' });
      console.log("User promoted to admin:", targetUid);

      // Optionally, set custom claims in Firebase Auth
      try {
        await getAdminAuth(firebaseApp).setCustomUserClaims(targetUid, { admin: true });
        console.log("Custom admin claim set for user:", targetUid);
      } catch (customClaimError) {
        console.warn("Could not set custom claims (this is optional):", customClaimError);
      }

      res.json({ success: true, message: "User promoted to admin", userId: targetUid });
    } catch (error: any) {
      console.error("Error promoting user to admin:", error);
      res.status(500).json({ error: error.message || "Failed to promote user to admin" });
    }
  });

  // Make a user a driver
  app.post("/api/admin/promote-to-driver", verifyAdmin, async (req, res) => {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: "Either userId or email is required" });
    }

    try {
      if (!db) throw new Error("Firestore not initialized");
      if (!auth) throw new Error("Firebase Auth not initialized");

      let targetUid = userId;

      // If email is provided, find the user by email
      if (!targetUid && email) {
        try {
          const userRecord = await getAdminAuth(firebaseApp).getUserByEmail(email);
          targetUid = userRecord.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: "User not found with this email" });
          }
          throw error;
        }
      }

      if (!targetUid) {
        return res.status(400).json({ error: "Could not determine user ID" });
      }

      // Update user role in Firestore
      const userDocRef = admin.firestore().collection('users').doc(targetUid);
      const userDoc = await userDocRef.get();

      if (!(userDoc as any).exists()) {
        return res.status(404).json({ error: "User document not found in Firestore" });
      }

      await userDocRef.update({ role: 'driver' });
      console.log("User promoted to driver:", targetUid);

      // Optionally, set custom claims in Firebase Auth
      try {
        await getAdminAuth(firebaseApp).setCustomUserClaims(targetUid, { driver: true });
        console.log("Custom driver claim set for user:", targetUid);
      } catch (customClaimError) {
        console.warn("Could not set custom claims (this is optional):", customClaimError);
      }

      res.json({ success: true, message: "User promoted to driver", userId: targetUid });
    } catch (error: any) {
      console.error("Error promoting user to driver:", error);
      res.status(500).json({ error: error.message || "Failed to promote user to driver" });
    }
  });

  // Verify Google ID Token
  app.post("/api/auth/google/verify", async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "No credential provided" });
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Create JWT for session
      const token = jwt.sign(
        { 
          id: payload.sub, 
          email: payload.email, 
          name: payload.name, 
          picture: payload.picture 
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Set cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "lax" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ success: true, user: { 
        id: payload.sub, 
        email: payload.email, 
        name: payload.name, 
        picture: payload.picture 
      }});
    } catch (error: any) {
      console.error("Token verification error:", error.message);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ user: decoded });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "lax" : "none"
    });
    res.json({ success: true });
  });

  // Real-time Location Endpoint
  app.post("/api/location", verifyUser, async (req, res) => {
    const { bus_id, lat, lng, speed } = req.body;

    if (!bus_id || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing required fields: bus_id, lat, lng" });
    }

    const locationData = {
      lat,
      lng,
      speed,
      timestamp: new Date().toISOString()
    };

    // Store in memory
    busLocations[bus_id] = locationData;

    // Emit to Socket.IO room
    io.to(`bus_${bus_id}`).emit("location_update", locationData);

    res.json({ success: true });
  });

  // Admin: Set Project Card Number
  app.post("/api/admin/set-project-card-number", verifyAdmin, async (req, res) => {
    const { cardNumber } = req.body;
    if (!cardNumber) {
      return res.status(400).json({ error: "Karta raqami talab qilinadi" });
    }

    try {
      const settingsRef = clientDoc(clientDb, "settings", "payment");
      await setClientDoc(settingsRef, {
        adminCardNumber: cardNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting card number:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // User: Upload Payment Receipt
  app.post("/api/upload-payment-receipt", verifyUser, async (req, res) => {
    const { bookingId, receiptUrl } = req.body;
    if (!bookingId || !receiptUrl) {
      return res.status(400).json({ error: "Booking ID va chek URL talab qilinadi" });
    }

    const MANUAL_PAYMENT_TIMEOUT_SECONDS = 30; // 30 seconds timeout for manual payment verification

    try {
      const bookingRef = clientDoc(clientDb, "bookings", bookingId);
      const bookingDoc = await getClientDoc(bookingRef);

      if (!bookingDoc.exists()) {
        return res.status(404).json({ error: "Booking topilmadi" });
      }

      if (bookingDoc.data()?.userId !== (req as any).user.uid) {
        return res.status(403).json({ error: "Ruxsat berilmagan" });
      }

      const uploadedAt = new Date();
      const expiresAt = new Date(uploadedAt.getTime() + MANUAL_PAYMENT_TIMEOUT_SECONDS * 1000);

      await updateClientDoc(bookingRef, {
        paymentStatus: "pending_review",
        paymentMethod: "manual",
        receiptUrl,
        receiptUploadedAt: uploadedAt.toISOString(),
        receiptExpiresAt: expiresAt.toISOString(),
        updatedAt: uploadedAt.toISOString()
      });

      // Log to Supabase for analytics
      try {
        await logToSupabase('payment_logs', {
          booking_id: bookingId,
          user_id: (req as any).user.uid,
          event: 'receipt_uploaded',
          status: 'pending_review',
          uploaded_at: uploadedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          timeout_seconds: MANUAL_PAYMENT_TIMEOUT_SECONDS
        });
      } catch (supabaseError) {
        console.warn("Error logging to Supabase:", supabaseError);
      }

      res.json({ 
        success: true,
        message: 'Chek muvaffaqiyatli yuklandi',
        timeoutSeconds: MANUAL_PAYMENT_TIMEOUT_SECONDS
      });
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Confirm/Reject Manual Payment
  app.post("/api/admin/confirm-manual-payment", verifyAdmin, async (req, res) => {
    const { bookingId, status } = req.body; // status: 'paid' or 'rejected'
    if (!bookingId || !status) {
      return res.status(400).json({ error: "Booking ID va holat talab qilinadi" });
    }

    try {
      const bookingRef = clientDoc(clientDb, "bookings", bookingId);
      const bookingDoc = await getClientDoc(bookingRef);

      if (!bookingDoc.exists()) {
        return res.status(404).json({ error: "Booking topilmadi" });
      }

      const updateData: any = {
        paymentStatus: status,
        updatedAt: new Date().toISOString()
      };

      if (status === "paid") {
        updateData.status = "confirmed";
      } else if (status === "rejected") {
        // Optionally keep status as pending or mark as cancelled
        updateData.status = "cancelled";
      }

      await updateClientDoc(bookingRef, updateData);

      // Log to Supabase for analytics
      try {
        await logToSupabase('payment_logs', {
          booking_id: bookingId,
          admin_id: (req as any).user.uid,
          event: 'payment_confirmed',
          status: status,
          confirmed_at: new Date().toISOString()
        });
      } catch (supabaseError) {
        console.warn("Error logging to Supabase:", supabaseError);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Ticket PDF
  app.post("/api/generate-ticket", verifyUser, async (req, res) => {
    const { bookingId } = req.body;
    const userId = (req as any).user.uid;

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID talab qilinadi" });
    }

    try {
      // Fetch booking from Firestore
      const bookingRef = clientDoc(clientDb, 'bookings', bookingId);
      const bookingDoc = await getClientDoc(bookingRef);
      if (!bookingDoc.exists()) {
        return res.status(404).json({ error: "Chipta topilmadi" });
      }

      const booking = bookingDoc.data()!;
      
      // Authorization check: User can only download their own ticket, or admin can download any
      const userDocRef = clientDoc(clientDb, 'users', userId);
      const userDoc = await getClientDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';
      
      if (booking.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Ruxsat berilmagan" });
      }

      if (booking.status !== 'confirmed') {
        return res.status(403).json({ error: "Chipta hali tasdiqlanmagan" });
      }

      // Fetch ride details
      const rideDocRef = clientDoc(clientDb, 'rides', booking.rideId);
      const rideDoc = await getClientDoc(rideDocRef);
      const ride = rideDoc.exists() ? rideDoc.data() : null;

      // Fetch user details (the passenger)
      const passengerDocRef = clientDoc(clientDb, 'users', booking.userId);
      const passengerDoc = await getClientDoc(passengerDocRef);
      const passenger = passengerDoc.exists() ? passengerDoc.data() : null;

      const fullName = passenger?.name || booking.fullName || "Noma'lum";
      const phone = passenger?.phoneNumber || booking.phone || "Noma'lum";
      const birthDate = passenger?.birthDate || "Noma'lum";
      const passport = passenger?.passport || "Noma'lum";
      const busNumber = ride?.busNumber || "Noma'lum";
      const seatNumber = booking.seatNumber || "Noma'lum";
      const purchaseDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('uz-UZ') : new Date().toLocaleDateString('uz-UZ');
      const ticketId = `TZ-${bookingId.slice(0, 8).toUpperCase()}`;
      const issueDate = new Date().toLocaleString('uz-UZ');

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 400]); // A5-ish landscape for ticket feel
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Background / Border
      page.drawRectangle({
        x: 10,
        y: 10,
        width: width - 20,
        height: height - 20,
        borderColor: rgb(0.06, 0.45, 0.35), // Emerald 700
        borderWidth: 2,
      });

      // Header Section
      page.drawRectangle({
        x: 10,
        y: height - 80,
        width: width - 20,
        height: 70,
        color: rgb(0.06, 0.45, 0.35),
      });

      page.drawText("TezChipta", {
        x: 30,
        y: height - 55,
        size: 30,
        font: boldFont,
        color: rgb(1, 1, 1),
      });

      page.drawText("AVTOBUS CHIPTASI", {
        x: width - 200,
        y: height - 50,
        size: 14,
        font: boldFont,
        color: rgb(1, 1, 1),
      });

      // QR Code
      const qrData = JSON.stringify({ ticketId, fullName, busNumber, seatNumber });
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);
      const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
      page.drawImage(qrImage, {
        x: width - 110,
        y: height - 180,
        width: 80,
        height: 80,
      });

      // Ticket ID
      page.drawText(`ID: ${ticketId}`, {
        x: width - 110,
        y: height - 195,
        size: 10,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Passenger Info Section
      page.drawText("YO'LOVCHI MA'LUMOTLARI", {
        x: 30,
        y: height - 110,
        size: 12,
        font: boldFont,
        color: rgb(0.06, 0.45, 0.35),
      });

      const drawField = (label: string, value: string, x: number, y: number) => {
        page.drawText(label, { x, y, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(value, { x, y: y - 15, size: 12, font, color: rgb(0, 0, 0) });
      };

      drawField("Ism Familiya:", fullName, 30, height - 140);
      drawField("Telefon:", phone, 30, height - 185);
      drawField("Tug'ilgan sana:", birthDate, 200, height - 185);
      drawField("Pasport/ID:", passport, 30, height - 230);

      // Travel Info Section
      page.drawText("SAYOHAT MA'LUMOTLARI", {
        x: 30,
        y: height - 275,
        size: 12,
        font: boldFont,
        color: rgb(0.06, 0.45, 0.35),
      });

      drawField("Avtobus raqami:", busNumber, 30, height - 305);
      drawField("O'rindiq:", seatNumber.toString(), 150, height - 305);
      drawField("Sotib olingan sana:", purchaseDate, 270, height - 305);

      // Status Badge
      const isConfirmed = booking.status === 'confirmed';
      const statusColor = isConfirmed ? rgb(0.06, 0.45, 0.35) : rgb(0.8, 0.1, 0.1);
      
      page.drawRectangle({
        x: width - 150,
        y: 30,
        width: 120,
        height: 30,
        color: statusColor,
        opacity: 0.1,
      });

      page.drawText(isConfirmed ? "TASDIQLANGAN" : "TASDIQLANMAGAN", {
        x: width - 140,
        y: 42,
        size: 10,
        font: boldFont,
        color: statusColor,
      });

      // Footer
      page.drawText(`Berilgan vaqt: ${issueDate}`, {
        x: 30,
        y: 30,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText("TezChipta - Xavfsiz va qulay sayohat", {
        x: 30,
        y: 20,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${ticketId}.pdf`);
      res.send(Buffer.from(pdfBytes));

    } catch (error: any) {
      console.error("Ticket generation error:", error);
      res.status(500).json({ error: "Chipta yaratishda xatolik yuz berdi" });
    }
  });

  // Admin: Clear Database
  app.post("/api/admin/clear-database", verifyAdmin, async (req, res) => {
    if (isProduction && process.env.ALLOW_DATABASE_CLEAR !== 'true') {
      return res.status(403).json({ error: "Clear database is disabled in production" });
    }

    try {
      const collections = ['bookings', 'rides', 'users', 'drivers', 'faqs', 'messages', 'chats', 'reviews', 'blogs'];
      
      for (const collectionName of collections) {
        const collectionRef = clientCollection(clientDb, collectionName);
        const snapshot = await getClientDocs(collectionRef);
        
        for (const document of snapshot.docs) {
          // Don't delete the admin user
          if (collectionName === 'users' && (document.data().email === 'qoziboyevaslbek359@gmail.com' || document.data().role === 'admin')) continue;
          
          // If it's a chat, delete its messages subcollection first
          if (collectionName === 'chats') {
            const messagesCollectionRef = clientCollection(clientDb, 'chats', document.id, 'messages');
            const messagesSnapshot = await getClientDocs(messagesCollectionRef);
            // In client SDK, we don't have batch delete easily like this, so we loop
            for (const msgDoc of messagesSnapshot.docs) {
              await deleteClientDoc(msgDoc.ref);
            }
          }
          
          await deleteClientDoc(document.ref);
        }
      }

      // Clear in-memory bus locations
      Object.keys(busLocations).forEach(key => delete busLocations[key]);

      res.json({ success: true, message: "Ma'lumotlar bazasi muvaffaqiyatli tozalandi" });
    } catch (error) {
      console.error("Clear database error:", error);
      res.status(500).json({ error: "Bazani tozalashda xatolik yuz berdi" });
    }
  });

  // ===== NEWSLETTER SYSTEM =====

  // Subscribe to newsletter
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "To'g'ri email manzilini kiriting" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if already subscribed
      const existingSubscriber = await getClientDocs(
        clientQuery(
          clientCollection(clientDb, 'newsletter_subscribers'),
          clientWhere('email', '==', normalizedEmail)
        )
      );

      if (!existingSubscriber.empty) {
        return res.status(200).json({ 
          message: "Siz allaqachon obuna qilgansiz",
          subscribed: true
        });
      }

      // Add new subscriber
      const docRef = await addClientDoc(
        clientCollection(clientDb, 'newsletter_subscribers'),
        {
          email: normalizedEmail,
          subscribedAt: new Date().toISOString(),
          status: 'active',
          unsubscribeToken: Math.random().toString(36).substr(2, 9)
        }
      );

      console.log("Newsletter subscriber added:", normalizedEmail);
      res.status(201).json({ 
        message: "Siz newsletter ga muvaffaqiyatli obuna qildingiz",
        subscriberId: docRef.id,
        subscribed: true
      });
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ error: "Obunalashda xatolik yuz berdi" });
    }
  });

  // Unsubscribe from newsletter
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email manzili talab qilinadi" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find and delete subscriber
      const snapshot = await getClientDocs(
        clientQuery(
          clientCollection(clientDb, 'newsletter_subscribers'),
          clientWhere('email', '==', normalizedEmail)
        )
      );

      if (snapshot.empty) {
        return res.status(404).json({ error: "Obuna topilmadi" });
      }

      await deleteClientDoc(snapshot.docs[0].ref);

      console.log("Newsletter subscriber removed:", normalizedEmail);
      res.json({ 
        message: "Siz newsletter dan obunan chiqtingiz",
        unsubscribed: true
      });
    } catch (error: any) {
      console.error("Newsletter unsubscribe error:", error);
      res.status(500).json({ error: "Obunan chiqishda xatolik yuz berdi" });
    }
  });

  // Get all newsletter subscribers (Admin only)
  app.get("/api/admin/newsletter/subscribers", verifyAdmin, async (req, res) => {
    try {
      const snapshot = await getClientDocs(
        clientQuery(
          clientCollection(clientDb, 'newsletter_subscribers'),
          clientWhere('status', '==', 'active')
        )
      );

      const subscribers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({
        count: subscribers.length,
        subscribers: subscribers
      });
    } catch (error: any) {
      console.error("Get subscribers error:", error);
      res.status(500).json({ error: "Obunachilar ro'yxatini olishda xatolik yuz berdi" });
    }
  });

  // Send newsletter to all subscribers (Admin only)
  app.post("/api/admin/newsletter/send", verifyAdmin, async (req, res) => {
    try {
      const { subject, message, htmlContent } = req.body;

      if (!subject || !message) {
        return res.status(400).json({ error: "Sarlavha va xabar talab qilinadi" });
      }

      // Get all active subscribers
      const snapshot = await getClientDocs(
        clientQuery(
          clientCollection(clientDb, 'newsletter_subscribers'),
          clientWhere('status', '==', 'active')
        )
      );

      const subscribers = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email
      }));

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "Jadvalga olingan obunachilar yo'q" });
      }

      // Create newsletter record
      const newsletterRef = await addClientDoc(
        clientCollection(clientDb, 'newsletters'),
        {
          subject: subject,
          message: message,
          htmlContent: htmlContent || null,
          recipientCount: subscribers.length,
          sentAt: new Date().toISOString(),
          sentBy: (req as any).user?.email || (req as any).user?.uid,
          status: 'sent'
        }
      );

      // In production, integrate with email service (SendGrid, Mailgun, Firebase Email, etc.)
      // For now, we'll just log and store the newsletter
      console.log(`Newsletter sent to ${subscribers.length} subscribers:`, {
        subject: subject,
        sent: new Date().toISOString(),
        recipients: subscribers.map(s => s.email)
      });

      /* Example integration code for future email sending:
      try {
        // Option 1: Firebase Messaging
        const tokens = await getDeviceTokens(subscribers);
        await admin.messaging().sendMulticast({
          notification: { title: subject, body: message },
          tokens: tokens
        });

        // Option 2: SendGrid API
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // await Promise.all(subscribers.map(sub => 
        //   sgMail.send({...})
        // ));

        // Option 3: Mailgun API
        // const mailgun = require('mailgun.js');
        // const mg = new mailgun(FormData);
        // await Promise.all(subscribers.map(sub => 
        //   mg.messages.create(...)
        // ));
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Still return success as newsletter record was created
      }
      */

      res.json({
        success: true,
        message: `Newsletter ${subscribers.length} obunachiiga jo'natildi`,
        newsletterId: newsletterRef.id,
        recipientCount: subscribers.length
      });
    } catch (error: any) {
      console.error("Send newsletter error:", error);
      res.status(500).json({ error: "Newsletter jo'natishda xatolik yuz berdi" });
    }
  });

  // Get newsletter history (Admin only)
  app.get("/api/admin/newsletter/history", verifyAdmin, async (req, res) => {
    try {
      const snapshot = await getClientDocs(
        clientQuery(clientCollection(clientDb, 'newsletters'))
      );

      const newsletters = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a: any, b: any) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime())
        .slice(0, 50);

      res.json({
        count: newsletters.length,
        newsletters: newsletters
      });
    } catch (error: any) {
      console.error("Get newsletter history error:", error);
      res.status(500).json({ error: "Newsletter tarixini olishda xatolik yuz berdi" });
    }
  });

  // Socket.IO Logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_bus", (bus_id) => {
      console.log(`Socket ${socket.id} joining bus_${bus_id}`);
      socket.join(`bus_${bus_id}`);
      
      // Send initial location if available
      if (busLocations[bus_id]) {
        socket.emit("location_update", busLocations[bus_id]);
      }
    });

    socket.on("leave_bus", (bus_id) => {
      console.log(`Socket ${socket.id} leaving bus_${bus_id}`);
      socket.leave(`bus_${bus_id}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    
    console.log("Current working directory:", process.cwd());
    console.log("Serving static files from:", distPath);
    console.log("Serving public files from:", publicPath);
    console.log("dist exists:", fs.existsSync(distPath));
    console.log("index.html exists:", fs.existsSync(path.join(distPath, 'index.html')));
    console.log("assets folder exists:", fs.existsSync(path.join(distPath, 'assets')));
    
    // Check if dist exists, if not log warning
    if (!fs.existsSync(distPath)) {
      console.warn("⚠️  WARNING: dist folder not found. Build may not have completed successfully.");
      console.warn("⚠️  Server will still attempt to serve but may fail. Check Render logs for build errors.");
    }
    
    // Add request logging for debugging
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    // Middleware to set correct Content-Type headers for static files BEFORE serving
    app.use((req, res, next) => {
      if (req.path.includes('/assets/')) {
        if (req.path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (req.path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (req.path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else if (req.path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (req.path.endsWith('.woff2')) {
          res.setHeader('Content-Type', 'font/woff2');
        } else if (req.path.endsWith('.woff')) {
          res.setHeader('Content-Type', 'font/woff');
        } else if (req.path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (req.path.endsWith('.jpg') || req.path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (req.path.endsWith('.gif')) {
          res.setHeader('Content-Type', 'image/gif');
        }
      }
      next();
    });

    // Serve built files with explicit error handling
    app.use('/assets', (req, res, next) => {
      // req.path starts with "/" so we need to slice it off for proper path joining
      const fileName = req.path.slice(1); // Remove leading /
      const filePath = path.join(distPath, 'assets', fileName);
      
      console.log(`📦 Asset request: /assets${req.path}`);
      console.log(`   Resolved to: ${filePath}`);
      console.log(`   File exists: ${fs.existsSync(filePath)}`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Asset not found: /assets${req.path}`);
        console.error(`   Expected at: ${filePath}`);
        // List available files for debugging
        const assetsDir = path.join(distPath, 'assets');
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          console.error(`   Total files in assets dir: ${files.length}`);
          // Try to find similar files
          const searchName = fileName.split('-').slice(0, 2).join('-');
          const matching = files.filter(f => f.includes(searchName));
          if (matching.length > 0) {
            console.error(`   Files matching "${searchName}": ${matching.slice(0, 3).join(', ')}`);
          }
        }
        return res.status(404).set('Content-Type', 'text/plain').send(`Asset not found: /assets${req.path}`);
      }
      
      // Set content type based on file extension
      if (req.path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (req.path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (req.path.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (req.path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (req.path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`❌ Error serving asset /assets${req.path}:`, err.message);
          if (!res.headersSent) {
            res.status(500).set('Content-Type', 'text/plain').send(`Error serving asset: ${err.message}`);
          }
        } else {
          console.log(`✅ Served asset: /assets${req.path}`);
        }
      });
    });

    // Serve public files (robots.txt, sitemap.xml, etc.)
    app.use(express.static(publicPath));
    
    // Serve other dist files (index.html will be served by catch-all)
    app.use((req, res, next) => {
      const filePath = path.join(distPath, req.path);
      
      // Only serve actual files, not directories or index.html via this middleware
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile() && req.path !== '/' && !req.path.startsWith('/assets')) {
        return res.sendFile(filePath);
      }
      
      next();
    });
    
    // Explicit route for manifest to ensure correct MIME type
    app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
      const manifestPath = path.join(distPath, 'manifest.webmanifest');
      if (fs.existsSync(manifestPath)) {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.sendFile(manifestPath);
      } else {
        res.status(404).send('Manifest not found');
      }
    });

    // Explicit route for logo.png just in case
    app.get('/logo.png', (req, res) => {
      const logoInPublic = path.join(publicPath, 'logo.png');
      const logoInDist = path.join(distPath, 'logo.png');
      
      res.setHeader('Content-Type', 'image/png');
      if (fs.existsSync(logoInPublic)) {
        res.sendFile(logoInPublic);
      } else if (fs.existsSync(logoInDist)) {
        res.sendFile(logoInDist);
      } else {
        res.status(404).send('Logo not found');
      }
    });

    app.get('*', (req, res) => {
      // For any other route (SPA routing), serve index.html
      const indexPath = path.join(distPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error(`Error serving index.html:`, err);
            res.status(500).set('Content-Type', 'text/plain').send('Server error');
          }
        });
      } else {
        console.error(`ERROR: index.html not found at ${indexPath}`);
        res.status(500).set('Content-Type', 'text/plain').send(`Server Error: index.html not found at ${indexPath}`);
      }
    });
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Fatal error during server startup:", error);
  process.exit(1);
});
