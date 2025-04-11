import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { patientDoctorAccessConfig, doctorPatientAccessConfig, userRegistryConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/PatientPage.css";

const PatientPage = () => {
    const [account, setAccount] = useState(null);
    const [doctorAddress, setDoctorAddress] = useState("");
    const [accessStatus, setAccessStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [myDoctors, setMyDoctors] = useState([]);
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

        const patientDoctorAccessContract = new ethers.Contract(
            patientDoctorAccessConfig.address,
            patientDoctorAccessConfig.abi,
            signer || provider
        );

        return { userRegistryContract, patientDoctorAccessContract };
    }, []);

    // Check user role on load
    useEffect(() => {
        const checkUserRole = async () => {
            try {
                const { ethereum } = window;
                
                // 1. First check if MetaMask is installed
                if (!ethereum?.isMetaMask) {
                    alert("Please install MetaMask!");
                    return navigate("/");
                }
    
                // 2. Wait for provider to be ready
                if (!ethereum.selectedAddress) {
                    await new Promise(resolve => {
                        const checkAddress = () => {
                            if (ethereum.selectedAddress) {
                                ethereum.removeListener('accountsChanged', checkAddress);
                                resolve();
                            }
                        };
                        ethereum.on('accountsChanged', checkAddress);
                    });
                }
    
                // 3. Get accounts with a timeout fallback
                const accounts = await Promise.race([
                    ethereum.request({ method: 'eth_requestAccounts' }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Provider timeout')), 3000)
                    )
                ]);
    
                if (!accounts.length) {
                    return navigate("/");
                }
                setAccount(accounts[0]);
    
                // 4. Initialize provider with error handling
                let provider;
                try {
                    provider = new ethers.BrowserProvider(ethereum);
                } catch (e) {
                    console.error("Provider init error:", e);
                    throw new Error("Failed to connect to wallet");
                }
    
                const signer = await provider.getSigner();
                const { userRegistryContract } = await initializeContracts(provider, signer);
    
                // 5. Verify role - FIXED: Using accounts[0] instead of doctorAddress
                const role = await userRegistryContract.getUserRole(accounts[0]);
                const roleNumber = role.toNumber ? role.toNumber() : Number(role);
    
                if (roleNumber !== 1) { // 1 = Patient
                    alert("Only patients can access this page");
                    return navigate("/");
                }
    
                // 6. Load doctors with retry logic
                let retries = 3;
                while (retries > 0) {
                    try {
                        await fetchMyDoctors();
                        break;
                    } catch (fetchError) {
                        console.error(`Fetch failed (${retries} retries left):`, fetchError);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
    
            } catch (error) {
                console.error("Initialization error:", error);
                setError(error.message || "Failed to initialize patient dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };
    
        // Add delay for provider initialization
        const initTimer = setTimeout(() => {
            checkUserRole();
        }, 500); // Short delay to ensure provider injection
    
        return () => clearTimeout(initTimer);
    }, [navigate, initializeContracts]);

    // Check access status
    const checkAccessStatus = async (doctorAddress) => {
        if (!ethers.isAddress(doctorAddress)) {
            setError("Invalid Ethereum address");
            return;
        }

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { patientDoctorAccessContract, userRegistryContract } = await initializeContracts(provider, signer);

            // Verify the address is a registered doctor
            const doctorRole = await userRegistryContract.getUserRole(doctorAddress);
            const DoctorNumber = doctorRole.toNumber ? doctorRole.toNumber() : parseInt(doctorRole.toString(), 10);
            if (DoctorNumber !== 2) {
                throw new Error("The address is not a registered doctor");
            }

            const status = await patientDoctorAccessContract.hasAccess(account, doctorAddress);
            setAccessStatus(status);
        } catch (error) {
            console.error("Access check failed:", error);
            setError(error.message || "Failed to check access status");
        } finally {
            setLoading(false);
        }
    };

    // Grant access to doctor
    const grantAccess = async () => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { patientDoctorAccessContract, userRegistryContract } = await initializeContracts(provider, signer);

            // Verify the address is a registered doctor
            const doctorRole = await userRegistryContract.getUserRole(doctorAddress);
            const DoctorNumber = doctorRole.toNumber ? doctorRole.toNumber() : parseInt(doctorRole.toString(), 10);
            if (DoctorNumber !== 2) {
                throw new Error("The address is not a registered doctor");
            }

            const tx = await patientDoctorAccessContract.grantDoctorAccess(doctorAddress);
            await tx.wait();
            setAccessStatus(true);
            await fetchMyDoctors();
        } catch (error) {
            console.error("Grant access failed:", error);
            setError(error.reason || error.message || "Failed to grant access");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access from doctor
    const revokeAccess = async (address) => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { patientDoctorAccessContract } = await initializeContracts(provider, signer);

            const tx = await patientDoctorAccessContract.revokeDoctorAccess(address);
            await tx.wait();
            setAccessStatus(false);
            await fetchMyDoctors();
        } catch (error) {
            console.error("Revoke access failed:", error);
            setError(error.reason || "Failed to revoke access");
        } finally {
            setLoading(false);
        }
    };

    // Fetch list of authorized doctors
    const fetchMyDoctors = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Get current provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();
    
            // 2. Initialize contract with signer
            const { patientDoctorAccessContract } = await initializeContracts(provider, signer);
    
            // 3. Verify patient role (double-check)
            const { userRegistryContract } = await initializeContracts(provider, signer);
            const role = await userRegistryContract.getUserRole(currentAddress);
            if (Number(role) !== 1) {
                throw new Error("Connected wallet is not registered as patient");
            }
    
            // 4. Call getAllAuthorizations with CURRENT address (not account state)
            const allDoctors = await patientDoctorAccessContract.getAllAuthorizations(currentAddress, {
                gasLimit: 500000
            });
    
            // 5. Properly decode struct response
            const formattedDoctors = allDoctors.map(doctor => ({
                doctorAddress: doctor[0],
                grantTimestamp: Number(doctor[1]),
                isActive: doctor[2]
            }));
    
            // 6. Filter and update state
            const activeDoctors = formattedDoctors.filter(doctor => doctor.isActive);
            setMyDoctors(activeDoctors);
    
        } catch (error) {
            console.error("Doctor fetch error:", error);
            setError(error.reason || error.message || "Failed to load doctors");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingRole) {
        return (
            <div className="loading-screen">
                <h2>Verifying your patient status...</h2>
                <p>Please wait while we confirm your role</p>
            </div>
        );
    }

    return (
        <div className="patient-dashboard">
            <header className="top-header">
                <div className="left">TokenMed</div>
                <div className="center">Patient Dashboard</div>
                <div className="right">
                    <span>User : {account}</span>
                </div>
            </header>

            <div className="wallet-info">
                {!account ? (
                    <div className="wallet-notice">
                        <p>Please connect your wallet to continue</p>
                        <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="dashboard-main">
                            <div className="access-control">
                                <h2>Manage Doctor Access</h2>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={doctorAddress}
                                        onChange={(e) => setDoctorAddress(e.target.value)}
                                        placeholder="Enter doctor's 0x address"
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
                                )}
                            </div>

                            <div className="my-doctors">
                                <h2>Doctors With Access</h2>
                                <button 
                                    onClick={fetchMyDoctors} 
                                    disabled={loading}
                                    className="refresh-btn"
                                >
                                    {loading ? "Refreshing..." : "Refresh List"}
                                </button>

                                {myDoctors.length > 0 ? (
                                    <ul className="doctor-list">
                                        {myDoctors.map((doctor, index) => (
                                            <li key={index} className="doctor-item">
                                                <div className="doctor-info">
                                                    <p className="doctor-address">Doctor: {doctor.doctorAddress}</p>
                                                    <p className="access-time">
                                                        Date and Time access was granted: {new Date(doctor.grantTimestamp * 1000).toLocaleString()}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => revokeAccess(doctor.doctorAddress)}
                                                    disabled={loading}
                                                    className="revoke-btn"
                                                >
                                                    Revoke
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-doctors">No doctors have access to your records</p>
                                )}
                            </div>
                        </div>

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
                    </>
                )}
            </div>
        </div>
    );
};

export default PatientPage;