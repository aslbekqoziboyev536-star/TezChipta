import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import Stripe from "stripe";
import jwt from "jsonwebtoken";
import axios from "axios";
import admin from "firebase-admin";

import { createServer as createViteServer } from "vite";
import { OAuth2Client } from "google-auth-library";

import {
  getFirestore as getAdminFirestore,
  getAuth as getAdminAuth,
} from "firebase-admin";

import {
  initializeApp as initializeClientApp,
} from "firebase/app";

import {
  getFirestore as getClientFirestore,
  doc as clientDoc,
  getDoc as getClientDoc,
  updateDoc as updateClientDoc,
  collection as clientCollection,
  addDoc as addClientDoc,
  setDoc as setClientDoc,
  query as clientQuery,
  where as clientWhere,
  getDocs as getClientDocs,
  deleteDoc as clientDeleteDoc,
} from "firebase/firestore";

import { logToSupabase } from "./src/lib/supabaseServer.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 3000);

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const CORS_ORIGINS = (process.env.CORS_ORIGINS || APP_URL)
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

const stripe = new Stripe(STRIPE_SECRET_KEY);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const firebaseConfig = fs.existsSync("firebase-applet-config.json")
  ? JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"))
  : {};

let firebaseApp: any;
let db: any;
let auth: any;
let clientDb: any;

// ---------------- FIREBASE ----------------
try {
  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    firebaseApp = admin.app();
  }

  db = getAdminFirestore(firebaseApp);
  auth = getAdminAuth(firebaseApp);

  const clientApp = initializeClientApp(firebaseConfig);
  clientDb = getClientFirestore(clientApp);
} catch (e) {
  console.error("Firebase init error:", e);
}

// ---------------- EXPRESS ----------------
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, true); // dev-friendly (blockni yumshatdik)
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ---------------- SECURITY HEADERS ----------------
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ---------------- HEALTH ----------------
app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

// ---------------- AUTH MIDDLEWARE ----------------
async function verifyUser(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------- STATIC FRONTEND (FIXED) ----------------
const distPath = path.join(process.cwd(), "dist");
const publicPath = path.join(process.cwd(), "public");

if (isProd) {
  // 1. STATIC FILES (IMPORTANT FIX)
  app.use(express.static(distPath));

  app.use(express.static(publicPath));

  // 2. SPA fallback
  app.get("*", (req, res) => {
    const indexPath = path.join(distPath, "index.html");

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("Build not found");
    }
  });
} else {
  // DEV MODE VITE
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);
}

// ---------------- SOCKET ----------------
const busLocations: any = {};

io.on("connection", (socket) => {
  socket.on("join_bus", (id) => {
    socket.join(`bus_${id}`);
  });

  socket.on("disconnect", () => {});
});

// ---------------- LOCATION ----------------
app.post("/api/location", verifyUser, (req, res) => {
  const { bus_id, lat, lng } = req.body;

  busLocations[bus_id] = { lat, lng, time: Date.now() };

  io.to(`bus_${bus_id}`).emit("update", busLocations[bus_id]);

  res.json({ ok: true });
});

// ---------------- STRIPE ----------------
app.post("/api/create-checkout-session", verifyUser, async (req, res) => {
  const { bookingId, price } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "uzs",
        product_data: { name: "Ticket" },
        unit_amount: price * 100,
      },
      quantity: 1,
    }],
    success_url: `${APP_URL}/success`,
    cancel_url: `${APP_URL}/cancel`,
  });

  res.json({ url: session.url });
});

// ---------------- START ----------------
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
