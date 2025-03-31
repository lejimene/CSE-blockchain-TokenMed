import { useState, useEffect } from "react";
import { ethers } from "ethers";  // This imports the main ethers object
import { contractAddress, contractABI } from "../contracts/UserAccessRegistry";
import { useNavigate } from "react-router-dom";

const DoctorPage = () => {
    const [account, setAccount] = useState(null);
    const [patients, setPatients] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        checkIfDoctor();
    }, []);

    const checkIfDoctor = async () => {
        // Changed to use BrowserProvider (equivalent to Web3Provider in v5)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        const userRole = await contract.getUserRole(address);
        if (userRole !== 2) navigate("/");
    };

    const fetchPatients = async () => {
        // Changed to use BrowserProvider
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const doctorPatients = await contract.getPatientsForDoctor(account);
        setPatients(doctorPatients);
    };

    return (
        <div>
            <h1>Doctor Dashboard</h1>
            <button onClick={fetchPatients}>Load Patients</button>
            <ul>
                {patients.map((patient, index) => (
                    <li key={index}>{patient}</li>
                ))}
            </ul>
        </div>
    );
};

export default DoctorPage;