// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CustomERC20Token
 * @dev Standard ERC20 token with Ownable for ownership management
 */
contract CustomERC20Token is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsValue,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _decimals = decimalsValue;
        _mint(initialOwner, initialSupply * 10 ** decimalsValue);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Allows owner to mint additional tokens
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Allows owner to burn tokens from their own balance
     */
    function burn(uint256 amount) public onlyOwner {
        _burn(msg.sender, amount);
    }
}

/**
 * @title ERC20TokenFactory
 * @dev Factory contract for deploying custom ERC20 tokens
 */
contract ERC20TokenFactory {
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint8 decimals,
        uint256 timestamp
    );

    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        uint256 totalSupply;
        uint8 decimals;
        uint256 createdAt;
    }

    // Mapping from creator address to their created tokens
    mapping(address => address[]) public creatorTokens;

    // Mapping from token address to token info
    mapping(address => TokenInfo) public tokenInfo;

    // Array of all created tokens
    address[] public allTokens;

    /**
     * @dev Creates a new ERC20 token
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialSupply The initial supply (will be multiplied by 10^decimals)
     * @param decimals The number of decimals for the token
     * @return The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals
    ) external returns (address) {
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(decimals <= 18, "Decimals must be <= 18");

        // Deploy new token with msg.sender as owner
        CustomERC20Token newToken = new CustomERC20Token(
            name,
            symbol,
            initialSupply,
            decimals,
            msg.sender
        );

        address tokenAddress = address(newToken);

        // Store token information
        TokenInfo memory info = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            totalSupply: initialSupply * 10 ** decimals,
            decimals: decimals,
            createdAt: block.timestamp
        });

        tokenInfo[tokenAddress] = info;
        creatorTokens[msg.sender].push(tokenAddress);
        allTokens.push(tokenAddress);

        emit TokenCreated(
            tokenAddress,
            msg.sender,
            name,
            symbol,
            initialSupply * 10 ** decimals,
            decimals,
            block.timestamp
        );

        return tokenAddress;
    }

    /**
     * @dev Get all tokens created by a specific address
     * @param creator The address of the token creator
     * @return Array of token addresses
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @dev Get detailed information about tokens created by an address
     * @param creator The address of the token creator
     * @return Array of TokenInfo structs
     */
    function getCreatorTokensInfo(address creator) external view returns (TokenInfo[] memory) {
        address[] memory tokens = creatorTokens[creator];
        TokenInfo[] memory infos = new TokenInfo[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            infos[i] = tokenInfo[tokens[i]];
        }

        return infos;
    }

    /**
     * @dev Get information about a specific token
     * @param tokenAddress The address of the token
     * @return TokenInfo struct
     */
    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokenInfo[tokenAddress];
    }

    /**
     * @dev Get total number of tokens created
     * @return The number of tokens
     */
    function getTotalTokensCreated() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @dev Get all token addresses
     * @return Array of all token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
}
