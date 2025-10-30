// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecureStorage
 * @dev Store and retrieve encrypted document references on IPFS
 * @notice Users can upload documents to IPFS and store the reference with a secret ID for later retrieval
 */
contract SecureStorage {
    struct Document {
        string secretId;          // User-chosen ID for retrieval
        string ipfsHash;          // IPFS CID
        string encryptedMetadata; // Optional encrypted metadata (JSON string)
        string fileName;          // Original file name
        uint256 fileSize;         // File size in bytes
        uint256 uploadedAt;       // Upload timestamp
        bool active;              // Soft delete flag
    }

    // user => secretId => Document
    mapping(address => mapping(string => Document)) private documents;

    // user => list of secret IDs
    mapping(address => string[]) private documentIds;

    // Track total documents per user
    mapping(address => uint256) private documentCount;

    event DocumentUploaded(
        address indexed user,
        string secretId,
        string ipfsHash,
        string fileName,
        uint256 fileSize
    );
    event DocumentRetrieved(address indexed user, string secretId);
    event DocumentDeleted(address indexed user, string secretId);
    event DocumentUpdated(address indexed user, string secretId, string newIpfsHash);

    /**
     * @dev Upload a document reference to the contract
     * @param secretId User-chosen ID for later retrieval
     * @param ipfsHash IPFS CID of the uploaded document
     * @param encryptedMetadata Optional encrypted metadata
     * @param fileName Original file name
     * @param fileSize File size in bytes
     */
    function uploadDocument(
        string calldata secretId,
        string calldata ipfsHash,
        string calldata encryptedMetadata,
        string calldata fileName,
        uint256 fileSize
    ) external {
        require(bytes(secretId).length > 0, "Secret ID cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(!documents[msg.sender][secretId].active, "Document with this ID already exists");

        documents[msg.sender][secretId] = Document({
            secretId: secretId,
            ipfsHash: ipfsHash,
            encryptedMetadata: encryptedMetadata,
            fileName: fileName,
            fileSize: fileSize,
            uploadedAt: block.timestamp,
            active: true
        });

        documentIds[msg.sender].push(secretId);
        documentCount[msg.sender]++;

        emit DocumentUploaded(msg.sender, secretId, ipfsHash, fileName, fileSize);
    }

    /**
     * @dev Update an existing document's IPFS hash
     * @param secretId Document ID to update
     * @param newIpfsHash New IPFS CID
     * @param encryptedMetadata New encrypted metadata
     * @param fileName New file name
     * @param fileSize New file size
     */
    function updateDocument(
        string calldata secretId,
        string calldata newIpfsHash,
        string calldata encryptedMetadata,
        string calldata fileName,
        uint256 fileSize
    ) external {
        require(documents[msg.sender][secretId].active, "Document not found");
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");

        documents[msg.sender][secretId].ipfsHash = newIpfsHash;
        documents[msg.sender][secretId].encryptedMetadata = encryptedMetadata;
        documents[msg.sender][secretId].fileName = fileName;
        documents[msg.sender][secretId].fileSize = fileSize;

        emit DocumentUpdated(msg.sender, secretId, newIpfsHash);
    }

    /**
     * @dev Retrieve a document by secret ID
     * @param secretId Document ID to retrieve
     * @return Document details
     */
    function getDocument(string calldata secretId) external returns (Document memory) {
        require(documents[msg.sender][secretId].active, "Document not found");

        emit DocumentRetrieved(msg.sender, secretId);

        return documents[msg.sender][secretId];
    }

    /**
     * @dev Delete a document (soft delete)
     * @param secretId Document ID to delete
     */
    function deleteDocument(string calldata secretId) external {
        require(documents[msg.sender][secretId].active, "Document not found");

        documents[msg.sender][secretId].active = false;
        documentCount[msg.sender]--;

        emit DocumentDeleted(msg.sender, secretId);
    }

    /**
     * @dev Get all active documents for the caller
     * @return Array of all active documents
     */
    function getAllDocuments() external view returns (Document[] memory) {
        string[] memory ids = documentIds[msg.sender];
        uint256 activeCount = documentCount[msg.sender];

        Document[] memory result = new Document[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < ids.length && index < activeCount; i++) {
            if (documents[msg.sender][ids[i]].active) {
                result[index] = documents[msg.sender][ids[i]];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Search documents by secret ID substring
     * @param query Search query
     * @return Array of matching documents
     */
    function searchDocuments(string calldata query) external view returns (Document[] memory) {
        require(bytes(query).length > 0, "Query cannot be empty");

        string[] memory ids = documentIds[msg.sender];
        uint256 activeCount = documentCount[msg.sender];

        // First pass: count matches
        Document[] memory tempDocs = new Document[](activeCount);
        uint256 matchCount = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            Document memory doc = documents[msg.sender][ids[i]];
            if (doc.active && contains(doc.secretId, query)) {
                tempDocs[matchCount] = doc;
                matchCount++;
            }
        }

        // Second pass: create properly sized result array
        Document[] memory result = new Document[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            result[i] = tempDocs[i];
        }

        return result;
    }

    /**
     * @dev Get total number of active documents for the caller
     * @return Number of active documents
     */
    function getDocumentCount() external view returns (uint256) {
        return documentCount[msg.sender];
    }

    /**
     * @dev Check if a document exists
     * @param secretId Document ID to check
     * @return true if document exists and is active
     */
    function documentExists(string calldata secretId) external view returns (bool) {
        return documents[msg.sender][secretId].active;
    }

    /**
     * @dev Internal function to check if a string contains a substring
     * @param str The string to search in
     * @param substr The substring to search for
     * @return true if substr is found in str
     */
    function contains(string memory str, string memory substr) private pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);

        if (substrBytes.length > strBytes.length) return false;
        if (substrBytes.length == 0) return true;

        for (uint256 i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < substrBytes.length; j++) {
                if (toLower(strBytes[i + j]) != toLower(substrBytes[j])) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }

        return false;
    }

    /**
     * @dev Convert a byte to lowercase
     * @param b Byte to convert
     * @return Lowercase version of the byte
     */
    function toLower(bytes1 b) private pure returns (bytes1) {
        if (b >= 0x41 && b <= 0x5A) {
            // A-Z
            return bytes1(uint8(b) + 32);
        }
        return b;
    }
}
