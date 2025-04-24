// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserAccessRegistry {
    enum Role { Unregistered, Patient, Doctor, Admin }

    struct User {
        bool isRegistered;
        Role role;
    }

    mapping(address => User) private users;

    event UserRegistered(address indexed user, Role role);

    function registerUser(Role role) external {
        require(!users[msg.sender].isRegistered, "Already registered");
        require(role == Role.Patient || role == Role.Doctor, "Invalid role for self-registration");
        
        users[msg.sender] = User(true, role);
        emit UserRegistered(msg.sender, role);
    }

    // No password needed—just check if sender is registered
    function isUserAuthenticated() external view returns (bool) {
        return users[msg.sender].isRegistered;
    }

    function getUserRole(address user) external view returns (Role) {
        return users[user].role;
    }
}