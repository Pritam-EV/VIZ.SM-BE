import cors from 'cors';

const corsHandler = cors({
  origin: [
    process.env.CLIENT_URL || 'https://smeter.vjratechnologies.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],  // ✅ Added OPTIONS
  credentials: true,
  allowedHeaders: [  // ✅ CRITICAL FIX
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200,  // ✅ Some legacy browsers
  preflightContinue: false
});

export default corsHandler;
