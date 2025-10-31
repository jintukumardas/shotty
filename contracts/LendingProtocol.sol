// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LendingProtocol
 * @dev Decentralized lending and borrowing protocol with collateralization
 * Lend assets to earn interest, or borrow against collateral
 */
contract LendingProtocol is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant LIQUIDATION_THRESHOLD = 80; // 80% LTV
    uint256 public constant LIQUIDATION_PENALTY = 10; // 10% penalty
    uint256 public constant INTEREST_RATE_BASE = 5; // 5% base APR
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Structs
    struct Pool {
        uint256 totalSupply;
        uint256 totalBorrowed;
        uint256 interestRate;
        uint256 lastUpdateTime;
        bool isActive;
    }

    struct UserDeposit {
        uint256 amount;
        uint256 shares;
        uint256 depositTime;
        uint256 interestEarned;
    }

    struct UserLoan {
        uint256 borrowedAmount;
        uint256 collateralAmount;
        uint256 borrowTime;
        uint256 interestAccrued;
        bool isActive;
    }

    // State variables
    mapping(address => Pool) public pools;
    mapping(address => mapping(address => UserDeposit)) public deposits; // token => user => deposit
    mapping(address => mapping(address => UserLoan)) public loans; // user => token => loan
    mapping(address => uint256) public collateralValues; // Simplified: 1:1 value for demo

    address[] public supportedTokens;
    uint256 public platformFeePercent = 1; // 1% platform fee

    // Events
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount, uint256 interest);
    event Borrowed(address indexed user, address indexed token, uint256 amount, uint256 collateral);
    event Repaid(address indexed user, address indexed token, uint256 amount, uint256 interest);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 amount);
    event PoolCreated(address indexed token, uint256 initialInterestRate);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new lending pool for a token
     * @param token Token address
     * @param initialInterestRate Initial interest rate (in basis points, e.g., 500 = 5%)
     */
    function createPool(address token, uint256 initialInterestRate) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!pools[token].isActive, "Pool already exists");

        pools[token] = Pool({
            totalSupply: 0,
            totalBorrowed: 0,
            interestRate: initialInterestRate,
            lastUpdateTime: block.timestamp,
            isActive: true
        });

        supportedTokens.push(token);
        collateralValues[token] = 1 ether; // Set initial value (simplified 1:1 for demo)

        emit PoolCreated(token, initialInterestRate);
    }

    /**
     * @dev Deposit tokens to earn interest
     * @param token Token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(pools[token].isActive, "Pool not active");
        require(amount > 0, "Amount must be > 0");

        Pool storage pool = pools[token];
        UserDeposit storage userDeposit = deposits[token][msg.sender];

        // Update interest before deposit
        _updateInterest(token, msg.sender);

        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares
        uint256 shares;
        if (pool.totalSupply == 0) {
            shares = amount;
        } else {
            shares = (amount * pool.totalSupply) / (pool.totalSupply - pool.totalBorrowed);
        }

        userDeposit.amount += amount;
        userDeposit.shares += shares;
        userDeposit.depositTime = block.timestamp;

        pool.totalSupply += amount;
        pool.lastUpdateTime = block.timestamp;

        emit Deposited(msg.sender, token, amount);
    }

    /**
     * @dev Withdraw deposited tokens and earned interest
     * @param token Token to withdraw
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        Pool storage pool = pools[token];
        UserDeposit storage userDeposit = deposits[token][msg.sender];

        require(userDeposit.amount > 0, "No deposit");

        // Update interest
        _updateInterest(token, msg.sender);

        uint256 withdrawAmount = amount == 0 ? userDeposit.amount : amount;
        require(withdrawAmount <= userDeposit.amount, "Insufficient balance");
        require(withdrawAmount <= pool.totalSupply - pool.totalBorrowed, "Insufficient liquidity");

        uint256 interest = userDeposit.interestEarned;

        userDeposit.amount -= withdrawAmount;
        pool.totalSupply -= withdrawAmount;

        // Reset interest
        userDeposit.interestEarned = 0;

        // Transfer tokens back
        IERC20(token).safeTransfer(msg.sender, withdrawAmount + interest);

        emit Withdrawn(msg.sender, token, withdrawAmount, interest);
    }

    /**
     * @dev Borrow tokens by providing collateral
     * @param token Token to borrow
     * @param amount Amount to borrow
     */
    function borrow(address token, uint256 amount) external payable nonReentrant {
        require(pools[token].isActive, "Pool not active");
        require(amount > 0, "Amount must be > 0");
        require(msg.value > 0, "Must provide collateral");

        Pool storage pool = pools[token];
        UserLoan storage loan = loans[msg.sender][token];

        // Check available liquidity
        require(amount <= pool.totalSupply - pool.totalBorrowed, "Insufficient liquidity");

        // Check collateral is sufficient (150% collateralization ratio)
        uint256 requiredCollateral = (amount * 150) / 100;
        require(msg.value >= requiredCollateral, "Insufficient collateral");

        loan.borrowedAmount += amount;
        loan.collateralAmount += msg.value;
        loan.borrowTime = block.timestamp;
        loan.isActive = true;

        pool.totalBorrowed += amount;

        // Transfer borrowed tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, token, amount, msg.value);
    }

    /**
     * @dev Repay borrowed tokens
     * @param token Token to repay
     * @param amount Amount to repay (0 = repay all)
     */
    function repay(address token, uint256 amount) external nonReentrant {
        UserLoan storage loan = loans[msg.sender][token];

        require(loan.isActive, "No active loan");

        // Calculate accrued interest
        uint256 interest = _calculateLoanInterest(msg.sender, token);
        uint256 totalDebt = loan.borrowedAmount + interest;

        uint256 repayAmount = amount == 0 ? totalDebt : amount;
        require(repayAmount <= totalDebt, "Repay amount too high");

        // Transfer repayment from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), repayAmount);

        Pool storage pool = pools[token];
        pool.totalBorrowed -= (repayAmount > loan.borrowedAmount ? loan.borrowedAmount : repayAmount);

        // Calculate collateral to return
        uint256 collateralReturn = (loan.collateralAmount * repayAmount) / totalDebt;

        loan.borrowedAmount -= (repayAmount > loan.borrowedAmount ? loan.borrowedAmount : repayAmount - interest);
        loan.collateralAmount -= collateralReturn;

        if (loan.borrowedAmount == 0) {
            loan.isActive = false;
            // Return remaining collateral
            if (loan.collateralAmount > 0) {
                (bool success, ) = msg.sender.call{value: loan.collateralAmount}("");
                require(success, "Collateral return failed");
                loan.collateralAmount = 0;
            }
        }

        emit Repaid(msg.sender, token, repayAmount, interest);
    }

    /**
     * @dev Liquidate an undercollateralized loan
     * @param borrower Borrower address
     * @param token Loan token
     */
    function liquidate(address borrower, address token) external nonReentrant {
        UserLoan storage loan = loans[borrower][token];

        require(loan.isActive, "No active loan");

        uint256 interest = _calculateLoanInterest(borrower, token);
        uint256 totalDebt = loan.borrowedAmount + interest;

        // Check if loan is undercollateralized
        uint256 currentLTV = (totalDebt * 100) / loan.collateralAmount;
        require(currentLTV >= LIQUIDATION_THRESHOLD, "Loan not liquidatable");

        Pool storage pool = pools[token];

        // Liquidator repays the debt
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalDebt);

        pool.totalBorrowed -= loan.borrowedAmount;

        // Liquidator receives collateral + penalty
        uint256 liquidationReward = loan.collateralAmount;

        loan.borrowedAmount = 0;
        loan.collateralAmount = 0;
        loan.isActive = false;

        // Transfer collateral to liquidator
        (bool success, ) = msg.sender.call{value: liquidationReward}("");
        require(success, "Liquidation reward transfer failed");

        emit Liquidated(borrower, msg.sender, totalDebt);
    }

    /**
     * @dev Get user deposit info
     * @param token Token address
     * @param user User address
     * @return amount Deposited amount
     * @return interest Earned interest
     */
    function getUserDeposit(address token, address user)
        external
        view
        returns (uint256 amount, uint256 interest)
    {
        UserDeposit memory userDeposit = deposits[token][user];
        uint256 pendingInterest = _calculateDepositInterest(token, user);

        return (userDeposit.amount, userDeposit.interestEarned + pendingInterest);
    }

    /**
     * @dev Get user loan info
     * @param token Token address
     * @param user User address
     * @return borrowed Borrowed amount
     * @return collateral Collateral amount
     * @return interest Accrued interest
     */
    function getUserLoan(address token, address user)
        external
        view
        returns (uint256 borrowed, uint256 collateral, uint256 interest)
    {
        UserLoan memory loan = loans[user][token];
        uint256 accruedInterest = _calculateLoanInterest(user, token);

        return (loan.borrowedAmount, loan.collateralAmount, accruedInterest);
    }

    /**
     * @dev Get pool utilization rate
     * @param token Token address
     * @return utilization Utilization rate (0-100)
     */
    function getPoolUtilization(address token) external view returns (uint256 utilization) {
        Pool memory pool = pools[token];

        if (pool.totalSupply == 0) return 0;

        return (pool.totalBorrowed * 100) / pool.totalSupply;
    }

    /**
     * @dev Calculate deposit interest
     */
    function _calculateDepositInterest(address token, address user)
        internal
        view
        returns (uint256)
    {
        UserDeposit memory userDeposit = deposits[token][user];
        Pool memory pool = pools[token];

        if (userDeposit.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - userDeposit.depositTime;
        uint256 interest = (userDeposit.amount * pool.interestRate * timeElapsed) /
            (SECONDS_PER_YEAR * 10000);

        return interest;
    }

    /**
     * @dev Calculate loan interest
     */
    function _calculateLoanInterest(address user, address token)
        internal
        view
        returns (uint256)
    {
        UserLoan memory loan = loans[user][token];
        Pool memory pool = pools[token];

        if (!loan.isActive || loan.borrowedAmount == 0) return 0;

        uint256 timeElapsed = block.timestamp - loan.borrowTime;
        uint256 interest = (loan.borrowedAmount * pool.interestRate * timeElapsed) /
            (SECONDS_PER_YEAR * 10000);

        return interest + loan.interestAccrued;
    }

    /**
     * @dev Update interest for a user
     */
    function _updateInterest(address token, address user) internal {
        uint256 interest = _calculateDepositInterest(token, user);
        if (interest > 0) {
            deposits[token][user].interestEarned += interest;
            deposits[token][user].depositTime = block.timestamp;
        }
    }

    /**
     * @dev Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return supportedTokens;
    }

    /**
     * @dev Receive ETH for collateral
     */
    receive() external payable {}

    /**
     * @dev Withdraw stuck ETH (only owner)
     */
    function withdrawETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
