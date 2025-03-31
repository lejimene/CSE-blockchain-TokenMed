import { ethers } from "ethers";
import contractABI from "../contracts/EHRNFT.json";  // Import ABI from the contracts folder

const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';  // Replace with your actual contract address

export const getContract = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      // Request access to the user's wallet
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      return contract;
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      throw new Error("Unable to connect to MetaMask");
    }
  } else {
    console.error("MetaMask not detected");
    throw new Error("MetaMask not installed");
  }
};
