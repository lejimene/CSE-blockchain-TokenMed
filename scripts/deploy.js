// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const UserAccessRegistry = await hre.ethers.getContractFactory("UserAccessRegistry");
  const contract = await UserAccessRegistry.deploy();

  await contract.waitForDeployment();
  
  console.log(`
    Contract deployed to: ${contract.target}
    
    To verify in console:
    npx hardhat console --network localhost
    > const contract = await ethers.getContractAt("UserAccessRegistry", "${contract.target}")
    > await contract.getUserRole("YOUR_TEST_ADDRESS")
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});