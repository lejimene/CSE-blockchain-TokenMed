// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserAccessRegistry.sol";

contract PatientDoctorAccessController {
    UserAccessRegistry private userRegistry;

    struct Access {
        uint256 grantTimestamp;
        uint256 revokeTimestamp;
        bool isActive;
    }

    // Primary access storage
    mapping(address => mapping(address => Access)) private accessMap; // patient => doctor => Access
    
    // Relationship tracking using mappings
    mapping(address => address[]) private patientDoctors; // patient => list of doctors
    mapping(address => mapping(address => bool)) private isDoctorForPatient; // patient => doctor => exists
    
    mapping(address => address[]) private doctorPatients; // doctor => list of patients
    mapping(address => mapping(address => bool)) private isPatientForDoctor; // doctor => patient => exists

    event AccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event AccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);

    modifier onlyPatient() {
        require(userRegistry.getUserRole(msg.sender) == UserAccessRegistry.Role.Patient, "Not a patient");
        _;
    }

    modifier onlyDoctor() {
        require(userRegistry.getUserRole(msg.sender) == UserAccessRegistry.Role.Doctor, "Not a doctor");
        _;
    }

    constructor(address _userRegistry) {
        userRegistry = UserAccessRegistry(_userRegistry);
    }

    function patientGrantAccess(address doctor) external onlyPatient {
        require(userRegistry.getUserRole(doctor) == UserAccessRegistry.Role.Doctor, "Invalid doctor");
        Access storage access = accessMap[msg.sender][doctor];
        require(!access.isActive, "Already granted");

        // Add to relationship mappings if not already present
        if (!isDoctorForPatient[msg.sender][doctor]) {
            patientDoctors[msg.sender].push(doctor);
            isDoctorForPatient[msg.sender][doctor] = true;
            
            doctorPatients[doctor].push(msg.sender);
            isPatientForDoctor[doctor][msg.sender] = true;
        }

        access.isActive = true;
        access.grantTimestamp = block.timestamp;
        access.revokeTimestamp = 0;

        emit AccessGranted(msg.sender, doctor, block.timestamp);
    }

    function patientRevokeAccess(address doctor) external onlyPatient {
        Access storage access = accessMap[msg.sender][doctor];
        require(access.isActive, "Not active");

        access.isActive = false;
        access.revokeTimestamp = block.timestamp;

        emit AccessRevoked(msg.sender, doctor, block.timestamp);
    }

    function doctorRevokeAccess(address patient) external onlyDoctor {
        Access storage access = accessMap[patient][msg.sender];
        require(access.isActive, "Not active");

        access.isActive = false;
        access.revokeTimestamp = block.timestamp;

        emit AccessRevoked(patient, msg.sender, block.timestamp);
    }

    function getActiveDoctorsForPatient() external view returns (address[] memory) {
        address[] storage allDoctors = patientDoctors[msg.sender];
        address[] memory active = new address[](allDoctors.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allDoctors.length; i++) {
            if (accessMap[msg.sender][allDoctors[i]].isActive) {
                active[count++] = allDoctors[i];
            }
        }
        
        // Resize array to remove empty slots
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = active[i];
        }
        
        return result;
    }

    function getActivePatientsForDoctor() external view returns (address[] memory) {
        address[] storage allPatients = doctorPatients[msg.sender];
        address[] memory active = new address[](allPatients.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allPatients.length; i++) {
            if (accessMap[allPatients[i]][msg.sender].isActive) {
                active[count++] = allPatients[i];
            }
        }
        
        // Resize array to remove empty slots
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = active[i];
        }
        
        return result;
    }

    function getAccessDetails(address patient, address doctor) external view returns (bool, uint256, uint256) {
        Access memory access = accessMap[patient][doctor];
        return (access.isActive, access.grantTimestamp, access.revokeTimestamp);
    }

    // Optional: Get all historical relationships (both active and inactive)
    function getAllDoctorsForPatient(address patient) external view returns (address[] memory) {
        return patientDoctors[patient];
    }

    function getAllPatientsForDoctor(address doctor) external view returns (address[] memory) {
        return doctorPatients[doctor];
    }
}