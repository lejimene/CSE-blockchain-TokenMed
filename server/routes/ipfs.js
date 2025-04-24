import express from 'express';
import axios from 'axios';

const router = express.Router();

// PIN JSON to IPFS (using Pinata)
router.post('/pin-json', async (req, res) => {
  try {
    const { metadata } = req.body;
    
    if (!metadata) {
      return res.status(400).json({ error: 'Metadata is required' });
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET,
        },
      }
    );

    res.json({ 
      success: true,
      cid: response.data.IpfsHash,
      ipfsUrl: `ipfs://${response.data.IpfsHash}`
    });

  } catch (error) {
    console.error('Pinata error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to pin to IPFS',
      details: error.response?.data || error.message 
    });
  }
});

// Optional: PIN file to IPFS
router.post('/pin-file', async (req, res) => {
  // You would implement file upload handling here
});

export default router;