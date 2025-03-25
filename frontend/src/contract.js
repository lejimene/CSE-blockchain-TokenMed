import { ethers } from "ethers";
import EHRNFT from "./contracts/EHRNFT.json";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your contract address

export async function connectToContract() {
  if (typeof window.ethereum !== "undefined") {
    // Use the new BrowserProvider instead of Web3Provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, EHRNFT.abi, signer);
    return contract;
  } else {
    alert("Please install MetaMask!");
  }
}