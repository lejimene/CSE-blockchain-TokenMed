import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pinataSDK from '@pinata/sdk';

dotenv.config();
const app = express();
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY, 
  process.env.PINATA_SECRET_API_KEY
);

// Middleware - Updated CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', // React frontend
    'http://localhost:5173'  // Vite frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' }));

// API Key Validation Middleware (optional for prod)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    services: {
      pinata: !!process.env.PINATA_API_KEY
    }
  });
});

// IPFS Pinning Endpoint
app.post('/api/pin-json', /* validateApiKey, */ async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }

    const pinataOptions = {
      pinataMetadata: {
        name: `ehr-record-${Date.now()}`,
        keyvalues: {
          sender: req.headers['x-wallet-address'] || 'unknown'
        }
      },
      pinataContent: req.body
    };

    const result = await pinata.pinJSONToIPFS(pinataOptions);
    
    res.json({ 
      success: true,
      cid: result.IpfsHash,
      ipfsUrl: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
    });
  } catch (error) {
    console.error('Pinata error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to pin to IPFS'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// Server start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Pinata status: ${process.env.PINATA_API_KEY ? '✅' : '❌'}`);
});