import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pinataSDK from '@pinata/sdk';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
const app = express();
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY, 
  process.env.PINATA_SECRET_API_KEY
);

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    // Add production domains here
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' }));

// Database simulation (in production, use a real database)
const userRecords = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    services: {
      pinata: !!process.env.PINATA_API_KEY,
      storage: 'operational'
    }
  });
});

// Unified IPFS Pinning Endpoint
app.post('/api/pin-json', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }

    const recordId = req.body.recordId || uuidv4();
    const isUpdate = req.body.isUpdate || false;

    const pinataOptions = {
      pinataMetadata: {
        name: `ehr-${isUpdate ? 'update' : 'record'}-${recordId}-${Date.now()}`,
        keyvalues: {
          sender: walletAddress,
          recordId,
          isUpdate: isUpdate.toString(),
          timestamp: new Date().toISOString()
        }
      },
      pinataContent: req.body.data || req.body  // Correctly use the 'data' field
    };

    const result = await pinata.pinJSONToIPFS(pinataOptions);
    const ipfsUrl = `ipfs://${result.IpfsHash}`;  // Get the correct IPFS URL

    // Return the IPFS URL and other details
    res.json({ 
      success: true,
      IpfsHash: result.IpfsHash,  // Note uppercase 'I' to match frontend
      ipfsUrl: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      isUpdate,
      recordId
    });
  } catch (error) {
    console.error('Pinata error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to pin to IPFS'
    });
  }
});

// Get record history endpoint
app.get('/api/record-history', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const record = userRecords.get(walletAddress);
    if (!record) {
      return res.status(404).json({ error: 'No records found' });
    }

    res.json({
      success: true,
      current: record.current,
      history: record.history
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get record history'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Pinata status: ${process.env.PINATA_API_KEY ? '✅' : '❌'}`);
});