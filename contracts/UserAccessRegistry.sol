// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserAccessRegistry {
    enum Role { Unregistered, Patient, Doctor }

    struct User {
        bool isRegistered;
        Role role;
    }

    // Mapping of users and their roles
    mapping(address => User) private users;

    // Doctor password requirement (simple for school project)
    bytes32 public constant DOCTOR_PASSWORD_HASH = keccak256(abi.encodePacked("med123"));

    // Events
    event UserRegistered(address indexed user, Role role);

    /// @notice Register as a patient or doctor
    /// @param role 1 for Patient, 2 for Doctor
    /// @param password Plaintext password (only required for doctors)
    function registerUser(Role role, string memory password) external {
        require(!users[msg.sender].isRegistered, "Already registered");

        // Doctor password check
        if (role == Role.Doctor) {
            require(
                keccak256(abi.encodePacked(password)) == DOCTOR_PASSWORD_HASH,
                "Invalid doctor password"
            );
        }

        users[msg.sender] = User({
            isRegistered: true,
            role: role
        });

        emit UserRegistered(msg.sender, role);
    }

    /// @notice Get the role of a user
    function getUserRole(address user) external view returns (Role) {
        return users[user].role;
    }
}
