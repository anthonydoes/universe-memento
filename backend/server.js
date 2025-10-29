import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import webhookApp from './api/webhook.js';
import dataRouter from './api/data.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Mount webhook app first (needs raw body)
app.use(webhookApp);

// Then apply JSON parsing for other routes
app.use(express.json());

// Mount data API routes
app.use('/api', dataRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});