import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { PatientDoctorAccessControllerConfig, userRegistryConfig, EHR_NFTConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/DoctorPage.css";
import PatientRecordViewer from "../components/PatientRecordViewer";
import MedicalRecordEditor from "../components/MedicalRecordEditor";

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

    const fetchPatientRecord = useCallback(async (ehrContract, accessControllerContract, patientAddress) => {
        try {
          const tokenId = await ehrContract.getTokenId(patientAddress);
          if (!tokenId) throw new Error("Patient has no EHR NFT");
          
          setTokenId(tokenId);
          
          // Get current data URI and history
          const [currentURI, historyURIs] = await Promise.all([
            ehrContract.getCurrentDataURI(tokenId),
            ehrContract.getDataHistory(tokenId)
          ]);
      
          // Validate and format the URI
          const formattedUri = currentURI.startsWith('ipfs://') ? 
            currentURI : 
            currentURI ? `ipfs://${currentURI}` : null;
          
          if (!formattedUri) {
            throw new Error("Invalid IPFS URI format");
          }
      
          // Fetch record data from IPFS
          const gatewayUrl = formattedUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(gatewayUrl);
          
          if (!response.ok) throw new Error('Failed to fetch record data');
          
          const data = await response.json();
          
          // Validate the data structure
          if (!data || (typeof data !== 'object')) {
            throw new Error("Invalid record data format");
          }
      
          setPatientRecord(data);
          setRecordHistory(historyURIs);
          
          return true;
        } catch (error) {
          console.error("Error fetching patient record:", error);
          setError(`Failed to load patient record: ${error.message}`);
          return false;
        }
      }, []);

    useEffect(() => {
        const checkUserRole = async () => {
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
                const { userRegistryContract } = await initializeContracts(provider, signer);

                const role = await userRegistryContract.getRole(accounts[0]);
                const roleNumber = role.toNumber ? role.toNumber() : Number(role);

                if (roleNumber !== ROLES.DOCTOR) {
                    alert("Only doctors can access this page");
                    return navigate("/");
                }

                await fetchActivePatients(provider, signer);
            } catch (error) {
                console.error("Initialization error:", error);
                setError("Failed to initialize doctor dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };

        checkUserRole();
    }, [navigate, initializeContracts]);

    const revokeAccess = async (patientAddress) => {
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
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
        try {
            if (!provider || !signer) {
                const { ethereum } = window;
                provider = new ethers.BrowserProvider(ethereum);
                signer = await provider.getSigner();
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
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
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
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
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