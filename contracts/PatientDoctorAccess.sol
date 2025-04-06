// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserAccessRegistry.sol";
import "./DoctorPatientAccess.sol";

contract PatientDoctorAccess {
    UserAccessRegistry private userRegistry;
    DoctorPatientAccess private doctorPatientAccess;

    struct DoctorAccess {
        address doctorAddress;
        uint256 grantTimestamp;
        bool isActive;
    }

    mapping(address => DoctorAccess[]) private patientAuthorizations;
    mapping(address => mapping(address => uint256)) private authorizationIndex;

    event AccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event AccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);

    // Modifier to restrict access to patients only
    modifier onlyPatient() {
        require(
            userRegistry.getUserRole(msg.sender) == UserAccessRegistry.Role.Patient,
            "Only patients can call this function"
        );
        _;
    }

    // Modifier to verify an address is a registered doctor
    modifier onlyDoctor(address doctorAddress) {
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Address is not a registered doctor"
        );
        _;
    }

    constructor(address _userRegistryAddress) {
        userRegistry = UserAccessRegistry(_userRegistryAddress);
    }

    function setDoctorPatientAccess(address _doctorPatientAccessAddress) external onlyPatient {
        require(address(doctorPatientAccess) == address(0), "Already initialized");
        doctorPatientAccess = DoctorPatientAccess(_doctorPatientAccessAddress);
    }

    function grantDoctorAccess(address doctorAddress) 
        external 
        onlyPatient
        onlyDoctor(doctorAddress)
    {
        require(
            authorizationIndex[msg.sender][doctorAddress] == 0 || 
            !patientAuthorizations[msg.sender][authorizationIndex[msg.sender][doctorAddress] - 1].isActive,
            "Access already granted"
        );

        uint256 newIndex = patientAuthorizations[msg.sender].length;
        patientAuthorizations[msg.sender].push(DoctorAccess({
            doctorAddress: doctorAddress,
            grantTimestamp: block.timestamp,
            isActive: true
        }));
        
        authorizationIndex[msg.sender][doctorAddress] = newIndex + 1;
        doctorPatientAccess.updateAccessStatus(msg.sender, doctorAddress, true);
        emit AccessGranted(msg.sender, doctorAddress, block.timestamp);
    }

    function revokeDoctorAccess(address doctorAddress) 
        external 
        onlyPatient
        onlyDoctor(doctorAddress)
    {
        uint256 index = authorizationIndex[msg.sender][doctorAddress];
        require(index > 0, "No access granted to this doctor");

        DoctorAccess storage access = patientAuthorizations[msg.sender][index - 1];
        require(access.isActive, "Access already revoked");

        access.isActive = false;
        doctorPatientAccess.updateAccessStatus(msg.sender, doctorAddress, false);
        emit AccessRevoked(msg.sender, doctorAddress, block.timestamp);
    }

    // View functions with address validation
    function hasAccess(address patientAddress, address doctorAddress) 
        external 
        view 
        returns (bool) 
    {
        // Validate both addresses
        if (userRegistry.getUserRole(patientAddress) != UserAccessRegistry.Role.Patient ||
            userRegistry.getUserRole(doctorAddress) != UserAccessRegistry.Role.Doctor) {
            return false;
        }
        
        uint256 index = authorizationIndex[patientAddress][doctorAddress];
        if (index == 0) return false;
        return patientAuthorizations[patientAddress][index - 1].isActive;
    }

    function getAllAuthorizations(address patientAddress) 
        external 
        view 
        returns (DoctorAccess[] memory) 
    {
        require(
            userRegistry.getUserRole(patientAddress) == UserAccessRegistry.Role.Patient,
            "Address is not a registered patient"
        );
        return patientAuthorizations[patientAddress];
    }

    function getActiveAuthorizations(address patientAddress) 
        external 
        view 
        returns (DoctorAccess[] memory) 
    {
        require(
            userRegistry.getUserRole(patientAddress) == UserAccessRegistry.Role.Patient,
            "Address is not a registered patient"
        );
        
        DoctorAccess[] storage all = patientAuthorizations[patientAddress];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) activeCount++;
        }
        
        DoctorAccess[] memory result = new DoctorAccess[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) {
                result[resultIndex] = all[i];
                resultIndex++;
            }
        }
        return result;
    }

    function getAuthorizationTime(address patientAddress, address doctorAddress) 
        external 
        view 
        returns (uint256) 
    {
        require(
            userRegistry.getUserRole(patientAddress) == UserAccessRegistry.Role.Patient,
            "Address is not a registered patient"
        );
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Address is not a registered doctor"
        );
        
        uint256 index = authorizationIndex[patientAddress][doctorAddress];
        if (index == 0) return 0;
        return patientAuthorizations[patientAddress][index - 1].grantTimestamp;
    }
}