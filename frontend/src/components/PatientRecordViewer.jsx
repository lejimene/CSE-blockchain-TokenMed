import { useState } from 'react';
import "../styles/components/PatientRecordViewer.css";
import { getProvider, getSigner } from "../web3Provider";
// Add at the top of the file
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

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
        
        // Handle common IPFS URI formats
        if (uri.startsWith('ipfs://')) return uri;
        if (uri.startsWith('https://')) {
            const match = uri.match(/ipfs\/([^/]+)/);
            return match ? `ipfs://${match[1]}` : null;
        }
        if (uri.startsWith('Qm') && uri.length > 10) return `ipfs://${uri}`;
        
        return null;
    };
    const validateRecordData = (data) => {
        if (!data || typeof data !== 'object') return false;
        // Ensure required fields exist
        if (!data.name || !data.birthDate) return false;
        return true;
    };
    const PatientInfoSection = ({ data }) => (
        <div className="record-section">
            <h4>Patient Information</h4>
            <p><strong>Name:</strong> {getRecordField(data, 'name')}</p>
            <p><strong>Date of Birth:</strong> {getRecordField(data, 'birthDate')}</p>
        </div>
    );
    
    const MedicalInfoSection = ({ data }) => (
        <div className="record-section">
            <h4>Medical Information</h4>
            <p><strong>Blood Type:</strong> {getRecordField(data, 'bloodType')}</p>
            <p><strong>Conditions:</strong> {getRecordField(data, 'conditions')}</p>
            <p><strong>Medications:</strong> {getRecordField(data, 'medications')}</p>
        </div>
    );
    const ErrorMessage = ({ error, onDismiss }) => (
        <div className="error-message">
            <p>{error}</p>
            <button onClick={onDismiss}>Dismiss</button>
        </div>
    );
    const LoadingSpinner = () => (
        <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );

    const handleViewHistory = async (historyUri) => {
        setLoadingHistory(true);
        setError(null);
        try {
            const normalizedUri = normalizeIpfsUri(historyUri);
            if (!normalizedUri) {
                throw new Error('Invalid IPFS URI format');
            }
    
            // Try multiple gateways if first fails
            const gateways = [
                IPFS_GATEWAY,
                'https://ipfs.io/ipfs/',
                'https://dweb.link/ipfs/'
            ];
    
            let data;
            let lastError;
    
            for (const gateway of gateways) {
                try {
                    const gatewayUrl = normalizedUri.replace('ipfs://', gateway);
                    const response = await fetch(gatewayUrl);
                    
                    if (!response.ok) continue;
                    
                    data = await response.json();
                    if (!data || typeof data !== 'object') continue;
                    
                    break;
                } catch (err) {
                    lastError = err;
                    continue;
                }
            }
    
            if (!data) {
                throw lastError || new Error('All gateways failed to fetch the record');
            }
    
            setViewingHistory({
                ...data,
                // Ensure we have a timestamp
                timestamp: data.timestamp || historyUri.split('/').pop()
            });
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
                    {loadingHistory ? <LoadingSpinner /> : 'Historical Version'}
                </button>
            </div>
    
            <div className="patient-header">
                <h3>Medical Record {tokenId ? `(EHR #${tokenId})` : ''}</h3>
                <p className="patient-address">Patient: {getPatientAddressDisplay()}</p>
            </div>
    
            {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
    
            {loadingHistory ? (
                <LoadingSpinner />
            ) : currentView === 'current' ? (
                <div className="record-display">
                    {record ? (
                        <>
                            <PatientInfoSection data={record} />
                            <MedicalInfoSection data={record} />
                        </>
                    ) : (
                        <p className="no-data">No current record available</p>
                    )}
                </div>
            ) : (
                <div className="history-display">
                    {viewingHistory ? (
                        <>
                            <PatientInfoSection data={viewingHistory} />
                            <MedicalInfoSection data={viewingHistory} />
                            <p className="record-date">Record from: {formatDate(viewingHistory.timestamp)}</p>
                        </>
                    ) : (
                        <p className="no-data">No historical data loaded</p>
                    )}
                </div>
            )}
    
            {history.length > 0 && (
                <div className="version-history">
                    <h4>Version History</h4>
                    <ul>
                        {history
                            .filter(uri => normalizeIpfsUri(uri))
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
                    {import.meta.env.DEV && (
                        <p className="gateway-info">
                            Using IPFS gateway: {IPFS_GATEWAY}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientRecordViewer;