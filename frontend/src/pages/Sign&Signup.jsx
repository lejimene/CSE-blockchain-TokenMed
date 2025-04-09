import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { userRegistryConfig} from "../contracts/contracts-config";
import { useNavigate } from "react-router-dom";
import "../styles/pages/Signup&Signin.css";

const Dashboard = () => {
    const [account, setAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null); // null = unregistered, 1 = patient, 2 = doctor
    const [showDoctorPassword, setShowDoctorPassword] = useState(false);
    const [doctorPassword, setDoctorPassword] = useState("");
    const navigate = useNavigate();
    const userRegistryAddress = userRegistryConfig.address 
    const userRegistryABI = userRegistryConfig.abi 


    // Check registration status when account changes
    useEffect(() => {
        const checkRegistration = async () => {
            setIsLoading(true);
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(userRegistryAddress, userRegistryABI , provider);
                
                const role = await contract.getUserRole(account);
                console.log('User Role:', role.toString());
        
                const roleNumber = role.toNumber ? role.toNumber() : parseInt(role.toString(), 10);
                console.log(roleNumber)
                if (roleNumber === 1) {
                    setUserRole(1); // Patient
                } else if (roleNumber === 2) {
                    setUserRole(2); // Doctor
                } else {
                    setUserRole(null); // Unregistered
                }
            } catch (error) {
                console.error("Registration check failed:", error);
                setError("Connect with MetaMask to Continue");
            } finally {
                setIsLoading(false);
            }
        };

        if (account) {
            checkRegistration();
        }
    }, [account]);

    // Redirect user based on role
    useEffect(() => {
        if (userRole === 1) {
            console.log('Redirecting to patient page');
            navigate("/patient");
        } else if (userRole === 2) {
            console.log('Redirecting to doctor page');
            navigate("/doctor");
        }
    }, [userRole, navigate]);

    // Connect wallet handler
    const connectWallet = async () => {
        setIsLoading(true);
        try {
            if (!window.ethereum) throw new Error("Please install MetaMask");

            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            setAccount(accounts[0]);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Registration handlers
    const registerAsPatient = async () => {
        setIsLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(userRegistryAddress, userRegistryABI , signer);
    
            await contract.registerUser(1, "");
    
            setUserRole(1);
            navigate("/patient");
        } catch (error) {
            setError("Patient registration failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const registerAsDoctor = async () => {
        setIsLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(userRegistryAddress, userRegistryABI , signer);
    
            await contract.registerUser(2, doctorPassword);
    
            setUserRole(2);
            navigate("/doctor");
        } catch (error) {
            setError("Doctor registration failed. Ensure password is 'med123'.");
        } finally {
            setIsLoading(false);
        }
    };

    // Shorten address for display
    const shortenAddress = (addr) => {
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    return (
        <div className="dashboard-container">
            <h1>Healthcare Access Portal</h1>
            
            {error && <div className="error">{error}</div>}
            
            {!account ? (
                <button 
                    onClick={connectWallet} 
                    disabled={isLoading}
                    className="connect-btn"
                >
                    {isLoading ? "Connecting..." : "Connect Wallet"}
                </button>
            ) : isLoading ? (
                <p>Checking registration status...</p>
            ) : userRole === null ? (
                <div className="registration-options">
                    <h2>Welcome, {shortenAddress(account)}</h2>
                    <p>You are not registered. Please choose your role:</p>
                    
                    <div className="role-buttons">
                        <button 
                            onClick={registerAsPatient}
                            className="patient-btn"
                        >
                            Register as Patient
                        </button>
                        
                        <button 
                            onClick={() => setShowDoctorPassword(true)}
                            className="doctor-btn"
                        >
                            Register as Doctor
                        </button>
                    </div>
                    
                    {showDoctorPassword && (
                        <div className="doctor-form">
                            <input
                                type="password"
                                value={doctorPassword}
                                onChange={(e) => setDoctorPassword(e.target.value)}
                                placeholder="Enter doctor password (med123)"
                            />
                            <button 
                                onClick={registerAsDoctor}
                                disabled={!doctorPassword}
                            >
                                Confirm Registration
                            </button>
                            <button onClick={() => setShowDoctorPassword(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <p>Redirecting to your dashboard...</p>
            )}
        </div>
    );
};

export default Dashboard;