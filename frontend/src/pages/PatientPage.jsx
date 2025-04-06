import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { patientDoctorAccessConfig } from "../contracts/contracts-config";
import { userRegistryConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/PatientPage.css";

const PatientPage = () => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [doctorAddress, setDoctorAddress] = useState("");
    const [accessStatus, setAccessStatus] = useState(null);
    const [myDoctors, setMyDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const PatDocAccessAdress = patientDoctorAccessConfig.address
    const PatDocAccessABI = patientDoctorAccessConfig.abi

    const userRegistryAddress = userRegistryConfig.address 
    const userRegistryABI = userRegistryConfig.abi 

    // Initialize contract and check wallet connection
    useEffect(() => {
        async function init() {
            if (window.ethereum) {
                try {
                    // Request account access
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setAccount(accounts[0]);
                    
                    // Setup provider and contract
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const contractInstance = new ethers.Contract(PatDocAccessAdress, PatDocAccessABI, signer);
                    setContract(contractInstance);

                    // Listen for account changes
                    window.ethereum.on('accountsChanged', (accounts) => {
                        setAccount(accounts[0]);
                    });

                } catch (err) {
                    console.error("Error connecting to MetaMask:", err);
                    setError("Failed to connect to wallet");
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

    // Check access status for a specific doctor
    const checkAccessStatus = async (doctorAddr) => {
        if (!contract || !account) return;
        
        setLoading(true);
        try {
            const hasAccess = await contract.hasAccessToPatient(doctorAddr, account);
            setAccessStatus(hasAccess);
            setError("");
        } catch (err) {
            console.error("Error checking access status:", err);
            setError("Failed to check access status");
        } finally {
            setLoading(false);
        }
    };

    // Get all doctors who have access to this patient
    const fetchMyDoctors = async () => {
        if (!contract || !account) return;
        
        setLoading(true);
        try {
            // Note: You might need to adjust this based on your actual contract functions
            // This assumes you have a way to get all doctors with access
            const doctors = await contract.getActivePatientAccess(account);
            setMyDoctors(doctors);
            setError("");
        } catch (err) {
            console.error("Error fetching doctors:", err);
            setError("Failed to fetch your doctors");
        } finally {
            setLoading(false);
        }
    };

    // Grant access to a doctor
    const grantAccess = async () => {
        if (!contract || !doctorAddress) return;
        
        setLoading(true);
        try {
            // Note: This assumes you have a function in PatientDoctorAccess to request access
            const tx = await contract.requestAccess(doctorAddress);
            await tx.wait();
            setError("");
            alert("Access request sent successfully");
            fetchMyDoctors(); // Refresh the list
        } catch (err) {
            console.error("Error granting access:", err);
            setError("Failed to grant access");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access from a doctor
    const revokeAccess = async (doctorAddr) => {
        if (!contract || !doctorAddr) return;
        
        setLoading(true);
        try {
            // Note: This assumes you have a function in PatientDoctorAccess to revoke access
            const tx = await contract.revokeAccess(doctorAddr);
            await tx.wait();
            setError("");
            alert("Access revoked successfully");
            fetchMyDoctors(); // Refresh the list
        } catch (err) {
            console.error("Error revoking access:", err);
            setError("Failed to revoke access");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="patient-dashboard">
            <h1>Patient Dashboard</h1>
            
            {!account ? (
                <div className="wallet-notice">
                    <p>Please connect your wallet to continue</p>
                    <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <>
                    <div className="wallet-info">
                        <p>Connected as: {account}</p>
                    </div>

                    <div className="access-control">
                        <h2>Manage Doctor Access</h2>
                        <div className="input-group">
                            <input
                                type="text"
                                value={doctorAddress}
                                onChange={(e) => setDoctorAddress(e.target.value)}
                                placeholder="Enter doctor's address"
                            />
                            <button 
                                onClick={() => checkAccessStatus(doctorAddress)}
                                disabled={loading || !doctorAddress}
                            >
                                {loading ? "Checking..." : "Check Access"}
                            </button>
                        </div>

                        {accessStatus !== null && (
                            <div className="access-status">
                                <p>Access Status: {accessStatus ? "Granted" : "Not Granted"}</p>
                                {accessStatus ? (
                                    <button 
                                        onClick={() => revokeAccess(doctorAddress)}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Revoke Access"}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={grantAccess}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Grant Access"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="my-doctors">
                        <h2>Doctors With Access</h2>
                        <button onClick={fetchMyDoctors} disabled={loading}>
                            {loading ? "Loading..." : "Refresh List"}
                        </button>
                        
                        {myDoctors.length > 0 ? (
                            <ul>
                                {myDoctors.map((doctor, index) => (
                                    <li key={index}>
                                        <p>Doctor Address: {doctor.patientAddress}</p>
                                        <p>Access Granted: {new Date(doctor.grantTimestamp * 1000).toLocaleString()}</p>
                                        <button onClick={() => revokeAccess(doctor.patientAddress)}>
                                            Revoke Access
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No doctors currently have access to your records</p>
                        )}
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </>
            )}
        </div>
    );
};

export default PatientPage;