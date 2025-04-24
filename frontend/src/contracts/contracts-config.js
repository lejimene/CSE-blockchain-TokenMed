// Import all your contract ABIs
import PatientDoctorAccessController from "./PatientDoctorAccessController.json";
import UserAccessRegistry from "./UserAccessRegistry.json";
import EHR_NFT from "./EHR_NFT.json";

// Define your contract configurations
const contracts = {
  PatientDoctorAccessController: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Replace with actual address
    abi: PatientDoctorAccessController.abi,
  },
  EHR_NFT: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Replace with actual address
    abi: EHR_NFT.abi,
  },
  UserAccessRegistry: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Replace with actual address
    abi: UserAccessRegistry.abi,
  },
};

// Export individual contracts for selective importing
export const PatientDoctorAccessControllerConfig = contracts.PatientDoctorAccessController;
export const userRegistryConfig = contracts.UserAccessRegistry;
export const EHR_NFTConfig = contracts.EHR_NFT;

// Export the entire configuration object
export default contracts;