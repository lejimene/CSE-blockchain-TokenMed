const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const EHRNFT = await hre.ethers.getContractFactory("EHRNFT");
  const ehrNFT = await EHRNFT.deploy(owner.address);

  await ehrNFT.waitForDeployment(); // Wait for the deployment to complete

  console.log("EHRNFT deployed to:", await ehrNFT.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});