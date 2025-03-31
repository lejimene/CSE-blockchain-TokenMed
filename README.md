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
How to start it.

get one terminal and do 
npx hardhat node

Then in another terminal inside the frontend folder to start the site itself do
npm start

When you create a new contract you must run these commands in two seperate terminals. First connects to hardhat and the other creates a new deployed address but also updates new 
contract information

npx hardhat node
run npx hardhat run scripts/deploy.js --network localhost

Any time you create anything new you have to grab inside of artifacts/contracts/some.sol/some.json file and move that file into the frontend/contracts folder.

Deployed to 0x5FbDB2315678afecb367f032d93F642f64180aa3 as of now can redeployed later.