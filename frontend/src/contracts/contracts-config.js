// Import all your contract ABIs
import DoctorPatientAccess from "./DoctorPatientAccess.json";
import PatientDoctorAccess from "./PatientDoctorAccess.json";
import UserAccessRegistry from "./UserAccessRegistry.json";

// Define your contract configurations
const contracts = {
  DoctorPatientAccess: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Replace with actual address
    abi: DoctorPatientAccess.abi,
  },
  PatientDoctorAccess: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Replace with actual address
    abi: PatientDoctorAccess.abi,
  },
  UserAccessRegistry: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Replace with actual address
    abi: UserAccessRegistry.abi,
  },
};

// Export individual contracts for selective importing
export const doctorPatientAccessConfig = contracts.DoctorPatientAccess;
export const patientDoctorAccessConfig = contracts.PatientDoctorAccess;
export const userRegistryConfig = contracts.UserAccessRegistry;

// Export the entire configuration object
export default contracts;