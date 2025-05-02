// Improved version with fixes:
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy UserAccessRegistry
    console.log("\nDeploying UserAccessRegistry...");
    const UserAccessRegistry = await hre.ethers.getContractFactory("UserAccessRegistry");
    const userAccessRegistry = await UserAccessRegistry.deploy();
    await userAccessRegistry.waitForDeployment();
    console.log(`UserAccessRegistry deployed to: ${userAccessRegistry.target}`);

    // 2. Deploy PatientDoctorAccessController
    console.log("\nDeploying PatientDoctorAccessController...");
    const PatientDoctorAccessController = await hre.ethers.getContractFactory("PatientDoctorAccessController");
    const patientDoctorAccessController = await PatientDoctorAccessController.deploy(
      userAccessRegistry.target
    );
    await patientDoctorAccessController.waitForDeployment();
    console.log(`PatientDoctorAccessController deployed to: ${patientDoctorAccessController.target}`);

    // 3. Deploy EHR_NFT
    console.log("\nDeploying EHR_NFT...");
    const EHR_NFT = await hre.ethers.getContractFactory("EHR_NFT");
    const ehrNFT = await EHR_NFT.deploy(
      patientDoctorAccessController.target,
      userAccessRegistry.target
    );
    await ehrNFT.waitForDeployment();
    console.log(`EHR_NFT deployed to: ${ehrNFT.target}`);

    // Prepare contract addresses
    const contracts = {
      userAccessRegistry: userAccessRegistry.target,
      patientDoctorAccessController: patientDoctorAccessController.target,
      ehrNFT: ehrNFT.target,
      abis: {
        UserAccessRegistry: getAbiPath("UserAccessRegistry"),
        PatientDoctorAccessController: getAbiPath("PatientDoctorAccessController"),
        EHR_NFT: getAbiPath("EHR_NFT")
      }
    };

    // Save to frontend
    const contractsDir = path.join(__dirname, '..', 'frontend', 'src', 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(contractsDir, 'contract-addresses.json'),
      JSON.stringify(contracts, null, 2)
    );

    // Update .env file
    updateEnvFile(
      path.join(__dirname, '..', 'frontend', '.env'),
      userAccessRegistry.target,
      patientDoctorAccessController.target,
      ehrNFT.target
    );

    console.log('\nDeployment complete!');
    logVerificationCommands(
      userAccessRegistry.target,
      patientDoctorAccessController.target,
      ehrNFT.target
    );

  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exitCode = 1;
  }
}

// Helper function to get ABI path
function getAbiPath(contractName) {
  return path.join(
    __dirname,
    '..',
    'artifacts',
    'contracts',
    `${contractName}.sol`,
    `${contractName}.json`
  );
}

// Helper function to update .env file
function updateEnvFile(envPath, registryAddr, controllerAddr, nftAddr) {
  let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  // Remove existing entries if they exist
  envContents = envContents
    .replace(/^VITE_USER_ACCESS_REGISTRY_ADDRESS=.*$/gm, '')
    .replace(/^VITE_PATIENT_DOCTOR_ACCESS_CONTROLLER_ADDRESS=.*$/gm, '')
    .replace(/^VITE_EHR_NFT_ADDRESS=.*$/gm, '')
    .trim();
  
  // Add new entries
  envContents += `\nVITE_USER_ACCESS_REGISTRY_ADDRESS=${registryAddr}`;
  envContents += `\nVITE_PATIENT_DOCTOR_ACCESS_CONTROLLER_ADDRESS=${controllerAddr}`;
  envContents += `\nVITE_EHR_NFT_ADDRESS=${nftAddr}\n`;
  
  fs.writeFileSync(envPath, envContents.trim());
  console.log(`Updated .env file at ${envPath}`);
}

// Helper function to log verification commands
function logVerificationCommands(registryAddr, controllerAddr, nftAddr) {
  console.log('\nTo verify contracts on Etherscan, run:');
  console.log(`npx hardhat verify --network <network> ${registryAddr}`);
  console.log(`npx hardhat verify --network <network> ${controllerAddr} ${registryAddr}`);
  console.log(`npx hardhat verify --network <network> ${nftAddr} ${controllerAddr} ${registryAddr}`);
}

main();