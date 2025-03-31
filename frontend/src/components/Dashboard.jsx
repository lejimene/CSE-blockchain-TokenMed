import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "../contracts/UserAccessRegistry";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const [account, setAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null); // null = unregistered, 1 = patient, 2 = doctor
    const [showDoctorPassword, setShowDoctorPassword] = useState(false);
    const [doctorPassword, setDoctorPassword] = useState("");
    const navigate = useNavigate();

    // Check registration status when account changes
    useEffect(() => {
        const checkRegistration = async () => {
            setIsLoading(true);
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(contractAddress, contractABI, provider);
                
                // Get the user role from the contract using getUserRole
                const role = await contract.getUserRole(account);
                console.log('User Role:', role.toString()); // Convert the BigNumber to string for logging
        
                // Convert role to a regular number for comparison
                const roleNumber = role.toNumber ? role.toNumber() : parseInt(role.toString(), 10);
        
                if (roleNumber === 1) {
                    setUserRole(1); // Patient
                } else if (roleNumber === 2) {
                    setUserRole(2); // Doctor
                } else {
                    setUserRole(null); // Unregistered
                }
            } catch (error) {
                console.error("Registration check failed:", error);
                setError("Connect with MetaMask to Cotinue");
            } finally {
                setIsLoading(false);
            }
        };

        checkRegistration();
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
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
            // Call registerUser with role = 1 (Patient) and empty string as password
            await contract.registerUser(1, "");
    
            setUserRole(1); // Update state to reflect patient role
            navigate("/patient"); // Redirect to patient page
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
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
            // Call registerUser with role = 2 (Doctor) and the password
            await contract.registerUser(2, doctorPassword);
    
            setUserRole(2); // Update state to reflect doctor role
            navigate("/doctor"); // Redirect to doctor page
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
            
            <style jsx>{`
                .dashboard-container {
                    max-width: 600px;
                    margin: 2rem auto;
                    padding: 2rem;
                    text-align: center;
                }
                .error {
                    color: red;
                    margin: 1rem 0;
                }
                .connect-btn {
                    background: #f5841f;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                }
                .registration-options {
                    margin-top: 2rem;
                }
                .role-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin: 1.5rem 0;
                }
                .patient-btn {
                    background: #4CAF50;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .doctor-btn {
                    background: #2196F3;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .doctor-form {
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: center;
                }
                .doctor-form input {
                    padding: 0.5rem;
                    width: 200px;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
