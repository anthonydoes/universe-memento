import express from 'express';

const router = express.Router();

// Placeholder endpoint
router.get('/data', (req, res) => {
  res.json({ message: 'Data API endpoint' });
});

export default router;