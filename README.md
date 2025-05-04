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




You will need pinata , infura, your 

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
- Alchemy/Infura API key (for Ethereum node access)

npm install

You will need four terminals you will have to run after getting dependecies for everything
terminal 1 - npx hardhat node
terminal 2 - npx hardhat run scripts/deploy.js --network localhost 
terminal 3 - cd frontend 
            -Then npm run dev
Terminal 4 - cd server
            -Then node server.js

