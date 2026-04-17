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

const stripe = new Stripe(STRIPE_SECRET_KEY || "");

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

async function startServer() {
  const app = express();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT || 5174;
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

  // Global Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // Security Headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://apis.google.com"],
        connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://okgmaigpiqxlxlwqbtjb.supabase.co", "wss://*.supabase.co", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.google.com", "https://hooks.stripe.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://*.gstatic.com", "https://*.stripe.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  const corsOptions = {
    origin: isProduction ? [APP_URL] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));
  
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));
  app.use(cookieParser());

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/create-checkout-session", verifyUser, async (req, res) => {
    const { bookingId, rideName, price } = req.body;
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "uzs",
            product_data: { name: rideName, description: `Booking ID: ${bookingId}` },
            unit_amount: price * 100,
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
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/verify-session", async (req, res) => {
    const { session_id } = req.query;
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      const bookingId = session.client_reference_id;
      if (session.payment_status === "paid" && bookingId) {
        await updateClientDoc(clientDoc(clientDb, "bookings", bookingId), {
          status: "confirmed",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          updatedAt: new Date().toISOString(),
        });
        res.json({ success: true, bookingId });
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Create Driver
  app.post("/api/admin/create-driver", verifyAdmin, async (req, res) => {
    const { email, password, name, phone, photo, bio, experience, rating } = req.body;
    try {
      const signUpResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        { email, password, returnSecureToken: true }
      );
      const uid = signUpResponse.data.localId;
      await setClientDoc(clientDoc(clientDb, 'users', uid), {
        name, email, role: 'driver', createdAt: new Date().toISOString(), _serverSecret: INTERNAL_SECRET
      });
      const driverDoc = await addClientDoc(clientCollection(clientDb, 'drivers'), {
        uid, name, email, phone: phone || '', photo: photo || '', bio: bio || '',
        experience: experience || 0, rating: rating || 5.0, createdAt: new Date().toISOString(), _serverSecret: INTERNAL_SECRET
      });
      res.json({ success: true, driverId: driverDoc.id, uid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Location tracking
  app.post("/api/location", (req, res) => {
    const { bus_id, lat, lng, speed } = req.body;
    if (!bus_id) return res.status(400).json({ error: "Missing bus_id" });
    const locationData = { lat, lng, speed, timestamp: new Date().toISOString() };
    busLocations[bus_id] = locationData;
    io.to(`bus_${bus_id}`).emit("location_update", locationData);
    res.json({ success: true });
  });

  // FCM Notification Endpoint
  app.post("/api/send-notification", async (req, res) => {
    const { fcmToken, title, body, url } = req.body;
    if (!fcmToken) return res.status(400).json({ error: "FCM Token required" });
    if (!firebaseApp) return res.status(500).json({ error: "Firebase Admin not initialized" });

    try {
      const message = {
        notification: { title, body },
        data: { url: url || "/" },
        token: fcmToken
      };
      const response = await admin.messaging(firebaseApp).send(message);
      res.json({ success: true, response });
    } catch (error: any) {
      console.error("FCM Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fallback to SPA
  if (isProduction) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
