import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { PatientDoctorAccessControllerConfig, userRegistryConfig , EHR_NFTConfig} from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/PatientPage.css";
import NFTMinter from '../components/Minting';

const PatientPage = () => {
    const [account, setAccount] = useState(null);
    const [doctorAddress, setDoctorAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeDoctors, setActiveDoctors] = useState([]);
    const [error, setError] = useState(null);
    const [isCheckingRole, setIsCheckingRole] = useState(true);
    const navigate = useNavigate();
    const [doctorDetails, setDoctorDetails] = useState({});



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

    console.log("Current account:", account);

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

                if (roleNumber !== 1) { // 1 = Patient
                    alert("Only patients can access this page");
                    return navigate("/");
                }

                await fetchActiveDoctors();
            } catch (error) {
                console.error("Initialization error:", error);
                setError(error.message || "Failed to initialize patient dashboard");
            } finally {
                setIsCheckingRole(false);
            }
        };

        checkUserRole();
    }, [navigate, initializeContracts]);


    // Grant access to doctor
    const grantAccess = async () => {
        if (!ethers.isAddress(doctorAddress)) {
            setError("Invalid Ethereum address");
            return;
        }

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract, userRegistryContract } = await initializeContracts(provider, signer);

            // Verify the address is a registered doctor
            const doctorRole = await userRegistryContract.getUserRole(doctorAddress);
            const roleNumber = doctorRole.toNumber ? doctorRole.toNumber() : Number(doctorRole);
            if (roleNumber !== 2) {
                throw new Error("The address is not a registered doctor");
            }

            const tx = await accessControllerContract.patientGrantAccess(doctorAddress);
            await tx.wait();
            await fetchActiveDoctors();
            setDoctorAddress("");
        } catch (error) {
            console.error("Grant access failed:", error);
            setError(error.reason || error.message || "Failed to grant access");
        } finally {
            setLoading(false);
        }
    };

    // Revoke access from doctor
    const revokeAccess = async (doctorAddress) => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                PatientDoctorAccessControllerConfig.address,
                PatientDoctorAccessControllerConfig.abi,
                signer
            );

            // Get access details with proper BigInt handling
            const [isActive, grantTime, revokeTime] = await contract.getAccessDetails(await signer.getAddress(), doctorAddress);
            
            // Convert BigInt to Number for comparison
            const hasExistingAccess = grantTime !== 0n; // 0n is BigInt zero
            
            if (!hasExistingAccess) {
                throw new Error("No access relationship exists with this doctor");
            }
            if (!isActive) {
                throw new Error("Access was already revoked");
            }

            // Execute revoke
            const tx = await contract.patientRevokeAccess(doctorAddress);
            await tx.wait();
            await fetchActiveDoctors();
            
        } catch (error) {
            console.error("Revoke error:", error);
            setError(error.message || "Revocation failed");
        } finally {
            setLoading(false);
        }
    };

    // Fetch active doctors
    const fetchActiveDoctors = async () => {
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { accessControllerContract } = await initializeContracts(provider, signer);

            const doctors = await accessControllerContract.getActiveDoctorsForPatient();
            setActiveDoctors(doctors);
        } catch (error) {
            console.error("Failed to fetch doctors:", error);
            setError(error.message || "Failed to load doctors");
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
                            <NFTMinter account={account} />
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
                                        onClick={grantAccess}
                                        disabled={loading || !doctorAddress}
                                    >
                                        {loading ? "Processing..." : "Grant Access"}
                                    </button>
                                </div>
                            </div>

                            <div className="my-doctors">
                                <h2>Doctors With Access</h2>
                                <button 
                                    onClick={fetchActiveDoctors} 
                                    disabled={loading}
                                    className="refresh-btn"
                                >
                                    {loading ? "Refreshing..." : "Refresh List"}
                                </button>

                                {activeDoctors.length > 0 ? (
                                    <ul className="doctor-list">
                                        {activeDoctors.map((doctor, index) => (
                                            <li key={index} className="doctor-item">
                                                <div className="doctor-info">
                                                    <p className="doctor-address">Doctor: {doctor}</p>
                                                </div>
                                                <button 
                                                    onClick={() => revokeAccess(doctor)}
                                                    disabled={loading}
                                                    className="revoke-btn"
                                                >
                                                    Revoke Access
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