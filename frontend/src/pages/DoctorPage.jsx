import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { PatientDoctorAccessControllerConfig, userRegistryConfig, EHR_NFTConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/DoctorPage.css";
import PatientRecordViewer from "../components/PatientRecordViewer";
import MedicalRecordEditor from "../components/MedicalRecordEditor";

import { getProvider, getSigner } from "../web3Provider";

const ROLES = {
  UNREGISTERED: 0,
  PATIENT: 1,
  DOCTOR: 2
};

const DoctorPage = () => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activePatients, setActivePatients] = useState([]);
    const [error, setError] = useState(null);
    const [isCheckingRole, setIsCheckingRole] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientRecord, setPatientRecord] = useState(null);
    const [recordHistory, setRecordHistory] = useState([]);
    const [tokenId, setTokenId] = useState(null);
    const navigate = useNavigate();

    const initializeContracts = useCallback(async (provider, signer) => {
        try {
          const network = await provider.getNetwork();
          
          // Use chainId instead of name for more reliable matching
          const contractAddresses = {
            userRegistry: userRegistryConfig[network.chainId]?.address,
            accessController: PatientDoctorAccessControllerConfig[network.chainId]?.address,
            ehr: EHR_NFTConfig[network.chainId]?.address
          };
          
          Object.entries(contractAddresses).forEach(([name, address]) => {
            if (!address || !ethers.isAddress(address)) {
              throw new Error(`Missing or invalid ${name} address for network ID ${network.chainId}`);
            }
          });
      
          return {
            userRegistryContract: new ethers.Contract(
              contractAddresses.userRegistry,
              userRegistryConfig.abi,
              signer || provider
            ),
            accessControllerContract: new ethers.Contract(
              contractAddresses.accessController,
              PatientDoctorAccessControllerConfig.abi,
              signer || provider
            ),
            ehrContract: new ethers.Contract(
              contractAddresses.ehr,
              EHR_NFTConfig.abi,
              signer || provider
            )
          };
        } catch (error) {
          console.error("Contract initialization failed:", error);
          throw new Error(`Failed to initialize contracts: ${error.message}`);
        }
      }, []);

      const fetchPatientRecord = useCallback(async (ehrContract, accessControllerContract, patientAddress) => {
        setLoading(true);
        setError(null);
        
        try {
          // Verify access if we have a signer
          if (accessControllerContract.signer) {
            const hasAccess = await accessControllerContract.hasAccess(
              patientAddress, 
              await accessControllerContract.signer.getAddress()
            );
            if (!hasAccess) throw new Error("Access to this patient's records has been revoked");
          }
      
          const tokenId = await ehrContract.getTokenId(patientAddress);
          if (!tokenId) throw new Error("Patient has no EHR NFT");
          
          setTokenId(tokenId);
          
          const [currentURI, historyURIs] = await Promise.all([
            ehrContract.getCurrentDataURI(tokenId),
            ehrContract.getDataHistory(tokenId)
          ]);
      
          if (!currentURI) throw new Error("No record data available");
      
          const gatewayUrl = currentURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(gatewayUrl);
          
          if (!response.ok) throw new Error('Failed to fetch record data');
          
          const data = await response.json();
          
          if (!data || typeof data !== 'object') {
            throw new Error("Invalid record data format");
          }
      
          setPatientRecord(data);
          setRecordHistory(historyURIs);
        } catch (error) {
          console.error("Error fetching patient record:", error);
          setError(`Failed to load record: ${error.message}`);
          setPatientRecord(null);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        const checkUserRole = async () => {
          try {
            const provider = getProvider();
            let signer;
            let address = account;
      
            try {
              signer = await getSigner();
              address = await signer.getAddress();
              setAccount(address);
            } catch (signerError) {
              if (!address) {
                throw new Error("Wallet connection required");
              }
              // Continue in read-only mode
            }
      
            const { userRegistryContract } = await initializeContracts(provider, signer);
            const role = await userRegistryContract.getRole(address);
            const roleNumber = role.toNumber ? role.toNumber() : Number(role);
      
            if (roleNumber !== ROLES.DOCTOR) {
              return navigate("/");
            }
      
            if (signer) {
              await fetchActivePatients(provider, signer);
            }
          } catch (error) {
            console.error("Initialization error:", error);
            setError(error.message.includes("Wallet connection required")
              ? "Please connect your wallet"
              : "Failed to initialize dashboard");
          } finally {
            setIsCheckingRole(false);
          }
        };
      
        checkUserRole();
      }, [navigate, account]);

    const revokeAccess = async (patientAddress) => {
        if (!window.ethereum) {
            setError("MetaMask required for this action");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const provider = getProvider();
            const signer = await getSigner(); // Required for this action
            const { accessControllerContract } = await initializeContracts(provider, signer);

            const tx = await accessControllerContract.revokeAccess(patientAddress);
            await tx.wait();
            
            // If we're viewing this patient's record, clear it
            if (selectedPatient === patientAddress) {
                setSelectedPatient(null);
                setPatientRecord(null);
            }
            
            await fetchActivePatients(provider, signer);
        } catch (error) {
            console.error("Revoke access failed:", error);
            setError(error.reason || error.message || "Failed to revoke access");
        } finally {
            setLoading(false);
        }
    };

    const fetchActivePatients = async (provider, signer) => {
        setLoading(true);
        provider = getProvider();
        signer = await getSigner(); // This will throw in Infura-only mode
        try {
            if (!provider || !signer) {
                if (!window.ethereum) {
                    throw new Error("Wallet connection required");
                }
                 provider = getProvider();
                 signer = await getSigner(); // Required for this action
            }
            
            const { accessControllerContract } = await initializeContracts(provider, signer);
            const patients = await accessControllerContract.getActivePatients(await signer.getAddress());
            
            setActivePatients(patients);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
            setError(error.message || "Failed to load patients");
        } finally {
            setLoading(false);
        }
    };
    const handleSelectPatient = async (patientAddress) => {
        setLoading(true);
        setError(null);
        try {
            const provider = getProvider();
            const signer = await getSigner(); // Required for this action
            const { ehrContract, accessControllerContract } = await initializeContracts(provider, signer);
            
            // Verify access first
            const hasAccess = await accessControllerContract.hasAccess(patientAddress, await signer.getAddress());
            if (!hasAccess) throw new Error("You no longer have access to this patient's records");
            
            setSelectedPatient(patientAddress);
            await fetchPatientRecord(ehrContract, accessControllerContract, patientAddress);
        } catch (error) {
            console.error("Error selecting patient:", error);
            setError(error.message || "Failed to select patient");
            setSelectedPatient(null);
        } finally {
            setLoading(false);
        }
    };

    const refreshPatientList = async () => {
        setLoading(true);
        try {
            const provider = getProvider();
            const signer = await getSigner(); // Required for this action
            await fetchActivePatients(provider, signer);
        } catch (error) {
            console.error("Refresh failed:", error);
            setError(error.message || "Failed to refresh patient list");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingRole) {
        return (
            <div className="loading-screen">
                <h2>Verifying your doctor status...</h2>
                <p>Please wait while we confirm your role</p>
            </div>
        );
    }

    return (
        <div className="doctor-page-container">
            <header className="doctor-header">
                <div className="logo">MedToken</div>
                <div className="dashboard-title">Doctor Dashboard</div>
                <div className="account-info">
                    {account ? `Dr. ${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Not Connected'}
                </div>
            </header>

            {!account ? (
                <div className="wallet-notice">
                    <p>Please connect your wallet to continue</p>
                    <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <main className="doctor-main">
                    <section className="patients-section">
                        <div className="section-header">
                            <h2>Your Patients</h2>
                            <button 
                                onClick={refreshPatientList} 
                                disabled={loading} 
                                className="refresh-btn"
                            >
                                {loading ? "Refreshing..." : "⟳ Refresh"}
                            </button>
                        </div>

                        {activePatients.length > 0 ? (
                            <div className="patient-list-container">
                                <ul className="patient-list">
                                    {activePatients.map((patient, index) => (
                                        <li 
                                            key={index} 
                                            className={`patient-item ${selectedPatient === patient ? 'active' : ''}`}
                                            onClick={() => handleSelectPatient(patient)}
                                        >
                                            <div className="patient-info">
                                                <span className="patient-id">Patient #{index + 1}</span>
                                                <span className="patient-address">{patient.substring(0, 8)}...{patient.substring(patient.length - 4)}</span>
                                            </div>
                                            <button 
                                                className="revoke-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    revokeAccess(patient);
                                                }}
                                                disabled={loading}
                                            >
                                                Revoke Access
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="no-patients">No patients have granted you access yet</p>
                        )}
                    </section>

                    <section className="record-section">
                        {selectedPatient ? (
                            patientRecord ? (
                                <PatientRecordViewer 
                                    record={patientRecord} 
                                    history={recordHistory}
                                    patientAddress={selectedPatient}
                                    tokenId={tokenId}
                                />
                            ) : (
                                <div className="loading-record">
                                    <p>Loading patient record...</p>
                                </div>
                            )
                        ) : (
                            <div className="no-patient-selected">
                                <h3>Select a patient to view their medical records</h3>
                                <p>Click on a patient from the list to view their EHR</p>
                            </div>
                        )}
                    </section>
                    {selectedPatient && patientRecord && (
                        <section className="editor-section">
                            <MedicalRecordEditor 
                                tokenId={tokenId} 
                                patientAddress={selectedPatient}
                                ehrData={patientRecord}
                                onRecordUpdated={async () => {
                                    const provider = new ethers.BrowserProvider(window.ethereum);
                                    const signer = await provider.getSigner();
                                    await initializeContracts(provider, signer).then(({ ehrContract, accessControllerContract }) => {
                                        fetchPatientRecord(ehrContract, accessControllerContract, selectedPatient);
                                    });
                                }}
                            />
                        </section>
                        )}

                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                            <button 
                                onClick={() => setError(null)}
                                className="dismiss-btn"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </main>
            )}
        </div>
    );
};

export default DoctorPage;