const { ethers } = require("hardhat");

async function main() {
  // 1. Get the contract instance
  const ehrNft = await ethers.getContractAt(
    "EHR_NFT",
    process.env.MY_NFT_ADDRESS // Make sure this is set in .env
  );

  // 2. Use a plain address (not ENS name)
  const recipient = "0x17cbB08C41e85e8B39d63bF9Ec9611bc41014f52"; // Replace with actual address
  
  // 3. Use your IPFS URI from Pinata
  const tokenURI = "ipfs://bafybeib6a6drnuvjpwhsbnd6nbvuqshmmiwjifxcmmj4obsy3zkg6uhc6e"; // Your actual metadata CID

  // 4. Mint the NFT
  console.log(`Minting NFT to ${recipient}...`);
  const tx = await ehrNft.mintNFT(recipient, tokenURI);
  await tx.wait();

  console.log(`✅ NFT minted! Transaction hash: ${tx.hash}`);
  console.log(`View NFT: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});