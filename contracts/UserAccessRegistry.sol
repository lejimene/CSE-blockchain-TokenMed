// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserAccessRegistry {
    enum Role { Unregistered, Patient, Doctor }

    struct User {
        Role role;
        bytes publicKey; // Public key for ECDH
    }

    mapping(address => User) private users;

    event UserRegistered(address indexed user, Role role, bytes publicKey);
    event PublicKeyUpdated(address indexed user, bytes newPublicKey);

    // Maximum length for public key to prevent abuse
    uint256 public constant MAX_PUBLIC_KEY_LENGTH = 128;

    function registerUser(Role role, bytes calldata publicKey) external {
        require(users[msg.sender].role == Role.Unregistered, "Already registered");
        require(role == Role.Patient || role == Role.Doctor, "Invalid role");
        require(publicKey.length > 0 && publicKey.length <= MAX_PUBLIC_KEY_LENGTH, "Invalid public key length");

        users[msg.sender] = User(role, publicKey);
        emit UserRegistered(msg.sender, role, publicKey);
    }

    function updatePublicKey(bytes calldata newPublicKey) external {
        require(users[msg.sender].role != Role.Unregistered, "Not registered");
        require(newPublicKey.length > 0 && newPublicKey.length <= MAX_PUBLIC_KEY_LENGTH, "Invalid public key length");

        users[msg.sender].publicKey = newPublicKey;
        emit PublicKeyUpdated(msg.sender, newPublicKey);
    }

    function getRole(address user) external view returns (Role) {
        return users[user].role;
    }

    function getPublicKey(address user) external view returns (bytes memory) {
        return users[user].publicKey;
    }

    function hasRole(address user, Role role) external view returns (bool) {
        return users[user].role == role;
    }

    function batchRegister(
        address[] calldata userAddresses, 
        Role[] calldata roles, 
        bytes[] calldata publicKeys
    ) external {
        require(
            userAddresses.length == roles.length && 
            roles.length == publicKeys.length, 
            "Array length mismatch"
        );
        
        // Prevent too many registrations in one call for gas limits
        require(userAddresses.length <= 100, "Too many registrations");
        
        for (uint256 i = 0; i < userAddresses.length; i++) {
            require(users[userAddresses[i]].role == Role.Unregistered, "Already registered");
            require(roles[i] == Role.Patient || roles[i] == Role.Doctor, "Invalid role");
            require(
                publicKeys[i].length > 0 && 
                publicKeys[i].length <= MAX_PUBLIC_KEY_LENGTH, 
                "Invalid public key"
            );
            
            users[userAddresses[i]] = User(roles[i], publicKeys[i]);
            emit UserRegistered(userAddresses[i], roles[i], publicKeys[i]);
        }
    }
}