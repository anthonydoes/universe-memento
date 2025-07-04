// Debug endpoint to see what Universe is sending
export default async function handler(req, res) {
  console.log('=== WEBHOOK DEBUG ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body:', req.body);
  console.log('========================');

  // Log environment variables (safely)
  console.log('Environment check:');
  console.log('GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? 'Set' : 'Missing');
  console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
  console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Missing');
  console.log('UNIVERSE_WEBHOOK_SECRET:', process.env.UNIVERSE_WEBHOOK_SECRET ? 'Set' : 'Missing');
  console.log('TARGET_TICKET_TYPE:', process.env.TARGET_TICKET_TYPE);
  console.log('SHEET_NAME:', process.env.SHEET_NAME);

  // Check specific headers Universe should send
  const signature = req.headers['x-universe-signature'];
  const userAgent = req.headers['user-agent'];
  
  console.log('Signature header:', signature);
  console.log('User agent:', userAgent);

  res.json({
    status: 'debug',
    method: req.method,
    hasSignature: !!signature,
    hasBody: !!req.body,
    bodyType: typeof req.body,
    headers: req.headers,
    envVarsSet: {
      GOOGLE_SHEETS_ID: !!process.env.GOOGLE_SHEETS_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      UNIVERSE_WEBHOOK_SECRET: !!process.env.UNIVERSE_WEBHOOK_SECRET,
      TARGET_TICKET_TYPE: process.env.TARGET_TICKET_TYPE,
      SHEET_NAME: process.env.SHEET_NAME
    },
    timestamp: new Date().toISOString()
  });
}