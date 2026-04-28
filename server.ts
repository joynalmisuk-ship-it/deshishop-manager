import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import multer from "multer";
import { fileURLToPath } from "url";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { createServer } from "http";
import { Server } from "socket.io";

let db: any;
let io: Server;
const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const normalizeBasePath = (value: string) => {
  const cleaned = value.trim().replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "";
};
const APP_BASE = normalizeBasePath(process.env.APP_BASE || "/app");
const JWT_SECRET = process.env.JWT_SECRET || 'deshishop-secret-key-change-this';
const BACKUP_DIR = path.join(APP_ROOT, "backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// Multer setup for backup restores
const upload = multer({ dest: 'uploads/' });

async function startServer() {
  // Initialize Database
  db = new Database("shop.db");

  // Initialize Database Schema
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        plan TEXT DEFAULT 'Free Trial',
        status TEXT DEFAULT 'Pending', -- Pending, Approved, Suspended
        expiry_date DATETIME,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

    CREATE TABLE IF NOT EXISTS payment_gateway_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway_name TEXT UNIQUE NOT NULL,
      store_id TEXT,
      store_password TEXT,
      mode TEXT DEFAULT 'sandbox',
      is_active INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_name TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'Success', -- Pending, Success, Failed
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mfs_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      customer_phone TEXT,
      trx_id TEXT,
      vendor_id INTEGER,
      shop_number_id INTEGER,
      shop_id INTEGER DEFAULT 1,
      payment_status TEXT DEFAULT 'Paid', -- Paid, Partial, Due
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recharge_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Recharge',
      amount REAL NOT NULL,
      profit REAL DEFAULT 0,
      cashback REAL DEFAULT 0,
      customer_phone TEXT,
      vendor_id INTEGER,
      shop_number_id INTEGER,
      shop_id INTEGER DEFAULT 1,
      payment_status TEXT DEFAULT 'Paid',
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_type TEXT NOT NULL,
      variant TEXT NOT NULL,
      pages INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      shop_id INTEGER DEFAULT 1,
      payment_status TEXT DEFAULT 'Paid',
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      unit TEXT DEFAULT 'pcs',
      purchase_price REAL DEFAULT 0,
      shop_id INTEGER DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'Add' or 'Remove'
      quantity INTEGER NOT NULL,
      description TEXT,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    );

    CREATE TABLE IF NOT EXISTS other_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      amount REAL NOT NULL,
      profit REAL DEFAULT 0,
      shop_id INTEGER DEFAULT 1,
      payment_status TEXT DEFAULT 'Paid',
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      shop_id INTEGER DEFAULT 1,
      payment_status TEXT DEFAULT 'Paid',
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      vendor_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      details TEXT,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      type TEXT NOT NULL,
      number TEXT NOT NULL,
      password TEXT,
      opening_balance REAL DEFAULT 0,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      description TEXT NOT NULL,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendor_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      shop_id INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT,
      value TEXT,
      shop_id INTEGER DEFAULT 1,
      PRIMARY KEY (key, shop_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'shop_owner', 'manager', 'staff'
      name TEXT NOT NULL,
      shop_id INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shop_id INTEGER, -- Optional: link to an already created pending shop
      shop_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      plan TEXT, -- Plan requested
      status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'Open', -- Open, Resolved, Closed
      admin_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration: Add shop_id and plan to shop_requests if they don't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(shop_requests)").all();
    const hasShopId = tableInfo.some((col: any) => col.name === 'shop_id');
    const hasPlan = tableInfo.some((col: any) => col.name === 'plan');
    
    if (!hasShopId) {
      db.exec("ALTER TABLE shop_requests ADD COLUMN shop_id INTEGER REFERENCES shops(id)");
    }
    if (!hasPlan) {
      db.exec("ALTER TABLE shop_requests ADD COLUMN plan TEXT");
    }
    
    // Add email to shop_requests and shops
    const shopTableInfo = db.prepare("PRAGMA table_info(shops)").all();
    if (!shopTableInfo.some((col: any) => col.name === 'email')) {
      db.exec("ALTER TABLE shops ADD COLUMN email TEXT");
    }
    if (!tableInfo.some((col: any) => col.name === 'email')) {
      db.exec("ALTER TABLE shop_requests ADD COLUMN email TEXT");
    }
  } catch (err) {
    console.log("Migration for shop_requests already done or failed:", err);
  }

  // Initial Data
  db.exec(`
    INSERT OR IGNORE INTO shops (id, name, status, timestamp) VALUES (1, 'Default Shop', 'Approved', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
    INSERT OR IGNORE INTO inventory (item_name, quantity, shop_id, last_updated) VALUES ('Paper Rims', 0, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('bkash_cashout_comm', '4.5', 1);
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('nagad_cashout_comm', '4.0', 1);
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('rocket_cashout_comm', '4.0', 1);
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_bw', '2.0', 1);
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_color', '12.0', 1);
    INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('timezone_offset', '6', 1);
  `);

  // Seed default hero slides
  const slidesCount = (db.prepare("SELECT COUNT(*) as count FROM hero_slides").get() as any)?.count || 0;
  if (slidesCount === 0) {
    db.prepare("INSERT INTO hero_slides (title, subtitle, image_url, order_index) VALUES (?, ?, ?, ?)")
      .run("Simple Solution for Your Business", "Track mobile banking, recharge, printing, and all other services in one place.", "https://picsum.photos/seed/shop1/1200/600", 0);
    db.prepare("INSERT INTO hero_slides (title, subtitle, image_url, order_index) VALUES (?, ?, ?, ?)")
      .run("Manage Multiple Shops Easily", "Switch between your shops and track everything from a single dashboard.", "https://picsum.photos/seed/shop2/1200/600", 1);
    db.prepare("INSERT INTO hero_slides (title, subtitle, image_url, order_index) VALUES (?, ?, ?, ?)")
      .run("Secure & Reliable Ledger", "Your data is encrypted and backed up daily to Google Drive.", "https://picsum.photos/seed/shop3/1200/600", 2);
  }

  // Seed default admin user
  const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (username, password, role, name, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
      .run('admin', hashedPassword, 'admin', 'Administrator');
    console.log("Default admin user created: admin / admin123");
  }
} catch (err) {
  console.error("Database initialization failed:", err);
}

try {
  const shopsTableInfo = db.prepare("PRAGMA table_info(shops)").all();
  
  // Migration: Add status to shops
  if (shopsTableInfo.length > 0 && !shopsTableInfo.some((col: any) => col.name === 'status')) {
    db.exec("ALTER TABLE shops ADD COLUMN status TEXT DEFAULT 'Approved'"); // Existing shops are approved
  }

  // Migration: Add logo_url to shops
  if (shopsTableInfo.length > 0 && !shopsTableInfo.some((col: any) => col.name === 'logo_url')) {
    db.exec("ALTER TABLE shops ADD COLUMN logo_url TEXT");
  }

  // Migration: Add plan and expiry_date to shops
  if (shopsTableInfo.length > 0) {
    if (!shopsTableInfo.some((col: any) => col.name === 'plan')) {
      db.exec("ALTER TABLE shops ADD COLUMN plan TEXT DEFAULT 'Free Trial'");
    }
    if (!shopsTableInfo.some((col: any) => col.name === 'expiry_date')) {
      db.exec("ALTER TABLE shops ADD COLUMN expiry_date DATETIME");
    }
  }

  // Migration: Add cost column to service_sales if it doesn't exist
  const tableInfo = db.prepare("PRAGMA table_info(service_sales)").all();
  const hasCostColumn = tableInfo.some((col: any) => col.name === 'cost');
  if (!hasCostColumn && tableInfo.length > 0) {
    db.exec("ALTER TABLE service_sales ADD COLUMN cost REAL DEFAULT 0");
  }

  // Migration: Add vendor_id and type to recharge_transactions
  const rechargeTableInfo = db.prepare("PRAGMA table_info(recharge_transactions)").all();
  if (rechargeTableInfo.length > 0) {
    if (!rechargeTableInfo.some((col: any) => col.name === 'vendor_id')) {
      db.exec("ALTER TABLE recharge_transactions ADD COLUMN vendor_id INTEGER");
    }
    if (!rechargeTableInfo.some((col: any) => col.name === 'type')) {
      db.exec("ALTER TABLE recharge_transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'Recharge'");
    }
    if (!rechargeTableInfo.some((col: any) => col.name === 'shop_number_id')) {
      db.exec("ALTER TABLE recharge_transactions ADD COLUMN shop_number_id INTEGER");
    }
    // Migration: Add payment columns to recharge_transactions
    if (!rechargeTableInfo.some((col: any) => col.name === 'payment_status')) db.exec("ALTER TABLE recharge_transactions ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
    if (!rechargeTableInfo.some((col: any) => col.name === 'paid_amount')) db.exec("ALTER TABLE recharge_transactions ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!rechargeTableInfo.some((col: any) => col.name === 'due_amount')) db.exec("ALTER TABLE recharge_transactions ADD COLUMN due_amount REAL DEFAULT 0");
    if (!rechargeTableInfo.some((col: any) => col.name === 'customer_id')) db.exec("ALTER TABLE recharge_transactions ADD COLUMN customer_id INTEGER");
    if (!rechargeTableInfo.some((col: any) => col.name === 'cashback')) db.exec("ALTER TABLE recharge_transactions ADD COLUMN cashback REAL DEFAULT 0");
  }

  // Migration: Add opening_balance to shop_numbers
  const shopNumbersTableInfo = db.prepare("PRAGMA table_info(shop_numbers)").all();
  if (shopNumbersTableInfo.length > 0 && !shopNumbersTableInfo.some((col: any) => col.name === 'opening_balance')) {
    db.exec("ALTER TABLE shop_numbers ADD COLUMN opening_balance REAL DEFAULT 0");
  }

  // Migration: Add vendor_id to mfs_transactions
  const mfsTableInfo = db.prepare("PRAGMA table_info(mfs_transactions)").all();
  if (mfsTableInfo.length > 0) {
    if (!mfsTableInfo.some((col: any) => col.name === 'vendor_id')) {
      db.exec("ALTER TABLE mfs_transactions ADD COLUMN vendor_id INTEGER");
    }
    if (!mfsTableInfo.some((col: any) => col.name === 'shop_number_id')) {
      db.exec("ALTER TABLE mfs_transactions ADD COLUMN shop_number_id INTEGER");
    }
    // Migration: Add payment columns to mfs_transactions
    if (!mfsTableInfo.some((col: any) => col.name === 'payment_status')) db.exec("ALTER TABLE mfs_transactions ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
    if (!mfsTableInfo.some((col: any) => col.name === 'paid_amount')) db.exec("ALTER TABLE mfs_transactions ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!mfsTableInfo.some((col: any) => col.name === 'due_amount')) db.exec("ALTER TABLE mfs_transactions ADD COLUMN due_amount REAL DEFAULT 0");
    if (!mfsTableInfo.some((col: any) => col.name === 'customer_id')) db.exec("ALTER TABLE mfs_transactions ADD COLUMN customer_id INTEGER");
  }

  // Migration: Add payment columns to service_sales
  if (tableInfo.length > 0) {
    if (!tableInfo.some((col: any) => col.name === 'payment_status')) db.exec("ALTER TABLE service_sales ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
    if (!tableInfo.some((col: any) => col.name === 'paid_amount')) db.exec("ALTER TABLE service_sales ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!tableInfo.some((col: any) => col.name === 'due_amount')) db.exec("ALTER TABLE service_sales ADD COLUMN due_amount REAL DEFAULT 0");
    if (!tableInfo.some((col: any) => col.name === 'customer_id')) db.exec("ALTER TABLE service_sales ADD COLUMN customer_id INTEGER");
  }

  // Migration: Add payment columns to other_sales
  const otherSalesTableInfo = db.prepare("PRAGMA table_info(other_sales)").all();
  if (otherSalesTableInfo.length > 0) {
    if (!otherSalesTableInfo.some((col: any) => col.name === 'payment_status')) db.exec("ALTER TABLE other_sales ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
    if (!otherSalesTableInfo.some((col: any) => col.name === 'paid_amount')) db.exec("ALTER TABLE other_sales ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!otherSalesTableInfo.some((col: any) => col.name === 'due_amount')) db.exec("ALTER TABLE other_sales ADD COLUMN due_amount REAL DEFAULT 0");
    if (!otherSalesTableInfo.some((col: any) => col.name === 'customer_id')) db.exec("ALTER TABLE other_sales ADD COLUMN customer_id INTEGER");
  }

  // Migration: Add payment columns to expenses
  const expensesTableInfo = db.prepare("PRAGMA table_info(expenses)").all();
  if (expensesTableInfo.length > 0) {
    if (!expensesTableInfo.some((col: any) => col.name === 'payment_status')) db.exec("ALTER TABLE expenses ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
    if (!expensesTableInfo.some((col: any) => col.name === 'paid_amount')) db.exec("ALTER TABLE expenses ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!expensesTableInfo.some((col: any) => col.name === 'due_amount')) db.exec("ALTER TABLE expenses ADD COLUMN due_amount REAL DEFAULT 0");
    if (!expensesTableInfo.some((col: any) => col.name === 'vendor_id')) db.exec("ALTER TABLE expenses ADD COLUMN vendor_id INTEGER");
  }

  // Migration: Add purchase_price to inventory
  const inventoryTableInfo = db.prepare("PRAGMA table_info(inventory)").all();
  if (inventoryTableInfo.length > 0 && !inventoryTableInfo.some((col: any) => col.name === 'purchase_price')) {
    db.exec("ALTER TABLE inventory ADD COLUMN purchase_price REAL DEFAULT 0");
  }

  // Migration: Add shop_id to all relevant tables
  const tablesToMigrate = [
    'mfs_transactions', 'recharge_transactions', 'service_sales', 'inventory',
    'other_sales', 'expenses', 'vendors', 'shop_numbers', 'orders', 'customers', 'users',
    'vendor_transactions', 'customer_transactions', 'stock_history', 'settings'
  ];

  tablesToMigrate.forEach(table => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (info.length > 0 && !info.some(col => col.name === 'shop_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN shop_id INTEGER DEFAULT 1`);
      console.log(`Migration: Added shop_id column to ${table} table`);
    }
  });

  } catch (err) {
    console.error("Migration failed:", err);
  }

  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    path: `${APP_BASE}/socket.io`,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_shop", (shopId) => {
      socket.join(`shop_${shopId}`);
    });
  });

  const emitNewHistoryEntry = (shopId: number, entry: any) => {
    io.to(`shop_${shopId}`).emit("new_history_entry", entry);
  };
  app.use(express.json());
  app.use(cors());
  
  // Debug logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  if (APP_BASE) {
    app.use((req, res, next) => {
      if (req.url === APP_BASE) {
        req.url = "/";
      } else if (req.url.startsWith(`${APP_BASE}/`)) {
        req.url = req.url.slice(APP_BASE.length) || "/";
      }
      next();
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const DIST_PATH = path.join(APP_ROOT, "dist");
  const INDEX_PATH = path.join(DIST_PATH, "index.html");
  const ASSETS_PATH = path.join(DIST_PATH, "assets");

  app.use("/assets", express.static(ASSETS_PATH, { fallthrough: false }));
  if (APP_BASE) {
    app.use(`${APP_BASE}/assets`, express.static(ASSETS_PATH, { fallthrough: false }));
  }

  app.get("/api/debug-runtime", (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV || null,
      appBase: APP_BASE,
      port: PORT,
      cwd: process.cwd(),
      appRoot: APP_ROOT,
      distPath: DIST_PATH,
      distExists: fs.existsSync(DIST_PATH),
      assetsPath: ASSETS_PATH,
      assetsExists: fs.existsSync(ASSETS_PATH),
      indexPath: INDEX_PATH,
      indexExists: fs.existsSync(INDEX_PATH),
    });
  });

  app.get(["/", "/index.html"], (req, res, next) => {
    if (fs.existsSync(INDEX_PATH)) {
      return res.sendFile(INDEX_PATH);
    }
    next();
  });

  // Serve uploads directory statically
  const UPLOADS_DIR = path.join(APP_ROOT, "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Multer setup for logo uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  const uploadLogo = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|webp/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
    }
  });

  // Initialize Admin User
  const initAdmin = async () => {
    const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare("INSERT INTO users (username, password, role, name, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))").run('admin', hashedPassword, 'admin', 'Administrator');
      console.log("Default admin user created: admin / admin123");
    }
  };
  initAdmin();

  // Middleware to verify JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      console.log(`[${new Date().toISOString()}] Unauthorized: No token provided for ${req.url}`);
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.log(`[${new Date().toISOString()}] Forbidden: Invalid token for ${req.url}`);
        return res.status(403).json({ error: "Forbidden: Invalid token" });
      }
      
      // Allow admin and premium shop owners to override shop_id via header
      const requestedShopId = req.headers['x-shop-id'];
      if (requestedShopId) {
        const parsedId = parseInt(requestedShopId as string);
        const activeId = isNaN(parsedId) ? (user.shop_id || 1) : parsedId;

        if (user.role === 'admin') {
          user.active_shop_id = activeId;
        } else if (user.role === 'shop_owner') {
          // Check if they have a Premium shop and own the requested shop
          const ownedOrPrimary = user.shop_id === activeId || db.prepare(`
            SELECT count(*) as count FROM shop_requests 
            WHERE user_id = ? AND shop_id = ? AND status = 'Approved'
          `).get(user.id, activeId).count > 0;

          const hasPremium = db.prepare(`
            SELECT count(*) as count FROM shops 
            WHERE plan = 'Premium' AND (id = ? OR id IN (SELECT shop_id FROM shop_requests WHERE user_id = ? AND status = 'Approved'))
          `).get(user.shop_id, user.id).count > 0;

          if (ownedOrPrimary && hasPremium) {
            user.active_shop_id = activeId;
          } else {
            user.active_shop_id = user.shop_id || 1;
          }
        } else {
          user.active_shop_id = user.shop_id || 1;
        }
      } else {
        user.active_shop_id = user.shop_id || 1;
      }
      
      req.user = user;
      next();
    });
  };

  // Middleware to check for read-only access (Shop Partner)
  const checkReadOnly = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'shop_partner' && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      // Allow login/register/verify if needed, but they are usually unauthenticated or handled separately
      // Here we specifically target data mutation routes
      const allowedPaths = ['/api/auth/login', '/api/auth/register', '/api/payments/verify'];
      if (allowedPaths.includes(req.path)) {
        return next();
      }
      return res.status(403).json({ error: "Shop Partner role has read-only access. You cannot perform this action." });
    }
    next();
  };

  // --- API Routes ---

  // Auth Endpoints
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Check shop status (except for global admin)
    if (user.role !== 'admin' || user.shop_id !== 1) {
      const shop: any = db.prepare("SELECT status FROM shops WHERE id = ?").get(user.shop_id || 1);
      if (shop && shop.status === 'Pending') {
        return res.status(403).json({ error: "Your shop registration is pending approval. Please contact admin." });
      }
      if (shop && shop.status === 'Suspended') {
        return res.status(403).json({ error: "Your shop has been suspended. Please contact admin." });
      }
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          name: user.name,
          shop_id: user.shop_id 
        }, JWT_SECRET);
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            name: user.name,
            shop_id: user.shop_id 
          } 
        });
      } else {
        res.status(400).json({ error: "Invalid password" });
      }
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password, name, shopName, email, mobile, plan, paymentId } = req.body;
    
    if (!username || !password || !name || !shopName || !mobile) {
      return res.status(400).json({ error: "Required fields: Username, Password, Full Name, Shop Name, Mobile" });
    }

    try {
      // Check if user exists
      const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Calculate expiry date (1 month from now)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      const expiryDateStr = expiryDate.toISOString();

      // Create new shop
      const shopStmt = db.prepare("INSERT INTO shops (name, email, phone, plan, status, expiry_date, timestamp) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      const shopInfo = shopStmt.run(shopName, email || null, mobile, plan || 'Free Trial', 'Pending', expiryDateStr);
      const shopId = shopInfo.lastInsertRowid;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user as shop_owner for the new shop
      const userStmt = db.prepare("INSERT INTO users (username, password, role, name, shop_id, created_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      const userInfo = userStmt.run(username, hashedPassword, 'shop_owner', name, shopId);

      // Link payment if exists
      if (paymentId) {
        db.prepare("UPDATE package_payments SET status = 'Success' WHERE id = ?").run(paymentId);
      }

      // Create shop request for admin visibility
      db.prepare("INSERT INTO shop_requests (user_id, shop_id, shop_name, email, phone, plan, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
        .run(userInfo.lastInsertRowid, shopId, shopName, email || null, mobile, plan || 'Free Trial', 'Pending');

      // Initialize default settings for the new shop
      db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('bkash_cashout_comm', '4.5', ?)").run(shopId);
      db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('nagad_cashout_comm', '4.0', ?)").run(shopId);
      db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('rocket_cashout_comm', '4.0', ?)").run(shopId);
      db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_bw', '2.0', ?)").run(shopId);
      db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_color', '12.0', ?)").run(shopId);

      res.status(201).json({ success: true, message: "Registration successful" });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Payment Endpoints
  app.post("/api/payments/verify", (req, res) => {
    const { planName, amount, transactionId, paymentMethod } = req.body;
    
    try {
      // In a real system, you would verify the transactionId with the payment gateway API here.
      // For this "automatic" simulation, we'll assume any transaction ID starting with 'TRX' is valid.
      
      if (!transactionId || transactionId.length < 8) {
        return res.status(400).json({ error: "Invalid Transaction ID. Must be at least 8 characters." });
      }

      const result = db.prepare("INSERT INTO package_payments (plan_name, amount, transaction_id, payment_method, status, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
        .run(planName, amount, transactionId, paymentMethod, 'Success');
      
      res.json({ 
        success: true, 
        paymentId: result.lastInsertRowid,
        message: "Payment verified successfully" 
      });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Transaction ID already used." });
      }
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  // SSLCommerz Payment Gateway Endpoints
  app.get("/api/admin/payment-settings", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    try {
      const settings = db.prepare("SELECT * FROM payment_gateway_settings WHERE gateway_name = 'sslcommerz'").get();
      res.json(settings || { gateway_name: 'sslcommerz', store_id: '', store_password: '', mode: 'sandbox', is_active: 0 });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/payment-settings", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    const { store_id, store_password, mode, is_active } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM payment_gateway_settings WHERE gateway_name = 'sslcommerz'").get();
      if (existing) {
        db.prepare("UPDATE payment_gateway_settings SET store_id = ?, store_password = ?, mode = ?, is_active = ? WHERE gateway_name = 'sslcommerz'")
          .run(store_id, store_password, mode, is_active ? 1 : 0);
      } else {
        db.prepare("INSERT INTO payment_gateway_settings (gateway_name, store_id, store_password, mode, is_active) VALUES ('sslcommerz', ?, ?, ?, ?)")
          .run(store_id, store_password, mode, is_active ? 1 : 0);
      }
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/payments/initiate", async (req, res) => {
    const { planName, amount, shopId, userId } = req.body;
    
    try {
      const settings: any = db.prepare("SELECT * FROM payment_gateway_settings WHERE gateway_name = 'sslcommerz' AND is_active = 1").get();
      if (!settings) {
        return res.status(400).json({ error: "Payment gateway not configured or inactive" });
      }

      const tran_id = `TRX${Date.now()}`;
      const isSandbox = settings.mode === 'sandbox';
      const apiUrl = isSandbox 
        ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

      const formData = new URLSearchParams();
      formData.append('store_id', settings.store_id);
      formData.append('store_passwd', settings.store_password);
      formData.append('total_amount', amount.toString());
      formData.append('currency', 'BDT');
      formData.append('tran_id', tran_id);
      formData.append('success_url', `${req.protocol}://${req.get('host')}/api/payments/success?tran_id=${tran_id}&plan=${planName}&shopId=${shopId}`);
      formData.append('fail_url', `${req.protocol}://${req.get('host')}/api/payments/fail`);
      formData.append('cancel_url', `${req.protocol}://${req.get('host')}/api/payments/cancel`);
      formData.append('ipn_url', `${req.protocol}://${req.get('host')}/api/payments/ipn`);
      formData.append('cus_name', 'Customer');
      formData.append('cus_email', 'customer@example.com');
      formData.append('cus_add1', 'Dhaka');
      formData.append('cus_city', 'Dhaka');
      formData.append('cus_postcode', '1000');
      formData.append('cus_country', 'Bangladesh');
      formData.append('cus_phone', '01700000000');
      formData.append('shipping_method', 'NO');
      formData.append('product_name', planName);
      formData.append('product_category', 'Software');
      formData.append('product_profile', 'general');

      const response = await axios.post(apiUrl, formData);
      
      if (response.data.status === 'SUCCESS') {
        // Create a pending payment record
        db.prepare("INSERT INTO package_payments (plan_name, amount, transaction_id, payment_method, status, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
          .run(planName, amount, tran_id, 'SSLCommerz', 'Pending');
        
        res.json({ url: response.data.GatewayPageURL });
      } else {
        res.status(400).json({ error: response.data.failedreason || "Payment initiation failed" });
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/payments/success", (req, res) => {
    const { tran_id, plan, shopId } = req.query as any;
    try {
      db.prepare("UPDATE package_payments SET status = 'Success' WHERE transaction_id = ?").run(tran_id);
      
      // Update shop plan if needed
      if (shopId && plan) {
        db.prepare("UPDATE shops SET plan = ?, status = 'Approved' WHERE id = ?").run(plan, shopId);
      }

      res.send(`
        <html>
          <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <h1 style="color: #10b981;">Payment Successful!</h1>
            <p>Your transaction ID: ${tran_id}</p>
            <p>Redirecting you back to the app...</p>
            <script>
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/api/payments/fail", (req, res) => {
    res.send(`
      <html>
        <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <h1 style="color: #ef4444;">Payment Failed</h1>
          <p>Please try again later.</p>
          <button onclick="window.location.href='/'" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer;">Back to Home</button>
        </body>
      </html>
    `);
  });

  app.post("/api/payments/cancel", (req, res) => {
    res.send(`
      <html>
        <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <h1 style="color: #f59e0b;">Payment Cancelled</h1>
          <p>You have cancelled the payment.</p>
          <button onclick="window.location.href='/'" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer;">Back to Home</button>
        </body>
      </html>
    `);
  });

  app.post("/api/payments/ipn", (req, res) => {
    const { tran_id, status } = req.body;
    if (status === 'VALID') {
      db.prepare("UPDATE package_payments SET status = 'Success' WHERE transaction_id = ?").run(tran_id);
    }
    res.status(200).send("OK");
  });

  // Hero Slides Endpoints
  app.get("/api/hero-slides", (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      let isAdmin = false;

      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded.role === 'admin') {
            isAdmin = true;
          }
        } catch (e) {
          // Token invalid, treat as public
        }
      }

      const query = isAdmin 
        ? "SELECT * FROM hero_slides ORDER BY order_index ASC"
        : "SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY order_index ASC";
      
      const slides = db.prepare(query).all();
      res.json(Array.isArray(slides) ? slides : []);
    } catch (err: any) {
      console.error("Hero Slides Fetch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hero-slides", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { title, subtitle, image_url, order_index } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO hero_slides (title, subtitle, image_url, order_index) VALUES (?, ?, ?, ?)");
      const info = stmt.run(title, subtitle, image_url, order_index || 0);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/hero-slides/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { title, subtitle, image_url, order_index, is_active } = req.body;
    try {
      const stmt = db.prepare("UPDATE hero_slides SET title = ?, subtitle = ?, image_url = ?, order_index = ?, is_active = ? WHERE id = ?");
      stmt.run(title, subtitle, image_url, order_index, is_active, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/hero-slides/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare("DELETE FROM hero_slides WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shop Management Endpoints
  app.get("/api/shops", authenticateToken, (req: any, res) => {
    if (req.user.role === 'admin' && req.user.shop_id === 1) {
      const shops = db.prepare("SELECT * FROM shops ORDER BY timestamp DESC").all();
      return res.json(shops);
    }
    
    // For shop_owners, show shops they own
    if (req.user.role === 'shop_owner') {
      const ownedShops = db.prepare(`
        SELECT * FROM shops 
        WHERE id = ? 
        OR id IN (SELECT shop_id FROM shop_requests WHERE user_id = ? AND status = 'Approved')
      `).all(req.user.shop_id, req.user.id);
      return res.json(ownedShops);
    }

    // Default: just their assigned shop
    const shop = db.prepare("SELECT * FROM shops WHERE id = ?").get(req.user.shop_id);
    res.json(shop ? [shop] : []);
  });

  app.put("/api/shops/:id/status", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' || req.user.shop_id !== 1) return res.status(403).json({ error: "Forbidden" });
    const { status } = req.body;
    const { id } = req.params;
    
    if (!['Pending', 'Approved', 'Suspended'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      db.prepare("UPDATE shops SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/shops", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, address, phone } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO shops (name, address, phone, timestamp) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      const info = stmt.run(name, address, phone);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/shops/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, address, phone } = req.body;
    try {
      db.prepare("UPDATE shops SET name = ?, address = ?, phone = ? WHERE id = ?")
        .run(name, address, phone, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/shops/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    if (req.params.id === '1') return res.status(400).json({ error: "Cannot delete default shop" });
    try {
      db.prepare("DELETE FROM shops WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shop Logo Upload Endpoint
  app.post("/api/shops/:id/logo", authenticateToken, checkReadOnly, uploadLogo.single('logo'), (req: any, res) => {
    const shopId = req.params.id;
    
    // Authorization check: only admin or shop owner of this shop can upload logo
    if (req.user.role !== 'admin' && (req.user.role !== 'shop_owner' || req.user.shop_id.toString() !== shopId)) {
      return res.status(403).json({ error: "Forbidden: You can only update your own shop's logo" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const logoUrl = `/uploads/${req.file.filename}`;
      
      // Get old logo to delete it
      const oldShop: any = db.prepare("SELECT logo_url FROM shops WHERE id = ?").get(shopId);
      if (oldShop && oldShop.logo_url) {
        const oldPath = path.join(process.cwd(), oldShop.logo_url);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.error("Failed to delete old logo:", e); }
        }
      }

      db.prepare("UPDATE shops SET logo_url = ? WHERE id = ?").run(logoUrl, shopId);
      res.json({ success: true, logo_url: logoUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Management Endpoints (Admin, Shop Owner, Manager)
  app.get("/api/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'shop_owner' && req.user.role !== 'manager') return res.status(403).json({ error: "Forbidden" });
    
    let users;
    if (req.user.role === 'admin') {
      users = db.prepare("SELECT id, username, role, name, shop_id, created_at FROM users").all();
    } else {
      users = db.prepare("SELECT id, username, role, name, shop_id, created_at FROM users WHERE shop_id = ?").all(req.user.shop_id);
    }
    res.json(users);
  });

  app.post("/api/users", authenticateToken, checkReadOnly, async (req: any, res) => {
    const { username, password, role, name, shop_id } = req.body;
    
    // Role Hierarchy Enforcement
    const allowedRoles: Record<string, string[]> = {
      'admin': ['admin', 'shop_owner', 'manager', 'staff'],
      'shop_owner': ['manager', 'staff'],
      'manager': ['staff'],
      'staff': []
    };

    if (!allowedRoles[req.user.role]?.includes(role)) {
      return res.status(403).json({ error: `You are not allowed to create a user with role: ${role}` });
    }
    
    // Shop owners and managers can only create users for their own shop
    // Premium shop owners can assign to any of their owned shops
    let targetShopId = req.user.shop_id;
    if (req.user.role === 'admin') {
      targetShopId = shop_id || 1;
    } else if (req.user.role === 'shop_owner') {
      const hasPremium = db.prepare(`
        SELECT count(*) as count FROM shops 
        WHERE plan = 'Premium' AND (id = ? OR id IN (SELECT shop_id FROM shop_requests WHERE user_id = ? AND status = 'Approved'))
      `).get(req.user.shop_id, req.user.id).count > 0;

      if (hasPremium && shop_id) {
        // Verify ownership of the target shop
        const isOwned = shop_id === req.user.shop_id || db.prepare(`
          SELECT count(*) as count FROM shop_requests 
          WHERE user_id = ? AND shop_id = ? AND status = 'Approved'
        `).get(req.user.id, shop_id).count > 0;
        
        if (isOwned) targetShopId = shop_id;
      }
    }
    
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (username, password, role, name, shop_id, created_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      const info = stmt.run(username, hashedPassword, role || 'staff', name, targetShopId);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: "Username likely already exists" });
    }
  });

  app.put("/api/users/:id", authenticateToken, checkReadOnly, async (req: any, res) => {
    const { id } = req.params;
    const { name, role, shop_id } = req.body;
    
    if (req.user.role !== 'admin' && req.user.role !== 'shop_owner') return res.status(403).json({ error: "Forbidden" });

    try {
      const targetUser: any = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      if (req.user.role === 'shop_owner') {
        const hasPremium = db.prepare(`
          SELECT count(*) as count FROM shops 
          WHERE plan = 'Premium' AND (id = ? OR id IN (SELECT shop_id FROM shop_requests WHERE user_id = ? AND status = 'Approved'))
        `).get(req.user.shop_id, req.user.id).count > 0;

        if (targetUser.shop_id !== req.user.shop_id && !hasPremium) {
           return res.status(403).json({ error: "Forbidden" });
        }
        
        // Verify ownership if changing shop
        if (shop_id && shop_id !== targetUser.shop_id) {
          const isOwned = shop_id === req.user.shop_id || db.prepare(`
            SELECT count(*) as count FROM shop_requests 
            WHERE user_id = ? AND shop_id = ? AND status = 'Approved'
          `).get(req.user.id, shop_id).count > 0;
          if (!isOwned || !hasPremium) return res.status(403).json({ error: "Cannot assign to this shop" });
        }
      }

      db.prepare("UPDATE users SET name = ?, role = ?, shop_id = ? WHERE id = ?").run(name || targetUser.name, role || targetUser.role, shop_id || targetUser.shop_id, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    // Only Admin and Shop Owner can delete users. Manager cannot delete users (reduced power).
    if (req.user.role !== 'admin' && req.user.role !== 'shop_owner') return res.status(403).json({ error: "Forbidden" });
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    
    // Shop owners can only delete users from their own shop
    if (req.user.role === 'shop_owner') {
      const userToDelete: any = db.prepare("SELECT shop_id FROM users WHERE id = ?").get(req.params.id);
      if (!userToDelete || userToDelete.shop_id !== req.user.shop_id) {
        return res.status(403).json({ error: "You can only delete users from your own shop" });
      }
    }
    
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/users/:id/password", authenticateToken, checkReadOnly, async (req: any, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password is required" });

    // Only Admin and Shop Owner can reset passwords
    if (req.user.role !== 'admin' && req.user.role !== 'shop_owner') return res.status(403).json({ error: "Forbidden" });

    const targetUser: any = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Shop owners can only reset passwords for users in their own shop
    if (req.user.role === 'shop_owner' && targetUser.shop_id !== req.user.shop_id) {
      return res.status(403).json({ error: "You can only reset passwords for users in your own shop" });
    }

    // Shop owners cannot reset admin passwords
    if (req.user.role === 'shop_owner' && targetUser.role === 'admin') {
      return res.status(403).json({ error: "Cannot reset admin password" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, id);
      res.json({ success: true, message: "Password reset successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Shop Request Endpoints
  app.post("/api/shop-requests", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ error: "Forbidden" });
    const { shop_name, address, phone, shop_id, plan } = req.body;
    
    try {
      const stmt = db.prepare("INSERT INTO shop_requests (user_id, shop_id, shop_name, address, phone, plan, created_at) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      stmt.run(req.user.id, shop_id || null, shop_name, address || null, phone || null, plan || null);
      res.json({ success: true, message: "Shop request submitted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/shop-requests", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const requests = db.prepare(`
      SELECT sr.*, u.username as requester_name 
      FROM shop_requests sr 
      JOIN users u ON sr.user_id = u.id 
      ORDER BY sr.created_at DESC
    `).all();
    res.json(requests);
  });

  app.put("/api/shop-requests/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { status } = req.body; // 'Approved' or 'Rejected'
    const requestId = req.params.id;

    try {
      db.transaction(() => {
        db.prepare("UPDATE shop_requests SET status = ? WHERE id = ?").run(status, requestId);
        
        if (status === 'Approved') {
          const request: any = db.prepare("SELECT * FROM shop_requests WHERE id = ?").get(requestId);
          
          if (request.shop_id) {
            // Update existing pending shop or upgrade plan
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            db.prepare("UPDATE shops SET status = 'Approved', plan = ?, expiry_date = ? WHERE id = ?")
              .run(request.plan || 'Standard', expiryDate.toISOString(), request.shop_id);
            
            // Also ensure the user is linked correctly (safeguard)
            db.prepare("UPDATE users SET shop_id = ? WHERE id = ?").run(request.shop_id, request.user_id);
          } else {
            // Legacy/Manual request: Create a new shop
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            const shopStmt = db.prepare("INSERT INTO shops (name, address, phone, plan, status, expiry_date, timestamp) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
            const shopInfo = shopStmt.run(request.shop_name, request.address, request.phone, request.plan || 'Free Trial', 'Approved', expiryDate.toISOString());
            const newShopId = shopInfo.lastInsertRowid;

            // Initialize default settings for the new shop
            db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('bkash_cashout_comm', '4.5', ?)").run(newShopId);
            db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('nagad_cashout_comm', '4.0', ?)").run(newShopId);
            db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('rocket_cashout_comm', '4.0', ?)").run(newShopId);
            db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_bw', '2.0', ?)").run(newShopId);
            db.prepare("INSERT OR IGNORE INTO settings (key, value, shop_id) VALUES ('cost_color', '12.0', ?)").run(newShopId);
            
            db.prepare("UPDATE users SET shop_id = ? WHERE id = ?").run(newShopId, request.user_id);
          }
        }
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // MFS Endpoints
  app.post("/api/mfs", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { operator, type, amount, customer_phone, trx_id, vendor_id, shop_number_id, payment_status, paid_amount, due_amount, customer_id } = req.body;
      const shop_id = req.user.active_shop_id;
      
      const cId = (customer_id && customer_id !== 'null' && customer_id !== '') ? parseInt(customer_id.toString()) : null;
      
      let commission = 0;
      if (type === "Cash-out") {
        const commRate = parseFloat(db.prepare("SELECT value FROM settings WHERE key = ? AND shop_id = ?").get(`${operator.toLowerCase()}_cashout_comm`, shop_id)?.value || "0");
        commission = (amount / 1000) * commRate;
      }
      
      const pStatus = payment_status || 'Paid';
      const pPaid = paid_amount !== undefined ? parseFloat(paid_amount.toString()) : amount;
      const pDue = due_amount !== undefined ? parseFloat(due_amount.toString()) : 0;

      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO mfs_transactions (operator, type, amount, commission, customer_phone, trx_id, vendor_id, shop_number_id, shop_id, payment_status, paid_amount, due_amount, customer_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        `);
        const info = stmt.run(operator, type, amount, commission, customer_phone, trx_id, vendor_id, shop_number_id, shop_id, pStatus, pPaid, pDue, cId);

        // Handle Customer Due
        if (pDue > 0 && cId) {
          db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(cId, 'Due', pDue, `Due for MFS ${type} (${operator}) - TrxID: ${trx_id || 'N/A'} (Ref: MFS-${info.lastInsertRowid})`, shop_id);
        }

        // Sync with Vendor Ledger if it's a B2B transaction
        if (vendor_id && (type === 'B2B-Buy' || type === 'B2B-Pay')) {
          const vendorType = type === 'B2B-Buy' ? 'Purchase' : 'Payment';
          const description = `${type} (${operator}): ${customer_phone || ''} (Ref: MFS-${info.lastInsertRowid})`;
          
          const vStmt = db.prepare("INSERT INTO vendor_transactions (vendor_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
          const vInfo = vStmt.run(vendor_id, vendorType, amount, description, shop_id);

          if (vendorType === 'Payment') {
            const vendor = db.prepare("SELECT name FROM vendors WHERE id = ?").get(vendor_id);
            db.prepare("INSERT INTO expenses (category, description, amount, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
              .run('Vendor Payment', `Paid to ${vendor?.name || 'Vendor'}: ${description} (Ref: VT-${vInfo.lastInsertRowid})`, amount, shop_id);
          }
        }
        return info.lastInsertRowid;
      });

      const lastId = transaction();
      
      // Emit real-time update
      const newEntry = db.prepare(`
        SELECT id, operator, type, amount, customer_phone, trx_id, timestamp, 
        NULL as service_type, NULL as variant, NULL as pages, NULL as price, 
        'mfs' as source, paid_amount, due_amount, 0 as cashback 
        FROM mfs_transactions WHERE id = ?
      `).get(lastId);
      if (newEntry) emitNewHistoryEntry(shop_id, newEntry);

      res.json({ success: true, id: lastId });
    } catch (err: any) {
      console.error("MFS Transaction Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/mfs/balances", authenticateToken, (req: any, res) => {
    try {
      const shop_id = req.user.active_shop_id || 1;
      const shopNumbers = db.prepare("SELECT * FROM shop_numbers WHERE operator IN ('bKash', 'Nagad', 'Rocket') AND shop_id = ?").all(shop_id);
      const balances: any = {};
      const summary: any = { bKash: 0, Nagad: 0, Rocket: 0 };

      shopNumbers.forEach((sn: any) => {
        const stats = db.prepare(`
          SELECT 
            SUM(CASE WHEN type IN ('Cash-out', 'Receive', 'Payment', 'B2B-Buy') THEN amount ELSE 0 END) as total_in,
            SUM(CASE WHEN type IN ('Cash-in', 'Send Money', 'B2B-Pay') THEN amount ELSE 0 END) as total_out
          FROM mfs_transactions 
          WHERE shop_number_id = ? AND shop_id = ?
        `).get(sn.id, shop_id) as any;

        const balance = (sn.opening_balance || 0) + (stats?.total_in || 0) - (stats?.total_out || 0);
        balances[`${sn.operator} (${sn.number} - ${sn.type})`] = balance;
        
        if (summary[sn.operator] !== undefined) {
          summary[sn.operator] += balance;
        }
      });

      res.json({ ...balances, ...summary });
    } catch (err: any) {
      console.error("MFS Balances Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/mfs", authenticateToken, (req: any, res) => {
    const { search } = req.query;
    const shop_id = req.user.active_shop_id;
    let query = "SELECT * FROM mfs_transactions WHERE shop_id = ?";
    const params = [shop_id];
    if (search) {
      query += " AND (customer_phone LIKE ? OR trx_id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY timestamp DESC LIMIT 50";
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  // Recharge Endpoints
  app.post("/api/recharge", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { operator, type, amount, cashback, customer_phone, vendor_id, shop_number_id, payment_status, paid_amount, due_amount, customer_id } = req.body;
      const shop_id = req.user.active_shop_id;
      
      const cId = (customer_id && customer_id !== 'null' && customer_id !== '') ? parseInt(customer_id.toString()) : null;
      
      const baseProfit = (type === 'Recharge') ? amount * 0.025 : 0; 
      const cashbackVal = parseFloat(cashback) || 0;
      const profit = baseProfit + cashbackVal;
      
      const pStatus = payment_status || 'Paid';
      const pPaid = paid_amount !== undefined ? parseFloat(paid_amount.toString()) : amount;
      const pDue = due_amount !== undefined ? parseFloat(due_amount.toString()) : 0;

      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO recharge_transactions (operator, type, amount, profit, cashback, customer_phone, vendor_id, shop_number_id, shop_id, payment_status, paid_amount, due_amount, customer_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        `);
        const info = stmt.run(operator, type || 'Recharge', amount, profit, cashbackVal, customer_phone, vendor_id, shop_number_id, shop_id, pStatus, pPaid, pDue, cId);

        // Handle Customer Due
        if (pDue > 0 && cId) {
          db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(cId, 'Due', pDue, `Due for Recharge ${operator} - ${customer_phone}`, shop_id);
        }

        // Sync with Vendor Ledger if it's a B2B transaction
        if (vendor_id && (type === 'B2B-Buy' || type === 'B2B-Pay')) {
          const vendorType = type === 'B2B-Buy' ? 'Purchase' : 'Payment';
          const description = `${type} (${operator}): ${customer_phone || ''} (Ref: REC-${info.lastInsertRowid})`;
          
          const vStmt = db.prepare("INSERT INTO vendor_transactions (vendor_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
          const vInfo = vStmt.run(vendor_id, vendorType, amount, description, shop_id);

          if (vendorType === 'Payment') {
            const vendor = db.prepare("SELECT name FROM vendors WHERE id = ?").get(vendor_id);
            db.prepare("INSERT INTO expenses (category, description, amount, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
              .run('Vendor Payment', `Paid to ${vendor?.name || 'Vendor'}: ${description} (Ref: VT-${vInfo.lastInsertRowid})`, amount, shop_id);
          }
        }
        return info.lastInsertRowid;
      });

      const lastId = transaction();
      
      // Emit real-time update
      const newEntry = db.prepare(`
        SELECT id, operator, type, amount, customer_phone, NULL as trx_id, timestamp, 
        NULL as service_type, NULL as variant, NULL as pages, NULL as price, 
        'recharge' as source, paid_amount, due_amount, cashback 
        FROM recharge_transactions WHERE id = ?
      `).get(lastId);
      if (newEntry) emitNewHistoryEntry(shop_id, newEntry);

      res.json({ success: true, id: lastId });
    } catch (err: any) {
      console.error("Recharge Transaction Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/recharge/balances", authenticateToken, (req: any, res) => {
    try {
      const shop_id = req.user.active_shop_id || 1;
      const shopNumbers = db.prepare("SELECT * FROM shop_numbers WHERE operator IN ('GP', 'Robi', 'BL', 'Airtel', 'Teletalk') AND shop_id = ?").all(shop_id);
      const balances: any = {};
      const summary: any = { GP: 0, Robi: 0, BL: 0, Airtel: 0, Teletalk: 0 };

      shopNumbers.forEach((sn: any) => {
        const stats = db.prepare(`
          SELECT 
            SUM(CASE WHEN type IN ('B2B-Buy') THEN amount ELSE 0 END) + SUM(cashback) as total_in,
            SUM(CASE WHEN type IN ('Recharge', 'B2B-Pay') THEN amount ELSE 0 END) as total_out
          FROM recharge_transactions 
          WHERE shop_number_id = ? AND shop_id = ?
        `).get(sn.id, shop_id) as any;

        const balance = (sn.opening_balance || 0) + (stats?.total_in || 0) - (stats?.total_out || 0);
        balances[`${sn.operator} (${sn.number})`] = balance;

        if (summary[sn.operator] !== undefined) {
          summary[sn.operator] += balance;
        }
      });

      res.json({ ...balances, ...summary });
    } catch (err: any) {
      console.error("Recharge Balances Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/recharge", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM recharge_transactions WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 50").all(shop_id);
    res.json(rows);
  });

  // Service Endpoints
  app.post("/api/services", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { service_type, variant, pages, price, payment_status, paid_amount, due_amount, customer_id } = req.body;
      const shop_id = req.user.active_shop_id;
      
      const cId = (customer_id && customer_id !== 'null' && customer_id !== '') ? parseInt(customer_id.toString()) : null;
      
      const isColor = variant.toLowerCase().includes('color');
      const costKey = isColor ? 'cost_color' : 'cost_bw';
      const unitCost = parseFloat(db.prepare("SELECT value FROM settings WHERE key = ? AND shop_id = ?").get(costKey, shop_id)?.value || "0");
      const totalCost = unitCost * pages;

      const pStatus = payment_status || 'Paid';
      const pPaid = paid_amount !== undefined ? parseFloat(paid_amount.toString()) : price;
      const pDue = due_amount !== undefined ? parseFloat(due_amount.toString()) : 0;

      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO service_sales (service_type, variant, pages, price, cost, shop_id, payment_status, paid_amount, due_amount, customer_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        `);
        const info = stmt.run(service_type, variant, pages, price, totalCost, shop_id, pStatus, pPaid, pDue, cId);
        
        // Handle Customer Due
        if (pDue > 0 && cId) {
          db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(cId, 'Due', pDue, `Due for ${service_type} (${variant}) - ${pages} pages`, shop_id);
        }

        // Deduct paper inventory
        db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE item_name = 'Paper Rims' AND shop_id = ?").run(pages, shop_id);
        
        return info.lastInsertRowid;
      });

      const lastId = transaction();
      
      // Emit real-time update
      const newEntry = db.prepare(`
        SELECT id, NULL as operator, NULL as type, price as amount, NULL as customer_phone, 
        NULL as trx_id, timestamp, service_type, variant, pages, NULL as price, 
        'services' as source, paid_amount, due_amount, 0 as cashback 
        FROM service_sales WHERE id = ?
      `).get(lastId);
      if (newEntry) emitNewHistoryEntry(shop_id, newEntry);

      res.json({ success: true, id: lastId });
    } catch (err: any) {
      console.error("Service Transaction Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/services", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM service_sales WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 50").all(shop_id);
    res.json(rows);
  });

  // Other Sales Endpoints
  app.post("/api/other-sales", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { item_name, amount, profit, payment_status, paid_amount, due_amount, customer_id } = req.body;
      const shop_id = req.user.active_shop_id;
      
      const cId = (customer_id && customer_id !== 'null' && customer_id !== '') ? parseInt(customer_id.toString()) : null;
      
      const pStatus = payment_status || 'Paid';
      const pPaid = paid_amount !== undefined ? parseFloat(paid_amount.toString()) : amount;
      const pDue = due_amount !== undefined ? parseFloat(due_amount.toString()) : 0;

      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO other_sales (item_name, amount, profit, shop_id, payment_status, paid_amount, due_amount, customer_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        `);
        const info = stmt.run(item_name, amount, profit, shop_id, pStatus, pPaid, pDue, cId);

        // Handle Customer Due
        if (pDue > 0 && cId) {
          db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(cId, 'Due', pDue, `Due for Sale: ${item_name}`, shop_id);
        }
        return info.lastInsertRowid;
      });

      const lastId = transaction();
      
      // Emit real-time update
      const newEntry = db.prepare(`
        SELECT id, item_name as operator, 'Sale' as type, amount, NULL as customer_phone, 
        NULL as trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, 
        NULL as price, 'other' as source, paid_amount, due_amount, 0 as cashback 
        FROM other_sales WHERE id = ?
      `).get(lastId);
      if (newEntry) emitNewHistoryEntry(shop_id, newEntry);

      res.json({ success: true, id: lastId });
    } catch (err: any) {
      console.error("Other Sales Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/other-sales", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM other_sales WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 50").all(shop_id);
    res.json(rows);
  });

  // Expense Endpoints
  app.post("/api/expenses", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { category, description, amount, payment_status, paid_amount, due_amount, vendor_id } = req.body;
      const shop_id = req.user.active_shop_id;
      
      const pStatus = payment_status || 'Paid';
      const pPaid = paid_amount !== undefined ? paid_amount : amount;
      const pDue = due_amount !== undefined ? due_amount : 0;

      const stmt = db.prepare(`
        INSERT INTO expenses (category, description, amount, shop_id, payment_status, paid_amount, due_amount, vendor_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      `);
      const info = stmt.run(category, description, amount, shop_id, pStatus, pPaid, pDue, vendor_id);

      // Emit real-time update
      const newEntry = db.prepare(`
        SELECT id, category as operator, 'Expense' as type, amount, description as customer_phone, 
        NULL as trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, 
        NULL as price, 'expense' as source, paid_amount, due_amount, 0 as cashback 
        FROM expenses WHERE id = ?
      `).get(info.lastInsertRowid);
      if (newEntry) emitNewHistoryEntry(shop_id, newEntry);

      // Handle Vendor Transactions
      if (vendor_id) {
        // 1. Record Due if any
        if (pDue > 0) {
          db.prepare("INSERT INTO vendor_transactions (vendor_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(vendor_id, 'Purchase', pDue, `Due Expense: ${category} - ${description}`, shop_id);
        }
        // 2. Record Payment if it's a Vendor Payment category and was paid
        if (category === 'Vendor Payment' && pPaid > 0) {
          db.prepare("INSERT INTO vendor_transactions (vendor_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(vendor_id, 'Payment', pPaid, `Payment: ${description}`, shop_id);
        }
      }

      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      console.error("Expense Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/expenses", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM expenses WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 50").all(shop_id);
    res.json(rows);
  });

  // Vendor Endpoints
  app.get("/api/vendors", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare(`
      SELECT v.*, 
      (SELECT SUM(amount) FROM vendor_transactions WHERE vendor_id = v.id AND type = 'Purchase' AND shop_id = ?) as total_purchase,
      (SELECT SUM(amount) FROM vendor_transactions WHERE vendor_id = v.id AND type = 'Payment' AND shop_id = ?) as total_payment
      FROM vendors v
      WHERE v.shop_id = ?
    `).all(shop_id, shop_id, shop_id);
    res.json(rows.map((r: any) => ({
      ...r,
      balance: (r.total_purchase || 0) - (r.total_payment || 0)
    })));
  });

  app.post("/api/vendors", authenticateToken, checkReadOnly, (req: any, res) => {
    const { name, phone, details } = req.body;
    const shop_id = req.user.active_shop_id;
    const stmt = db.prepare("INSERT INTO vendors (name, phone, details, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    const info = stmt.run(name, phone, details, shop_id);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.get("/api/vendors/:id/ledger", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM vendor_transactions WHERE vendor_id = ? AND shop_id = ? ORDER BY timestamp DESC").all(req.params.id, shop_id);
    res.json(rows);
  });

  app.post("/api/vendor-transactions", authenticateToken, checkReadOnly, (req: any, res) => {
    const { vendor_id, type, amount, description } = req.body;
    const shop_id = req.user.active_shop_id;
    const stmt = db.prepare("INSERT INTO vendor_transactions (vendor_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    const info = stmt.run(vendor_id, type, amount, description, shop_id);
    
    // If it's a payment, also record it as an expense
    if (type === 'Payment') {
      const vendor = db.prepare("SELECT name FROM vendors WHERE id = ?").get(vendor_id);
      db.prepare("INSERT INTO expenses (category, description, amount, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
        .run('Vendor Payment', `Paid to ${vendor?.name || 'Vendor'}: ${description} (Ref: VT-${info.lastInsertRowid})`, amount, shop_id);
    }
    
    res.json({ success: true });
  });

  app.put("/api/vendor-transactions/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    const { type, amount, description } = req.body;
    const shop_id = req.user.active_shop_id;
    const oldTx = db.prepare("SELECT * FROM vendor_transactions WHERE id = ? AND shop_id = ?").get(req.params.id, shop_id);
    
    if (!oldTx) return res.status(404).json({ error: "Transaction not found" });

    db.prepare("UPDATE vendor_transactions SET type = ?, amount = ?, description = ? WHERE id = ? AND shop_id = ?")
      .run(type, amount, description, req.params.id, shop_id);

    // Update expense if it was a payment
    if (oldTx.type === 'Payment' || type === 'Payment') {
      const vendor = db.prepare("SELECT name FROM vendors WHERE id = ? AND shop_id = ?").get(oldTx.vendor_id, shop_id);
      // Delete old expense if it existed
      db.prepare("DELETE FROM expenses WHERE category = 'Vendor Payment' AND description LIKE ? AND shop_id = ?")
        .run(`%Ref: VT-${req.params.id}%`, shop_id);
      
      // Add new expense if it's still a payment
      if (type === 'Payment') {
        db.prepare("INSERT INTO expenses (category, description, amount, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
          .run('Vendor Payment', `Paid to ${vendor?.name || 'Vendor'}: ${description} (Ref: VT-${req.params.id})`, amount, shop_id);
      }
    }
    
    res.json({ success: true });
  });

  app.delete("/api/vendor-transactions/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const shop_id = req.user.active_shop_id;
      const tx: any = db.prepare("SELECT * FROM vendor_transactions WHERE id = ? AND shop_id = ?").get(req.params.id, shop_id);
      if (!tx) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // If this was a payment, delete linked expense
      if (tx.type === 'Payment') {
        db.prepare("DELETE FROM expenses WHERE category = 'Vendor Payment' AND description LIKE ? AND shop_id = ?")
          .run(`%Ref: VT-${req.params.id}%`, shop_id);
      }

      // If this was synced from MFS or Recharge, delete the source transaction
      if (tx.description && tx.description.includes('Ref: MFS-')) {
        const mfsId = tx.description.split('Ref: MFS-')[1].split(')')[0];
        db.prepare("DELETE FROM mfs_transactions WHERE id = ? AND shop_id = ?").run(mfsId, shop_id);
      } else if (tx.description && tx.description.includes('Ref: REC-')) {
        const recId = tx.description.split('Ref: REC-')[1].split(')')[0];
        db.prepare("DELETE FROM recharge_transactions WHERE id = ? AND shop_id = ?").run(recId, shop_id);
      }

      db.prepare("DELETE FROM vendor_transactions WHERE id = ? AND shop_id = ?").run(req.params.id, shop_id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting vendor transaction:", err);
      res.status(500).json({ error: "Failed to delete vendor transaction" });
    }
  });

  // Customer Endpoints
  app.get("/api/customers", authenticateToken, (req: any, res) => {
    const rows = db.prepare(`
      SELECT c.*, 
      (SELECT SUM(amount) FROM customer_transactions WHERE customer_id = c.id AND type = 'Due' AND shop_id = c.shop_id) as total_due,
      (SELECT SUM(amount) FROM customer_transactions WHERE customer_id = c.id AND type = 'Payment' AND shop_id = c.shop_id) as total_paid
      FROM customers c
      WHERE c.shop_id = ?
    `).all(req.user.active_shop_id);
    res.json(rows.map((r: any) => ({
      ...r,
      balance: (r.total_due || 0) - (r.total_paid || 0)
    })));
  });

  app.post("/api/customers", authenticateToken, checkReadOnly, (req: any, res) => {
    const { name, phone, address } = req.body;
    const stmt = db.prepare("INSERT INTO customers (name, phone, address, shop_id, timestamp) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    const info = stmt.run(name, phone, address, req.user.active_shop_id);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.get("/api/customers/:id/ledger", authenticateToken, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM customer_transactions WHERE customer_id = ? AND shop_id = ? ORDER BY timestamp DESC").all(req.params.id, req.user.active_shop_id);
    res.json(rows);
  });

  app.post("/api/customer-transactions", authenticateToken, checkReadOnly, (req: any, res) => {
    const { customer_id, type, amount, description } = req.body;
    const stmt = db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    stmt.run(customer_id, type, amount, description, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.delete("/api/customer-transactions/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      db.prepare("DELETE FROM customer_transactions WHERE id = ? AND shop_id = ?").run(req.params.id, req.user.active_shop_id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete customer transaction" });
    }
  });

  app.get("/api/history", authenticateToken, (req: any, res) => {
    const { search, startDate, endDate } = req.query;
    let params: any[] = [];
    
    let mfsQuery = "SELECT id, operator, type, amount, customer_phone, trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, NULL as price, 'mfs' as source, paid_amount, due_amount, 0 as cashback FROM mfs_transactions WHERE shop_id = ?";
    let rechargeQuery = "SELECT id, operator, type, amount, customer_phone, NULL as trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, NULL as price, 'recharge' as source, paid_amount, due_amount, cashback FROM recharge_transactions WHERE shop_id = ?";
    let servicesQuery = "SELECT id, NULL as operator, NULL as type, price as amount, NULL as customer_phone, NULL as trx_id, timestamp, service_type, variant, pages, NULL as price, 'services' as source, paid_amount, due_amount, 0 as cashback FROM service_sales WHERE shop_id = ?";
    let otherQuery = "SELECT id, item_name as operator, 'Sale' as type, amount, NULL as customer_phone, NULL as trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, NULL as price, 'other' as source, paid_amount, due_amount, 0 as cashback FROM other_sales WHERE shop_id = ?";
    let expenseQuery = "SELECT id, category as operator, 'Expense' as type, amount, description as customer_phone, NULL as trx_id, timestamp, NULL as service_type, NULL as variant, NULL as pages, NULL as price, 'expense' as source, paid_amount, due_amount, 0 as cashback FROM expenses WHERE shop_id = ?";

    const shop_id = req.user.active_shop_id;
    const queries = [mfsQuery, rechargeQuery, servicesQuery, otherQuery, expenseQuery];
    const finalQueries = [];

    for (let q of queries) {
      let currentParams = [shop_id];
      if (search) {
        const searchPattern = `%${search}%`;
        if (q.includes('mfs_transactions')) {
          q += " AND (customer_phone LIKE ? OR trx_id LIKE ?)";
          currentParams.push(searchPattern, searchPattern);
        } else if (q.includes('recharge_transactions')) {
          q += " AND customer_phone LIKE ?";
          currentParams.push(searchPattern);
        } else if (q.includes('service_sales')) {
          q += " AND (service_type LIKE ? OR variant LIKE ?)";
          currentParams.push(searchPattern, searchPattern);
        } else if (q.includes('other_sales')) {
          q += " AND item_name LIKE ?";
          currentParams.push(searchPattern);
        } else if (q.includes('expenses')) {
          q += " AND (category LIKE ? OR description LIKE ?)";
          currentParams.push(searchPattern, searchPattern);
        }
      }

      if (startDate) {
        q += " AND timestamp >= ?";
        currentParams.push(startDate);
      }
      if (endDate) {
        q += " AND timestamp <= ?";
        currentParams.push(endDate);
      }
      
      finalQueries.push(q);
      params.push(...currentParams);
    }

    const unifiedQuery = `
      SELECT * FROM (
        ${finalQueries.join('\n        UNION ALL\n        ')}
      ) ORDER BY timestamp DESC LIMIT 300
    `;

    const rows = db.prepare(unifiedQuery).all(...params);
    res.json(rows);
  });

  app.delete("/api/history/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    const { source } = req.query;
    const { id } = req.params;

    try {
      if (source === 'mfs') {
        // Delete linked vendor and customer transactions
        db.prepare("DELETE FROM vendor_transactions WHERE description LIKE ? AND shop_id = ?").run(`%Ref: MFS-${id}%`, req.user.active_shop_id);
        db.prepare("DELETE FROM customer_transactions WHERE description LIKE ? AND shop_id = ?").run(`%Ref: MFS-${id}%`, req.user.active_shop_id);
        db.prepare("DELETE FROM mfs_transactions WHERE id = ? AND shop_id = ?").run(id, req.user.active_shop_id);
      } else if (source === 'recharge') {
        db.prepare("DELETE FROM vendor_transactions WHERE description LIKE ? AND shop_id = ?").run(`%Ref: REC-${id}%`, req.user.active_shop_id);
        db.prepare("DELETE FROM recharge_transactions WHERE id = ? AND shop_id = ?").run(id, req.user.active_shop_id);
      } else if (source === 'services') {
        db.prepare("DELETE FROM service_sales WHERE id = ? AND shop_id = ?").run(id, req.user.active_shop_id);
      } else if (source === 'other') {
        db.prepare("DELETE FROM other_sales WHERE id = ? AND shop_id = ?").run(id, req.user.active_shop_id);
      } else if (source === 'expense') {
        db.prepare("DELETE FROM expenses WHERE id = ? AND shop_id = ?").run(id, req.user.active_shop_id);
      }
      res.json({ success: true });
      io.to(`shop_${req.user.active_shop_id}`).emit("history_entry_deleted", { id, source });
    } catch (err) {
      console.error("Error deleting history transaction:", err);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Inventory Endpoints
  app.post("/api/inventory/add", authenticateToken, checkReadOnly, (req: any, res) => {
    const { quantity } = req.body;
    const qty = parseInt(quantity);
    
    try {
      const item: any = db.prepare("SELECT id FROM inventory WHERE item_name = 'Paper Rims' AND shop_id = ?").get(req.user.active_shop_id);
      if (!item) {
        return res.status(404).json({ error: "Paper Rims item not found in inventory" });
      }
      
      db.prepare("UPDATE inventory SET quantity = quantity + ?, last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND shop_id = ?").run(qty, item.id, req.user.active_shop_id);
      db.prepare("INSERT INTO stock_history (inventory_id, type, quantity, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
        .run(item.id, 'Add', qty, 'Restocked (Paper Rims)', req.user.active_shop_id);
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inventory", authenticateToken, (req: any, res) => {
    try {
      const rows = db.prepare("SELECT * FROM inventory WHERE shop_id = ? ORDER BY item_name ASC").all(req.user.active_shop_id);
      res.json(rows);
    } catch (err: any) {
      console.error("Inventory Fetch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inventory", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { item_name, quantity, min_stock, unit, purchase_price } = req.body;
      const stmt = db.prepare("INSERT INTO inventory (item_name, quantity, min_stock, unit, purchase_price, shop_id, last_updated) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
      const info = stmt.run(item_name, quantity || 0, min_stock || 5, unit || 'pcs', purchase_price || 0, req.user.active_shop_id);
      
      if (quantity > 0) {
        db.prepare("INSERT INTO stock_history (inventory_id, type, quantity, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
          .run(info.lastInsertRowid, 'Add', quantity, 'Initial stock', req.user.active_shop_id);
      }
      
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Product already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/inventory/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    const { item_name, min_stock, unit, purchase_price } = req.body;
    db.prepare("UPDATE inventory SET item_name = ?, min_stock = ?, unit = ?, purchase_price = ?, last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND shop_id = ?")
      .run(item_name, min_stock, unit, purchase_price || 0, req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    db.prepare("DELETE FROM stock_history WHERE inventory_id = ? AND shop_id = ?").run(req.params.id, req.user.active_shop_id);
    db.prepare("DELETE FROM inventory WHERE id = ? AND shop_id = ?").run(req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.post("/api/inventory/:id/stock", authenticateToken, checkReadOnly, (req: any, res) => {
    const { quantity, type, description } = req.body; // type: 'Add' or 'Remove'
    const qty = parseInt(quantity);
    
    const updateStmt = type === 'Add' 
      ? "UPDATE inventory SET quantity = quantity + ?, last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND shop_id = ?"
      : "UPDATE inventory SET quantity = quantity - ?, last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND shop_id = ?";
    
    db.prepare(updateStmt).run(qty, req.params.id, req.user.active_shop_id);
    db.prepare("INSERT INTO stock_history (inventory_id, type, quantity, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
      .run(req.params.id, type, qty, description, req.user.active_shop_id);
    
    res.json({ success: true });
  });

  app.get("/api/inventory/:id/history", authenticateToken, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM stock_history WHERE inventory_id = ? AND shop_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.params.id, req.user.active_shop_id);
    res.json(rows);
  });

  app.post("/api/inventory/sell", authenticateToken, checkReadOnly, (req: any, res) => {
    try {
      const { inventory_id, quantity, price, customer_id, payment_status, paid_amount, due_amount } = req.body;
      const qty = parseInt(quantity);
      const amount = parseFloat(price);

      const item: any = db.prepare("SELECT * FROM inventory WHERE id = ? AND shop_id = ?").get(inventory_id, req.user.active_shop_id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      if (item.quantity < qty) return res.status(400).json({ error: "Insufficient stock" });

      const transaction = db.transaction(() => {
        // 1. Update Inventory
        db.prepare("UPDATE inventory SET quantity = quantity - ?, last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND shop_id = ?").run(qty, inventory_id, req.user.active_shop_id);

        // 2. Record Stock History
        db.prepare("INSERT INTO stock_history (inventory_id, type, quantity, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
          .run(inventory_id, 'Remove', qty, `Sold: ${qty} ${item.unit}`, req.user.active_shop_id);

        // 3. Record Sale
        const pStatus = payment_status || 'Paid';
        const pPaid = paid_amount !== undefined ? parseFloat(paid_amount.toString()) : amount;
        const pDue = due_amount !== undefined ? parseFloat(due_amount.toString()) : 0;
        
        const cId = (customer_id && customer_id !== 'null' && customer_id !== '') ? parseInt(customer_id.toString()) : null;
        
        const profit = (amount - (item.purchase_price * qty));

        const saleStmt = db.prepare(`
          INSERT INTO other_sales (item_name, amount, profit, payment_status, paid_amount, due_amount, customer_id, shop_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        `);
        const saleInfo = saleStmt.run(item.item_name, amount, profit, pStatus, pPaid, pDue, cId, req.user.active_shop_id);

        // 4. Handle Customer Due
        if (pDue > 0 && cId) {
          db.prepare("INSERT INTO customer_transactions (customer_id, type, amount, description, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
            .run(cId, 'Due', pDue, `Due for Inventory Sale: ${item.item_name}`, req.user.active_shop_id);
        }

        return saleInfo.lastInsertRowid;
      });

      const saleId = transaction();
      const saleRecord = db.prepare("SELECT * FROM other_sales WHERE id = ? AND shop_id = ?").get(saleId, req.user.active_shop_id);
      res.json({ success: true, ...saleRecord });
    } catch (err: any) {
      console.error("Inventory Sale Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Shop Numbers Endpoints
  app.get("/api/shop-numbers", authenticateToken, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM shop_numbers WHERE shop_id = ?").all(req.user.active_shop_id);
    res.json(rows);
  });

  app.post("/api/shop-numbers", authenticateToken, checkReadOnly, (req: any, res) => {
    const { operator, type, number, password, opening_balance } = req.body;
    const stmt = db.prepare("INSERT INTO shop_numbers (operator, type, number, password, opening_balance, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    stmt.run(operator, type, number, password, opening_balance || 0, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.delete("/api/shop-numbers/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    db.prepare("DELETE FROM shop_numbers WHERE id = ? AND shop_id = ?").run(req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.put("/api/shop-numbers/:id/opening-balance", authenticateToken, checkReadOnly, (req: any, res) => {
    const { opening_balance } = req.body;
    db.prepare("UPDATE shop_numbers SET opening_balance = ? WHERE id = ? AND shop_id = ?").run(opening_balance, req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  // Orders Endpoints
  app.get("/api/orders", authenticateToken, (req: any, res) => {
    try {
      const { status } = req.query;
      let query = "SELECT * FROM orders WHERE shop_id = ?";
      const params = [req.user.active_shop_id];
      if (status) {
        query += " AND status = ?";
        params.push(status);
      }
      query += " ORDER BY timestamp DESC";
      const rows = db.prepare(query).all(...params);
      res.json(rows);
    } catch (err: any) {
      console.error("Orders Fetch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders", authenticateToken, checkReadOnly, (req: any, res) => {
    const { customer_name, customer_phone, description, amount, status } = req.body;
    const stmt = db.prepare("INSERT INTO orders (customer_name, customer_phone, description, amount, status, shop_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))");
    const info = stmt.run(customer_name, customer_phone, description, amount || 0, status || 'Pending', req.user.active_shop_id);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.put("/api/orders/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    const { customer_name, customer_phone, description, amount, status } = req.body;
    const stmt = db.prepare("UPDATE orders SET customer_name = ?, customer_phone = ?, description = ?, amount = ?, status = ? WHERE id = ? AND shop_id = ?");
    stmt.run(customer_name, customer_phone, description, amount, status, req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  app.delete("/api/orders/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    db.prepare("DELETE FROM orders WHERE id = ? AND shop_id = ?").run(req.params.id, req.user.active_shop_id);
    res.json({ success: true });
  });

  // Settings Endpoints
  app.get("/api/settings", authenticateToken, (req: any, res) => {
    const shop_id = req.user.active_shop_id;
    const rows = db.prepare("SELECT * FROM settings WHERE shop_id = ?").all(shop_id);
    res.json(rows);
  });

  app.post("/api/settings", authenticateToken, checkReadOnly, (req: any, res) => {
    const { key, value } = req.body;
    const shop_id = req.user.active_shop_id;
    db.prepare("INSERT OR REPLACE INTO settings (key, value, shop_id) VALUES (?, ?, ?)").run(key, value.toString(), shop_id);
    res.json({ success: true });
  });

  // Analytics Endpoints
  app.get("/api/analytics", authenticateToken, (req: any, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const shopId = req.user.active_shop_id || 1;
      
      // Get MFS breakdown
      const mfsStats = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Cash-in' THEN amount ELSE 0 END) as cash_in,
          SUM(CASE WHEN type = 'Cash-out' THEN amount ELSE 0 END) as cash_out,
          SUM(CASE WHEN type = 'Receive' THEN amount ELSE 0 END) as received,
          SUM(CASE WHEN type = 'Payment' THEN amount ELSE 0 END) as payment,
          SUM(amount) as total_volume,
          SUM(commission) as profit
        FROM mfs_transactions 
        WHERE date(timestamp) = date('now') AND shop_id = ?
      `).get(shopId) as any;

      const rechargeToday = db.prepare("SELECT SUM(amount) as total, SUM(profit) as profit FROM recharge_transactions WHERE date(timestamp) = date('now') AND shop_id = ?").get(shopId) as any;
      const servicesToday = db.prepare("SELECT SUM(price) as total, SUM(cost) as cost, SUM(pages) as pages FROM service_sales WHERE date(timestamp) = date('now') AND shop_id = ?").get(shopId) as any;
      const otherSalesToday = db.prepare("SELECT SUM(amount) as total, SUM(profit) as profit FROM other_sales WHERE date(timestamp) = date('now') AND shop_id = ?").get(shopId) as any;
      const expensesToday = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE date(timestamp) = date('now') AND shop_id = ?").get(shopId) as any;
      const inventory = db.prepare("SELECT quantity FROM inventory WHERE item_name = 'Paper Rims' AND shop_id = ?").get(shopId) as any;
      
      // Calculate Total Customer Due
      const customerStats = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Due' THEN amount ELSE 0 END) as total_due,
          SUM(CASE WHEN type = 'Payment' THEN amount ELSE 0 END) as total_paid
        FROM customer_transactions
        WHERE shop_id = ?
      `).get(shopId) as any;
      const totalCustomerDue = (customerStats?.total_due || 0) - (customerStats?.total_paid || 0);

      // Calculate Cumulative "Cash in Hand" (Physical Cash flow)
      const mfsCashFlowAll = (db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Cash-in' THEN paid_amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'Cash-out' THEN paid_amount ELSE 0 END) -
          SUM(CASE WHEN type = 'B2B-Buy' THEN paid_amount ELSE 0 END) -
          SUM(CASE WHEN type = 'B2B-Pay' THEN paid_amount ELSE 0 END) as val
        FROM mfs_transactions
        WHERE shop_id = ?
      `).get(shopId) as any)?.val || 0;
      
      const rechargeCashFlowAll = (db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Recharge' THEN paid_amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'B2B-Buy' THEN paid_amount ELSE 0 END) -
          SUM(CASE WHEN type = 'B2B-Pay' THEN paid_amount ELSE 0 END) as val
        FROM recharge_transactions
        WHERE shop_id = ?
      `).get(shopId) as any)?.val || 0;
      
      const servicesCashAll = db.prepare("SELECT SUM(paid_amount) as total FROM service_sales WHERE shop_id = ?").get(shopId)?.total || 0;
      const otherSalesCashAll = db.prepare("SELECT SUM(paid_amount) as total FROM other_sales WHERE shop_id = ?").get(shopId)?.total || 0;
      const expensesCashAll = db.prepare("SELECT SUM(paid_amount) as total FROM expenses WHERE shop_id = ?").get(shopId)?.total || 0;
      const customerPaymentsCashAll = db.prepare("SELECT SUM(amount) as total FROM customer_transactions WHERE type = 'Payment' AND shop_id = ?").get(shopId)?.total || 0;
      
      const openingCash = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'opening_cash' AND shop_id = ?").get(shopId)?.value || "0");
      const cashInHand = openingCash + mfsCashFlowAll + rechargeCashFlowAll + servicesCashAll + otherSalesCashAll - expensesCashAll + customerPaymentsCashAll;
      
      // Calculate MFS Balances
      const mfsBalances: any = {};
      let totalMfsBalance = 0;
      const mfsShopNumbers = db.prepare("SELECT * FROM shop_numbers WHERE operator IN ('bKash', 'Nagad', 'Rocket') AND shop_id = ?").all(shopId);
      mfsShopNumbers.forEach((sn: any) => {
        const stats = db.prepare(`
          SELECT 
            SUM(CASE WHEN type IN ('Cash-out', 'Receive', 'Payment', 'B2B-Buy') THEN amount ELSE 0 END) as total_in,
            SUM(CASE WHEN type IN ('Cash-in', 'Send Money', 'B2B-Pay') THEN amount ELSE 0 END) as total_out
          FROM mfs_transactions 
          WHERE shop_number_id = ? AND shop_id = ?
        `).get(sn.id, shopId);
        const bal = (sn.opening_balance || 0) + (stats?.total_in || 0) - (stats?.total_out || 0);
        mfsBalances[`${sn.operator} (${sn.number} - ${sn.type})`] = bal;
        totalMfsBalance += bal;
      });

      // Calculate Recharge Balances
      const rechargeBalances: any = {};
      let totalRechargeBalance = 0;
      const rechargeShopNumbers = db.prepare("SELECT * FROM shop_numbers WHERE operator IN ('GP', 'Robi', 'BL', 'Airtel', 'Teletalk') AND shop_id = ?").all(shopId);
      rechargeShopNumbers.forEach((sn: any) => {
        const stats = db.prepare(`
          SELECT 
            SUM(CASE WHEN type IN ('B2B-Buy') THEN amount ELSE 0 END) + SUM(cashback) as total_in,
            SUM(CASE WHEN type IN ('Recharge', 'B2B-Pay') THEN amount ELSE 0 END) as total_out
          FROM recharge_transactions 
          WHERE shop_number_id = ? AND shop_id = ?
        `).get(sn.id, shopId);
        const bal = (sn.opening_balance || 0) + (stats?.total_in || 0) - (stats?.total_out || 0);
        rechargeBalances[`${sn.operator} (${sn.number})`] = bal;
        totalRechargeBalance += bal;
      });

      const totalBalance = totalMfsBalance + totalRechargeBalance + cashInHand;

      const serviceProfit = (servicesToday?.total || 0) - (servicesToday?.cost || 0);
      const totalProfit = (mfsStats?.profit || 0) + (rechargeToday?.profit || 0) + serviceProfit + (otherSalesToday?.profit || 0);

      res.json({
        mfs: { total: mfsStats?.total_volume || 0, profit: mfsStats?.profit || 0 },
        recharge: rechargeToday || { total: 0, profit: 0 },
        services: { ...(servicesToday || { total: 0, pages: 0 }), profit: serviceProfit },
        other: otherSalesToday || { total: 0, profit: 0 },
        expenses: expensesToday || { total: 0 },
        inventory: inventory?.quantity || 0,
        mfsBalances,
        rechargeBalances,
        totalMfsBalance,
        totalRechargeBalance,
        cashInHand,
        totalBalance,
        totalProfit,
        totalCustomerDue,
        totalShops: req.user.role === 'admin' ? db.prepare("SELECT count(*) as count FROM shops").get().count : 0
      });
    } catch (err: any) {
      console.error("Analytics Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/analytics/chart-data", authenticateToken, (req: any, res) => {
    try {
      // Get last 7 days data
      const days = 7;
      const labels = [];
      const salesData = [];
      const mfsData = [];
      const profitData = [];
      const shopId = req.user.active_shop_id;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

        // Daily Sales (Services + Other + Recharge Profit + MFS Profit)
        const mfsProfit = db.prepare("SELECT SUM(commission) as val FROM mfs_transactions WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const rechargeProfit = db.prepare("SELECT SUM(profit) as val FROM recharge_transactions WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const serviceSales = db.prepare("SELECT SUM(price) as val FROM service_sales WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const otherSales = db.prepare("SELECT SUM(amount) as val FROM other_sales WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const serviceCost = db.prepare("SELECT SUM(cost) as val FROM service_sales WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const otherProfit = db.prepare("SELECT SUM(profit) as val FROM other_sales WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;
        const expenses = db.prepare("SELECT SUM(amount) as val FROM expenses WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;

        const totalSales = serviceSales + otherSales; // Revenue from direct sales
        const totalProfit = mfsProfit + rechargeProfit + (serviceSales - serviceCost) + otherProfit - expenses;
        
        const mfsVolume = db.prepare("SELECT SUM(amount) as val FROM mfs_transactions WHERE date(timestamp) = ? AND shop_id = ?").get(dateStr, shopId)?.val || 0;

        salesData.push(totalSales);
        mfsData.push(mfsVolume);
        profitData.push(totalProfit);
      }

      res.json({ labels, salesData, mfsData, profitData });
    } catch (err: any) {
      console.error("Chart Data Error:", err);
      res.status(500).json({ error: err.message });
    }
  });



  // --- Backup Logic ---

  const performBackup = async () => {
    const date = new Date().toISOString().split('T')[0];
    const backupPath = path.join(BACKUP_DIR, `shop-backup-${date}.db`);
    
    try {
      // Close DB temporarily to ensure a clean copy (or use backup() method if available)
      // better-sqlite3 has a .backup() method which is safer
      await db.backup(backupPath);
      console.log(`Backup created at ${backupPath}`);
      return backupPath;
    } catch (err) {
      console.error("Backup failed:", err);
      throw err;
    }
  };

  // Daily backup at midnight
  cron.schedule('0 0 * * *', () => {
    console.log("Running daily backup...");
    performBackup();
  });

  // Backup Endpoints
  app.get("/api/backups", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
        date: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    res.json(files);
  });

  app.get("/api/backups/download/:filename", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/backups/create", authenticateToken, checkReadOnly, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const path = await performBackup();
      res.json({ success: true, path });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backups/restore/:filename", authenticateToken, checkReadOnly, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const backupPath = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }

    try {
      // Close current DB
      db.close();
      // Copy backup to shop.db
      fs.copyFileSync(backupPath, "shop.db");
      // Restart process or re-open DB
      // In this environment, we can just re-open
      // But it's safer to tell the user to refresh
      res.json({ success: true, message: "Database restored. Please refresh the page." });
      process.exit(0); // The platform will restart the server
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backups/upload", authenticateToken, checkReadOnly, upload.single('backup'), (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const targetPath = path.join(BACKUP_DIR, `uploaded-${Date.now()}.db`);
    fs.renameSync(req.file.path, targetPath);
    res.json({ success: true, filename: path.basename(targetPath) });
  });

  // Google Drive Integration
  app.post("/api/backups/cloud-sync", authenticateToken, checkReadOnly, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const shopId = req.user.active_shop_id;
    const settings = db.prepare("SELECT key, value FROM settings WHERE shop_id = ? AND key IN ('google_drive_credentials', 'google_drive_folder_id')").all(shopId);
    const credentialsJson = settings.find(s => s.key === 'google_drive_credentials')?.value;
    const folderId = settings.find(s => s.key === 'google_drive_folder_id')?.value;

    if (!credentialsJson) {
      return res.status(400).json({ error: "Google Drive not configured. Please add Service Account JSON in Settings." });
    }
    
    try {
      let google;
      try {
        google = (await import("googleapis")).google;
      } catch (err) {
        return res.status(501).json({ error: "Google Drive sync is not installed on this hosting. Local backups still work." });
      }

      const credentials = JSON.parse(credentialsJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      const drive = google.drive({ version: 'v3', auth });
      const backupPath = await performBackup();
      const fileName = path.basename(backupPath);

      const fileMetadata: any = {
        name: fileName,
      };
      
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: 'application/x-sqlite3',
        body: fs.createReadStream(backupPath),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      res.json({ success: true, message: "Backup synced to Google Drive.", fileId: response.data.id });
    } catch (err: any) {
      console.error("Cloud sync failed:", err);
      let errorMessage = `Cloud sync failed: ${err.message}.`;
      if (err.message.includes("storage quota")) {
        errorMessage += " Service accounts have 0 quota by default. Please share a folder with the service account email and add the Folder ID in Settings.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Support Ticket Endpoints
  app.get("/api/support-tickets", authenticateToken, (req: any, res) => {
    try {
      let tickets;
      if (req.user.role === 'admin') {
        tickets = db.prepare(`
          SELECT st.*, s.name as shop_name, u.name as user_name 
          FROM support_tickets st 
          JOIN shops s ON st.shop_id = s.id 
          JOIN users u ON st.user_id = u.id 
          ORDER BY st.created_at DESC
        `).all();
      } else {
        tickets = db.prepare(`
          SELECT st.*, s.name as shop_name, u.name as user_name 
          FROM support_tickets st 
          JOIN shops s ON st.shop_id = s.id 
          JOIN users u ON st.user_id = u.id 
          WHERE st.shop_id = ? 
          ORDER BY st.created_at DESC
        `).all(req.user.active_shop_id || 1);
      }
      res.json(tickets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/support-tickets", authenticateToken, checkReadOnly, (req: any, res) => {
    const { subject, message } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO support_tickets (shop_id, user_id, subject, message, created_at, updated_at) 
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      `);
      const info = stmt.run(req.user.active_shop_id || 1, req.user.id, subject, message);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/support-tickets/:id", authenticateToken, checkReadOnly, (req: any, res) => {
    const { admin_reply, status } = req.body;
    try {
      if (admin_reply && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can reply to tickets" });
      }

      const existing: any = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Ticket not found" });

      if (req.user.role !== 'admin' && existing.shop_id !== (req.user.active_shop_id || 1)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const newStatus = status || existing.status;
      const newReply = admin_reply !== undefined ? admin_reply : existing.admin_reply;

      db.prepare(`
        UPDATE support_tickets 
        SET admin_reply = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') 
        WHERE id = ?
      `).run(newReply, newStatus, req.params.id);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Global Error Handler - returns JSON instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // 404 Handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_PATH));
    app.get("/", (req, res) => {
      res.sendFile(INDEX_PATH);
    });
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `API route ${req.originalUrl} not found` });
      }
      res.sendFile(INDEX_PATH);
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
