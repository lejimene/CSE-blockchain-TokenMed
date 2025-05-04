# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

Your chain ID in meta mask must be 31337 and default RPC URL of
1127.0.0.1:8545




You will need pinata , infura, and your private key to your metamask account

For setup in the root folder create a .env file that must have
private key is where your metamask account private key is located
INFURA_API_KEY
PRIVATE_KEY
PINATA_API_KEY
PINATA_SECRET_API_KEY
MY_NFT_ADDRESS

For frontend folder another .env file that must have 
VITE_INFURA_ID
VITE_NETWORK

VITE_PINATA_API_KEY
VITE_PINATA_SECRET
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/ 

VITE_API_URL=http://localhost:3001

for server folder another .env file that must have
PINATA_API_KEY
PINATA_SECRET_API_KEY
INFURA_ID
NETWORK (sepholia or localhost)


Prequeistet 
- Node.js v18+
- npm or yarn
- Hardhat
- MetaMask (or other Web3 wallet)
- Pinata API keys (for IPFS)
- Infura API key (for Ethereum node access)

How to run it after doing all that
1. npm install in root folder
2. cd frontend 
    - npm install
3. cd server
    - npm install


You will need four terminals you will have to run after getting dependecies for everything
terminal 1 (in root folder)- npx hardhat node 
terminal 2 (in root folder)- npx hardhat run scripts/deploy.js --network localhost  
terminal 3 - cd frontend 
            -Then npm run dev
Terminal 4 - cd server
            -Then node server.js

And to be certain you have the correct ABI and contract address after run scripts you should see in terminal the contract address and you can edit the 
file thats in frontend\src\contracts and edit the contracts-config.js for the address part 

as for the ABI json files you can find them once you deploy them in the artifacts\contracts
each contract has its own folder inside the folder the one that DOESNT have a .dbg you copy so you should have copy 
EHR_NFT.json
PatientDoctorAccessController.json
UserAccessRegistry.json
And move them into frontend\src\contracts

Then check http://localhost:5173/