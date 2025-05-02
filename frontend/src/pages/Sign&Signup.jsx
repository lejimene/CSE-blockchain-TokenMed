import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { userRegistryConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/Signup&Signin.css";
import KeyShow from "../components/KeyShow";

// Define role constants for better readability
const ROLES = {
  UNREGISTERED: 0,
  PATIENT: 1,
  DOCTOR: 2
};
export async function generateECDHKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
      {
          name: "ECDH",
          namedCurve: "P-384"
      },
      true,
      ["deriveKey", "deriveBits"]
  );

  return {
      publicKey: await window.crypto.subtle.exportKey("jwk", keyPair.publicKey),
      privateKey: await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
  };
}

// Key generation utilities
const generateSymmetricKey = () => {
  return window.crypto.getRandomValues(new Uint8Array(32));
};

const generateKeyPair = async () => {
  return await generateECDHKeys(); // This now returns JWK format keys
};

async function exportPublicKey(publicKey) {
  // Import the JWK to CryptoKey format first
  const cryptoKey = await window.crypto.subtle.importKey(
    'jwk',
    publicKey,
    {
      name: "ECDH",
      namedCurve: "P-384" // Note: Changed from P-256 to P-384 to match your new function
    },
    true,
    []
  );
  
  // Then export as spki
  const spki = await window.crypto.subtle.exportKey("spki", cryptoKey);
  return new Uint8Array(spki);
}

async function exportPrivateKey(privateKey) {
  // Import the JWK to CryptoKey format first
  const cryptoKey = await window.crypto.subtle.importKey(
    'jwk',
    privateKey,
    {
      name: "ECDH",
      namedCurve: "P-384" // Note: Changed from P-256 to P-384 to match your new function
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  
  // Then export as pkcs8
  const pkcs8 = await window.crypto.subtle.exportKey("pkcs8", cryptoKey);
  return new Uint8Array(pkcs8);
}
export async function generateAESKey() {
  const key = await window.crypto.subtle.generateKey(
      {
          name: "AES-GCM",
          length: 256
      },
      true,
      ["encrypt", "decrypt"]
  );
  return await window.crypto.subtle.exportKey("jwk", key);
}

const Dashboard = () => {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(ROLES.UNREGISTERED);
  const [publicKey, setPublicKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keysToBackup, setKeysToBackup] = useState(null);
  const navigate = useNavigate();
  const userRegistryAddress = userRegistryConfig.address;
  const userRegistryABI = userRegistryConfig.abi;

  // Check registration status when account changes
  useEffect(() => {
    const checkRegistration = async () => {
      if (!account) return;
      
      setIsLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(userRegistryAddress, userRegistryABI, provider);
        
        const role = await contract.getRole(account);
        const roleNumber = parseInt(role.toString(), 10);
        console.log("Confirmed role on-chain:", roleNumber.toString());
        
        if ([ROLES.UNREGISTERED, ROLES.PATIENT, ROLES.DOCTOR].includes(roleNumber)) {
          setUserRole(roleNumber);
          
          const storedKeys = localStorage.getItem(`keys_${account}`);
          if (storedKeys) {
            const { publicKey: storedPublicKey } = JSON.parse(storedKeys);
            setPublicKey(storedPublicKey);
          }
        } else {
          console.warn("Unknown role value received:", roleNumber);
          setUserRole(ROLES.UNREGISTERED);
        }
      } catch (error) {
        console.error("Registration check failed:", error);
        setError("Failed to check registration status. Please try again.");
        setUserRole(ROLES.UNREGISTERED);
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistration();
  }, [account, userRegistryAddress, userRegistryABI]);

  // Redirect user based on role
  useEffect(() => {
    if (isLoading || showKeyModal) return;
    
    switch (userRole) {
      case ROLES.PATIENT:
        navigate("/patient");
        break;
      case ROLES.DOCTOR:
        navigate("/doctor");
        break;
      default:
        break;
    }
  }, [userRole, isLoading, navigate, showKeyModal]);

  // Connect wallet handler
  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to continue");
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // Add this validation function
    const validatePublicKey = (publicKeyBytes) => {
        // Basic validation - adjust based on your expected key format
        if (!publicKeyBytes || publicKeyBytes.length === 0) {
        throw new Error("Empty public key generated");
        }
        // Add more specific validation if needed
        // For example, SPKI format should have specific headers
        if (publicKeyBytes.length < 64) {
        throw new Error("Invalid public key length");
        }
    };
  
  // Registration handler with key generation
  const registerUser = async (role) => {
    setIsLoading(true);
    setError(null);
    try {
      // Generate asymmetric ECDH keys
      const ecdhKeyPair = await generateECDHKeys(); // Directly using your new function
      const pubKeyBytes = await exportPublicKey(ecdhKeyPair.publicKey);
      
      // Generate symmetric AES key
      const aesKey = await generateAESKey();
      
      // Validate public key before proceeding
      validatePublicKey(pubKeyBytes);
      
      const publicKeyHex = ethers.hexlify(pubKeyBytes);
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(userRegistryAddress, userRegistryABI, signer);
  
      if (role !== ROLES.PATIENT && role !== ROLES.DOCTOR) {
        throw new Error("Invalid role selection");
      }
  
      // Prepare keys object - now including both asymmetric and symmetric keys
      const keys = {
        role,
        publicKey: publicKeyHex, // ECDH public key (hex)
        privateKey: ethers.hexlify(await exportPrivateKey(ecdhKeyPair.privateKey)), // ECDH private key (hex)
        aesKey: aesKey // AES symmetric key (JWK format)
      };
  
      // Send registration with public key to blockchain
      const tx = await contract.registerUser(role, ethers.getBytes(publicKeyHex));
      const receipt = await tx.wait();
      
      // Verify the role was set correctly
      const updatedRole = await contract.getRole(account);
      if (parseInt(updatedRole.toString(), 10) !== role) {
        throw new Error("Role not set correctly on-chain");
      }
  
      // Store all keys only after successful on-chain registration
      localStorage.setItem(`keys_${account}`, JSON.stringify(keys));
  
      setUserRole(role);
      setPublicKey(publicKeyHex);
      
      // Show key backup modal with all keys
      setKeysToBackup(keys);
      setShowKeyModal(true);
  
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = `Registration failed: ${error.reason || error.message}`;
      
      if (error.message.includes("Invalid public key length")) {
        errorMessage = "Key generation failed - please try again";
      } else if (error.message.includes("Role not set correctly")) {
        errorMessage = "Registration succeeded but role verification failed";
      } else if (error.message.includes("user rejected transaction")) {
        errorMessage = "Transaction was cancelled";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Shorten address for display
  const shortenAddress = (addr) => {
    return addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";
  };

  // Shorten public key for display
  const shortenPublicKey = (key) => {
    if (!key) return "";
    return key.length > 20 ? `${key.substring(0, 10)}...${key.substring(key.length - 10)}` : key;
  };

  // Get readable role name
  const getRoleName = (role) => {
    switch (role) {
      case ROLES.PATIENT: return "Patient";
      case ROLES.DOCTOR: return "Doctor";
      default: return "Unregistered";
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Healthcare Access Portal</h1>
      
      {error && (
        <div className="error-message">
          {error}
          {error.includes("MetaMask") && (
            <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer">
              Download MetaMask
            </a>
          )}
        </div>
      )}
      
      {!account ? (
        <div className="wallet-section">
          <button 
            onClick={connectWallet} 
            disabled={isLoading}
            className="connect-button"
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </button>
          <p className="wallet-hint">Connect your wallet to access the healthcare portal</p>
        </div>
      ) : (
        <div className="user-section">
          <div className="user-info">
            <h2>Welcome, {shortenAddress(account)}</h2>
            <p>Status: {getRoleName(userRole)}</p>
            {userRole !== ROLES.UNREGISTERED && publicKey && (
              <div className="key-info">
                <p>Public Key: {shortenPublicKey(publicKey)}</p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="loading-indicator">
              <p>Processing...</p>
            </div>
          ) : userRole === ROLES.UNREGISTERED ? (
            <div className="registration-options">
              <h3>Please select your role:</h3>
              <div className="key-explanation">
                <p>For your security, we'll generate cryptographic keys when you register.</p>
                <p>These will be used to protect your health data.</p>
              </div>
              <div className="role-buttons">
                <button 
                  onClick={() => registerUser(ROLES.PATIENT)}
                  disabled={isLoading}
                  className="role-button patient"
                >
                  Register as Patient
                </button>
                <button 
                  onClick={() => registerUser(ROLES.DOCTOR)}
                  disabled={isLoading}
                  className="role-button doctor"
                >
                  Register as Doctor
                </button>
              </div>
            </div>
          ) : (
            <div className="redirect-notice">
              <p>Redirecting to your {getRoleName(userRole).toLowerCase()} dashboard...</p>
            </div>
          )}
        </div>
      )}

      {showKeyModal && (
        <KeyShow 
          keys={keysToBackup}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;