/**
 * Flow Actions Service
 * Handles composable transaction workflows with connectors and actions
 */

import { ethers, Contract } from 'ethers';

const FLOW_ACTIONS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS || '';
const FLOW_CHAIN_RPC = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';

export enum ActionType {
  Transfer = 0,
  Swap = 1,
  Stake = 2,
  Lend = 3,
  Borrow = 4,
  Custom = 5
}

export enum WorkflowStatus {
  Pending = 0,
  Executing = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4
}

// ABI for FlowActions contract
const FLOW_ACTIONS_ABI = [
  "function createWorkflow((uint8 actionType, address target, bytes data, uint256 value, string description)[] actions, string name, bool allowPartialFailure) returns (uint256)",
  "function executeWorkflow(uint256 workflowId) payable returns ((uint256 workflowId, bool success, uint256 completedActions, bytes[] results))",
  "function createAndExecuteWorkflow((uint8 actionType, address target, bytes data, uint256 value, string description)[] actions, string name, bool allowPartialFailure) payable returns ((uint256 workflowId, bool success, uint256 completedActions, bytes[] results))",
  "function cancelWorkflow(uint256 workflowId)",
  "function registerConnector(string connectorName, address connectorAddress)",
  "function quickSwapAndStake(address swapTarget, bytes swapData, address stakeTarget, bytes stakeData) payable returns (uint256)",
  "function getWorkflow(uint256 workflowId) view returns (uint256 id, address creator, uint8 status, uint256 actionsCount, string name)",
  "function getWorkflowAction(uint256 workflowId, uint256 actionIndex) view returns (tuple(uint8 actionType, address target, bytes data, uint256 value, string description))",
  "function getUserWorkflows(address user) view returns (uint256[])",
  "function isConnectorRegistered(string connectorName, address connectorAddress) view returns (bool)",
  "event WorkflowCreated(uint256 indexed workflowId, address indexed creator, string name)",
  "event WorkflowExecuted(uint256 indexed workflowId, bool success, uint256 actionsCompleted)",
  "event WorkflowCancelled(uint256 indexed workflowId)",
  "event ActionExecuted(uint256 indexed workflowId, uint256 actionIndex, bool success)",
  "event ConnectorRegistered(bytes32 indexed connectorHash, string name)"
];

export interface Action {
  actionType: ActionType;
  target: string;
  data: string;
  value: string;
  description: string;
}

export interface Workflow {
  id: number;
  creator: string;
  status: WorkflowStatus;
  actionsCount: number;
  name: string;
  actions?: Action[];
}

export interface WorkflowResult {
  workflowId: number;
  success: boolean;
  completedActions: number;
  results: string[];
}

/**
 * Flow Actions Service Class
 */
export class FlowActionsService {
  private contract: Contract;
  private readOnlyProvider: ethers.JsonRpcProvider;

  constructor() {
    this.readOnlyProvider = new ethers.JsonRpcProvider(FLOW_CHAIN_RPC);
    this.contract = new ethers.Contract(
      FLOW_ACTIONS_CONTRACT_ADDRESS,
      FLOW_ACTIONS_ABI,
      this.readOnlyProvider
    );
  }

  /**
   * Get write-enabled contract with signer
   */
  private async getWriteContract(): Promise<Contract> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Wallet not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return new ethers.Contract(FLOW_ACTIONS_CONTRACT_ADDRESS, FLOW_ACTIONS_ABI, signer);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    actions: Action[],
    name: string,
    allowPartialFailure: boolean = false
  ): Promise<{ workflowId: number; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const contractActions = actions.map(action => ({
        actionType: action.actionType,
        target: action.target,
        data: action.data || '0x',
        value: action.value || '0',
        description: action.description
      }));

      const tx = await contract.createWorkflow(contractActions, name, allowPartialFailure);
      const receipt = await tx.wait();

      // Parse event to get workflow ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('WorkflowCreated(uint256,address,string)')
      );

      let workflowId = 0;
      if (event) {
        const decoded = contract.interface.parseLog(event);
        workflowId = Number(decoded?.args[0] || 0);
      }

      return {
        workflowId,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Create workflow error:', error);
      throw new Error(error.message || 'Failed to create workflow');
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: number, totalValue?: string): Promise<WorkflowResult> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.executeWorkflow(workflowId, {
        value: totalValue || '0'
      });

      const receipt = await tx.wait();

      return {
        workflowId,
        success: true,
        completedActions: 0,
        results: []
      };
    } catch (error: any) {
      console.error('Execute workflow error:', error);
      throw new Error(error.message || 'Failed to execute workflow');
    }
  }

  /**
   * Create and immediately execute a workflow
   */
  async createAndExecuteWorkflow(
    actions: Action[],
    name: string,
    allowPartialFailure: boolean = false,
    totalValue?: string
  ): Promise<WorkflowResult> {
    try {
      const contract = await this.getWriteContract();

      const contractActions = actions.map(action => ({
        actionType: action.actionType,
        target: action.target,
        data: action.data || '0x',
        value: action.value || '0',
        description: action.description
      }));

      const tx = await contract.createAndExecuteWorkflow(
        contractActions,
        name,
        allowPartialFailure,
        { value: totalValue || '0' }
      );

      const receipt = await tx.wait();

      return {
        workflowId: 0,
        success: true,
        completedActions: actions.length,
        results: []
      };
    } catch (error: any) {
      console.error('Create and execute workflow error:', error);
      throw new Error(error.message || 'Failed to create and execute workflow');
    }
  }

  /**
   * Cancel a pending workflow
   */
  async cancelWorkflow(workflowId: number): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.cancelWorkflow(workflowId);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Cancel workflow error:', error);
      throw new Error(error.message || 'Failed to cancel workflow');
    }
  }

  /**
   * Quick action: Swap and Stake
   */
  async quickSwapAndStake(
    swapTarget: string,
    swapData: string,
    stakeTarget: string,
    stakeData: string,
    value: string
  ): Promise<{ workflowId: number; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.quickSwapAndStake(
        swapTarget,
        swapData,
        stakeTarget,
        stakeData,
        { value }
      );

      const receipt = await tx.wait();

      // Parse event to get workflow ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('WorkflowCreated(uint256,address,string)')
      );

      let workflowId = 0;
      if (event) {
        const decoded = contract.interface.parseLog(event);
        workflowId = Number(decoded?.args[0] || 0);
      }

      return {
        workflowId,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Quick swap and stake error:', error);
      throw new Error(error.message || 'Failed to execute swap and stake');
    }
  }

  /**
   * Get workflow details
   */
  async getWorkflow(workflowId: number): Promise<Workflow> {
    try {
      const workflow = await this.contract.getWorkflow(workflowId);

      return {
        id: Number(workflow.id),
        creator: workflow.creator,
        status: workflow.status as WorkflowStatus,
        actionsCount: Number(workflow.actionsCount),
        name: workflow.name
      };
    } catch (error: any) {
      console.error('Get workflow error:', error);
      throw new Error('Failed to get workflow');
    }
  }

  /**
   * Get workflow action details
   */
  async getWorkflowAction(workflowId: number, actionIndex: number): Promise<Action> {
    try {
      const action = await this.contract.getWorkflowAction(workflowId, actionIndex);

      return {
        actionType: action.actionType as ActionType,
        target: action.target,
        data: action.data,
        value: action.value.toString(),
        description: action.description
      };
    } catch (error: any) {
      console.error('Get workflow action error:', error);
      throw new Error('Failed to get workflow action');
    }
  }

  /**
   * Get all workflows for a user
   */
  async getUserWorkflows(userAddress: string): Promise<number[]> {
    try {
      const workflowIds = await this.contract.getUserWorkflows(userAddress);
      return workflowIds.map((id: bigint) => Number(id));
    } catch (error: any) {
      console.error('Get user workflows error:', error);
      throw new Error('Failed to get user workflows');
    }
  }

  /**
   * Get all workflows with details for a user
   */
  async getUserWorkflowsWithDetails(userAddress: string): Promise<Workflow[]> {
    try {
      const workflowIds = await this.getUserWorkflows(userAddress);
      const workflows: Workflow[] = [];

      for (const id of workflowIds) {
        const workflow = await this.getWorkflow(id);
        workflows.push(workflow);
      }

      return workflows;
    } catch (error: any) {
      console.error('Get user workflows with details error:', error);
      throw new Error('Failed to get user workflows with details');
    }
  }

  /**
   * Check if connector is registered
   */
  async isConnectorRegistered(connectorName: string, connectorAddress: string): Promise<boolean> {
    try {
      return await this.contract.isConnectorRegistered(connectorName, connectorAddress);
    } catch (error: any) {
      console.error('Is connector registered error:', error);
      return false;
    }
  }

  /**
   * Helper: Create a transfer action
   */
  createTransferAction(tokenAddress: string, recipient: string, amount: string): Action {
    const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);

    return {
      actionType: ActionType.Transfer,
      target: tokenAddress,
      data: iface.encodeFunctionData('transfer', [recipient, amount]),
      value: '0',
      description: `Transfer tokens to ${recipient}`
    };
  }

  /**
   * Helper: Create a swap action
   */
  createSwapAction(
    swapContract: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Action {
    // This is a simplified swap interface - adjust based on actual DEX
    const iface = new ethers.Interface([
      'function swap(address tokenIn, address tokenOut, uint256 amountIn)'
    ]);

    return {
      actionType: ActionType.Swap,
      target: swapContract,
      data: iface.encodeFunctionData('swap', [tokenIn, tokenOut, amountIn]),
      value: '0',
      description: `Swap tokens`
    };
  }

  /**
   * Helper: Create a custom action
   */
  createCustomAction(
    target: string,
    data: string,
    value: string,
    description: string
  ): Action {
    return {
      actionType: ActionType.Custom,
      target,
      data,
      value,
      description
    };
  }
}

// Export singleton instance
export const flowActionsService = new FlowActionsService();
