// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AddressBook
 * @dev Store and manage personal contacts on-chain
 * @notice Users can save addresses with names for easy reference in transactions
 */
contract AddressBook {
    struct Contact {
        string name;
        address wallet;
        string notes;
        uint256 addedAt;
        bool active;
    }

    // user => contactName => Contact
    mapping(address => mapping(string => Contact)) private contacts;

    // user => list of contact names
    mapping(address => string[]) private contactNames;

    // Track total contacts per user
    mapping(address => uint256) private contactCount;

    event ContactAdded(address indexed user, string name, address wallet);
    event ContactUpdated(address indexed user, string name, address newWallet);
    event ContactRemoved(address indexed user, string name);

    /**
     * @dev Add a new contact
     * @param name Contact name (must be unique for the user)
     * @param wallet Contact's wallet address
     * @param notes Optional notes about the contact
     */
    function addContact(
        string calldata name,
        address wallet,
        string calldata notes
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(wallet != address(0), "Invalid address");
        require(!contacts[msg.sender][name].active, "Contact already exists");

        contacts[msg.sender][name] = Contact({
            name: name,
            wallet: wallet,
            notes: notes,
            addedAt: block.timestamp,
            active: true
        });

        contactNames[msg.sender].push(name);
        contactCount[msg.sender]++;

        emit ContactAdded(msg.sender, name, wallet);
    }

    /**
     * @dev Update an existing contact
     * @param name Contact name to update
     * @param newWallet New wallet address
     * @param notes New notes
     */
    function updateContact(
        string calldata name,
        address newWallet,
        string calldata notes
    ) external {
        require(contacts[msg.sender][name].active, "Contact not found");
        require(newWallet != address(0), "Invalid address");

        contacts[msg.sender][name].wallet = newWallet;
        contacts[msg.sender][name].notes = notes;

        emit ContactUpdated(msg.sender, name, newWallet);
    }

    /**
     * @dev Remove a contact
     * @param name Contact name to remove
     */
    function removeContact(string calldata name) external {
        require(contacts[msg.sender][name].active, "Contact not found");

        contacts[msg.sender][name].active = false;
        contactCount[msg.sender]--;

        emit ContactRemoved(msg.sender, name);
    }

    /**
     * @dev Get a specific contact by name
     * @param name Contact name
     * @return Contact details
     */
    function getContact(string calldata name) external view returns (Contact memory) {
        require(contacts[msg.sender][name].active, "Contact not found");
        return contacts[msg.sender][name];
    }

    /**
     * @dev Get all active contacts for the caller
     * @return Array of all active contacts
     */
    function getAllContacts() external view returns (Contact[] memory) {
        string[] memory names = contactNames[msg.sender];
        uint256 activeCount = contactCount[msg.sender];

        Contact[] memory result = new Contact[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < names.length && index < activeCount; i++) {
            if (contacts[msg.sender][names[i]].active) {
                result[index] = contacts[msg.sender][names[i]];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Search contacts by name (case-sensitive substring match)
     * @param query Search query
     * @return Array of matching contacts
     */
    function searchContacts(string calldata query) external view returns (Contact[] memory) {
        require(bytes(query).length > 0, "Query cannot be empty");

        string[] memory names = contactNames[msg.sender];
        uint256 activeCount = contactCount[msg.sender];

        // First pass: count matches
        Contact[] memory tempContacts = new Contact[](activeCount);
        uint256 matchCount = 0;

        for (uint256 i = 0; i < names.length; i++) {
            Contact memory contact = contacts[msg.sender][names[i]];
            if (contact.active && contains(contact.name, query)) {
                tempContacts[matchCount] = contact;
                matchCount++;
            }
        }

        // Second pass: create properly sized result array
        Contact[] memory result = new Contact[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            result[i] = tempContacts[i];
        }

        return result;
    }

    /**
     * @dev Resolve contact name to wallet address
     * @param name Contact name
     * @return Wallet address associated with the contact
     */
    function resolveContact(string calldata name) external view returns (address) {
        require(contacts[msg.sender][name].active, "Contact not found");
        return contacts[msg.sender][name].wallet;
    }

    /**
     * @dev Get total number of active contacts for the caller
     * @return Number of active contacts
     */
    function getContactCount() external view returns (uint256) {
        return contactCount[msg.sender];
    }

    /**
     * @dev Check if a contact name exists
     * @param name Contact name to check
     * @return true if contact exists and is active
     */
    function contactExists(string calldata name) external view returns (bool) {
        return contacts[msg.sender][name].active;
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
