import { useState } from 'react';
import { ethers } from 'ethers';
import "../styles/components/RecordViewer.css";

const RecordViewer = ({ currentRecord, history, onUpdate, loading }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(currentRecord || {});
    const [viewingHistory, setViewingHistory] = useState(null);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        try {
            await onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed:", error);
            setError(error.message || "Failed to update record");
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown date';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <div className="record-viewer">
            <h2>Your Medical Record</h2>
            
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {viewingHistory ? (
                <div className="history-view">
                    <h3>Record Version from {formatDate(viewingHistory.timestamp)}</h3>
                    <div className="record-data">
                        <div className="record-section">
                            <h4>Patient Information</h4>
                            <p><strong>Name:</strong> {viewingHistory.data.name}</p>
                            <p><strong>Date of Birth:</strong> {viewingHistory.data.birthDate}</p>
                        </div>
                        
                        <div className="record-section">
                            <h4>Medical Information</h4>
                            <p><strong>Blood Type:</strong> {viewingHistory.data.bloodType || 'Not specified'}</p>
                            <p><strong>Conditions:</strong> {viewingHistory.data.conditions || 'None reported'}</p>
                            <p><strong>Medications:</strong> {viewingHistory.data.medications || 'None reported'}</p>
                        </div>
                    </div>
                    <button 
                        className="back-button"
                        onClick={() => setViewingHistory(null)}
                    >
                        Back to Current Record
                    </button>
                </div>
            ) : isEditing ? (
                <form className="record-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3>Patient Information</h3>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                name="name"
                                value={formData.name || ''}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate || ''}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Medical Information</h3>
                        <div className="form-group">
                            <label>Blood Type</label>
                            <select 
                                name="bloodType" 
                                value={formData.bloodType || ''} 
                                onChange={handleInputChange}
                            >
                                <option value="">Select Blood Type</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Medical Conditions</label>
                            <textarea
                                name="conditions"
                                value={formData.conditions || ''}
                                onChange={handleInputChange}
                                placeholder="List any known medical conditions"
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label>Current Medications</label>
                            <textarea
                                name="medications"
                                value={formData.medications || ''}
                                onChange={handleInputChange}
                                placeholder="List current medications"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="save-button"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                            type="button"
                            className="cancel-button"
                            onClick={() => setIsEditing(false)}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="record-display">
                        <div className="record-section">
                            <h3>Patient Information</h3>
                            <p><strong>Name:</strong> {currentRecord.name}</p>
                            <p><strong>Date of Birth:</strong> {currentRecord.birthDate}</p>
                        </div>
                        
                        <div className="record-section">
                            <h3>Medical Information</h3>
                            <p><strong>Blood Type:</strong> {currentRecord.bloodType || 'Not specified'}</p>
                            <p><strong>Conditions:</strong> {currentRecord.conditions || 'None reported'}</p>
                            <p><strong>Medications:</strong> {currentRecord.medications || 'None reported'}</p>
                        </div>
                    </div>

                    <div className="record-actions">
                        <button 
                            className="edit-button"
                            onClick={() => {
                                setFormData(currentRecord);
                                setIsEditing(true);
                            }}
                        >
                            Update Record
                        </button>
                    </div>
                </>
            )}

            {history.length > 0 && !isEditing && !viewingHistory && (
                <div className="version-history">
                    <h3>Version History</h3>
                    <ul>
                    {[...history].reverse().map((uri, index) => (
                        <li key={index}>
                            <button className="version-button" onClick={async () => {
                                try {
                                    const response = await fetch(uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                                    if (!response.ok) throw new Error('Failed to fetch historical record');
                                    const data = await response.json();
                                    setViewingHistory({
                                        data,
                                        timestamp: data.timestamp || uri.split('/').pop()
                                    });
                                } catch (error) {
                                    console.error("Error loading historical record:", error);
                                    setError("Failed to load historical version");
                                }
                            }}>
                                Version {index + 1} - {formatDate(uri.split('/').pop())}
                            </button>
                        </li>
                    ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RecordViewer;