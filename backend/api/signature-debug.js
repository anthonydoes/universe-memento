import crypto from 'crypto';

// Disable body parsing to get raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get raw body from request
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      resolve(body);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body as buffer
    const rawBodyBuffer = await getRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');
    
    const signature = req.headers['x-uniiverse-signature'];
    const secret = process.env.UNIVERSE_WEBHOOK_SECRET || 'gj5Ghy&x';
    
    // Try different secret variations
    const secretVariations = [
      { name: 'As configured', value: secret },
      { name: 'Without quotes', value: 'gj5Ghy&x' },
      { name: 'URL encoded &', value: 'gj5Ghy%26x' },
      { name: 'HTML encoded &', value: 'gj5Ghy&amp;x' },
      { name: 'Escaped &', value: 'gj5Ghy\\&x' },
      { name: 'Just gj5Ghy', value: 'gj5Ghy' },
      { name: 'With trailing space', value: 'gj5Ghy&x ' },
      { name: 'With leading space', value: ' gj5Ghy&x' },
    ];
    
    console.log('=== SIGNATURE DEBUG ===');
    console.log('Received signature:', signature);
    console.log('Signature length:', signature?.length);
    console.log('Expected length for SHA-1:', 40);
    console.log('Body length:', rawBody.length);
    console.log('Body first 100 chars:', rawBody.substring(0, 100));
    console.log('Body last 100 chars:', rawBody.substring(rawBody.length - 100));
    console.log('\n--- Testing secret variations ---');
    
    const results = [];
    
    secretVariations.forEach(({ name, value }) => {
      const sig = crypto.createHmac('sha1', value).update(rawBody).digest('hex');
      const matches = sig === signature;
      console.log(`${name} (${value}): ${sig} ${matches ? '✅ MATCH!' : '❌'}`);
      results.push({ name, secret: value, signature: sig, matches });
    });
    
    // Also try with the raw buffer
    console.log('\n--- Testing with raw buffer ---');
    secretVariations.slice(0, 3).forEach(({ name, value }) => {
      const sig = crypto.createHmac('sha1', value).update(rawBodyBuffer).digest('hex');
      const matches = sig === signature;
      console.log(`Buffer - ${name}: ${sig} ${matches ? '✅ MATCH!' : '❌'}`);
      results.push({ name: `Buffer - ${name}`, secret: value, signature: sig, matches });
    });
    
    console.log('========================');
    
    const matchFound = results.some(r => r.matches);
    
    res.json({
      success: matchFound,
      receivedSignature: signature,
      bodyLength: rawBody.length,
      match: results.find(r => r.matches) || null,
      allResults: matchFound ? results.filter(r => r.matches) : results.slice(0, 5),
      hint: matchFound ? 'Match found! Use this secret configuration.' : 'No match found. Check with Universe support about the exact secret format.'
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}