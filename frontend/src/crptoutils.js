// No interfaces needed in JS - just document shapes in comments

/**
 * Generate ECDH key pair
 * @returns {Promise<{publicKey: JsonWebKey, privateKey: JsonWebKey}>}
 */
export async function generateECDHKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
      {
          name: "ECDH",
          namedCurve: "P-384"
      },
      true,
      ["deriveKey", "deriveBits"]
  );

  return {
      publicKey: await window.crypto.subtle.exportKey("jwk", keyPair.publicKey),
      privateKey: await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
  };
}

/**
* Generate AES-GCM symmetric key
* @returns {Promise<JsonWebKey>}
*/
export async function generateAESKey() {
  const key = await window.crypto.subtle.generateKey(
      {
          name: "AES-GCM",
          length: 256
      },
      true,
      ["encrypt", "decrypt"]
  );
  return await window.crypto.subtle.exportKey("jwk", key);
}

/**
* Encrypted data structure
* @typedef {Object} EncryptedData
* @property {string} iv - Initialization Vector (base64)
* @property {string} ciphertext - Encrypted data (base64)
*/