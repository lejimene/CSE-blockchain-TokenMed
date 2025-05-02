// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserAccessRegistry.sol";

contract PatientDoctorAccessController {
    UserAccessRegistry public immutable userRegistry;

    struct Access {
        uint32 grantTimestamp;
        uint32 revokeTimestamp;
        bool isActive;
    }

    mapping(address => mapping(address => Access)) private _accessMap;

    mapping(address => address[]) private _patientDoctors;
    mapping(address => mapping(address => uint256)) private _doctorIndex;

    mapping(address => address[]) private _doctorPatients;
    mapping(address => mapping(address => uint256)) private _patientIndex;

    // ✅ New mappings for active status
    mapping(address => mapping(address => bool)) private _activeDoctors;
    mapping(address => mapping(address => bool)) private _activePatients;

    // Key management
    mapping(address => bytes) private _patientSymmetricKeys;
    mapping(address => mapping(address => bytes)) private _doctorSymmetricKeys;

    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event SymmetricKeySet(address indexed patient, address indexed doctor);
    event SymmetricKeyRotated(address indexed patient, bytes newEncryptedKey);
    event EmergencyAccessRevoked(address indexed patient, address indexed doctor, address indexed initiator);

    modifier onlyPatient() {
        require(userRegistry.getRole(msg.sender) == UserAccessRegistry.Role.Patient, "Not a patient");
        _;
    }

    modifier onlyDoctor() {
    require(userRegistry.getRole(msg.sender) == UserAccessRegistry.Role.Doctor, "Not a doctor");
    _;
}

    constructor(address _userRegistry) {
        userRegistry = UserAccessRegistry(_userRegistry);
    }

    // ========== SYMMETRIC KEY MANAGEMENT ========== //

    function setPatientSymmetricKey(bytes calldata encryptedKey) external onlyPatient {
        require(encryptedKey.length > 0, "Invalid key");
        _patientSymmetricKeys[msg.sender] = encryptedKey;
        emit SymmetricKeySet(msg.sender, address(0));
    }

    function grantAccess(address doctor, bytes calldata encryptedSymmetricKeyForDoctor) external onlyPatient {
        require(doctor != address(0), "Invalid doctor address");
        require(doctor != msg.sender, "Cannot grant access to self");
        require(encryptedSymmetricKeyForDoctor.length >= 32, "Key too short"); // Minimum reasonable key size

        Access storage access = _accessMap[msg.sender][doctor];
        require(!access.isActive, "Access already granted");

        if (_doctorIndex[msg.sender][doctor] == 0) {
            _patientDoctors[msg.sender].push(doctor);
            _doctorIndex[msg.sender][doctor] = _patientDoctors[msg.sender].length;

            _doctorPatients[doctor].push(msg.sender);
            _patientIndex[doctor][msg.sender] = _doctorPatients[doctor].length;
        }

        access.isActive = true;
        access.grantTimestamp = uint32(block.timestamp);

        _doctorSymmetricKeys[msg.sender][doctor] = encryptedSymmetricKeyForDoctor;

        _activeDoctors[msg.sender][doctor] = true;
        _activePatients[doctor][msg.sender] = true;

        emit AccessGranted(msg.sender, doctor);
        emit SymmetricKeySet(msg.sender, doctor);
    }

    function revokeAccess(address counterparty) external {
        bool isPatient = userRegistry.getRole(msg.sender) == UserAccessRegistry.Role.Patient;
        bool isDoctor = userRegistry.getRole(msg.sender) == UserAccessRegistry.Role.Doctor;
        require(isPatient || isDoctor, "Unauthorized");

        address patient = isPatient ? msg.sender : counterparty;
        address doctor = isPatient ? counterparty : msg.sender;

        Access storage access = _accessMap[patient][doctor];
        require(access.isActive, "Access not active");

        access.isActive = false;
        access.revokeTimestamp = uint32(block.timestamp);

        _activeDoctors[patient][doctor] = false;
        _activePatients[doctor][patient] = false;

        _removeFromArray(_patientDoctors[patient], _doctorIndex[patient], doctor);
        _removeFromArray(_doctorPatients[doctor], _patientIndex[doctor], patient);

        emit AccessRevoked(patient, doctor);
    }

    function emergencyRevokeAllAccess() external onlyPatient {
    address[] storage doctors = _patientDoctors[msg.sender];
    for (uint256 i = 0; i < doctors.length; i++) {
        if (_accessMap[msg.sender][doctors[i]].isActive) {
            _accessMap[msg.sender][doctors[i]].isActive = false;
            _accessMap[msg.sender][doctors[i]].revokeTimestamp = uint32(block.timestamp);
            emit EmergencyAccessRevoked(msg.sender, doctors[i], msg.sender);
        }
    }}

    // ========== VIEW FUNCTIONS ========== //

    function getPatientSymmetricKey(address patient) external view returns (bytes memory) {
        require(msg.sender == patient, "Only patient can access their own key");
        return _patientSymmetricKeys[patient];
    }

    function getDoctorSymmetricKey(address patient) external view returns (bytes memory) {
        require(_accessMap[patient][msg.sender].isActive, "No active access");
        return _doctorSymmetricKeys[patient][msg.sender];
    }

    function hasAccess(address patient, address doctor) external view returns (bool) {
        return _accessMap[patient][doctor].isActive;
    }

    function getActiveDoctors(address patient) external view returns (address[] memory) {
        return _filterActive(patient, _patientDoctors[patient], true);
    }

    function getActivePatients(address doctor) external view returns (address[] memory) {
        return _filterActive(doctor, _doctorPatients[doctor], false);
    }

    function _filterActive(address principal, address[] storage all, bool isPatientFilter)
        private view returns (address[] memory)
    {
        uint256 count;
        address[] memory active = new address[](all.length);

        for (uint256 i = 0; i < all.length; i++) {
            address counterparty = all[i];
            bool isActive = isPatientFilter
                ? _activeDoctors[principal][counterparty]
                : _activePatients[principal][counterparty];

            if (isActive) active[count++] = counterparty;
        }

        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) result[i] = active[i];
        return result;
    }

    function _removeFromArray(address[] storage array, mapping(address => uint256) storage indexMap, address element) private {
        uint256 index = indexMap[element];
        require(index != 0, "Element not found"); // index 0 means not found
        uint256 lastIndex = array.length - 1;

        if (index - 1 != lastIndex) {
            address lastElement = array[lastIndex];
            array[index - 1] = lastElement;
            indexMap[lastElement] = index;
        }

        array.pop();
        delete indexMap[element];
    }
}
