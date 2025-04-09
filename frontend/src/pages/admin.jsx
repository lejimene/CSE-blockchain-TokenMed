import { useState } from "react";
import { ethers } from "ethers";
import { 
  patientDoctorAccessConfig, 
  doctorPatientAccessConfig 
} from "../contracts/contracts-config";
import "../styles/pages/admin.css";

// Password for admin functions (simple implementation for demo purposes)
const ADMIN_PASSWORD = "admin123";

const AdminPage = () => {
    const [password, setPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState({
        patientDoctor: false,
        doctorPatient: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
        setError("");
        
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            checkInitializationStatus();
        } else {
            setError("Invalid admin password");
        }
    };

    const checkInitializationStatus = async () => {
        setIsLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Check PatientDoctorAccess initialization
            const patientDoctorContract = new ethers.Contract(
                patientDoctorAccessConfig.address,
                patientDoctorAccessConfig.abi,
                signer
            );
            const patientDoctorAddress = await patientDoctorContract.doctorPatientAccess();
            
            // Check DoctorPatientAccess initialization
            const doctorPatientContract = new ethers.Contract(
                doctorPatientAccessConfig.address,
                doctorPatientAccessConfig.abi,
                signer
            );
            const doctorPatientAddress = await doctorPatientContract.patientDoctorAccess();
            
            setInitializationStatus({
                patientDoctor: patientDoctorAddress !== ethers.ZeroAddress,
                doctorPatient: doctorPatientAddress !== ethers.ZeroAddress
            });
        } catch (err) {
            setError(`Error checking status: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const initializeContracts = async () => {
        if (password !== ADMIN_PASSWORD) {
            setError("Authentication required");
            return;
        }

        setIsLoading(true);
        setError("");
        
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Initialize PatientDoctorAccess
            const patientDoctorContract = new ethers.Contract(
                patientDoctorAccessConfig.address,
                patientDoctorAccessConfig.abi,
                signer
            );
            const tx1 = await patientDoctorContract.setDoctorPatientAccess(doctorPatientAccessConfig.address);
            await tx1.wait();
            
            // Initialize DoctorPatientAccess
            const doctorPatientContract = new ethers.Contract(
                doctorPatientAccessConfig.address,
                doctorPatientAccessConfig.abi,
                signer
            );
            const tx2 = await doctorPatientContract.setPatientDoctorAccess(patientDoctorAccessConfig.address);
            await tx2.wait();
            
            // Update status
            setInitializationStatus({
                patientDoctor: true,
                doctorPatient: true
            });
        } catch (err) {
            setError(`Initialization failed: ${err.reason || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <h2>Admin Login</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter admin password"
                        required
                    />
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Processing..." : "Login"}
                    </button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <h2>Admin Dashboard</h2>
            
            <div className="contract-status">
                <h3>Contract Initialization Status</h3>
                <p>
                    PatientDoctorAccess: {initializationStatus.patientDoctor ? 
                    <span className="success">Initialized</span> : 
                    <span className="warning">Not Initialized</span>}
                </p>
                <p>
                    DoctorPatientAccess: {initializationStatus.doctorPatient ? 
                    <span className="success">Initialized</span> : 
                    <span className="warning">Not Initialized</span>}
                </p>
            </div>
            
            {(!initializationStatus.patientDoctor || !initializationStatus.doctorPatient) && (
                <div className="initialization-section">
                    <button 
                        onClick={initializeContracts} 
                        disabled={isLoading}
                    >
                        {isLoading ? "Initializing..." : "Initialize Contracts"}
                    </button>
                    {error && <p className="error">{error}</p>}
                </div>
            )}
        </div>
    );
};

export default AdminPage;