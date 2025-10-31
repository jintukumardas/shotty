// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ScheduledTransactions
 * @dev Schedule transactions for future execution with time-locks
 * Based on Flow's Forte scheduled transactions pattern
 */
contract ScheduledTransactions is Ownable, ReentrancyGuard {

    // Enums
    enum ScheduleStatus {
        Pending,
        Executed,
        Cancelled,
        Failed
    }

    // Structs
    struct ScheduledTx {
        uint256 id;
        address creator;
        address target;
        uint256 value;
        bytes data;
        uint256 executeAfter;
        uint256 executeWindow;  // Time window in which tx can be executed
        ScheduleStatus status;
        string description;
        uint256 createdAt;
        uint256 executedAt;
    }

    // State variables
    uint256 public nextScheduleId = 1;
    uint256 public minDelay = 1 minutes;
    uint256 public maxDelay = 365 days;
    uint256 public defaultWindow = 7 days;

    mapping(uint256 => ScheduledTx) public scheduledTransactions;
    mapping(address => uint256[]) public userSchedules;

    // Events
    event TransactionScheduled(
        uint256 indexed scheduleId,
        address indexed creator,
        address target,
        uint256 executeAfter,
        string description
    );

    event TransactionExecuted(uint256 indexed scheduleId, bool success);
    event TransactionCancelled(uint256 indexed scheduleId);
    event TransactionFailed(uint256 indexed scheduleId, bytes reason);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Schedule a transaction for future execution
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Encoded function call data
     * @param executeAfter Unix timestamp after which tx can be executed
     * @param executeWindow Time window for execution (0 = default)
     * @param description Human-readable description
     * @return scheduleId Unique identifier for the scheduled transaction
     */
    function scheduleTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeAfter,
        uint256 executeWindow,
        string calldata description
    ) public payable returns (uint256 scheduleId) {
        require(target != address(0), "Invalid target");
        require(executeAfter > block.timestamp, "Execution time must be in future");
        require(
            executeAfter <= block.timestamp + maxDelay,
            "Execution time too far in future"
        );
        require(
            executeAfter >= block.timestamp + minDelay,
            "Execution time too soon"
        );
        require(msg.value >= value, "Insufficient ETH sent");

        if (executeWindow == 0) {
            executeWindow = defaultWindow;
        }

        scheduleId = nextScheduleId++;

        scheduledTransactions[scheduleId] = ScheduledTx({
            id: scheduleId,
            creator: msg.sender,
            target: target,
            value: value,
            data: data,
            executeAfter: executeAfter,
            executeWindow: executeWindow,
            status: ScheduleStatus.Pending,
            description: description,
            createdAt: block.timestamp,
            executedAt: 0
        });

        userSchedules[msg.sender].push(scheduleId);

        emit TransactionScheduled(
            scheduleId,
            msg.sender,
            target,
            executeAfter,
            description
        );

        return scheduleId;
    }

    /**
     * @dev Execute a scheduled transaction
     * @param scheduleId ID of the scheduled transaction
     * @return success Whether execution succeeded
     */
    function executeScheduledTransaction(uint256 scheduleId)
        external
        nonReentrant
        returns (bool success)
    {
        ScheduledTx storage schedule = scheduledTransactions[scheduleId];

        require(schedule.id != 0, "Schedule does not exist");
        require(schedule.status == ScheduleStatus.Pending, "Not pending");
        require(block.timestamp >= schedule.executeAfter, "Too early to execute");
        require(
            block.timestamp <= schedule.executeAfter + schedule.executeWindow,
            "Execution window expired"
        );

        // Anyone can execute, but only within the time window
        (bool execSuccess, bytes memory returnData) = schedule.target.call{
            value: schedule.value
        }(schedule.data);

        if (execSuccess) {
            schedule.status = ScheduleStatus.Executed;
            schedule.executedAt = block.timestamp;
            emit TransactionExecuted(scheduleId, true);
            return true;
        } else {
            schedule.status = ScheduleStatus.Failed;
            emit TransactionFailed(scheduleId, returnData);
            emit TransactionExecuted(scheduleId, false);
            return false;
        }
    }

    /**
     * @dev Cancel a scheduled transaction (only creator can cancel)
     * @param scheduleId ID of the scheduled transaction
     */
    function cancelScheduledTransaction(uint256 scheduleId) external {
        ScheduledTx storage schedule = scheduledTransactions[scheduleId];

        require(schedule.id != 0, "Schedule does not exist");
        require(schedule.creator == msg.sender, "Not creator");
        require(schedule.status == ScheduleStatus.Pending, "Not pending");

        schedule.status = ScheduleStatus.Cancelled;

        // Refund ETH to creator
        if (schedule.value > 0) {
            (bool refundSuccess, ) = schedule.creator.call{value: schedule.value}("");
            require(refundSuccess, "Refund failed");
        }

        emit TransactionCancelled(scheduleId);
    }

    /**
     * @dev Schedule a simple token transfer
     * @param recipient Recipient address
     * @param amount Amount to send
     * @param executeAfter Execution timestamp
     * @param description Description
     * @return scheduleId Schedule ID
     */
    function scheduleTransfer(
        address payable recipient,
        uint256 amount,
        uint256 executeAfter,
        string calldata description
    ) external payable returns (uint256 scheduleId) {
        require(recipient != address(0), "Invalid recipient");
        require(executeAfter > block.timestamp, "Execution time must be in future");
        require(
            executeAfter <= block.timestamp + maxDelay,
            "Execution time too far in future"
        );
        require(
            executeAfter >= block.timestamp + minDelay,
            "Execution time too soon"
        );
        require(msg.value >= amount, "Insufficient ETH sent");

        scheduleId = nextScheduleId++;

        scheduledTransactions[scheduleId] = ScheduledTx({
            id: scheduleId,
            creator: msg.sender,
            target: recipient,
            value: amount,
            data: "0x",
            executeAfter: executeAfter,
            executeWindow: defaultWindow,
            status: ScheduleStatus.Pending,
            description: description,
            createdAt: block.timestamp,
            executedAt: 0
        });

        userSchedules[msg.sender].push(scheduleId);

        emit TransactionScheduled(
            scheduleId,
            msg.sender,
            recipient,
            executeAfter,
            description
        );

        return scheduleId;
    }

    /**
     * @dev Get all scheduled transactions for a user
     * @param user User address
     * @return scheduleIds Array of schedule IDs
     */
    function getUserSchedules(address user)
        external
        view
        returns (uint256[] memory scheduleIds)
    {
        return userSchedules[user];
    }

    /**
     * @dev Get detailed info about a scheduled transaction
     * @param scheduleId Schedule ID
     * @return schedule Full schedule details
     */
    function getSchedule(uint256 scheduleId)
        external
        view
        returns (ScheduledTx memory schedule)
    {
        return scheduledTransactions[scheduleId];
    }

    /**
     * @dev Check if a scheduled transaction is ready to execute
     * @param scheduleId Schedule ID
     * @return ready Whether the transaction can be executed now
     */
    function isReadyToExecute(uint256 scheduleId) external view returns (bool ready) {
        ScheduledTx memory schedule = scheduledTransactions[scheduleId];

        if (schedule.status != ScheduleStatus.Pending) return false;
        if (block.timestamp < schedule.executeAfter) return false;
        if (block.timestamp > schedule.executeAfter + schedule.executeWindow) return false;

        return true;
    }

    /**
     * @dev Get pending schedules count for a user
     * @param user User address
     * @return count Number of pending schedules
     */
    function getPendingSchedulesCount(address user)
        external
        view
        returns (uint256 count)
    {
        uint256[] memory schedules = userSchedules[user];
        count = 0;

        for (uint256 i = 0; i < schedules.length; i++) {
            if (scheduledTransactions[schedules[i]].status == ScheduleStatus.Pending) {
                count++;
            }
        }

        return count;
    }

    /**
     * @dev Update minimum delay (only owner)
     * @param newMinDelay New minimum delay in seconds
     */
    function setMinDelay(uint256 newMinDelay) external onlyOwner {
        require(newMinDelay > 0, "Invalid delay");
        minDelay = newMinDelay;
    }

    /**
     * @dev Update maximum delay (only owner)
     * @param newMaxDelay New maximum delay in seconds
     */
    function setMaxDelay(uint256 newMaxDelay) external onlyOwner {
        require(newMaxDelay > minDelay, "Invalid delay");
        maxDelay = newMaxDelay;
    }

    /**
     * @dev Receive ETH
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
