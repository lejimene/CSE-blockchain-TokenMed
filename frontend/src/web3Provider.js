// src/utils/web3Provider.js
import { ethers } from "ethers";

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.InfuraProvider(
    import.meta.env.VITE_NETWORK || "sepolia",
    import.meta.env.VITE_INFURA_ID
  );
};

export const getSigner = async () => {
  const provider = getProvider();

  // For non-browser environments (like Infura), no signer is available
  if (!window.ethereum) {
    throw new Error("No signer available in read-only mode");
  }

  return await provider.getSigner();
};
