import { useState } from 'react';
import "../styles/components/PatientRecordViewer.css";

const PatientRecordViewer = ({ record, history = [], patientAddress, tokenId }) => {
    const [viewingHistory, setViewingHistory] = useState(null);
    const [currentView, setCurrentView] = useState('current');
    const [error, setError] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown date';
        try {
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? timestamp : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return timestamp;
        }
    };

    const normalizeIpfsUri = (uri) => {
        if (!uri) return null;
        if (uri.includes('undefined')) return null;
        if (uri.startsWith('ipfs://')) return uri;
        if (uri.startsWith('Qm')) return `ipfs://${uri}`;
        return null;
    };

    const handleViewHistory = async (historyUri) => {
        setLoadingHistory(true);
        setError(null);
        try {
            const normalizedUri = normalizeIpfsUri(historyUri);
            if (!normalizedUri) {
                throw new Error('Invalid IPFS URI format');
            }

            const gatewayUrl = normalizedUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const response = await fetch(gatewayUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid record data format');
            }

            setViewingHistory(data);
            setCurrentView('history');
        } catch (error) {
            console.error("Error loading historical record:", error);
            setError(`Failed to load record: ${error.message}`);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Safely get patient address display
    const getPatientAddressDisplay = () => {
        if (!patientAddress) return 'Unknown patient';
        return `${patientAddress.substring(0, 8)}...${patientAddress.substring(patientAddress.length - 4)}`;
    };

    // Safely get record field
    const getRecordField = (data, field) => {
        if (!data) return 'Not available';
        return data[field] || 'None reported';
    };

    return (
        <div className="patient-record-viewer">
            <div className="view-switcher">
                <button 
                    className={`view-btn ${currentView === 'current' ? 'active' : ''}`}
                    onClick={() => setCurrentView('current')}
                    disabled={!record}
                >
                    Current Record
                </button>
                <button 
                    className={`view-btn ${currentView === 'history' ? 'active' : ''}`}
                    onClick={() => setCurrentView('history')}
                    disabled={!viewingHistory}
                >
                    {loadingHistory ? 'Loading...' : 'Historical Version'}
                </button>
            </div>

            <div className="patient-header">
                <h3>Medical Record {tokenId ? `(EHR #${tokenId})` : ''}</h3>
                <p className="patient-address">Patient: {getPatientAddressDisplay()}</p>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {currentView === 'current' ? (
                <div className="record-display">
                    {record ? (
                        <>
                            <div className="record-section">
                                <h4>Patient Information</h4>
                                <p><strong>Name:</strong> {getRecordField(record, 'name')}</p>
                                <p><strong>Date of Birth:</strong> {getRecordField(record, 'birthDate')}</p>
                            </div>
                            
                            <div className="record-section">
                                <h4>Medical Information</h4>
                                <p><strong>Blood Type:</strong> {getRecordField(record, 'bloodType')}</p>
                                <p><strong>Conditions:</strong> {getRecordField(record, 'conditions')}</p>
                                <p><strong>Medications:</strong> {getRecordField(record, 'medications')}</p>
                            </div>
                        </>
                    ) : (
                        <p className="no-data">No current record available</p>
                    )}
                </div>
            ) : (
                <div className="history-display">
                    {viewingHistory ? (
                        <>
                            <div className="record-section">
                                <h4>Patient Information</h4>
                                <p><strong>Name:</strong> {getRecordField(viewingHistory, 'name')}</p>
                                <p><strong>Date of Birth:</strong> {getRecordField(viewingHistory, 'birthDate')}</p>
                            </div>
                            
                            <div className="record-section">
                                <h4>Medical Information</h4>
                                <p><strong>Blood Type:</strong> {getRecordField(viewingHistory, 'bloodType')}</p>
                                <p><strong>Conditions:</strong> {getRecordField(viewingHistory, 'conditions')}</p>
                                <p><strong>Medications:</strong> {getRecordField(viewingHistory, 'medications')}</p>
                            </div>
                            <p className="record-date">Record from: {formatDate(viewingHistory.timestamp)}</p>
                        </>
                    ) : (
                        <p className="no-data">No historical data loaded</p>
                    )}
                </div>
            )}

            {history.length > 0 ? (
                <div className="version-history">
                    <h4>Version History</h4>
                    <ul>
                        {history
                            .filter(uri => normalizeIpfsUri(uri)) // Filter out invalid URIs
                            .map((uri, index) => (
                                <li key={index}>
                                    <button
                                        className="version-btn"
                                        onClick={() => handleViewHistory(uri)}
                                        disabled={loadingHistory}
                                    >
                                        Version {history.length - index} - {formatDate(uri.split('/').pop())}
                                    </button>
                                </li>
                            ))
                        }
                    </ul>
                </div>
            ) : (
                <p className="no-history">No version history available</p>
            )}
        </div>
    );
};

export default PatientRecordViewer;