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
app.use(express.json());

// Mount webhook app
app.use(webhookApp);

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