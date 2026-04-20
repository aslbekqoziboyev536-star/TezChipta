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

<<<<<<< HEAD
  if (!isProduction) {
=======
  // High Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://*.supabase.in", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.stripe.com", "wss://*.run.app", "ws://localhost:*", "https://picsum.photos", "https://imagehosting-hulf.onrender.com", "https://placehold.co", "https://cdn-icons-png.flaticon.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://*.stripe.com", "https://*.google.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
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

  // Security Headers for Firebase Auth and Popups
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // MongoDB Connection - Removed as it is not used and causing connection errors
  /*
  const MONGODB_URI = process.env.MONGODB_URI;
  if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    })
      .then(() => console.log("MongoDB connected successfully"))
      .catch(err => {
        console.error("MongoDB connection error:", err.message);
        if (err.message.includes("Could not connect to any servers") || err.message.includes("whitelist")) {
          console.error("ACTION REQUIRED: Your IP address is likely not whitelisted in MongoDB Atlas.");
          console.error("Please go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0).");
        }
        if (err.message.includes("authentication failed")) {
          console.error("CRITICAL: MongoDB authentication failed. Please check your MONGODB_URI credentials.");
        }
      });
  } else {
    console.warn("MONGODB_URI not found in environment variables. MongoDB features will be unavailable.");
  }
  */

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
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
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key is missing in environment variables");
      }

      console.log(`Creating Stripe session for booking ${bookingId}, price: ${price} UZS`);

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
              unit_amount: Math.round(Number(price) * 100), // Ensure it's a valid integer
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        client_reference_id: bookingId,
        success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/`,
      });

      console.log("Stripe session created successfully:", session.id);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe session creation error details:", {
        message: error.message,
        type: error.type,
        code: error.code,
        param: error.param
      });
      res.status(500).json({ 
        error: error.message,
        details: "Check server logs for more information regarding the Stripe error."
      });
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
        createdAt: new Date().toISOString(),
        _serverSecret: INTERNAL_SECRET
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
        createdAt: new Date().toISOString(),
        _serverSecret: INTERNAL_SECRET
      });
      console.log("Driver document created in Firestore with ID:", driverDoc.id);

      res.json({ success: true, driverId: driverDoc.id, uid: uid });
    } catch (error: any) {
      console.error("Error creating driver:", error);
      res.status(500).json({ error: error.message || "Failed to create driver", details: error.code });
    }
  });

  // Delete User (Admin Only)
  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Foydalanuvchi UID talab qilinadi" });
    }

    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      
      // Get user info to check if they are an admin
      const userToAuth = await auth.getUser(uid);
      const adminEmails = ['qoziboyevaslbek359@gmail.com', 'admin@tezchipta.uz'];
      
      if (adminEmails.includes(userToAuth.email || '')) {
        return res.status(403).json({ error: "Adminni o'chirib bo'lmaydi" });
      }

      // 1. Delete from Firebase Auth
      await auth.deleteUser(uid);
      console.log("User deleted from Firebase Auth:", uid);

      // 2. Delete from Firestore users collection
      const userRef = clientDoc(clientDb, 'users', uid);
      await deleteClientDoc(userRef);
      console.log("User document deleted from Firestore:", uid);

      // 3. Delete from Firestore drivers collection if exists
      const driversRef = clientCollection(clientDb, 'drivers');
      const driverQuerySnapshot = await getClientDocs(clientQuery(driversRef, clientWhere('uid', '==', uid)));
      for (const driverDoc of driverQuerySnapshot.docs) {
        await deleteClientDoc(driverDoc.ref);
        console.log("Related driver document deleted:", driverDoc.id);
      }

      res.json({ success: true, message: "Foydalanuvchi to'liq o'chirildi" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message || "Foydalanuvchini o'chirishda xatolik yuz berdi" });
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
        secure: true,
        sameSite: "none",
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
      secure: true,
      sameSite: "none"
    });
    res.json({ success: true });
  });

  // Real-time Location Endpoint
  app.post("/api/location", async (req, res) => {
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
        updatedAt: new Date().toISOString(),
        _serverSecret: INTERNAL_SECRET
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

    try {
      const bookingRef = clientDoc(clientDb, "bookings", bookingId);
      const bookingDoc = await getClientDoc(bookingRef);

      if (!bookingDoc.exists()) {
        return res.status(404).json({ error: "Booking topilmadi" });
      }

      if (bookingDoc.data()?.userId !== (req as any).user.uid) {
        return res.status(403).json({ error: "Ruxsat berilmagan" });
      }

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
        updatedAt: new Date().toISOString(),
        _serverSecret: INTERNAL_SECRET
      };

      if (status === "paid") {
        updateData.status = "confirmed";
      } else if (status === "rejected") {
        // Optionally keep status as pending or mark as cancelled
        updateData.status = "cancelled";
      }

      await updateClientDoc(bookingRef, updateData);

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
>>>>>>> a47f7c4 (Implemented sign in and ticketing)
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
