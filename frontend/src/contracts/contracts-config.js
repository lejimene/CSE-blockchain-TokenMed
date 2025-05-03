// Import all your contract ABIs
import PatientDoctorAccessController from "./PatientDoctorAccessController.json";
import UserAccessRegistry from "./UserAccessRegistry.json";
import EHR_NFT from "./EHR_NFT.json";

// Define your contract configurations
const contracts = {
  PatientDoctorAccessController: {
    11155111: { // Sepolia
      address: "0xe6d6FD8de9950EfBb71d028c755B3245d9AAC5cf",
    },
    // Add other networks as needed
    abi: PatientDoctorAccessController.abi,
  },
  EHR_NFT: {
    11155111: {
      address: "0x8c7df9BC0782712436335664a80ac914208f48f5",
    },
    abi: EHR_NFT.abi,
  },
  UserAccessRegistry: {
    11155111: {
      address: "0xB4fc8A2cfa053EabCa1f600d2B527EA6bAC5fbbB",
    },
    abi: UserAccessRegistry.abi,
  },
};

// Export individual contracts for selective importing
export const PatientDoctorAccessControllerConfig = contracts.PatientDoctorAccessController;
export const userRegistryConfig = contracts.UserAccessRegistry;
export const EHR_NFTConfig = contracts.EHR_NFT;

// Export the entire configuration object
export default contracts;