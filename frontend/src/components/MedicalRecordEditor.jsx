import { useState } from "react";
import { ethers } from "ethers";
import { EHR_NFTConfig, PatientDoctorAccessControllerConfig } from "../contracts/contracts-config";
import { API_CONFIG } from '../config/api';
import "../styles/components/MedicalRecordEditor.css";
import { getProvider, getSigner } from "../web3Provider";

const MedicalRecordEditor = ({ tokenId, patientAddress, ehrData, onRecordUpdated }) => {

    if (!ehrData) {
        return <div>Loading medical record...</div>;
    }

    const [formData, setFormData] = useState({
        conditions: ehrData.conditions || "",
        medications: ehrData.medications || "",
        bloodType: ehrData.bloodType || "",
        notes: ""
    });

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validateInput = () => {
        const { conditions, medications, bloodType, notes } = formData;
        if (!conditions || !medications || !bloodType) {
            throw new Error("Conditions, medications, and blood type are required.");
        }
        if (
            conditions.length > 500 ||
            medications.length > 500 ||
            bloodType.length > 10 ||
            notes.length > 2000
        ) {
            throw new Error("One or more fields exceed allowed length.");
        }
    };

    const pinToIPFS = async (data) => {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pinJson}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': patientAddress || 'unknown',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to pin to IPFS');
        }

        return `ipfs://${result.IpfsHash}`;
    };

    const uploadUpdatedRecord = async () => {
        validateInput();

        const updatedRecord = {
            ...ehrData,
            ...formData,
            updatedAt: new Date().toISOString()
        };

        const dataURI = await pinToIPFS(updatedRecord);

        const metadata = {
            name: `Medical Record for ${ehrData.name}`,
            description: `EHR - Updated ${new Date().toISOString()}`,
            image: "ipfs://static-ehr-image", // Update with actual image URI
            external_url: "https://ehr-platform.example.com", // Update accordingly
            attributes: [
                { trait_type: "Blood Type", value: formData.bloodType },
                { trait_type: "Record Type", value: "Medical EHR" }
            ],
            properties: {
                patient_data: {
                    name: ehrData.name,
                    birthDate: ehrData.birthDate,
                    bloodType: formData.bloodType,
                    conditions: formData.conditions,
                    medications: formData.medications,
                    notes: formData.notes,
                    ipfs: dataURI,
                    timestamp: new Date().toISOString()
                }
            }
        };

        const metadataURI = await pinToIPFS(metadata);

        return { dataURI, metadataURI };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        setError(null);
    
        try {
            if (!tokenId || !patientAddress) {
                throw new Error("Token ID and patient address are required");
            }
    
            // Get signer (with connected wallet) and instantiate contracts
            const signer = await getSigner();
            const signerAddress = await signer.getAddress();
            const network = await signer.provider.getNetwork();
    
            const ehrAddress = EHR_NFTConfig[Number(network.chainId)]?.address;
            const accessAddress = PatientDoctorAccessControllerConfig[Number(network.chainId)]?.address;

            if (!ehrAddress || !accessAddress) {
                throw new Error(`Contracts not deployed on ${getNetworkName(network.chainId)}`);
            }

            // Instantiate contracts
            const ehrContract = new ethers.Contract(
                ehrAddress,
                EHR_NFTConfig.abi,
                signer
            );
    
            const accessContract = new ethers.Contract(
                accessAddress,
                PatientDoctorAccessControllerConfig.abi,
                signer
            );
    
    
            // Verify doctor has permission to update this patient's record
            const hasAccess = await accessContract.hasAccess(patientAddress, signerAddress);
    
            if (!hasAccess) {
                throw new Error("Access denied to update this record.");
            }
    
            // Upload updated data and metadata to IPFS
            const { dataURI, metadataURI } = await uploadUpdatedRecord();
    
            // Send on-chain updates
            const tx1 = await ehrContract.updateDataURI(tokenId, dataURI);
            await tx1.wait();
    
            const tx2 = await ehrContract.setMetadataURI(tokenId, metadataURI);
            await tx2.wait();
    
            // Clear notes and trigger refresh
            setFormData((prev) => ({ ...prev, notes: "" }));
            onRecordUpdated?.();
        } catch (err) {
            console.error(err);
            setError(err.message || "Update failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="record-editor">
            <h3>Edit Medical Information</h3>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Conditions*</label>
                    <input
                        name="conditions"
                        value={formData.conditions}
                        onChange={handleChange}
                        maxLength={500}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Medications*</label>
                    <input
                        name="medications"
                        value={formData.medications}
                        onChange={handleChange}
                        maxLength={500}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Blood Type*</label>
                    <input
                        name="bloodType"
                        value={formData.bloodType}
                        onChange={handleChange}
                        maxLength={10}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Notes</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        maxLength={2000}
                        rows={4}
                    />
                </div>

                <button
                    type="submit"
                    className="submit-button"
                    disabled={uploading}
                >
                    {uploading ? "Updating..." : "Submit Update"}
                </button>
            </form>
        </div>
    );
};

export default MedicalRecordEditor;
