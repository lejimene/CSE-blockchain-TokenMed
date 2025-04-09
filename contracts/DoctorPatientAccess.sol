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

    modifier onlyDoctor() {
        require(
            userRegistry.getUserRole(msg.sender) == UserAccessRegistry.Role.Doctor,
            "Only doctors can call this function"
        );
        _;
    }

    modifier onlyPatientOrDoctor(address patientAddress, address doctorAddress) {
        require(
            msg.sender == patientAddress || msg.sender == doctorAddress,
            "Not authorized to view this access"
        );
        _;
    }

    constructor(address _userRegistryAddress) {
        userRegistry = UserAccessRegistry(_userRegistryAddress);
    }

    function setPatientDoctorAccess(address _patientDoctorAccessAddress) external  {
        require(address(patientDoctorAccess) == address(0), "Already initialized");
        patientDoctorAccess = PatientDoctorAccess(_patientDoctorAccessAddress);
    }

    function updateAccessStatus(address patientAddress, address doctorAddress, bool isGranted)
        external
    {
        require(msg.sender == address(patientDoctorAccess), "Only PatientDoctorAccess can call this");
        require(
            userRegistry.getUserRole(patientAddress) == UserAccessRegistry.Role.Patient,
            "Address is not a registered patient"
        );
        require(
            userRegistry.getUserRole(doctorAddress) == UserAccessRegistry.Role.Doctor,
            "Address is not a registered doctor"
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

    function getAllPatientAccess() external view onlyDoctor returns (PatientAccess[] memory) {
        return doctorAuthorizations[msg.sender];
    }

    function getActivePatientAccess() external view onlyDoctor returns (PatientAccess[] memory) {
        PatientAccess[] storage all = doctorAuthorizations[msg.sender];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) activeCount++;
        }

        PatientAccess[] memory result = new PatientAccess[](activeCount);
        uint256 resultIndex = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].isActive) {
                result[resultIndex++] = all[i];
            }
        }

        return result;
    }

    // Add access control so only the involved patient or doctor can query the access
    function hasAccessToPatient(address doctorAddress, address patientAddress) 
        external
        view
        onlyPatientOrDoctor(patientAddress, doctorAddress)
        returns (bool)
    {
        if (
            userRegistry.getUserRole(doctorAddress) != UserAccessRegistry.Role.Doctor ||
            userRegistry.getUserRole(patientAddress) != UserAccessRegistry.Role.Patient
        ) {
            return false;
        }

        uint256 index = authorizationIndex[doctorAddress][patientAddress];
        if (index == 0) return false;
        return doctorAuthorizations[doctorAddress][index - 1].isActive;
    }
}
