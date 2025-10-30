// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RedeemLinksEscrow
 * @notice Escrow contract for creating and redeeming token links on Push Chain
 * @dev Uses hash-based verification for secure token redemption
 */
contract RedeemLinksEscrow {
    struct RedeemLink {
        address creator;
        uint256 amount;
        bool redeemed;
        uint256 createdAt;
        uint256 expiresAt;
        bytes32 secretHash; // Store the hash of the secret
    }

    // Mapping from linkId hash to RedeemLink
    mapping(bytes32 => RedeemLink) public redeemLinks;

    // Events
    event LinkCreated(
        bytes32 indexed linkId,
        address indexed creator,
        uint256 amount,
        uint256 expiresAt
    );

    event LinkRedeemed(
        bytes32 indexed linkId,
        address indexed redeemer,
        uint256 amount
    );

    event LinkCanceled(
        bytes32 indexed linkId,
        address indexed creator,
        uint256 amount
    );

    /**
     * @notice Create a new redeem link
     * @param linkHash Hash of the secret key (keccak256(secret))
     * @param expiresIn Time in seconds until link expires (0 for no expiry)
     * @return linkId The unique identifier for this redeem link
     */
    function createRedeemLink(bytes32 linkHash, uint256 expiresIn)
        external
        payable
        returns (bytes32 linkId)
    {
        require(msg.value > 0, "Must send tokens");
        require(linkHash != bytes32(0), "Invalid link hash");

        // Generate unique linkId from creator, amount, timestamp, and hash
        linkId = keccak256(
            abi.encodePacked(
                msg.sender,
                msg.value,
                block.timestamp,
                linkHash
            )
        );

        require(redeemLinks[linkId].creator == address(0), "Link already exists");

        uint256 expiresAt = expiresIn > 0 ? block.timestamp + expiresIn : 0;

        redeemLinks[linkId] = RedeemLink({
            creator: msg.sender,
            amount: msg.value,
            redeemed: false,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            secretHash: linkHash
        });

        emit LinkCreated(linkId, msg.sender, msg.value, expiresAt);
    }

    /**
     * @notice Redeem tokens from a link using the secret
     * @param linkId The unique identifier of the redeem link
     * @param secret The secret key for this link
     */
    function redeemTokens(bytes32 linkId, string memory secret) external {
        RedeemLink storage link = redeemLinks[linkId];

        require(link.creator != address(0), "Link does not exist");
        require(!link.redeemed, "Link already redeemed");
        require(
            link.expiresAt == 0 || block.timestamp <= link.expiresAt,
            "Link has expired"
        );

        // Verify secret matches the stored hash
        bytes32 providedHash = keccak256(abi.encodePacked(secret));
        require(providedHash == link.secretHash, "Invalid secret");

        link.redeemed = true;

        // Transfer tokens to redeemer
        (bool success, ) = msg.sender.call{value: link.amount}("");
        require(success, "Transfer failed");

        emit LinkRedeemed(linkId, msg.sender, link.amount);
    }

    /**
     * @notice Redeem tokens from a link to a specific address
     * @param linkId The unique identifier of the redeem link
     * @param secret The secret key for this link
     * @param recipient The address to receive the tokens
     */
    function redeemTokensTo(
        bytes32 linkId,
        string memory secret,
        address payable recipient
    ) external {
        require(recipient != address(0), "Invalid recipient address");

        RedeemLink storage link = redeemLinks[linkId];

        require(link.creator != address(0), "Link does not exist");
        require(!link.redeemed, "Link already redeemed");
        require(
            link.expiresAt == 0 || block.timestamp <= link.expiresAt,
            "Link has expired"
        );

        // Verify secret matches the stored hash
        bytes32 providedHash = keccak256(abi.encodePacked(secret));
        require(providedHash == link.secretHash, "Invalid secret");

        link.redeemed = true;

        // Transfer tokens to specified recipient
        (bool success, ) = recipient.call{value: link.amount}("");
        require(success, "Transfer failed");

        emit LinkRedeemed(linkId, recipient, link.amount);
    }

    /**
     * @notice Cancel an unredeemed link and refund creator
     * @param linkId The unique identifier of the redeem link
     */
    function cancelLink(bytes32 linkId) external {
        RedeemLink storage link = redeemLinks[linkId];

        require(link.creator == msg.sender, "Only creator can cancel");
        require(!link.redeemed, "Link already redeemed");

        uint256 amount = link.amount;
        link.redeemed = true; // Mark as redeemed to prevent re-entry

        // Refund creator
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund failed");

        emit LinkCanceled(linkId, msg.sender, amount);
    }

    /**
     * @notice Get details of a redeem link
     * @param linkId The unique identifier of the redeem link
     */
    function getLinkDetails(bytes32 linkId)
        external
        view
        returns (
            address creator,
            uint256 amount,
            bool redeemed,
            uint256 createdAt,
            uint256 expiresAt
        )
    {
        RedeemLink memory link = redeemLinks[linkId];
        return (
            link.creator,
            link.amount,
            link.redeemed,
            link.createdAt,
            link.expiresAt
        );
    }

    /**
     * @notice Check if a link is still valid
     * @param linkId The unique identifier of the redeem link
     */
    function isLinkValid(bytes32 linkId) external view returns (bool) {
        RedeemLink memory link = redeemLinks[linkId];

        if (link.creator == address(0)) return false;
        if (link.redeemed) return false;
        if (link.expiresAt > 0 && block.timestamp > link.expiresAt) return false;

        return true;
    }

    /**
     * @notice Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
