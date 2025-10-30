// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DomainRegistry
 * @dev Domain name registration system supporting multiple chains
 * Allows users to reserve domain names on Push Chain and link them to any chain address
 */
contract DomainRegistry is Ownable {
    struct Domain {
        string name;
        address owner;
        uint256 chainId;
        address resolvedAddress;
        uint256 registeredAt;
        uint256 expiresAt;
        string metadata; // JSON string with additional info
        bool active;
    }

    // Mapping from domain hash to Domain struct
    mapping(bytes32 => Domain) public domains;

    // Mapping from owner to their domain hashes
    mapping(address => bytes32[]) private _ownerDomains;

    // Mapping to check if domain name is taken
    mapping(bytes32 => bool) private _domainExists;

    // Registration fee (in wei)
    uint256 public registrationFee;

    // Domain expiration period (in seconds)
    uint256 public expirationPeriod;

    event DomainRegistered(
        bytes32 indexed domainHash,
        string domainName,
        address indexed owner,
        uint256 chainId,
        address resolvedAddress,
        uint256 expiresAt,
        uint256 timestamp
    );

    event DomainTransferred(
        bytes32 indexed domainHash,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event DomainResolved(
        bytes32 indexed domainHash,
        uint256 chainId,
        address resolvedAddress,
        uint256 timestamp
    );

    event DomainRenewed(
        bytes32 indexed domainHash,
        uint256 newExpiresAt,
        uint256 timestamp
    );

    event DomainMetadataUpdated(
        bytes32 indexed domainHash,
        string metadata,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {
        registrationFee = 0.01 ether; // Default fee
        expirationPeriod = 365 days; // Default 1 year
    }

    /**
     * @dev Register a new domain
     * @param domainName The domain name to register
     * @param chainId The blockchain ID where the domain points
     * @param resolvedAddress The address on the target chain
     * @param metadata JSON metadata string
     * @return domainHash The hash of the domain
     */
    function registerDomain(
        string memory domainName,
        uint256 chainId,
        address resolvedAddress,
        string memory metadata
    ) public payable returns (bytes32) {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(domainName).length > 0, "Domain name cannot be empty");
        require(resolvedAddress != address(0), "Invalid resolved address");

        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(!_domainExists[domainHash], "Domain already registered");

        uint256 expiresAt = block.timestamp + expirationPeriod;

        domains[domainHash] = Domain({
            name: domainName,
            owner: msg.sender,
            chainId: chainId,
            resolvedAddress: resolvedAddress,
            registeredAt: block.timestamp,
            expiresAt: expiresAt,
            metadata: metadata,
            active: true
        });

        _domainExists[domainHash] = true;
        _ownerDomains[msg.sender].push(domainHash);

        emit DomainRegistered(
            domainHash,
            domainName,
            msg.sender,
            chainId,
            resolvedAddress,
            expiresAt,
            block.timestamp
        );

        return domainHash;
    }

    /**
     * @dev Batch register multiple domains
     * @param domainNames Array of domain names
     * @param chainIds Array of chain IDs
     * @param resolvedAddresses Array of resolved addresses
     * @param metadatas Array of metadata strings
     * @return domainHashes Array of domain hashes
     */
    function batchRegisterDomains(
        string[] memory domainNames,
        uint256[] memory chainIds,
        address[] memory resolvedAddresses,
        string[] memory metadatas
    ) public payable returns (bytes32[] memory) {
        require(
            domainNames.length == chainIds.length &&
            chainIds.length == resolvedAddresses.length &&
            resolvedAddresses.length == metadatas.length,
            "Array length mismatch"
        );

        require(msg.value >= registrationFee * domainNames.length, "Insufficient registration fee");

        bytes32[] memory domainHashes = new bytes32[](domainNames.length);

        for (uint256 i = 0; i < domainNames.length; i++) {
            // Create domain without requiring additional payment
            bytes32 domainHash = keccak256(abi.encodePacked(domainNames[i]));
            require(!_domainExists[domainHash], "Domain already registered");

            uint256 expiresAt = block.timestamp + expirationPeriod;

            domains[domainHash] = Domain({
                name: domainNames[i],
                owner: msg.sender,
                chainId: chainIds[i],
                resolvedAddress: resolvedAddresses[i],
                registeredAt: block.timestamp,
                expiresAt: expiresAt,
                metadata: metadatas[i],
                active: true
            });

            _domainExists[domainHash] = true;
            _ownerDomains[msg.sender].push(domainHash);

            domainHashes[i] = domainHash;

            emit DomainRegistered(
                domainHash,
                domainNames[i],
                msg.sender,
                chainIds[i],
                resolvedAddresses[i],
                expiresAt,
                block.timestamp
            );
        }

        return domainHashes;
    }

    /**
     * @dev Resolve a domain to get its chain and address
     * @param domainName The domain name to resolve
     * @return chainId The chain ID
     * @return resolvedAddress The resolved address
     */
    function resolveDomain(string memory domainName) public view returns (uint256 chainId, address resolvedAddress) {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        Domain memory domain = domains[domainHash];
        require(domain.active, "Domain is not active");
        require(block.timestamp < domain.expiresAt, "Domain has expired");

        return (domain.chainId, domain.resolvedAddress);
    }

    /**
     * @dev Update domain resolution
     * @param domainName The domain name
     * @param newChainId New chain ID
     * @param newAddress New resolved address
     */
    function updateDomainResolution(
        string memory domainName,
        uint256 newChainId,
        address newAddress
    ) public {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        Domain storage domain = domains[domainHash];
        require(domain.owner == msg.sender, "Not the domain owner");
        require(domain.active, "Domain is not active");

        domain.chainId = newChainId;
        domain.resolvedAddress = newAddress;

        emit DomainResolved(domainHash, newChainId, newAddress, block.timestamp);
    }

    /**
     * @dev Transfer domain ownership
     * @param domainName The domain name
     * @param newOwner New owner address
     */
    function transferDomain(string memory domainName, address newOwner) public {
        require(newOwner != address(0), "Invalid new owner");

        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        Domain storage domain = domains[domainHash];
        require(domain.owner == msg.sender, "Not the domain owner");

        address previousOwner = domain.owner;

        // Remove from previous owner's array
        bytes32[] storage previousOwnerDomains = _ownerDomains[previousOwner];
        for (uint256 i = 0; i < previousOwnerDomains.length; i++) {
            if (previousOwnerDomains[i] == domainHash) {
                // Move last element to this position and pop
                previousOwnerDomains[i] = previousOwnerDomains[previousOwnerDomains.length - 1];
                previousOwnerDomains.pop();
                break;
            }
        }

        // Transfer ownership
        domain.owner = newOwner;

        // Add to new owner's array
        _ownerDomains[newOwner].push(domainHash);

        emit DomainTransferred(domainHash, previousOwner, newOwner, block.timestamp);
    }

    /**
     * @dev Renew domain registration
     * @param domainName The domain name to renew
     */
    function renewDomain(string memory domainName) public payable {
        require(msg.value >= registrationFee, "Insufficient renewal fee");

        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        Domain storage domain = domains[domainHash];
        require(domain.owner == msg.sender, "Not the domain owner");

        uint256 newExpiresAt = domain.expiresAt + expirationPeriod;
        domain.expiresAt = newExpiresAt;

        emit DomainRenewed(domainHash, newExpiresAt, block.timestamp);
    }

    /**
     * @dev Update domain metadata
     * @param domainName The domain name
     * @param metadata New metadata JSON string
     */
    function updateDomainMetadata(string memory domainName, string memory metadata) public {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        Domain storage domain = domains[domainHash];
        require(domain.owner == msg.sender, "Not the domain owner");

        domain.metadata = metadata;

        emit DomainMetadataUpdated(domainHash, metadata, block.timestamp);
    }

    /**
     * @dev Get all domains owned by an address
     * @param owner Address to query
     * @return domainHashes Array of domain hashes
     */
    function getOwnedDomains(address owner) public view returns (bytes32[] memory) {
        return _ownerDomains[owner];
    }

    /**
     * @dev Get domain details
     * @param domainName The domain name
     * @return domain The domain struct
     */
    function getDomainDetails(string memory domainName) public view returns (Domain memory) {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        require(_domainExists[domainHash], "Domain does not exist");

        return domains[domainHash];
    }

    /**
     * @dev Check if domain exists
     * @param domainName The domain name to check
     * @return exists True if domain exists
     */
    function domainExists(string memory domainName) public view returns (bool) {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));
        return _domainExists[domainHash];
    }

    /**
     * @dev Check if domain is available for registration
     * @param domainName The domain name to check
     * @return available True if domain is available
     */
    function isDomainAvailable(string memory domainName) public view returns (bool) {
        bytes32 domainHash = keccak256(abi.encodePacked(domainName));

        if (!_domainExists[domainHash]) {
            return true;
        }

        Domain memory domain = domains[domainHash];

        // Domain is available if expired
        return block.timestamp >= domain.expiresAt;
    }

    /**
     * @dev Set registration fee (owner only)
     * @param newFee New registration fee in wei
     */
    function setRegistrationFee(uint256 newFee) public onlyOwner {
        registrationFee = newFee;
    }

    /**
     * @dev Set expiration period (owner only)
     * @param newPeriod New expiration period in seconds
     */
    function setExpirationPeriod(uint256 newPeriod) public onlyOwner {
        expirationPeriod = newPeriod;
    }

    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Get domain hash
     * @param domainName The domain name
     * @return domainHash The keccak256 hash
     */
    function getDomainHash(string memory domainName) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(domainName));
    }
}
