/**
 * Derive shared secret between patient and doctor
 */
async function deriveSharedSecret(privateKeyJwk, publicKeyJwk) {
    const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        { name: "ECDH", namedCurve: "P-384" },
        false,
        ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        { name: "ECDH", namedCurve: "P-384" },
        false,
        []
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: publicKey
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt data with AES-GCM
 */
async function encryptData(data, symmetricKey) {
    const key = await window.crypto.subtle.importKey(
        "jwk",
        symmetricKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        encoded
    );

    return {
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertext)
    };
}

/**
 * Encrypt symmetric key with shared secret (for doctor access)
 */
async function encryptSymmetricKey(symmetricKey, sharedSecret) {
    const keyData = JSON.stringify(symmetricKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(keyData);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        sharedSecret,
        encoded
    );

    return JSON.stringify({
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertext)
    });
}

module.exports = {
    deriveSharedSecret,
    encryptData,
    encryptSymmetricKey
};