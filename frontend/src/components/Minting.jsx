import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { EHR_NFTConfig } from '../contracts/contracts-config';
import { API_CONFIG } from '../config/api';
import "../styles/components/Minting.css";
import { getProvider, getSigner } from "../web3Provider";

const CONSTANT_IPFS_IMAGE_URI = "ipfs://bafybeib6a6drnuvjpwhsbnd6nbvuqshmmiwjifxcmmj4obsy3zkg6uhc6e";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
const PLATFORM_EXTERNAL_URL = "http://localhost:5173/patient";

const Minting = ({ account }) => {
  const [ehrData, setEhrData] = useState({
    name: '',
    birthDate: '',
    bloodType: '',
    conditions: '',
    medications: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMinted, setHasMinted] = useState(false);
  const [currentDataURI, setCurrentDataURI] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [historyURIs, setHistoryURIs] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState(null);
  const [showManualImportGuide, setShowManualImportGuide] = useState(false);

  

  // Check minted status and fetch existing data
  useEffect(() => {
    const checkMintedStatus = async () => {
      if (account) {
        try {
          const provider = getProvider();
          const signer = await getSigner();
          const network = await provider.getNetwork(); // Get the current network
          
          // Get contract address for the current network
          const contractAddress = EHR_NFTConfig[Number(network.chainId)]?.address;
          const contractABI = EHR_NFTConfig.abi;
          
          if (!contractAddress) {
            throw new Error(`No contract deployed for chain ID ${network.chainId}`);
          }
    
          const contract = new ethers.Contract(
            contractAddress, 
            contractABI, 
            signer
          );
          
          const hasMinted = await contract.hasMintedNFT(account);
          setHasMinted(hasMinted);
          
          if (hasMinted) {
            const tokenId = await contract.getTokenId(account);
            const medicalRecord = await contract.getMedicalRecord(tokenId);
            setCurrentDataURI(medicalRecord.dataURI);
            setMetadataURI(medicalRecord.metadataURI);
            setHistoryURIs(medicalRecord.historyURIs);
            await fetchEHRData(medicalRecord.dataURI);
          }
        } catch (error) {
          console.error('Error in checkMintedStatus:', error);
          setError('Failed to check minted status: ' + error.message);
        }
      }
    };
    
    checkMintedStatus();
  }, [account]);


  const fetchEHRData = async (uri) => {
    if (!uri) {
      setError('No data URI available');
      return;
    }
  
    try {
      let gatewayUrl = uri.startsWith('ipfs://') 
        ? `${PINATA_GATEWAY}${uri.split('ipfs://')[1]}`
        : `${PINATA_GATEWAY}${uri}`;
    
      const response = await fetch(gatewayUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const data = await response.json();
      const patientData = data.properties?.patient_data || data;
      
      setEhrData({
        name: patientData.name || '',
        birthDate: patientData.birthDate || '',
        bloodType: patientData.bloodType || '',
        conditions: patientData.conditions || '',
        medications: patientData.medications || ''
      });
    } catch (error) {
      console.error('Error in fetchEHRData:', error);
      setError('Failed to load medical record: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEhrData(prev => ({ ...prev, [name]: value }));
  };

  const pinToIPFS = async (data, isUpdate = false) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pinJson}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account || 'unknown',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'IPFS pinning failed');
      }

      const ipfsHash = result.IpfsHash || result.ipfsHash;
      if (!ipfsHash) {
        throw new Error('No IPFS hash received in response');
      }

      return {
        ...result,
        IpfsHash: ipfsHash
      };
    } catch (error) {
      console.error('IPFS Pinning error:', error);
      throw new Error(`Error pinning to IPFS: ${error.message}`);
    }
  };

  const createMetadata = (ehrData, dataURI) => ({
    name: `Medical Record for ${ehrData.name}`,
    description: `Electronic Health Record - Last updated ${new Date().toISOString()}`,
    image: CONSTANT_IPFS_IMAGE_URI,
    external_url: PLATFORM_EXTERNAL_URL,
    attributes: [
      { trait_type: "Record Type", value: "Medical EHR" },
      { trait_type: "Blood Type", value: ehrData.bloodType || "Unknown" }
    ],
    properties: {
      patient_data: {
        name: ehrData.name,
        birthDate: ehrData.birthDate,
        bloodType: ehrData.bloodType,
        conditions: ehrData.conditions,
        medications: ehrData.medications,
        ipfs: dataURI,
        timestamp: new Date().toISOString()
      }
    }
  });

  const addNFTToMetaMask = async (contractAddress, tokenId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: contractAddress,
            tokenId: tokenId,
            symbol: 'EHR',
            name: 'MedicalRecord',
            image: CONSTANT_IPFS_IMAGE_URI.replace('ipfs://', PINATA_GATEWAY),
          },
        },
      });
      return true;
    } catch (error) {
      console.error('Error adding NFT:', error);
      return false;
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    if (!showManualImportGuide) {
      window.location.reload();
    }
  };

  const handleCloseManualGuide = () => {
    setShowManualImportGuide(false);
    setShowSuccessModal(false);
    window.location.reload();
  };

  const handleMint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!ehrData.name || !ehrData.birthDate) {
        throw new Error("Name and birth date are required");
      }
  
      // 1. Pin medical data to IPFS
      const medicalData = {
        ...ehrData,
        timestamp: new Date().toISOString(),
        owner: account
      };
      const dataResult = await pinToIPFS(medicalData);
      const dataURI = `ipfs://${dataResult.IpfsHash}`;
  
      // 2. Create and pin metadata
      const metadata = createMetadata(ehrData, dataURI);
      const metadataResult = await pinToIPFS(metadata);
      const metadataURI = `ipfs://${metadataResult.IpfsHash}`;
  
      // 3. Mint NFT with metadata URI
      const provider = getProvider();
      const signer = await getSigner();
      const network = await provider.getNetwork();
      
      // Get contract address for current network
      const contractAddress = EHR_NFTConfig[Number(network.chainId)]?.address;
      if (!contractAddress) {
        throw new Error(`No contract deployed for chain ID ${network.chainId}`);
      }
  
      const contract = new ethers.Contract(
        contractAddress,
        EHR_NFTConfig.abi,
        signer
      );
  
      const tx = await contract.mint(metadataURI);
      const receipt = await tx.wait();
  
      // 4. Extract tokenId from transaction logs
      let tokenId;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "NFTMinted") {
            tokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch {}
      }
  
      if (!tokenId) {
        throw new Error("Could not determine tokenId from transaction");
      }
  
      // 5. Update data URI and add to MetaMask
      await contract.updateDataURI(tokenId, dataURI);
      setMintedTokenId(tokenId);
      setShowSuccessModal(true);
      
      const added = await addNFTToMetaMask(contractAddress, tokenId);
      if (added) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setShowManualImportGuide(true);
      }
  
      setHasMinted(true);
      setCurrentDataURI(dataURI);
      setMetadataURI(metadataURI);
  
    } catch (error) {
      console.error("Minting error:", error);
      setError(error.message || "Failed to mint NFT");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!ehrData.name || !ehrData.birthDate) {
        throw new Error("Name and birth date are required");
      }
  
      // 1. Pin new medical data
      const medicalData = {
        ...ehrData,
        timestamp: new Date().toISOString(),
        owner: account
      };
      const dataResult = await pinToIPFS(medicalData, true);
      const newDataURI = `ipfs://${dataResult.IpfsHash}`;
  
      // 2. Create and pin new metadata
      const metadata = createMetadata(ehrData, newDataURI);
      const metadataResult = await pinToIPFS(metadata, true);
      const newMetadataURI = `ipfs://${metadataResult.IpfsHash}`;
  
      // 3. Update contract
      const provider = getProvider();
      const signer = await getSigner();
      const network = await provider.getNetwork();
      
      // Get contract address for current network
      const contractAddress = EHR_NFTConfig[Number(network.chainId)]?.address;
      if (!contractAddress) {
        throw new Error(`No contract deployed for chain ID ${network.chainId}`);
      }
  
      const contract = new ethers.Contract(
        contractAddress,
        EHR_NFTConfig.abi,
        signer
      );
  
      const tokenId = await contract.getTokenId(account);
      await contract.updateDataURI(tokenId, newDataURI);
      await contract.setMetadataURI(tokenId, newMetadataURI);
  
      // Refresh UI
      const medicalRecord = await contract.getMedicalRecord(tokenId);
      setCurrentDataURI(medicalRecord.dataURI);
      setMetadataURI(medicalRecord.metadataURI);
      setHistoryURIs(medicalRecord.historyURIs);
      setIsUpdating(false);
      
      alert('Record updated successfully!');
    } catch (error) {
      console.error("Update error:", error);
      setError(error.message || "Failed to update record");
    } finally {
      setIsLoading(false);
    }
  };

  const viewHistoricalRecord = async (uri) => {
    try {
      setIsLoading(true);
      await fetchEHRData(uri);
    } catch (error) {
      setError('Failed to load historical record: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasMinted) {
    return (
      <div className="minting-container">
        <h2>Medical Record NFT</h2>
        
        {isUpdating ? (
          <>
            <div className="form-group">
              <label>Patient Information</label>
              <input
                name="name"
                value={ehrData.name}
                onChange={handleInputChange}
                placeholder="Full Name"
                required
              />
              <input
                type="date"
                name="birthDate"
                value={ehrData.birthDate}
                onChange={handleInputChange}
                placeholder="Date of Birth"
                required
              />
            </div>

            <div className="form-group">
              <label>Medical Information</label>
              <select 
                name="bloodType" 
                value={ehrData.bloodType} 
                onChange={handleInputChange}
              >
                <option value="">Select Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <textarea
                name="conditions"
                value={ehrData.conditions}
                onChange={handleInputChange}
                placeholder="Known medical conditions"
                rows={3}
              />
              <textarea
                name="medications"
                value={ehrData.medications}
                onChange={handleInputChange}
                placeholder="Current medications"
                rows={3}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button 
                onClick={handleUpdate}
                disabled={isLoading}
                className="mint-button"
              >
                {isLoading ? 'Saving...' : 'Save New Version'}
              </button>
              <button 
                onClick={() => setIsUpdating(false)}
                disabled={isLoading}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="record-display">
              <h3>Patient Information</h3>
              <p><strong>Name:</strong> {ehrData.name}</p>
              <p><strong>Date of Birth:</strong> {ehrData.birthDate}</p>
              
              <h3>Medical Information</h3>
              <p><strong>Blood Type:</strong> {ehrData.bloodType || 'Not specified'}</p>
              <p><strong>Conditions:</strong> {ehrData.conditions || 'None reported'}</p>
              <p><strong>Medications:</strong> {ehrData.medications || 'None reported'}</p>
              
              <p className="ipfs-link">
                <strong>Current Version:</strong> 
                <a href={currentDataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                   target="_blank" 
                   rel="noopener noreferrer">
                  View on IPFS
                </a>
              </p>
            </div>

            <button 
              onClick={() => setIsUpdating(true)}
              className="edit-button"
            >
              Update Medical Record
            </button>

            {historyURIs.length > 0 && (
              <div className="version-history">
                <h3>Previous Versions</h3>
                <ul>
                  {historyURIs.map((uri, index) => (
                    <li key={index}>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          viewHistoricalRecord(uri);
                        }}
                      >
                        Version {historyURIs.length - index}
                      </a>
                      <span className="view-ipfs">
                        (<a 
                          href={uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                          target="_blank" 
                          rel="noopener noreferrer">
                          View on IPFS
                        </a>)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>🎉 NFT Minted Successfully!</h3>
              <p>Your medical record NFT has been created.</p>
              
              {showManualImportGuide ? (
                <div className="manual-import-guide">
                  <h4>Don't see your NFT in MetaMask?</h4>
                  <ol>
                    <li>Open MetaMask</li>
                    <li>Go to the "NFTs" tab</li>
                    <li>Click "Import NFTs"</li>
                    <li>
                      Enter: <br />
                      Contract: <code>{EHR_NFTConfig.address}</code><br />
                      Token ID: <code>{mintedTokenId}</code>
                    </li>
                  </ol>
                  <button 
                    className="close-button"
                    onClick={handleCloseManualGuide}
                  >
                    I've Imported It - Refresh
                  </button>
                </div>
              ) : (
                <div className="auto-success">
                  <p>Your NFT should appear in MetaMask shortly...</p>
                  <button 
                    className="close-button"
                    onClick={handleCloseSuccessModal}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="minting-container">
      <h2>Create Medical Record NFT</h2>
      
      <div className="form-group">
        <label>Patient Information</label>
        <input
          name="name"
          value={ehrData.name}
          onChange={handleInputChange}
          placeholder="Full Name"
          required
        />
        <input
          type="date"
          name="birthDate"
          value={ehrData.birthDate}
          onChange={handleInputChange}
          placeholder="Date of Birth"
          required
        />
      </div>

      <div className="form-group">
        <label>Medical Information</label>
        <select 
          name="bloodType" 
          value={ehrData.bloodType} 
          onChange={handleInputChange}
        >
          <option value="">Select Blood Type</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
        <textarea
          name="conditions"
          value={ehrData.conditions}
          onChange={handleInputChange}
          placeholder="Known medical conditions"
          rows={3}
        />
        <textarea
          name="medications"
          value={ehrData.medications}
          onChange={handleInputChange}
          placeholder="Current medications"
          rows={3}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button 
        onClick={handleMint}
        disabled={isLoading}
        className="mint-button"
      >
        {isLoading ? 'Creating Record...' : 'Create Medical Record NFT'}
      </button>

      <div className="info-note">
        <p>Your medical data will be securely stored on IPFS and linked to an NFT.</p>
        <p>Each update creates a new version while preserving previous versions.</p>
      </div>
    </div>
  );
};

export default Minting;