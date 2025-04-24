// ignition/modules/LockModule.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI = 1_000_000_000n;

module.exports = buildModule("FullDeploymentModule", (m) => {
  // 1. Deploy Lock (original contract)
  const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  // 2. Deploy MyNFT (no dependencies)
  const nft = m.contract("EHR_NFT");

  // 3. Deploy UserAccessRegistry (no dependencies)
  const userRegistry = m.contract("UserAccessRegistry");

  // 4. Deploy PatientDoctorAccessController (depends on UserAccessRegistry)
  const accessController = m.contract("PatientDoctorAccessController", [userRegistry]);

  return { lock, nft, userRegistry, accessController };
});