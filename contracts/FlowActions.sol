// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FlowActions
 * @dev Composable transaction workflows with connectors and actions
 * Based on Flow's Forte Flow Actions pattern for building complex DeFi workflows
 */
contract FlowActions is Ownable, ReentrancyGuard {

    // Enums
    enum ActionType {
        Transfer,      // Simple token transfer
        Swap,          // Token swap
        Stake,         // Stake tokens
        Lend,          // Lend tokens
        Borrow,        // Borrow tokens
        Custom         // Custom action via contract call
    }

    enum WorkflowStatus {
        Pending,
        Executing,
        Completed,
        Failed,
        Cancelled
    }

    // Structs
    struct Action {
        ActionType actionType;
        address target;        // Target contract
        bytes data;            // Encoded function call
        uint256 value;         // ETH value
        string description;
    }

    struct Workflow {
        uint256 id;
        address creator;
        Action[] actions;
        WorkflowStatus status;
        uint256 createdAt;
        uint256 executedAt;
        string name;
        bool allowPartialFailure;
    }

    struct WorkflowResult {
        uint256 workflowId;
        bool success;
        uint256 completedActions;
        bytes[] results;
    }

    // State variables
    uint256 public nextWorkflowId = 1;
    mapping(uint256 => Workflow) public workflows;
    mapping(address => uint256[]) public userWorkflows;
    mapping(bytes32 => bool) public registeredConnectors;

    // Events
    event WorkflowCreated(uint256 indexed workflowId, address indexed creator, string name);
    event WorkflowExecuted(uint256 indexed workflowId, bool success, uint256 actionsCompleted);
    event WorkflowCancelled(uint256 indexed workflowId);
    event ActionExecuted(uint256 indexed workflowId, uint256 actionIndex, bool success);
    event ConnectorRegistered(bytes32 indexed connectorHash, string name);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new workflow with multiple actions
     * @param actions Array of actions to execute
     * @param name Human-readable workflow name
     * @param allowPartialFailure Whether to continue if an action fails
     * @return workflowId Unique workflow identifier
     */
    function createWorkflow(
        Action[] calldata actions,
        string calldata name,
        bool allowPartialFailure
    ) public returns (uint256 workflowId) {
        require(actions.length > 0, "No actions provided");
        require(actions.length <= 20, "Too many actions (max 20)");

        workflowId = nextWorkflowId++;

        Workflow storage workflow = workflows[workflowId];
        workflow.id = workflowId;
        workflow.creator = msg.sender;
        workflow.status = WorkflowStatus.Pending;
        workflow.createdAt = block.timestamp;
        workflow.name = name;
        workflow.allowPartialFailure = allowPartialFailure;

        // Copy actions
        for (uint256 i = 0; i < actions.length; i++) {
            workflow.actions.push(actions[i]);
        }

        userWorkflows[msg.sender].push(workflowId);

        emit WorkflowCreated(workflowId, msg.sender, name);

        return workflowId;
    }

    /**
     * @dev Execute a workflow
     * @param workflowId Workflow ID to execute
     * @return result WorkflowResult with execution details
     */
    function executeWorkflow(uint256 workflowId)
        public
        payable
        nonReentrant
        returns (WorkflowResult memory result)
    {
        Workflow storage workflow = workflows[workflowId];

        require(workflow.id != 0, "Workflow does not exist");
        require(workflow.creator == msg.sender, "Not workflow creator");
        require(workflow.status == WorkflowStatus.Pending, "Workflow not pending");

        workflow.status = WorkflowStatus.Executing;

        result.workflowId = workflowId;
        result.results = new bytes[](workflow.actions.length);
        result.completedActions = 0;
        result.success = true;

        // Execute each action in sequence
        for (uint256 i = 0; i < workflow.actions.length; i++) {
            Action memory action = workflow.actions[i];

            (bool success, bytes memory returnData) = action.target.call{
                value: action.value
            }(action.data);

            result.results[i] = returnData;

            if (success) {
                result.completedActions++;
                emit ActionExecuted(workflowId, i, true);
            } else {
                emit ActionExecuted(workflowId, i, false);

                if (!workflow.allowPartialFailure) {
                    result.success = false;
                    workflow.status = WorkflowStatus.Failed;
                    emit WorkflowExecuted(workflowId, false, result.completedActions);
                    return result;
                }

                result.success = false;
            }
        }

        workflow.status = result.success ? WorkflowStatus.Completed : WorkflowStatus.Failed;
        workflow.executedAt = block.timestamp;

        emit WorkflowExecuted(workflowId, result.success, result.completedActions);

        return result;
    }

    /**
     * @dev Create and immediately execute a workflow
     * @param actions Array of actions
     * @param name Workflow name
     * @param allowPartialFailure Allow partial failures
     * @return result Workflow execution result
     */
    function createAndExecuteWorkflow(
        Action[] calldata actions,
        string calldata name,
        bool allowPartialFailure
    ) external payable nonReentrant returns (WorkflowResult memory result) {
        require(actions.length > 0, "No actions provided");
        require(actions.length <= 20, "Too many actions (max 20)");

        uint256 workflowId = nextWorkflowId++;

        Workflow storage workflow = workflows[workflowId];
        workflow.id = workflowId;
        workflow.creator = msg.sender;
        workflow.status = WorkflowStatus.Executing;
        workflow.createdAt = block.timestamp;
        workflow.name = name;
        workflow.allowPartialFailure = allowPartialFailure;

        // Copy actions
        for (uint256 i = 0; i < actions.length; i++) {
            workflow.actions.push(actions[i]);
        }

        userWorkflows[msg.sender].push(workflowId);

        emit WorkflowCreated(workflowId, msg.sender, name);

        // Execute immediately
        result.workflowId = workflowId;
        result.results = new bytes[](workflow.actions.length);
        result.completedActions = 0;
        result.success = true;

        // Execute each action in sequence
        for (uint256 i = 0; i < workflow.actions.length; i++) {
            Action memory action = workflow.actions[i];

            (bool success, bytes memory returnData) = action.target.call{
                value: action.value
            }(action.data);

            result.results[i] = returnData;

            if (success) {
                result.completedActions++;
                emit ActionExecuted(workflowId, i, true);
            } else {
                emit ActionExecuted(workflowId, i, false);

                if (!workflow.allowPartialFailure) {
                    result.success = false;
                    workflow.status = WorkflowStatus.Failed;
                    emit WorkflowExecuted(workflowId, false, result.completedActions);
                    return result;
                }

                result.success = false;
            }
        }

        workflow.status = result.success ? WorkflowStatus.Completed : WorkflowStatus.Failed;
        workflow.executedAt = block.timestamp;

        emit WorkflowExecuted(workflowId, result.success, result.completedActions);

        return result;
    }

    /**
     * @dev Cancel a pending workflow
     * @param workflowId Workflow ID
     */
    function cancelWorkflow(uint256 workflowId) external {
        Workflow storage workflow = workflows[workflowId];

        require(workflow.id != 0, "Workflow does not exist");
        require(workflow.creator == msg.sender, "Not workflow creator");
        require(workflow.status == WorkflowStatus.Pending, "Workflow not pending");

        workflow.status = WorkflowStatus.Cancelled;

        emit WorkflowCancelled(workflowId);
    }

    /**
     * @dev Register a connector for reusable actions
     * @param connectorName Connector name
     * @param connectorAddress Connector contract address
     */
    function registerConnector(
        string calldata connectorName,
        address connectorAddress
    ) external onlyOwner {
        bytes32 connectorHash = keccak256(abi.encodePacked(connectorName, connectorAddress));
        registeredConnectors[connectorHash] = true;

        emit ConnectorRegistered(connectorHash, connectorName);
    }

    /**
     * @dev Quick action: Swap and Stake
     * @param swapTarget Swap contract address
     * @param swapData Encoded swap function call
     * @param stakeTarget Stake contract address
     * @param stakeData Encoded stake function call
     * @return workflowId Created workflow ID
     */
    function quickSwapAndStake(
        address swapTarget,
        bytes calldata swapData,
        address stakeTarget,
        bytes calldata stakeData
    ) external payable returns (uint256 workflowId) {
        workflowId = nextWorkflowId++;

        Workflow storage workflow = workflows[workflowId];
        workflow.id = workflowId;
        workflow.creator = msg.sender;
        workflow.status = WorkflowStatus.Pending;
        workflow.createdAt = block.timestamp;
        workflow.name = "Swap and Stake";
        workflow.allowPartialFailure = false;

        // Add swap action
        workflow.actions.push(Action({
            actionType: ActionType.Swap,
            target: swapTarget,
            data: swapData,
            value: msg.value / 2,
            description: "Swap tokens"
        }));

        // Add stake action
        workflow.actions.push(Action({
            actionType: ActionType.Stake,
            target: stakeTarget,
            data: stakeData,
            value: msg.value / 2,
            description: "Stake tokens"
        }));

        userWorkflows[msg.sender].push(workflowId);

        emit WorkflowCreated(workflowId, msg.sender, "Swap and Stake");

        return workflowId;
    }

    /**
     * @dev Get workflow details
     * @param workflowId Workflow ID
     * @return id Workflow ID
     * @return creator Creator address
     * @return status Current status
     * @return actionsCount Number of actions
     * @return name Workflow name
     */
    function getWorkflow(uint256 workflowId)
        external
        view
        returns (
            uint256 id,
            address creator,
            WorkflowStatus status,
            uint256 actionsCount,
            string memory name
        )
    {
        Workflow storage workflow = workflows[workflowId];
        return (
            workflow.id,
            workflow.creator,
            workflow.status,
            workflow.actions.length,
            workflow.name
        );
    }

    /**
     * @dev Get action details from a workflow
     * @param workflowId Workflow ID
     * @param actionIndex Action index
     * @return action Action details
     */
    function getWorkflowAction(uint256 workflowId, uint256 actionIndex)
        external
        view
        returns (Action memory action)
    {
        require(workflows[workflowId].id != 0, "Workflow does not exist");
        require(actionIndex < workflows[workflowId].actions.length, "Invalid action index");

        return workflows[workflowId].actions[actionIndex];
    }

    /**
     * @dev Get all workflows for a user
     * @param user User address
     * @return workflowIds Array of workflow IDs
     */
    function getUserWorkflows(address user)
        external
        view
        returns (uint256[] memory workflowIds)
    {
        return userWorkflows[user];
    }

    /**
     * @dev Check if connector is registered
     * @param connectorName Connector name
     * @param connectorAddress Connector address
     * @return registered Whether connector is registered
     */
    function isConnectorRegistered(
        string calldata connectorName,
        address connectorAddress
    ) external view returns (bool registered) {
        bytes32 connectorHash = keccak256(abi.encodePacked(connectorName, connectorAddress));
        return registeredConnectors[connectorHash];
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
