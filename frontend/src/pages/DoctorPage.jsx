import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { PatientDoctorAccessControllerConfig, userRegistryConfig } from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/DoctorPage.css";

const DoctorPage = () => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activePatients, setActivePatients] = useState([]);
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

        const accessControllerContract = new ethers.Contract(
            PatientDoctorAccessControllerConfig.address,
            PatientDoctorAccessControllerConfig.abi,
            signer || provider
        );

        return { userRegistryContract, accessControllerContract };
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
                const roleNumber = role.toNumber ? role.toNumber() : Number(role);

                if (roleNumber !== 2) { // 2 = Doctor role
                    alert("Only doctors can access this page");
                    return navigate("/");
                }

                await fetchActivePatients();
            } catch (error) {
                console.error("Initialization error:", error);
                setError("Failed to initialize doctor dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };

        checkUserRole();
    }, [navigate, initializeContracts]);

    // Revoke access from patient
    const revokeAccess = async (patientAddress) => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract } = await initializeContracts(provider, signer);

            const tx = await accessControllerContract.doctorRevokeAccess(patientAddress);
            await tx.wait();
            await fetchActivePatients();
        } catch (error) {
            console.error("Revoke access failed:", error);
            setError(error.reason || "Failed to revoke access");
        } finally {
            setLoading(false);
        }
    };

    // Fetch active patients
    const fetchActivePatients = async () => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract } = await initializeContracts(provider, signer);

            const patients = await accessControllerContract.getActivePatientsForDoctor();
            setActivePatients(patients);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
            setError(error.message || "Failed to load patients");
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
                    <section className="patients-section">
                        <h2>Patients Who Granted You Access</h2>
                        <button 
                            onClick={fetchActivePatients} 
                            disabled={loading} 
                            className="refresh-btn"
                        >
                            {loading ? "Refreshing..." : "Refresh List"}
                        </button>

                        {activePatients.length > 0 ? (
                            <ul className="patient-list">
                                {activePatients.map((patient, index) => (
                                    <li key={index} className="patient-item">
                                        <div className="patient-info">
                                            <p className="patient-address">Patient: {patient}</p>
                                        </div>
                                        <button 
                                            className="revoke-btn"
                                            onClick={() => revokeAccess(patient)}
                                            disabled={loading}
                                        >
                                            Revoke Access
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-patients">No patients have granted you access yet</p>
                        )}
                    </section>

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