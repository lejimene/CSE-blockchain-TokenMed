// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import "./PatientDoctorAccessController.sol";
import "./UserAccessRegistry.sol";

contract EHR_NFT is ERC721 {
    uint256 private _tokenCounter;
    PatientDoctorAccessController public immutable accessController;
    UserAccessRegistry public immutable userRegistry;

    struct MedicalRecord {
        string dataURI;
        string[] historyURIs;
        string metadataURI; // Points to full JSON metadata
        mapping(address => bool) authorizedDoctors; // On-chain auth
    }

    mapping(address => uint256) private _patientToToken;
    mapping(uint256 => address) private _tokenToPatient;
    mapping(uint256 => MedicalRecord) private _tokenRecords;

    event NFTMinted(address indexed patient, uint256 indexed tokenId, string initialDataURI);
    event DataUpdated(uint256 indexed tokenId, string newDataURI);
    event MetadataUpdated(uint256 indexed tokenId, string newMetadataURI);
    event AccessUpdated(uint256 indexed tokenId, address indexed doctor, bool granted);

    constructor(address _accessController, address _userRegistry)
        ERC721("MedicalRecord", "EHR") {
        accessController = PatientDoctorAccessController(_accessController);
        userRegistry = UserAccessRegistry(_userRegistry);
    }

    // ========== CORE FUNCTIONALITY ========== //

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return _tokenRecords[tokenId].metadataURI;
    }

    function mint(string calldata metadataURI) external returns (uint256) {
        require(_patientToToken[msg.sender] == 0, "Already minted");
        require(userRegistry.getRole(msg.sender) == UserAccessRegistry.Role.Patient, "Only patients");

        uint256 tokenId = ++_tokenCounter;
        _mint(msg.sender, tokenId);

        _patientToToken[msg.sender] = tokenId;
        _tokenToPatient[tokenId] = msg.sender;

        MedicalRecord storage record = _tokenRecords[tokenId];
        record.metadataURI = metadataURI; // Store metadata URI
        record.dataURI = ""; // Initialize empty (will be set on first update)
        
        emit NFTMinted(msg.sender, tokenId, metadataURI);
        return tokenId;
    }

    function updateDataURI(uint256 tokenId, string calldata newDataURI) external {
        address owner = ownerOf(tokenId);
        require(
            msg.sender == owner ||
            getApproved(tokenId) == msg.sender ||
            isApprovedForAll(owner, msg.sender) ||
            accessController.hasAccess(owner, msg.sender),
            "Not authorized"
        );

        MedicalRecord storage record = _tokenRecords[tokenId];
        if (bytes(record.dataURI).length > 0) {
            record.historyURIs.push(record.dataURI);
        }
        record.dataURI = newDataURI;

        emit DataUpdated(tokenId, newDataURI);
    }

    function setMetadataURI(uint256 tokenId, string calldata newMetadataURI) external {
        address owner = ownerOf(tokenId);
        require(
            msg.sender == owner ||
            getApproved(tokenId) == msg.sender ||
            isApprovedForAll(owner, msg.sender) ||
            accessController.hasAccess(owner, msg.sender),
            "Not authorized"
        );

        _tokenRecords[tokenId].metadataURI = newMetadataURI;
        emit MetadataUpdated(tokenId, newMetadataURI);
    }

    // ========== ACCESS MANAGEMENT ========== //
    function shareWithDoctor(address doctor, bytes calldata doctorEncryptedKey) external {
        uint256 tokenId = _patientToToken[msg.sender];
        require(tokenId != 0, "No NFT minted");
        require(_ownerOf(tokenId) == msg.sender, "Not the NFT owner");

        accessController.grantAccess(doctor, doctorEncryptedKey);
        emit AccessUpdated(tokenId, doctor, true);
    }

    function revokeAccess(address doctor) external {
        uint256 tokenId = _patientToToken[msg.sender];
        require(tokenId != 0, "No NFT minted");
        require(_ownerOf(tokenId) == msg.sender, "Not the NFT owner");

        accessController.revokeAccess(doctor);
        emit AccessUpdated(tokenId, doctor, false);
    }

    // ========== VIEW FUNCTIONS ========== //
    function getCurrentDataURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Medical record does not exist");
        return _tokenRecords[tokenId].dataURI;
    }

    function getDataHistory(uint256 tokenId) external view returns (string[] memory) {
        require(_ownerOf(tokenId) != address(0), "Medical record does not exist");
        return _tokenRecords[tokenId].historyURIs;
    }

    function hasMintedNFT(address patient) external view returns (bool) {
        uint256 tokenId = _patientToToken[patient];
        return tokenId != 0 && _ownerOf(tokenId) != address(0);
    }

    function getTokenId(address patient) external view returns (uint256) {
        uint256 tokenId = _patientToToken[patient];
        require(tokenId != 0 && _ownerOf(tokenId) != address(0), "No valid NFT for patient");
        return tokenId;
    }

    // ========== OVERRIDES ========== //
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address) {
        require(auth == address(0) || to == address(0) || to == auth,
            "Non-transferable NFT");
        return super._update(to, tokenId, auth);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721.ownerOf(tokenId);
        return (spender == owner || ERC721.getApproved(tokenId) == spender || ERC721.isApprovedForAll(owner, spender));
    }
}