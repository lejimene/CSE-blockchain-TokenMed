import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { PatientDoctorAccessControllerConfig, userRegistryConfig, EHR_NFTConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/PatientPage.css";
import NFTMinter from '../components/Minting';
import RecordViewer from '../components/RecordViewer';
import { API_CONFIG } from '../config/api';

const ROLES = {
  UNREGISTERED: 0,
  PATIENT: 1,
  DOCTOR: 2
};

const PatientPage = () => {
    const [account, setAccount] = useState(null);
    const [doctorAddress, setDoctorAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeDoctors, setActiveDoctors] = useState([]);
    const [error, setError] = useState(null);
    const [isCheckingRole, setIsCheckingRole] = useState(true);
    const navigate = useNavigate();
    const [hasNFT, setHasNFT] = useState(false);
    const [activeTab, setActiveTab] = useState('records');
    const [recordData, setRecordData] = useState(null);
    const [recordHistory, setRecordHistory] = useState([]);
    const [tokenId, setTokenId] = useState(null);

    const initializeContracts = useCallback(async (provider, signer) => {
        const userRegistryContract = new ethers.Contract(
            userRegistryConfig.address,
            userRegistryConfig.abi,
            provider
        );

        const accessControllerContract = new ethers.Contract(
            PatientDoctorAccessControllerConfig.address,
            PatientDoctorAccessControllerConfig.abi,
            signer || provider
        );

        const ehrContract = new ethers.Contract(
            EHR_NFTConfig.address,
            EHR_NFTConfig.abi,
            signer || provider
        );

        return { userRegistryContract, accessControllerContract, ehrContract };
    }, []);

    const fetchRecordData = useCallback(async (ehrContract, tokenId) => {
        try {
          const [currentURI, historyURIs] = await Promise.all([
            ehrContract.getCurrentDataURI(tokenId),
            ehrContract.getDataHistory(tokenId)
          ]);
          
          // Ensure the URI is properly formatted
          const formattedUri = currentURI.startsWith('ipfs://') ? 
            currentURI : 
            `ipfs://${currentURI}`;
          
          // Fetch current record data
          const gatewayUrl = formattedUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(gatewayUrl);
          
          if (!response.ok) throw new Error('Failed to fetch record data');
          
          const data = await response.json();
          
          setRecordData(data);
          setRecordHistory(historyURIs);
        } catch (error) {
          console.error("Error fetching record data:", error);
          setError(error.message);
        }
      }, []);

    useEffect(() => {
        const checkUserRoleAndNFT = async () => {
            try {
                const { ethereum } = window;
                
                if (!ethereum?.isMetaMask) {
                    alert("Please install MetaMask!");
                    return navigate("/");
                }

                const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                if (!accounts.length) return navigate("/");
                
                setAccount(accounts[0]);
                const provider = new ethers.BrowserProvider(ethereum);
                const signer = await provider.getSigner();
                
                const { userRegistryContract, ehrContract } = await initializeContracts(provider, signer);
                
                // Check role
                const role = await userRegistryContract.getRole(accounts[0]);
                const roleNumber = parseInt(role.toString(), 10);

                if (roleNumber !== ROLES.PATIENT) {
                    alert("Only patients can access this page");
                    return navigate("/");
                }

                // Check NFT status
                const hasMinted = await ehrContract.hasMintedNFT(accounts[0]);
                setHasNFT(hasMinted);
                
                if (hasMinted) {
                    const tokenId = await ehrContract.getTokenId(accounts[0]);
                    setTokenId(tokenId);
                    await fetchRecordData(ehrContract, tokenId);
                }
                
                await fetchActiveDoctors(provider, signer);
            } catch (error) {
                console.error("Initialization error:", error);
                setError(error.message || "Failed to initialize patient dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };

        checkUserRoleAndNFT();
    }, [navigate, initializeContracts, fetchRecordData]);

    const grantAccess = async () => {
        if (!ethers.isAddress(doctorAddress)) {
            setError("Invalid Ethereum address");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract, userRegistryContract, ehrContract } = await initializeContracts(provider, signer);

            const role = await userRegistryContract.getRole(doctorAddress);
            const roleNumber = parseInt(role.toString(), 10);
            
            if (roleNumber !== ROLES.DOCTOR) {
                throw new Error("The address is not a registered doctor");
            }

            // Generate a symmetric key (in a real app, this would be properly encrypted)
            const placeholderKey = ethers.encodeBytes32String("placeholder-symmetric-key");
            
            const tx = await accessControllerContract.grantAccess(
                doctorAddress,
                placeholderKey
            );
            
            await tx.wait();
            await fetchActiveDoctors(provider, signer);
            setDoctorAddress("");
        } catch (error) {
            console.error("Grant access failed:", error);
            setError(error.reason || error.message || "Failed to grant access");
        } finally {
            setLoading(false);
        }
    };

    const revokeAccess = async (doctorAddress) => {
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract } = await initializeContracts(provider, signer);

            const isActive = await accessControllerContract.hasAccess(
                await signer.getAddress(),
                doctorAddress
            );

            if (!isActive) {
                throw new Error("Access was already revoked or never granted");
            }

            const tx = await accessControllerContract.revokeAccess(doctorAddress);
            await tx.wait();
            await fetchActiveDoctors(provider, signer);
            
        } catch (error) {
            console.error("Revoke error:", error);
            setError(error.reason || error.message || "Revocation failed");
        } finally {
            setLoading(false);
        }
    };

    const updateRecord = async (newData) => {
        setLoading(true);
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const { ehrContract } = await initializeContracts(provider, signer);
          
          // Pin new data to IPFS
          const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pinJson}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': account,
            },
            body: JSON.stringify(newData)
          });
          
          if (!response.ok) throw new Error('Failed to pin new record');
          
          const result = await response.json();
          
          // Handle both response formats (IpfsHash or ipfsHash or ipfsUrl)
          const ipfsHash = result.IpfsHash || result.ipfsHash || 
                          (result.ipfsUrl ? result.ipfsUrl.replace('ipfs://', '') : null);
          
          if (!ipfsHash) {
            throw new Error('No IPFS hash received in response');
          }
          
          const ipfsUrl = `ipfs://${ipfsHash}`;
          
          // Update the NFT with new URI
          const tx = await ehrContract.updateDataURI(tokenId, ipfsUrl);
          await tx.wait();
          
          // Refresh data
          await fetchRecordData(ehrContract, tokenId);
        } catch (error) {
          console.error("Update error:", error);
          setError(error.message || "Failed to update record");
        } finally {
          setLoading(false);
        }
      };

    const fetchActiveDoctors = async (provider, signer) => {
        setLoading(true);
        try {
            const { accessControllerContract } = await initializeContracts(provider, signer);
            const patientAddress = await signer.getAddress();
            
            const doctors = await accessControllerContract.getActiveDoctors(patientAddress);
            setActiveDoctors(doctors);
        } catch (error) {
            console.error("Failed to fetch doctors:", error);
            setError(error.message || "Failed to load doctors");
        } finally {
            setLoading(false);
        }
    };

    const shortenAddress = (addr) => {
        return addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";
    };

    if (isCheckingRole) {
        return <div className="patient-dashboard">Verifying access permissions...</div>;
    }

    return (
        <div className="patient-dashboard">
            <div className="top-header">
                <div className="left">Patient Dashboard</div>
                <div className="center">
                    <button 
                        className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
                        onClick={() => setActiveTab('records')}
                    >
                        My Records
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                        onClick={() => setActiveTab('doctors')}
                    >
                        Doctor Access
                    </button>
                    {!hasNFT && (
                        <button 
                            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => setActiveTab('create')}
                        >
                            Create Record
                        </button>
                    )}
                </div>
                <div className="right">Connected: {shortenAddress(account)}</div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button className="dismiss-btn" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            <div className="dashboard-content">
                {activeTab === 'records' && (
                    <div className="records-section">
                        {hasNFT ? (
                            <RecordViewer 
                                currentRecord={recordData}
                                history={recordHistory}
                                onUpdate={updateRecord}
                                loading={loading}
                            />
                        ) : (
                            <div className="no-records">
                                <h2>No Health Records Found</h2>
                                <p>You haven't created a health record NFT yet.</p>
                                <button 
                                    className="create-btn"
                                    onClick={() => setActiveTab('create')}
                                >
                                    Create Health Record
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'doctors' && (
                    <div className="access-control-section">
                        <h2>Manage Doctor Access</h2>
                        <div className="input-group">
                            <input
                                type="text"
                                value={doctorAddress}
                                onChange={(e) => setDoctorAddress(e.target.value)}
                                placeholder="Enter doctor's wallet address"
                                disabled={loading}
                            />
                            <button 
                                className="grant-btn"
                                onClick={grantAccess}
                                disabled={loading || !doctorAddress}
                            >
                                {loading ? "Processing..." : "Grant Access"}
                            </button>
                        </div>

                        <div className="doctor-list">
                            <h3>Authorized Doctors</h3>
                            {activeDoctors.length === 0 ? (
                                <p className="no-doctors">No doctors currently have access</p>
                            ) : (
                                <ul>
                                    {activeDoctors.map((doctor) => (
                                        <li key={doctor}>
                                            <span>{shortenAddress(doctor)}</span>
                                            <button
                                                onClick={() => revokeAccess(doctor)}
                                                disabled={loading}
                                            >
                                                Revoke
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="create-section">
                        <NFTMinter account={account} onMintSuccess={() => {
                            setHasNFT(true);
                            setActiveTab('records');
                        }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientPage;