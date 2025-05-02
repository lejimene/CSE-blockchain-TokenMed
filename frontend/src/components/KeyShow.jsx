import { useState } from "react";
import "../styles/components/KeyShow.css";

const KeyShow = ({ keys, onClose }) => {
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [showAESKey, setShowAESKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const keyText = [
            `🔑 Public Key (ECDH): ${keys.publicKey}`,
            `🔒 Private Key (ECDH): ${showPrivateKey ? keys.privateKey : '[HIDDEN]'}`,
            `🔐 Symmetric Key (AES): ${showAESKey ? keys.aesKey.k : '[HIDDEN]'}`
        ].join('\n\n');
        
        navigator.clipboard.writeText(keyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>🔑 Save Your Keys Securely</h3>
                <p className="warning-text">
                    These cryptographic keys cannot be recovered if lost. Store them in a password manager or other secure location.
                </p>

                <div className="key-section">
                    <h4>Public Key (ECDH - shareable):</h4>
                    <div className="key-display">
                        {keys.publicKey}
                    </div>
                    <p className="key-description">Used for secure key exchange</p>
                </div>

                <div className="key-section">
                    <div className="private-key-header">
                        <h4>Private Key (ECDH - keep secret!):</h4>
                        <label className="toggle-private">
                            <input
                                type="checkbox"
                                checked={showPrivateKey}
                                onChange={() => setShowPrivateKey(!showPrivateKey)}
                            />
                            {showPrivateKey ? 'Hide' : 'Show'}
                        </label>
                    </div>
                    {showPrivateKey && (
                        <div className="key-display private">
                            {keys.privateKey}
                        </div>
                    )}
                    <p className="key-description">Used for decrypting messages and deriving keys</p>
                </div>

                <div className="key-section">
                    <div className="private-key-header">
                        <h4>Symmetric Key (AES - most sensitive!):</h4>
                        <label className="toggle-private">
                            <input
                                type="checkbox"
                                checked={showAESKey}
                                onChange={() => setShowAESKey(!showAESKey)}
                            />
                            {showAESKey ? 'Hide' : 'Show'}
                        </label>
                    </div>
                    {showAESKey ? (
                        <div className="key-display private">
                            <div className="aes-key-value">{keys.aesKey.k}</div>
                            <p className="key-note">
                                <strong>Note:</strong> This is your encryption key. Store it like a password.
                            </p>
                        </div>
                    ) : (
                        <div className="key-display redacted">
                            ••••••••••••••••••••••••••••••••
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={handleCopy} className="copy-button">
                        {copied ? 'Copied!' : 'Copy Visible Keys'}
                    </button>
                    <button onClick={onClose} className="confirm-button">
                        I've Saved My Keys
                    </button>
                </div>

            </div>
        </div>
    );
};

export default KeyShow;