import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { doctorPatientAccessConfig } from "../contracts/contracts-config";
import { userRegistryConfig } from "../contracts/contracts-config";
import "../styles/pages/DoctorPage.css";

const DoctorPage = () => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [userRegistry, setUserRegistry] = useState(null);
    const [patientAddress, setPatientAddress] = useState("");
    const [accessStatus, setAccessStatus] = useState(null);
    const [myPatients, setMyPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isDoctor, setIsDoctor] = useState(false);
    const [roleChecked, setRoleChecked] = useState(false);

    const DoctPatAccAddress = doctorPatientAccessConfig.address
    const DoctPatAccABI = doctorPatientAccessConfig.abi

    const userRegistryAddress = userRegistryConfig.address 
    const userRegistryABI = userRegistryConfig.abi 

    // Initialize contracts and check wallet connection
    useEffect(() => {
        async function init() {
            if (window.ethereum) {
                try {
                    // Request account access
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setAccount(accounts[0]);
                    
                    // Setup provider
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();

                    // Initialize UserAccessRegistry
                    const userRegistryInstance = new ethers.Contract(
                        userRegistryAddress, 
                        userRegistryABI, 
                        signer
                    );
                    setUserRegistry(userRegistryInstance);

                    // Check user role
                    const role = await userRegistryInstance.getUserRole(accounts[0]);
                    setIsDoctor(role === 2); // 2 = Doctor role in your enum
                    setRoleChecked(true);

                    // Only initialize DoctorPatientAccess if user is a doctor
                    if (role === 2) {
                        const contractInstance = new ethers.Contract(
                            DoctPatAccAddress, 
                            DoctPatAccABI, 
                            signer
                        );
                        setContract(contractInstance);
                        fetchMyPatients(contractInstance, accounts[0]);
                    }

                    // Listen for account changes
                    window.ethereum.on('accountsChanged', async (newAccounts) => {
                        setAccount(newAccounts[0]);
                        const newRole = await userRegistryInstance.getUserRole(newAccounts[0]);
                        setIsDoctor(newRole === 2);
                        if (newRole === 2) {
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            const signer = await provider.getSigner();
                            const contractInstance = new ethers.Contract(
                                DoctPatAccAddress, 
                                DoctPatAccABI, 
                                signer
                            );
                            setContract(contractInstance);
                            fetchMyPatients(contractInstance, newAccounts[0]);
                        } else {
                            setContract(null);
                            setMyPatients([]);
                        }
                    });

                } catch (err) {
                    console.error("Initialization error:", err);
                    setError("Failed to initialize application");
                }
            } else {
                setError("Please install MetaMask to use this application");
            }
        }

        init();

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
        };
    }, []);

    // Get all patients this doctor has access to
    const fetchMyPatients = async (contractInstance, doctorAddress) => {
        if (!contractInstance || !doctorAddress) return;
        
        setLoading(true);
        try {
            const activePatients = await contractInstance.getActivePatientAccess(doctorAddress);
            setMyPatients(activePatients);
            setError("");
        } catch (err) {
            console.error("Error fetching patients:", err);
            setError("Failed to fetch your patients. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Check if doctor has access to a specific patient
    const checkAccessStatus = async () => {
        if (!contract || !account || !userRegistry || !patientAddress) return;
        
        setLoading(true);
        try {
            // Verify the address is a registered patient
            const patientRole = await userRegistry.getUserRole(patientAddress);
            if (patientRole !== 1) { // 1 = Patient role in your enum
                throw new Error("The address is not a registered patient");
            }

            const hasAccess = await contract.hasAccessToPatient(account, patientAddress);
            setAccessStatus(hasAccess);
            setError("");
        } catch (err) {
            console.error("Error checking access:", err);
            setError(err.message || "Failed to check access status");
            setAccessStatus(null);
        } finally {
            setLoading(false);
        }
    };

    // Grant access to a patient (through PatientDoctorAccess contract)
    const grantAccess = async () => {
        if (!contract || !account || !patientAddress) return;
        
        setLoading(true);
        try {
            const tx = await contract.updateAccessStatus(
                patientAddress, 
                account, 
                true // isGranted
            );
            await tx.wait();
            
            // Refresh data
            setAccessStatus(true);
            fetchMyPatients(contract, account);
            setError("");
        } catch (err) {
            console.error("Error granting access:", err);
            setError(err.message || "Failed to grant access");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access from a patient
    const revokeAccess = async (patientAddr) => {
        if (!contract || !account || !patientAddr) return;
        
        setLoading(true);
        try {
            const tx = await contract.updateAccessStatus(
                patientAddr, 
                account, 
                false // isGranted
            );
            await tx.wait();
            
            // Refresh data
            if (patientAddr === patientAddress) {
                setAccessStatus(false);
            }
            fetchMyPatients(contract, account);
            setError("");
        } catch (err) {
            console.error("Error revoking access:", err);
            setError(err.message || "Failed to revoke access");
        } finally {
            setLoading(false);
        }
    };

    if (!window.ethereum) {
        return (
            <div className="doctor-dashboard">
                <h1>Doctor Dashboard</h1>
                <div className="error-message">
                    Please install MetaMask to use this application
                </div>
            </div>
        );
    }

    if (!roleChecked) {
        return (
            <div className="doctor-dashboard">
                <h1>Doctor Dashboard</h1>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isDoctor) {
        return (
            <div className="doctor-dashboard">
                <h1>Doctor Dashboard</h1>
                <div className="role-notice">
                    <p>Your account is not registered as a doctor</p>
                    <p>Please register as a doctor first using the correct password</p>
                </div>
            </div>
        );
    }

    return (
        <div className="doctor-dashboard">
            <h1>Doctor Dashboard</h1>
            
            <div className="wallet-info">
                <p>Connected as Doctor: {account}</p>
            </div>

            <div className="access-control">
                <h2>Manage Patient Access</h2>
                <div className="input-group">
                    <input
                        type="text"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        placeholder="Enter patient's wallet address"
                        disabled={loading}
                    />
                    <button 
                        onClick={checkAccessStatus}
                        disabled={loading || !patientAddress}
                    >
                        {loading ? "Checking..." : "Check Access"}
                    </button>
                </div>

                {accessStatus !== null && (
                    <div className="access-status">
                        <p>Access Status: {accessStatus ? "Granted" : "Not Granted"}</p>
                        <div className="action-buttons">
                            {accessStatus ? (
                                <button 
                                    onClick={() => revokeAccess(patientAddress)}
                                    disabled={loading}
                                    className="revoke-btn"
                                >
                                    {loading ? "Processing..." : "Revoke Access"}
                                </button>
                            ) : (
                                <button 
                                    onClick={grantAccess}
                                    disabled={loading}
                                    className="grant-btn"
                                >
                                    {loading ? "Processing..." : "Grant Access"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="my-patients">
                <h2>Your Patients</h2>
                <button 
                    onClick={() => fetchMyPatients(contract, account)} 
                    disabled={loading}
                    className="refresh-btn"
                >
                    {loading ? "Refreshing..." : "Refresh List"}
                </button>
                
                {myPatients.length > 0 ? (
                    <div className="patients-list">
                        {myPatients.map((patient, index) => (
                            <div key={index} className="patient-card">
                                <div className="patient-info">
                                    <p className="patient-address">
                                        Patient: {patient.patientAddress}
                                    </p>
                                    <p className="access-time">
                                        Access granted: {new Date(patient.grantTimestamp * 1000).toLocaleString()}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => revokeAccess(patient.patientAddress)}
                                    disabled={loading}
                                    className="revoke-btn"
                                >
                                    Revoke Access
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-patients">No patients have granted you access</p>
                )}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
        </div>
    );
};

export default DoctorPage;