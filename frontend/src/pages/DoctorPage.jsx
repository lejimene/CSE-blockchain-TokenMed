import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { doctorPatientAccessConfig, userRegistryConfig } from "../contracts/contracts-config";
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
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const { doctorPatientAccessContract, userRegistryContract } = await initializeContracts(provider, null);

            // Verify the address is a registered patient
            const patientRole = await userRegistryContract.getUserRole(patientAddress);
            if (Number(patientRole) !== 1) {
                throw new Error("The address is not a registered patient");
            }

            const status = await doctorPatientAccessContract.hasAccessToPatient(account, patientAddress);
            setAccessStatus(status);
        } catch (error) {
            console.error("Access check failed:", error);
            setError(error.message || "Failed to check access status");
        } finally {
            setLoading(false);
        }
    };

    // Fetch patients
    const fetchMyPatients = async () => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const { doctorPatientAccessContract } = await initializeContracts(provider, null);

            const patients = await doctorPatientAccessContract.getActivePatientAccess();
            setMyPatients(patients);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
            setError("Failed to load patient list");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access
    const revokeAccess = async (address) => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { doctorPatientAccessContract } = await initializeContracts(provider, signer);

            const tx = await doctorPatientAccessContract.updateAccessStatus(
                address,
                account,
                false // isGranted
            );
            await tx.wait();
            
            if (address === patientAddress) {
                setAccessStatus(false);
            }
            await fetchMyPatients();
        } catch (error) {
            console.error("Revoke access failed:", error);
            setError(error.reason || "Failed to revoke access");
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
        <div className="doctor-dashboard">
            <h1>Doctor Dashboard</h1>

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
                                    <button
                                        onClick={() => revokeAccess(patientAddress)}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Revoke Access"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="my-patients">
                        <h2>Patients With Access</h2>
                        <button onClick={fetchMyPatients} disabled={loading}>
                            {loading ? "Refreshing..." : "Refresh List"}
                        </button>

                        {myPatients.length > 0 ? (
                            <ul>
                                {myPatients.map((patient, index) => (
                                    <li key={index}>
                                        <p>Patient: {patient.patientAddress}</p>
                                        <p>Since: {new Date(patient.grantTimestamp * 1000).toLocaleString()}</p>
                                        <button 
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
                    </div>

                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                            <button onClick={() => setError(null)}>Dismiss</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DoctorPage;