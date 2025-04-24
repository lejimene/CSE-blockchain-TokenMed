import { useState } from 'react';
import { ethers } from 'ethers';
import { EHR_NFTConfig } from '../contracts/contracts-config';
import { API_CONFIG } from '../config/api';
import "../styles/components/Minting.css";

const NFTMinter = ({ account }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    diagnosis: '',
    treatment: '',
    date: new Date().toISOString().split('T')[0],
    encryptedData: '' // For actual EHR data encryption
  });
  const [hasMinted, setHasMinted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [ipfsData, setIpfsData] = useState(null);
  const [nftDetails, setNftDetails] = useState(null);

  // Check if user has already minted
  const checkMintStatus = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        EHR_NFTConfig.address,
        EHR_NFTConfig.abi,
        provider
      );
      const status = await contract.hasMinted(account);
      setHasMinted(status);
      return status;
    } catch (err) {
      console.error("Error checking mint status:", err);
      return false;
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Upload metadata to IPFS via your backend
  const uploadToIPFS = async (metadata) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pinJson}`, {
        method: 'POST',
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account
        },
        body: JSON.stringify(metadata)
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }
  
      const data = await response.json();
      return data.ipfsUrl;
    } catch (err) {
      console.error("IPFS upload error:", err);
      throw new Error(`IPFS upload failed: ${err.message}`);
    }
  };

  // Mint NFT with IPFS metadata
  const mintNFT = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Prepare metadata
      const metadata = {
        name: `EHR Record for ${formData.patientName}`,
        description: "Encrypted Electronic Health Record",
        attributes: [
          {
            trait_type: "Diagnosis",
            value: formData.diagnosis
          },
          {
            trait_type: "Treatment",
            value: formData.treatment
          },
          {
            trait_type: "Date",
            value: formData.date
          }
        ],
        encrypted_data: formData.encryptedData, // Actual encrypted EHR data
        created_at: new Date().toISOString()
      };

      // 2. Upload to IPFS
      const ipfsUri = await uploadToIPFS(metadata);
      setIpfsData({
        ipfsUrl: ipfsUri,
        metadata: metadata
      });

      // 3. Mint NFT with the IPFS URI
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        EHR_NFTConfig.address,
        EHR_NFTConfig.abi,
        signer
      );

      const tx = await contract.mint(ipfsUri);
      await tx.wait();

      setTxHash(tx.hash);
      setHasMinted(true);
      
      // 4. Get NFT details
      const tokenId = await contract.tokenCounter() - 1;
      const tokenURI = await contract.tokenURI(tokenId);
      
      setNftDetails({
        tokenId,
        tokenURI,
        owner: account
      });

    } catch (err) {
      console.error("Minting error:", err);
      setError(err.message || "Failed to mint NFT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nft-minter">
      <h2>Mint Your EHR NFT</h2>
      
      {hasMinted ? (
        <div className="mint-success">
          <h3>✅ Successfully Minted NFT!</h3>
          {nftDetails && (
            <div className="nft-details">
              <p><strong>Token ID:</strong> {nftDetails.tokenId.toString()}</p>
              <p><strong>Owner:</strong> {nftDetails.owner}</p>
              <p>
                <strong>IPFS Metadata:</strong> 
                <a href={nftDetails.tokenURI} target="_blank" rel="noopener noreferrer">
                  View Metadata
                </a>
              </p>
            </div>
          )}
          {txHash && (
            <p className="tx-hash">
              <strong>Transaction:</strong> 
              <a 
                href={`https://etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on Etherscan
              </a>
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mint-form">
            <div className="form-group">
              <label>Patient Name</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label>Diagnosis</label>
              <input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                placeholder="Condition or diagnosis"
              />
            </div>

            <div className="form-group">
              <label>Treatment</label>
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleInputChange}
                placeholder="Treatment plan or notes"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Encrypted Data (Base64)</label>
              <textarea
                name="encryptedData"
                value={formData.encryptedData}
                onChange={handleInputChange}
                placeholder="Paste encrypted EHR data here"
                rows="5"
              />
            </div>

            <button 
              onClick={mintNFT}
              disabled={loading || !account}
              className="mint-button"
            >
              {loading ? 'Minting...' : 'Mint EHR NFT'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NFTMinter;