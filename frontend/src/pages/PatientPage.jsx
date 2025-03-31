import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "../contracts/UserAccessRegistry";
import { useNavigate } from "react-router-dom";

const PatientPage = () => {
    const [account, setAccount] = useState(null);
    const [ehrData, setEhrData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        checkIfPatient();
    }, []);

    const checkIfPatient = async () => {
        // Changed to BrowserProvider (v6 equivalent of Web3Provider)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        // Added await since getSigner() is now async in v6
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        const userRole = await contract.getUserRole(address);
        if (userRole !== 1) navigate("/");
    };

    const fetchEHR = async () => {
        // Changed to BrowserProvider
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const metadataURI = await contract.getEHR(account);
        setEhrData(metadataURI);
    };

    return (
        <div>
            <h1>Patient Dashboard</h1>
            <button onClick={fetchEHR}>Load My EHR</button>
            {ehrData && <p>Metadata URI: {ehrData}</p>}
        </div>
    );
};

export default PatientPage;