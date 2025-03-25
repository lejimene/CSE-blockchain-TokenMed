import React, { useState } from "react";
import { connectToContract } from "./contract";

function App() {
  const [tokenURI, setTokenURI] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [newTokenURI, setNewTokenURI] = useState("");

  async function mintNFT() {
    const contract = await connectToContract();
    if (contract) {
      const transaction = await contract.mintNFT(await contract.signer.getAddress(), tokenURI);
      await transaction.wait();
      alert("NFT Minted!");
    }
  }

  async function updateEHR() {
    const contract = await connectToContract();
    if (contract) {
      const transaction = await contract.updateTokenURI(tokenId, newTokenURI);
      await transaction.wait();
      alert("EHR Updated!");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>EHR NFT DApp</h1>
      <div>
        <h2>Mint NFT</h2>
        <input
          type="text"
          placeholder="Token URI"
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
        />
        <button onClick={mintNFT}>Mint NFT</button>
      </div>
      <div>
        <h2>Update EHR</h2>
        <input
          type="text"
          placeholder="Token ID"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
        />
        <input
          type="text"
          placeholder="New Token URI"
          value={newTokenURI}
          onChange={(e) => setNewTokenURI(e.target.value)}
        />
        <button onClick={updateEHR}>Update EHR</button>
      </div>
    </div>
  );
}

export default App;