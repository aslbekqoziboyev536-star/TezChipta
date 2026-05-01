import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import mongoose from "mongoose";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as getClientDoc, updateDoc as updateClientDoc, collection as clientCollection, addDoc as addClientDoc, setDoc as setClientDoc, query as clientQuery, where as clientWhere, getDocs as getClientDocs, deleteDoc as deleteClientDoc } from "firebase/firestore";
import fs from "fs";
import axios from "axios";
import Stripe from "stripe";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const APP_URL = process.env.APP_URL || "http://localhost:5174";

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

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

if (!stripe) {
  console.warn("WARNING: STRIPE_SECRET_KEY is missing. Payment features will not work.");
}

// --- Metrics & Analytics ---
const serverMetrics = {
  onlineUsers: 0,
  todaySales: 0,
  todayRevenue: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[],
  endpointStats: {} as Record<string, { count: number, totalTime: number }>,
  errors: [] as { timestamp: string, message: string, endpoint?: string }[],
  conversions: {
    home: 0,
    search: 0,
    booking: 0,
    success: 0
  }
};

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
} else {
  // Fallback to environment variables for production/Render
  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID
  };
}

// Initialize Firebase Admin
let firebaseApp: admin.app.App;
try {
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
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  firebaseApp = admin.apps.length ? admin.app() : (null as any);
}

let db: any;
let auth: any;
let clientDb: any;

try {
  const clientApp = initializeClientApp(firebaseConfig);
  clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

  if (firebaseApp) {
    const databaseId = firebaseConfig.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID;
    db = databaseId ? getAdminFirestore(firebaseApp, databaseId) : getAdminFirestore(firebaseApp);
    auth = getAdminAuth(firebaseApp);
  }
} catch (error) {
  console.error("Firestore/Auth initialization error:", error);
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const busLocations: Record<string, { lat: number, lng: number, speed?: number, timestamp: string }> = {};
const INTERNAL_SECRET = "ai_studio_server_secret_2024";

const verifyFirebaseIdToken = async (idToken: string) => {
  try {
    if (auth) return await auth.verifyIdToken(idToken);
  } catch (error: any) {
    console.warn("Firebase Admin verifyIdToken failed, falling back to REST API");
  }

  if (!firebaseConfig.apiKey) throw new Error("Firebase API Key missing");

  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    { idToken }
  );

  const user = response.data.users?.[0];
  if (!user) throw new Error("User not found");

  return {
    uid: user.localId,
    email: user.email,
    email_verified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoUrl
  };
};

const verifyUser = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1]);
    next();
  } catch (error: any) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const verifyAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decodedToken = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1]);
    const email = String(decodedToken.email || '').toLowerCase();

    if (email && ADMIN_EMAILS.includes(email)) {
      req.user = decodedToken;
      return next();
    }

    if (!db) throw new Error("Firestore not initialized");
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.data()?.role === 'admin') {
      req.user = decodedToken;
      return next();
    }

    res.status(403).json({ error: "Forbidden: Admin access required" });
  } catch (error: any) {
    res.status(401).json({ error: "Admin verification failed" });
  }
};

const app = express();
const PORT = process.env.PORT || 4321;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }
});

// Response Time Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const path = req.path;

    // Update metrics
    serverMetrics.responseTimes.push(duration);
    if (serverMetrics.responseTimes.length > 100) serverMetrics.responseTimes.shift();

    serverMetrics.avgResponseTime = serverMetrics.responseTimes.reduce((a, b) => a + b, 0) / Math.max(1, serverMetrics.responseTimes.length);

    if (!serverMetrics.endpointStats[path]) {
      serverMetrics.endpointStats[path] = { count: 0, totalTime: 0 };
    }
    serverMetrics.endpointStats[path].count++;
    serverMetrics.endpointStats[path].totalTime += duration;

    // Log errors
    if (res.statusCode >= 400) {
      serverMetrics.errors.unshift({
        timestamp: new Date().toISOString(),
        message: `HTTP ${res.statusCode}: ${req.method} ${path}`,
        endpoint: path
      });
      if (serverMetrics.errors.length > 50) serverMetrics.errors.pop();
    }
  });
  next();
});

// 1. High Security Headers (Helmet)
// 1. High Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.stripe.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://va.vercel-scripts.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://*.stripe.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://va.vercel-scripts.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:", "https://*.googleusercontent.com", "https://*.gstatic.com", "https://*.stripe.com", "https://www.gstatic.com", "https://picsum.photos", "https://imagehosting-hulf.onrender.com", "https://placehold.co", "https://cdn-icons-png.flaticon.com", "https://*.firebaseapp.com"],
      connectSrc: [
        "'self'", 
        "https://*.supabase.co", 
        "https://*.supabase.in", 
        "https://*.googleapis.com", 
        "https://*.firebaseio.com", 
        "https://*.stripe.com", 
        "https://*.firebaseapp.com",
        "https://api.open-meteo.com",
        "https://va.vercel-scripts.com",
        "wss://*.firebaseio.com",
        "wss://*.run.app", 
        "wss://*.supabase.co", 
        "https://api.stripe.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.stripe.com", "https://*.google.com", "https://*.firebaseapp.com", "https://hooks.stripe.com"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer-when-downgrade" },
}));

// Additional Security Headers
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// 2. Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// 3. CORS & Parsers
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// 4. API Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/ping", (req, res) => res.json({ status: "pong", timestamp: new Date().toISOString() }));

async function startServer() {

  // --- Auth Routes ---
  app.post("/api/auth/google/verify", async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "No credential provided" });
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload) return res.status(400).json({ error: "Invalid token payload" });
      const token = jwt.sign({ id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ success: true, user: { id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture } });
    } catch (error: any) {
      console.error("Token verification error:", error.message);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ user: decoded });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true });
  });

  // --- Stripe Routes ---
  app.post("/api/create-checkout-session", verifyUser, async (req, res) => {
    const { bookingId, rideName, price } = req.body;
    if (!bookingId || !rideName || !price) return res.status(400).json({ error: "Missing required fields" });
    try {
      if (!STRIPE_SECRET_KEY) throw new Error("Stripe secret key is missing");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "uzs",
            product_data: { name: rideName, description: `Booking ID: ${bookingId}` },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        client_reference_id: bookingId,
        success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/`,
      });
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe session creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/verify-session", async (req, res) => {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Session ID is required" });
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      const bookingId = session.client_reference_id;
      if (session.payment_status === "paid" && bookingId) {
        await updateClientDoc(clientDoc(clientDb, "bookings", bookingId), {
          status: "confirmed",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          updatedAt: new Date().toISOString(),
          _serverSecret: INTERNAL_SECRET
        });
        res.json({ success: true, bookingId });
      } else {
        res.status(400).json({ success: false, error: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Stripe session verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Manual Payment Routes ---
  app.post("/api/upload-payment-receipt", verifyUser, async (req, res) => {
    const { bookingId, receiptUrl } = req.body;
    if (!bookingId || !receiptUrl) return res.status(400).json({ error: "Booking ID va chek URL talab qilinadi" });
    try {
      const bookingRef = clientDoc(clientDb, "bookings", bookingId);
      const bookingDoc = await getClientDoc(bookingRef);
      if (!bookingDoc.exists()) return res.status(404).json({ error: "Booking topilmadi" });
      if (bookingDoc.data()?.userId !== (req as any).user.uid) return res.status(403).json({ error: "Ruxsat berilmagan" });
      await updateClientDoc(bookingRef, {
        paymentStatus: "pending_review",
        paymentMethod: "manual",
        receiptUrl,
        receiptUploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _serverSecret: INTERNAL_SECRET
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Admin Routes ---
  app.post("/api/admin/create-driver", verifyAdmin, async (req, res) => {
    const { email, password, name, phone, photo, bio, experience, rating } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Email, password and name are required" });
    try {
      if (!firebaseConfig.apiKey) throw new Error("Firebase API Key not found");
      const signUpResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, { email, password, returnSecureToken: true });
      const uid = signUpResponse.data.localId;

      if (!db) throw new Error("Firestore Admin not initialized");

      const batch = db.batch();
      const userRef = db.collection('users').doc(uid);
      const driverRef = db.collection('drivers').doc();

      batch.set(userRef, {
        name,
        email,
        role: 'driver',
        createdAt: new Date().toISOString()
      });

      batch.set(driverRef, {
        uid,
        name,
        email,
        phone: phone || '',
        photo: photo || '',
        bio: bio || '',
        experience: experience || 0,
        rating: rating || 5.0,
        createdAt: new Date().toISOString()
      });

      await batch.commit();

      res.json({ success: true, driverId: driverRef.id, uid });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error("Error creating driver:", errorMsg);
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post("/api/admin/ai-analysis", verifyAdmin, async (req, res) => {
    try {
      const { usersCount, bookingsCount, ridesCount, language } = req.body;

      const dateStr = new Date().toISOString().split('T')[0];
      const cacheId = `${dateStr}_${language}`;

      if (!db) throw new Error("Firestore not initialized");
      const cacheRef = db.collection('stats_ai_cache').doc(cacheId);
      const cacheDoc = await cacheRef.get();

      if (cacheDoc.exists) {
        return res.json({ analysis: cacheDoc.data()?.result });
      }

      const statsSummary = `
        Platform Statistics:
        - Total Users: ${usersCount}
        - Total Bookings: ${bookingsCount}
        - Total Rides: ${ridesCount}
        
        Current Language: ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'}
        
        As an expert SaaS Analytics AI, provide a professional analysis in the specified language. 
        Focus on:
        1. Growth metrics summary.
        2. Anomaly detection (e.g., if bookings ratio is abnormal).
        3. Revenue forecast or growth potential.
        Keep it highly professional, concise (3-4 sentences), and actionable.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: statsSummary,
      });

      await cacheRef.set({
        result: response.text,
        timestamp: new Date().toISOString(),
        language
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("AI Analysis error details:", error);
      res.status(500).json({ error: "AI failed", details: error.message });
    }
  });

  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Foydalanuvchi UID talab qilinadi" });
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const userToAuth = await auth.getUser(uid);
      if (ADMIN_EMAILS.includes(userToAuth.email?.toLowerCase() || '')) return res.status(403).json({ error: "Adminni o'chirib bo'lmaydi" });
      await auth.deleteUser(uid);
      await deleteClientDoc(clientDoc(clientDb, 'users', uid));
      const driversRef = clientCollection(clientDb, 'drivers');
      const driverQuerySnapshot = await getClientDocs(clientQuery(driversRef, clientWhere('uid', '==', uid)));
      for (const driverDoc of driverQuerySnapshot.docs) await deleteClientDoc(driverDoc.ref);
      res.json({ success: true, message: "Foydalanuvchi to'liq o'chirildi" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/set-project-card-number", verifyAdmin, async (req, res) => {
    const { cardNumber } = req.body;
    if (!cardNumber) return res.status(400).json({ error: "Karta raqami talab qilinadi" });
    try {
      await setClientDoc(clientDoc(clientDb, "settings", "payment"), { adminCardNumber: cardNumber, updatedAt: new Date().toISOString(), _serverSecret: INTERNAL_SECRET }, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting card number:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/confirm-manual-payment", verifyAdmin, async (req, res) => {
    const { bookingId, status } = req.body;
    if (!bookingId || !status) return res.status(400).json({ error: "Booking ID va holat talab qilinadi" });
    try {
      const bookingRef = clientDoc(clientDb, "bookings", bookingId);
      const updateData: any = { paymentStatus: status, updatedAt: new Date().toISOString(), _serverSecret: INTERNAL_SECRET };
      if (status === "paid") updateData.status = "confirmed";
      else if (status === "rejected") updateData.status = "cancelled";
      await updateClientDoc(bookingRef, updateData);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/clear-database", verifyAdmin, async (req, res) => {
    try {
      const collections = ['bookings', 'rides', 'users', 'drivers', 'faqs', 'messages', 'chats', 'reviews', 'blogs'];
      for (const collectionName of collections) {
        const snapshot = await getClientDocs(clientCollection(clientDb, collectionName));
        for (const document of snapshot.docs) {
          if (collectionName === 'users' && (ADMIN_EMAILS.includes(document.data().email?.toLowerCase() || '') || document.data().role === 'admin')) continue;
          if (collectionName === 'chats') {
            const msgs = await getClientDocs(clientCollection(clientDb, 'chats', document.id, 'messages'));
            for (const msg of msgs.docs) await deleteClientDoc(msg.ref);
          }
          await deleteClientDoc(document.ref);
        }
      }
      Object.keys(busLocations).forEach(key => delete busLocations[key]);
      res.json({ success: true, message: "Ma'lumotlar bazasi muvaffaqiyatli tozalandi" });
    } catch (error) {
      console.error("Clear database error:", error);
      res.status(500).json({ error: "Bazani tozalashda xatolik yuz berdi" });
    }
  });

  // --- Location Routes ---
  app.post("/api/location", (req, res) => {
    const { bus_id, lat, lng, speed } = req.body;
    if (!bus_id) return res.status(400).json({ error: "Missing bus_id" });
    const locationData = { lat, lng, speed, timestamp: new Date().toISOString() };
    busLocations[bus_id] = locationData;
    io.to(`bus_${bus_id}`).emit("location_update", locationData);
    res.json({ success: true });
  });

  // --- Notification Routes ---
  app.post("/api/send-notification", async (req, res) => {
    const { fcmToken, title, body, url } = req.body;
    if (!fcmToken) return res.status(400).json({ error: "FCM Token required" });
    if (!firebaseApp) return res.status(500).json({ error: "Firebase Admin not initialized" });
    try {
      const message = { notification: { title, body }, data: { url: url || "/" }, token: fcmToken };
      const response = await admin.messaging(firebaseApp).send(message);
      res.json({ success: true, response });
    } catch (error: any) {
      console.error("FCM Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Ticket Routes ---
  app.post("/api/generate-ticket", verifyUser, async (req, res) => {
    const { bookingId } = req.body;
    const userId = (req as any).user.uid;
    if (!bookingId) return res.status(400).json({ error: "Booking ID talab qilinadi" });
    try {
      const bookingDoc = await getClientDoc(clientDoc(clientDb, 'bookings', bookingId));
      if (!bookingDoc.exists()) return res.status(404).json({ error: "Chipta topilmadi" });
      const booking = bookingDoc.data()!;
      const userDoc = await getClientDoc(clientDoc(clientDb, 'users', userId));
      const isAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';
      if (booking.userId !== userId && !isAdmin) return res.status(403).json({ error: "Ruxsat berilmagan" });
      if (booking.status !== 'confirmed') return res.status(403).json({ error: "Chipta hali tasdiqlanmagan" });

      const rideDoc = await getClientDoc(clientDoc(clientDb, 'rides', booking.rideId));
      const ride = rideDoc.exists() ? rideDoc.data() : null;
      const passengerDoc = await getClientDoc(clientDoc(clientDb, 'users', booking.userId));
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

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 400]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawRectangle({ x: 10, y: 10, width: width - 20, height: height - 20, borderColor: rgb(0.06, 0.45, 0.35), borderWidth: 2 });
      page.drawRectangle({ x: 10, y: height - 80, width: width - 20, height: 70, color: rgb(0.06, 0.45, 0.35) });
      page.drawText("TezChipta", { x: 30, y: height - 55, size: 30, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText("AVTOBUS CHIPTASI", { x: width - 200, y: height - 50, size: 14, font: boldFont, color: rgb(1, 1, 1) });

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ ticketId, fullName, busNumber, seatNumber }));
      const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
      page.drawImage(qrImage, { x: width - 110, y: height - 180, width: 80, height: 80 });
      page.drawText(`ID: ${ticketId}`, { x: width - 110, y: height - 195, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });

      const drawField = (label: string, value: string, x: number, y: number) => {
        page.drawText(label, { x, y, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(String(value), { x, y: y - 15, size: 12, font, color: rgb(0, 0, 0) });
      };

      drawField("Yo'lovchi:", fullName, 30, height - 110);
      drawField("Telefon:", phone, 30, height - 155);
      drawField("Pasport:", passport, 200, height - 155);
      drawField("Avtobus:", busNumber, 30, height - 200);
      drawField("O'rindiq:", String(seatNumber), 150, height - 200);
      drawField("Sana:", purchaseDate, 30, height - 245);

      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${ticketId}.pdf`);
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("Ticket generation error:", error);
      res.status(500).json({ error: "Chipta yaratishda xatolik yuz berdi" });
    }
  });

  // --- Socket.IO Logic ---
  io.on("connection", (socket) => {
    serverMetrics.onlineUsers++;
    io.emit('admin_metrics_update', serverMetrics);

    socket.on("join_bus", (bus_id) => {
      socket.join(`bus_${bus_id}`);
      if (busLocations[bus_id]) socket.emit("location_update", busLocations[bus_id]);
    });
    socket.on("leave_bus", (bus_id) => socket.leave(`bus_${bus_id}`));

    socket.on("disconnect", () => {
      serverMetrics.onlineUsers = Math.max(0, serverMetrics.onlineUsers - 1);
      io.emit('admin_metrics_update', serverMetrics);
    });

    // Analytics tracking from client
    socket.on("track_event", (event: keyof typeof serverMetrics.conversions) => {
      if (serverMetrics.conversions[event] !== undefined) {
        serverMetrics.conversions[event]++;
      }
    });
  });

  // Emit metrics periodically
  setInterval(() => {
    io.emit('admin_metrics_update', serverMetrics);
  }, 5000);

  // --- Vite & Static Assets ---
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}


// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
