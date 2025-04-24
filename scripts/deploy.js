const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy UserAccessRegistry
  const UserAccessRegistry = await hre.ethers.getContractFactory("UserAccessRegistry");
  const userAccessRegistry = await UserAccessRegistry.deploy();
  await userAccessRegistry.waitForDeployment(); // Added for safety
  console.log(`UserAccessRegistry deployed to: ${userAccessRegistry.target}`);

  // Deploy PatientDoctorAccessController
  const PatientDoctorAccessController = await hre.ethers.getContractFactory("PatientDoctorAccessController");
  const patientDoctorAccessController = await PatientDoctorAccessController.deploy(userAccessRegistry.target);
  await patientDoctorAccessController.waitForDeployment(); // Added for safety
  console.log(`PatientDoctorAccessController deployed to: ${patientDoctorAccessController.target}`);

  // Deploy EHR_NFT
  const EHR_NFT = await hre.ethers.getContractFactory("EHR_NFT");
  const ehrNFT = await EHR_NFT.deploy();
  await ehrNFT.waitForDeployment(); // Added for safety
  console.log(`EHR_NFT deployed to: ${ehrNFT.target}`);

  // Save addresses to both JSON and .env
  const contracts = {
    userAccessRegistry: userAccessRegistry.target,
    patientDoctorAccessController: patientDoctorAccessController.target,
    ehrNFT: ehrNFT.target
  };

  // Save to frontend JSON
  const contractsDir = path.join(__dirname, '..', 'frontend', 'src', 'contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(contractsDir, 'contract-addresses.json'),
    JSON.stringify(contracts, null, 2)
  );

  // Save to .env
  const envPath = path.join(__dirname, '..', 'frontend', '.env');
  let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  envContents += `\nVITE_USER_ACCESS_REGISTRY_ADDRESS=${userAccessRegistry.target}`;
  envContents += `\nVITE_PATIENT_DOCTOR_ACCESS_CONTROLLER_ADDRESS=${patientDoctorAccessController.target}`;
  envContents += `\nVITE_EHR_NFT_ADDRESS=${ehrNFT.target}\n`;
  fs.writeFileSync(envPath, envContents.trim());

  console.log('Addresses saved to both JSON and .env');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});