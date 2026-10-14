// ============================================================
// HEAL IN INDIA — Main Express Server
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://checkout.razorpay.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.razorpay.com", "https://maps.googleapis.com", "https://generativelanguage.googleapis.com"],
      frameSrc: ["https://api.razorpay.com"],
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

app.use(generalLimiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// STATIC FILES — serve frontend
// ============================================================

app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/clinics', require('./routes/clinics'));
app.use('/api/practitioners', require('./routes/practitioners'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/records', require('./routes/records'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews', require('./routes/reviews'));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Heal in India',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true'
  });
});

// ============================================================
// SPA FALLBACK — serve index.html for all frontend routes
// ============================================================

app.get('*', (req, res) => {
  // Don't catch API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred.'
    : err.message;
  res.status(statusCode).json({ error: message });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║         HEAL IN INDIA — API SERVER        ║
║   Healthcare & Wellness Tourism Platform  ║
╚══════════════════════════════════════════╝
  🌿 Server running at: http://localhost:${PORT}
  📦 Environment: ${process.env.NODE_ENV || 'development'}
  🔒 Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}
  `);
});

module.exports = app;
