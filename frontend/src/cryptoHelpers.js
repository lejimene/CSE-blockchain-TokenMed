// Convert between ArrayBuffer and Base64
function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Serialize/deserialize keys for blockchain storage
function serializeKeyForBlockchain(key) {
    return JSON.stringify(key);
}

function deserializeKeyFromBlockchain(keyString) {
    return JSON.parse(keyString);
}

module.exports = {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    serializeKeyForBlockchain,
    deserializeKeyFromBlockchain
};