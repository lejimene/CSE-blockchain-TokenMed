/**
 * Decrypt data with AES-GCM
 */
async function decryptData(encrypted, symmetricKey) {
    const key = await window.crypto.subtle.importKey(
        "jwk",
        symmetricKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToArrayBuffer(encrypted.iv)
        },
        key,
        base64ToArrayBuffer(encrypted.ciphertext)
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Decrypt doctor's encrypted symmetric key
 */
async function decryptDoctorKey(encryptedKey, sharedSecret) {
    const { iv, ciphertext } = JSON.parse(encryptedKey);
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToArrayBuffer(iv)
        },
        sharedSecret,
        base64ToArrayBuffer(ciphertext)
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
}

module.exports = {
    decryptData,
    decryptDoctorKey
};