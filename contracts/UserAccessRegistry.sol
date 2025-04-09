// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserAccessRegistry {
    enum Role { Unregistered, Patient, Doctor, Admin }

    struct User {
        bool isRegistered;
        Role role;
    }

    // Password hashes
    bytes32 public constant DOCTOR_PASSWORD_HASH = keccak256(abi.encodePacked("med123"));
    bytes32 public constant ADMIN_PASSWORD_HASH = keccak256(abi.encodePacked("admin123")); // Add admin password

    mapping(address => User) private users;

    event UserRegistered(address indexed user, Role role);

    function registerUser(Role role, string memory password) external {
        require(!users[msg.sender].isRegistered, "Already registered");

        if (role == Role.Doctor) {
            require(
                keccak256(abi.encodePacked(password)) == DOCTOR_PASSWORD_HASH,
                "Invalid doctor password"
            );
        } else if (role == Role.Admin) {
            require(
                keccak256(abi.encodePacked(password)) == ADMIN_PASSWORD_HASH,
                "Invalid admin password"
            );
        } else if (role == Role.Patient) {
            // No password required for patients
        } else {
            revert("Invalid role");
        }

        users[msg.sender] = User({
            isRegistered: true,
            role: role
        });

        emit UserRegistered(msg.sender, role);
    }

    function getUserRole(address user) external view returns (Role) {
        return users[user].role;
    }
}