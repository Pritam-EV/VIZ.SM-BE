import cors from 'cors';

const allowedOrigins = [
  process.env.CLIENT_URL || 'https://smeter.vjratechnologies.com',  // ← FIX: Use CLIENT_URL
  'https://smeter.vjratechnologies.com',  // Production domain (add explicitly as fallback)
  'http://localhost:3000',
  'http://localhost:5173'
];

console.log('✅ Allowed CORS origins:', allowedOrigins);  // ← DEBUG: Log origins on startup

const corsHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);  // ✓ Allow
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));  // ✗ Block + log
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
  preflightContinue: false,  // ✓ Express handles OPTIONS fully
  maxAge: 3600  // Cache preflight for 1 hour
});

export default corsHandler;
