import pinataSDK from '@pinata/sdk';
const pinata = new pinataSDK(process.env.VITE_PINATA_API_KEY, process.env.VITE_PINATA_SECRET);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const result = await pinata.pinJSONToIPFS(req.body);
    res.status(200).json({ cid: result.IpfsHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}