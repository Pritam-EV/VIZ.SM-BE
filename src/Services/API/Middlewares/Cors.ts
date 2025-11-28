// src/Services/API/Middlewares/Cors.ts
import cors from 'cors';

export default cors({
  origin: [
    'http://localhost:3000', 
    'https://smartmeter-vjratechnologies.web.app',  // ← YOUR FIREBASE URL
    'https://smartmeter-vjratechnologies.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
