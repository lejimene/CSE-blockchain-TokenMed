import { useState } from "react";
import { ethers } from "ethers";
import { EHR_NFTConfig } from "../contracts/contracts-config";
import "../styles/components/MedicalRecordEditor.css";
import { API_CONFIG } from '../config/api';

const MedicalRecordEditor = ({ tokenId, patientAddress, onRecordUpdated }) => {
    const [formData, setFormData] = useState({
        diagnosis: "",
        prescription: "",
        notes: ""
    });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validateRecordData = (data) => {
        if (!data.diagnosis || !data.prescription) {
            throw new Error("Diagnosis and prescription are required");
        }
        if (data.diagnosis.length > 500 || data.prescription.length > 500 || data.notes?.length > 2000) {
            throw new Error("Input exceeds maximum length");
        }
    };

    const uploadToIPFS = async (recordData) => {
        try {
            validateRecordData(recordData);

            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pinJson}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-wallet-address": patientAddress,
                },
                body: JSON.stringify({
                    record: {
                        ...recordData,
                        updatedAt: new Date().toISOString(),
                        patientAddress
                    }
                })
            });
        
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to pin JSON to IPFS");
            }

            const result = await response.json();
            
            // Handle both response formats
            const ipfsHash = result.IpfsHash || result.ipfsHash;
            if (!ipfsHash) {
                throw new Error("Invalid IPFS response - missing hash");
            }

            return `ipfs://${ipfsHash}`;
        } catch (error) {
            console.error("IPFS Upload Error:", error);
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        setError(null);

        try {
            if (!tokenId) throw new Error("No token ID provided");
            if (!patientAddress) throw new Error("Patient address required");
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const ehrContract = new ethers.Contract(
                EHR_NFTConfig.address,
                EHR_NFTConfig.abi,
                signer
            );

            // Verify the doctor still has access
            const hasAccess = await ehrContract.hasAccess(patientAddress, await signer.getAddress());
            if (!hasAccess) {
                throw new Error("You no longer have access to update this record");
            }

            const recordData = {
                ...formData,
                updatedBy: await signer.getAddress(),
                timestamp: new Date().toISOString()
            };

            const newRecordURI = await uploadToIPFS(recordData);

            // Validate the URI before sending to blockchain
            if (!newRecordURI.startsWith('ipfs://') || newRecordURI.includes('undefined')) {
                throw new Error("Invalid IPFS URI generated");
            }

            const tx = await ehrContract.updateEHR(tokenId, newRecordURI);
            const receipt = await tx.wait();

            if (receipt.status !== 1) {
                throw new Error("Transaction failed");
            }

            // Clear form on success
            setFormData({
                diagnosis: "",
                prescription: "",
                notes: ""
            });

            onRecordUpdated?.();
        } catch (err) {
            console.error("Record update failed:", err);
            setError(err.reason || err.message || "Failed to update record");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="record-editor">
            <h3>Update Medical Record</h3>
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Diagnosis*</label>
                    <input 
                        name="diagnosis" 
                        onChange={handleChange} 
                        value={formData.diagnosis} 
                        required 
                        maxLength={500}
                    />
                </div>

                <div className="form-group">
                    <label>Prescription*</label>
                    <input 
                        name="prescription" 
                        onChange={handleChange} 
                        value={formData.prescription} 
                        required 
                        maxLength={500}
                    />
                </div>

                <div className="form-group">
                    <label>Notes</label>
                    <textarea 
                        name="notes" 
                        onChange={handleChange} 
                        value={formData.notes} 
                        maxLength={2000}
                        rows={4}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={uploading || !formData.diagnosis || !formData.prescription}
                    className="submit-button"
                >
                    {uploading ? (
                        <>
                            <span className="spinner"></span>
                            Updating...
                        </>
                    ) : "Submit Update"}
                </button>
            </form>
        </div>
    );
};

export default MedicalRecordEditor;