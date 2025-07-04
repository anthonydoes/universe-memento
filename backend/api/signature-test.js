import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body
    const rawBody = req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : '';
    const signature = req.headers['x-uniiverse-signature'];
    const secret = process.env.UNIVERSE_WEBHOOK_SECRET || 'gj5Ghy&x';
    
    // Try different signature methods
    const sha1Signature = crypto
      .createHmac('sha1', secret)
      .update(rawBody)
      .digest('hex');
    
    const sha256Signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    
    // Also try with the raw request body if available
    let rawRequestBody = '';
    if (req.readable) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      rawRequestBody = Buffer.concat(chunks).toString();
    }
    
    const sha1SignatureRaw = rawRequestBody ? crypto
      .createHmac('sha1', secret)
      .update(rawRequestBody)
      .digest('hex') : 'N/A';
    
    console.log('=== SIGNATURE TEST ===');
    console.log('Received signature:', signature);
    console.log('Secret:', secret);
    console.log('Body length:', rawBody.length);
    console.log('Body type:', typeof req.body);
    console.log('SHA-1 signature:', sha1Signature);
    console.log('SHA-256 signature:', sha256Signature);
    console.log('SHA-1 signature (raw):', sha1SignatureRaw);
    console.log('Signature matches SHA-1?', signature === sha1Signature);
    console.log('Signature matches SHA-256?', signature === sha256Signature);
    console.log('First 100 chars of body:', rawBody.substring(0, 100));
    console.log('======================');
    
    res.json({
      received: signature,
      sha1: sha1Signature,
      sha256: sha256Signature,
      sha1Raw: sha1SignatureRaw,
      matchesSha1: signature === sha1Signature,
      matchesSha256: signature === sha256Signature,
      bodyLength: rawBody.length,
      bodyType: typeof req.body
    });
  } catch (error) {
    console.error('Signature test error:', error);
    res.status(500).json({ error: error.message });
  }
}