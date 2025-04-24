const pinataSDK = require('@pinata/sdk');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

async function pinMetadata() {
  // Example EHR NFT metadata
  const metadata = {
    name: "Patient Health Record #1",
    description: "Encrypted EHR stored on IPFS",
    image: "ipfs://bafybeib6a6drnuvjpwhsbnd6nbvuqshmmiwjifxcmmj4obsy3zkg6uhc6e", // Upload your image first (see note below)
    attributes: [
      { trait_type: "Condition", value: "Chronic" },
      { trait_type: "Access", value: "Doctor-Approved" }
    ]
  };

  try {
    const { IpfsHash } = await pinata.pinJSONToIPFS(metadata);
    console.log(`Metadata pinned! CID: ${IpfsHash}`);
    console.log(`tokenURI: ipfs://${IpfsHash}`);
    return IpfsHash;
  } catch (error) {
    console.error("Error pinning metadata:", error);
  }
}

pinMetadata();