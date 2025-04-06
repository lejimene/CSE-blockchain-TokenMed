// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserAccessRegistry.sol";
import "./PatientDoctorAccess.sol";

contract DoctorPatientAccess {
    UserAccessRegistry private userRegistry;
    PatientDoctorAccess private patientDoctorAccess;

    struct PatientAccess {
        address patientAddress;
        uint256 grantTimestamp;
        uint256 revokeTimestamp;
        bool isActive;
    }

    mapping(address => PatientAccess[]) private doctorAuthorizations;
    mapping(address => mapping(address => uint256)) private authorizationIndex;

    event PatientAccessAdded(address indexed doctor, address indexed patient, uint256 timestamp);
    event PatientAccessRemoved(address indexed doctor, address indexed patient, uint256 timestamp);

    // Modifier to restrict access to doctors only
    modifier onlyDoctor() {
        require(
            userRegistry.getUserRole(msg.sender) == UserAccessRegistry.Role.Doctor,
            "Only doctors can call this function"
        );
        _;
    }

    // Modifier to verify an address is a registered patient
    modifier onlyPatient(address patientAddress) {
        require(
            userRegistry.getUserRole(patientAddress) == UserAccessRegistry.Role.Patient,
            "Address is not a registered patient"
        );
        _;
    }

    constructor(address _userRegistryAddress) {
        userRegistry = UserAccessRegistry(_userRegistryAddress);
    }

    function setPatientDoctorAccess(address _patientDoctorAccessAddress) external onlyDoctor {
        require(address(patientDoctorAccess) == address(0), "Already initialized");
        patientDoctorAccess = PatientDoctorAccess(_patientDoctorAccessAddress);
    }

    function updateAccessStatus(
        address patientAddress, 
        address doctorAddress, 
        bool isGranted
    ) 
        external 
        onlyPatient(patientAddress)
    {
        require(msg.sender == address(patientDoctorAccess), "Only PatientDoctorAccess can call this");
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Doctor address is not registered"
        );
        
        uint256 index = authorizationIndex[doctorAddress][patientAddress];
        
        if (isGranted) {
            if (index == 0) {
                uint256 newIndex = doctorAuthorizations[doctorAddress].length;
                doctorAuthorizations[doctorAddress].push(PatientAccess({
                    patientAddress: patientAddress,
                    grantTimestamp: block.timestamp,
                    revokeTimestamp: 0,
                    isActive: true
                }));
                authorizationIndex[doctorAddress][patientAddress] = newIndex + 1;
            } else {
                PatientAccess storage access = doctorAuthorizations[doctorAddress][index - 1];
                access.isActive = true;
                access.grantTimestamp = block.timestamp;
                access.revokeTimestamp = 0;
            }
            emit PatientAccessAdded(doctorAddress, patientAddress, block.timestamp);
        } else {
            require(index > 0, "No access record found");
            PatientAccess storage access = doctorAuthorizations[doctorAddress][index - 1];
            access.isActive = false;
            access.revokeTimestamp = block.timestamp;
            emit PatientAccessRemoved(doctorAddress, patientAddress, block.timestamp);
        }
    }

    function getAllPatientAccess(address doctorAddress) 
        external 
        view 
        onlyDoctor 
        returns (PatientAccess[] memory) 
    {
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Specified address is not a doctor"
        );
        return doctorAuthorizations[doctorAddress];
    }

    function getActivePatientAccess(address doctorAddress) 
        external 
        view 
        onlyDoctor 
        returns (PatientAccess[] memory) 
    {
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Specified address is not a doctor"
        );
        
        PatientAccess[] storage all = doctorAuthorizations[doctorAddress];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) activeCount++;
        }
        
        PatientAccess[] memory result = new PatientAccess[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) {
                result[resultIndex] = all[i];
                resultIndex++;
            }
        }
        return result;
    }

    function hasAccessToPatient(address doctorAddress, address patientAddress) 
        external 
        view 
        returns (bool) 
    {
        // Verify both addresses are properly registered
        if (userRegistry.getUserRole(doctorAddress) != UserAccessRegistry.Role.Doctor ||
            userRegistry.getUserRole(patientAddress) != UserAccessRegistry.Role.Patient) {
            return false;
        }
        
        uint256 index = authorizationIndex[doctorAddress][patientAddress];
        if (index == 0) return false;
        return doctorAuthorizations[doctorAddress][index - 1].isActive;
    }
}