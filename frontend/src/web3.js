import Web3 from "web3";

// Connect to MetaMask or fallback to localhost
const web3 = new Web3(window.ethereum || "http://127.0.0.1:8545");

export default web3;
