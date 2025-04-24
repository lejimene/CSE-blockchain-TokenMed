require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Still useful for other environment variables

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {}, // Local Hardhat network
    localhost: { // For when you run 'npx hardhat node'
      url: "http://127.0.0.1:8545",
    }
  },
};