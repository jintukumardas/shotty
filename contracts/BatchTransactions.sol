// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BatchTransactions
 * @dev Execute multiple EVM operations in a single transaction for gas efficiency
 * Based on Flow's Cross-VM batched transactions pattern
 */
contract BatchTransactions is Ownable, ReentrancyGuard {

    // Events
    event BatchExecuted(address indexed executor, uint256 operationsCount, bool success);
    event OperationFailed(uint256 indexed operationIndex, bytes reason);

    // Structs
    struct Operation {
        address target;      // Target contract address
        uint256 value;       // ETH value to send
        bytes data;          // Encoded function call data
        bool allowFailure;   // Whether to continue if this operation fails
    }

    struct BatchResult {
        bool success;
        bytes[] results;
        uint256 failedCount;
    }

    // State variables
    uint256 public totalBatchesExecuted;
    mapping(address => uint256) public userBatchCount;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Execute a batch of operations atomically
     * @param operations Array of operations to execute
     * @param requireAllSuccess If true, revert on any failure. If false, continue and return results
     * @return result BatchResult containing success status and results
     */
    function executeBatch(
        Operation[] calldata operations,
        bool requireAllSuccess
    ) external payable nonReentrant returns (BatchResult memory result) {
        require(operations.length > 0, "No operations provided");
        require(operations.length <= 50, "Too many operations (max 50)");

        result.results = new bytes[](operations.length);
        result.failedCount = 0;
        result.success = true;

        uint256 totalValue = 0;
        for (uint256 i = 0; i < operations.length; i++) {
            totalValue += operations[i].value;
        }
        require(msg.value >= totalValue, "Insufficient ETH sent");

        // Execute each operation
        for (uint256 i = 0; i < operations.length; i++) {
            Operation calldata op = operations[i];

            (bool success, bytes memory returnData) = op.target.call{value: op.value}(op.data);

            if (!success) {
                result.failedCount++;
                result.results[i] = returnData;

                emit OperationFailed(i, returnData);

                if (requireAllSuccess || !op.allowFailure) {
                    revert("Operation failed");
                }

                result.success = false;
            } else {
                result.results[i] = returnData;
            }
        }

        // Update counters
        totalBatchesExecuted++;
        userBatchCount[msg.sender]++;

        // Refund excess ETH
        if (msg.value > totalValue) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalValue}("");
            require(refundSuccess, "Refund failed");
        }

        emit BatchExecuted(msg.sender, operations.length, result.success);

        return result;
    }

    /**
     * @dev Execute batch with simplified interface for common use case
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param datas Array of call data
     * @return success Whether all operations succeeded
     */
    function executeBatchSimple(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external payable nonReentrant returns (bool success) {
        require(
            targets.length == values.length && values.length == datas.length,
            "Array length mismatch"
        );
        require(targets.length > 0, "No operations provided");
        require(targets.length <= 50, "Too many operations (max 50)");

        bytes[] memory results = new bytes[](targets.length);
        uint256 failedCount = 0;
        success = true;

        uint256 totalValue = 0;
        for (uint256 i = 0; i < targets.length; i++) {
            totalValue += values[i];
        }
        require(msg.value >= totalValue, "Insufficient ETH sent");

        // Execute each operation
        for (uint256 i = 0; i < targets.length; i++) {
            (bool opSuccess, bytes memory returnData) = targets[i].call{value: values[i]}(datas[i]);

            if (!opSuccess) {
                failedCount++;
                results[i] = returnData;
                emit OperationFailed(i, returnData);
                success = false;
                revert("Operation failed");
            } else {
                results[i] = returnData;
            }
        }

        // Update counters
        totalBatchesExecuted++;
        userBatchCount[msg.sender]++;

        // Refund excess ETH
        if (msg.value > totalValue) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalValue}("");
            require(refundSuccess, "Refund failed");
        }

        emit BatchExecuted(msg.sender, targets.length, success);

        return success;
    }

    /**
     * @dev Helper to estimate gas for batch execution
     * @param operations Array of operations
     * @return estimatedGas Estimated gas cost
     */
    function estimateGas(Operation[] calldata operations)
        external
        pure
        returns (uint256 estimatedGas)
    {
        // Basic estimation: 21000 base + per operation costs
        estimatedGas = 21000;

        for (uint256 i = 0; i < operations.length; i++) {
            estimatedGas += 30000; // Approximate per-operation overhead
            if (operations[i].data.length > 0) {
                estimatedGas += operations[i].data.length * 16; // Data gas cost
            }
        }

        return estimatedGas;
    }

    /**
     * @dev Get batch execution statistics for a user
     * @param user User address
     * @return count Number of batches executed by user
     */
    function getUserStats(address user) external view returns (uint256 count) {
        return userBatchCount[user];
    }

    /**
     * @dev Withdraw stuck ETH (only owner)
     */
    function withdrawETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
