import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { doctorPatientAccessConfig,patientDoctorAccessConfig, userRegistryConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/DoctorPage.css";

const DoctorPage = () => {
    const [account, setAccount] = useState(null);
    const [patientAddress, setPatientAddress] = useState("");
    const [accessStatus, setAccessStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [myPatients, setMyPatients] = useState([]);
    const [error, setError] = useState(null);
    const [isCheckingRole, setIsCheckingRole] = useState(true);
    const navigate = useNavigate();

    // Initialize contracts
    const initializeContracts = useCallback(async (provider, signer) => {
        const userRegistryContract = new ethers.Contract(
            userRegistryConfig.address,
            userRegistryConfig.abi,
            provider
        );

        const doctorPatientAccessContract = new ethers.Contract(
            doctorPatientAccessConfig.address,
            doctorPatientAccessConfig.abi,
            signer || provider
        );

        return { userRegistryContract, doctorPatientAccessContract };
    }, []);

    // Check user role on load
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

                const role = await userRegistryContract.getUserRole(accounts[0]);
                const roleNumber = Number(role);

                if (roleNumber !== 2) { // 2 = Doctor role
                    alert("Only doctors can access this page");
                    return navigate("/");
                }

                // Load patients immediately after role verification
                await fetchMyPatients();
            } catch (error) {
                console.error("Initialization error:", error);
                setError("Failed to initialize doctor dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };

        checkUserRole();
    }, [navigate, initializeContracts]);

    // Check access status
    const checkAccessStatus = async (patientAddress) => {
        if (!ethers.isAddress(patientAddress)) {
            setError("Invalid Ethereum address");
            return;
        }
    
        setLoading(true);
        setError(null);
        
        try {
            // 1. Get current provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();
    
            // 2. Initialize contracts WITH signer
            const { doctorPatientAccessContract, userRegistryContract } = await initializeContracts(provider, signer);
    
            // 3. Verify patient role
            const patientRole = await userRegistryContract.getUserRole(patientAddress);
            if (Number(patientRole) !== 1) {
                throw new Error("The address is not a registered patient");
            }
    
            // 4. Check access - use CURRENT address (not React state)
            const status = await doctorPatientAccessContract.hasAccessToPatient(
                currentAddress, // Use signer's address
                patientAddress,
                { gasLimit: 500000 }
            );
            
            setAccessStatus(status);
        } catch (error) {
            console.error("Access check failed:", error);
            setError(error.reason || error.message || "Failed to check access status");
        } finally {
            setLoading(false);
        }
    };

    // Fetch patients
    const fetchMyPatients = async () => {
        setLoading(true);
        setError(null); // Reset previous errors
        
        try {
            // 1. Get current provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();
    
            // 2. Initialize contract WITH signer
            const { doctorPatientAccessContract } = await initializeContracts(provider, signer);
    
            // 3. Fetch patients with gas limit
            const patients = await doctorPatientAccessContract.getActivePatientAccess({
                gasLimit: 500000 // Prevents out-of-gas
            });
    
            // 4. Decode struct array if needed (check console.log first)
            console.log("Raw patients data:", patients); // Inspect structure
            
            // If patients are returned as [address, timestamp, bool] arrays:
            const formattedPatients = patients.map(patient => ({
                patientAddress: patient[0],          // Array index 0
                grantTimestamp: Number(patient[1]),  // Index 1 (convert BigNumber)
                isActive: patient[2]                 // Index 2
            }));
    
            setMyPatients(formattedPatients);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
            setError(error.reason || error.message || "Failed to load patient list");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access
    const revokeAccess = async (patientAddress) => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Get current provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();
    
            // 2. Initialize PATIENT'S contract (PatientDoctorAccess)
            const patientDoctorAccessContract = new ethers.Contract(
                patientDoctorAccessConfig.address, // Use PatientDoctorAccess address
                patientDoctorAccessConfig.abi,
                signer
            );
    
            // 3. Call revokeDoctorAccess on PatientDoctorAccess
            const tx = await patientDoctorAccessContract.revokeDoctorAccess(
                currentAddress, // Doctor's address (the one being revoked)
                { gasLimit: 500000 }
            );
            
            await tx.wait();
            
            // 4. Update UI
            setAccessStatus(false);
            await fetchMyPatients();
        } catch (error) {
            console.error("Revoke access failed:", error);
            setError(error.reason || error.message || "Failed to revoke access");
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
                <div className="logo">TokenMed</div>
                <div className="dashboard-title">Doctor Dashboard</div>
                <div className="account-info">
                    {account ? <span>Connected as: {account}</span> : <span>Not Connected</span>}
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
                    <section className="access-section">
                        <h2>Manage Patient Access</h2>
                        <div className="input-group">
                            <input
                                type="text"
                                value={patientAddress}
                                onChange={(e) => setPatientAddress(e.target.value)}
                                placeholder="Enter patient's 0x address"
                            />
                            <button
                                onClick={() => checkAccessStatus(patientAddress)}
                                disabled={loading || !patientAddress}
                            >
                                {loading ? "Checking..." : "Check Access"}
                            </button>
                        </div>

                        {accessStatus !== null && (
                            <div className="access-status">
                                <p>Access Status: {accessStatus ? "Granted" : "Not Granted"}</p>
                                {accessStatus && (
                                    <button className="revoke_btn"
                                        onClick={() => revokeAccess(patientAddress)}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Revoke Access"}
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="patients-section">
                        <h2>Patients With Access</h2>
                        <button onClick={fetchMyPatients} disabled={loading} className="refresh-btn">
                            {loading ? "Refreshing..." : "Refresh List"}
                        </button>

                        {myPatients.length > 0 ? (
                            <ul>
                            {myPatients.map((patient, index) => (
                              <li key={index} className="patient-item">
                                <div className="patient-details">
                                  <p className="patient-address">Patient: {patient.patientAddress}</p>
                                  <p className="patient-date">
                                    Date and Time access was granted: {new Date(patient.grantTimestamp * 1000).toLocaleString()}
                                  </p>
                                </div>
                                <button 
                                  className="revoke-btn"
                                  onClick={() => revokeAccess(patient.patientAddress)}
                                  disabled={loading}
                                >
                                  Revoke
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                            <p>No patients have granted you access</p>
                        )}
                    </section>
                </main>
            )}
        </div>
    );
};

export default DoctorPage;