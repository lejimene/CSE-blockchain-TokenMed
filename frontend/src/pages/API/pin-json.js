import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK(
  process.env.VITE_PINATA_API_KEY, 
  process.env.VITE_PINATA_SECRET
);

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isUpdate } = req.query;
    const metadata = {
      pinataMetadata: {
        name: isUpdate ? `ehr-update-${Date.now()}` : `ehr-record-${Date.now()}`,
        keyvalues: {
          walletAddress: req.headers['x-wallet-address'] || 'unknown',
          isUpdate: isUpdate ? 'true' : 'false'
        }
      },
      pinataContent: req.body
    };

    const result = await pinata.pinJSONToIPFS(metadata);
    
    res.status(200).json({
      success: true,
      IpfsHash: result.IpfsHash,  // Changed from ipfsHash to IpfsHash
      ipfsUrl: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
    });
  } catch (error) {
    console.error('Pinata error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'IPFS pinning failed'
    });
  }
}