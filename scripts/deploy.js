const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy UserAccessRegistry first
  const UserAccessRegistry = await hre.ethers.getContractFactory("UserAccessRegistry");
  const userAccessRegistry = await UserAccessRegistry.deploy();
  await userAccessRegistry.waitForDeployment();
  
  console.log(`UserAccessRegistry deployed to: ${userAccessRegistry.target}`);

  // Now deploy DoctorPatientAccess, passing UserAccessRegistry address
  const DoctorPatientAccess = await hre.ethers.getContractFactory("DoctorPatientAccess");
  const doctorPatientAccess = await DoctorPatientAccess.deploy(userAccessRegistry.target);
  await doctorPatientAccess.waitForDeployment();
  
  console.log(`DoctorPatientAccess deployed to: ${doctorPatientAccess.target}`);

  // Now deploy PatientDoctorAccess, passing UserAccessRegistry address
  const PatientDoctorAccess = await hre.ethers.getContractFactory("PatientDoctorAccess");
  const patientDoctorAccess = await PatientDoctorAccess.deploy(userAccessRegistry.target);
  await patientDoctorAccess.waitForDeployment();
  
  console.log(`PatientDoctorAccess deployed to: ${patientDoctorAccess.target}`);

  // Create or update .env file with contract addresses
  const envPath = path.join(__dirname, '..','frontend', '.env');
  let envContents = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContents = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing contract address entries if they exist
    envContents = envContents.split('\n')
      .filter(line => !line.startsWith('USER_ACCESS_REGISTRY_ADDRESS=') &&
                     !line.startsWith('DOCTOR_PATIENT_ACCESS_ADDRESS=') &&
                     !line.startsWith('PATIENT_DOCTOR_ACCESS_ADDRESS='))
      .join('\n');
  }
  
  // Add new contract addresses
  envContents += `\nUSER_ACCESS_REGISTRY_ADDRESS=${userAccessRegistry.target}\n`;
  envContents += `DOCTOR_PATIENT_ACCESS_ADDRESS=${doctorPatientAccess.target}\n`;
  envContents += `PATIENT_DOCTOR_ACCESS_ADDRESS=${patientDoctorAccess.target}\n`;
  
  // Write to .env file
  fs.writeFileSync(envPath, envContents.trim());
  console.log('Contract addresses written to .env file');

  console.log(`
    Deployment complete!
    
    UserAccessRegistry: ${userAccessRegistry.target}
    DoctorPatientAccess: ${doctorPatientAccess.target}
    PatientDoctorAccess: ${patientDoctorAccess.target}
    
    To verify in console:
    npx hardhat console --network localhost
    > const contract = await ethers.getContractAt("UserAccessRegistry", "${userAccessRegistry.target}")
    > await contract.getUserRole("YOUR_TEST_ADDRESS")
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});