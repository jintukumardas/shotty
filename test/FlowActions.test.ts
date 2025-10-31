import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { FlowActions } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FlowActions", function () {
  let flowActionsContract: FlowActions;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Action types enum
  const ActionType = {
    Transfer: 0,
    Swap: 1,
    Stake: 2,
    Lend: 3,
    Borrow: 4,
    Custom: 5
  };

  // Workflow status enum
  const WorkflowStatus = {
    Pending: 0,
    Executing: 1,
    Completed: 2,
    Failed: 3,
    Cancelled: 4
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const FlowActionsFactory = await ethers.getContractFactory("FlowActions");
    flowActionsContract = await FlowActionsFactory.deploy();
    await flowActionsContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await flowActionsContract.owner()).to.equal(owner.address);
    });

    it("Should start with workflow ID 1", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Send 0.1 ETH"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test Workflow", false);

      const workflow = await flowActionsContract.getWorkflow(1);
      expect(workflow.id).to.equal(1);
    });
  });

  describe("Create Workflow", function () {
    it("Should create a workflow successfully", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Transfer test"
        }
      ];

      await expect(
        flowActionsContract.connect(user1).createWorkflow(actions, "Test Workflow", false)
      ).to.emit(flowActionsContract, "WorkflowCreated");
    });

    it("Should store workflow details correctly", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Transfer"
        },
        {
          actionType: ActionType.Custom,
          target: user2.address,
          data: "0xabcd",
          value: 0,
          description: "Custom action"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Multi-Action Workflow", false);

      const workflow = await flowActionsContract.getWorkflow(1);
      expect(workflow.creator).to.equal(user1.address);
      expect(workflow.name).to.equal("Multi-Action Workflow");
      expect(workflow.actionsCount).to.equal(2);
      expect(workflow.status).to.equal(WorkflowStatus.Pending);
    });

    it("Should track user workflows", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: 0,
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Workflow 1", false);
      await flowActionsContract.connect(user1).createWorkflow(actions, "Workflow 2", false);

      const workflows = await flowActionsContract.getUserWorkflows(user1.address);
      expect(workflows.length).to.equal(2);
      expect(workflows[0]).to.equal(1);
      expect(workflows[1]).to.equal(2);
    });

    it("Should reject empty actions array", async function () {
      await expect(
        flowActionsContract.connect(user1).createWorkflow([], "Empty Workflow", false)
      ).to.be.revertedWith("No actions provided");
    });

    it("Should reject too many actions", async function () {
      const actions = Array(21).fill({
        actionType: ActionType.Transfer,
        target: user2.address,
        data: "0x",
        value: 0,
        description: "Test"
      });

      await expect(
        flowActionsContract.connect(user1).createWorkflow(actions, "Too Many Actions", false)
      ).to.be.revertedWith("Too many actions (max 20)");
    });
  });

  describe("Execute Workflow", function () {
    it("Should execute a simple workflow", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Send ETH"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Simple Transfer", false);

      const initialBalance = await ethers.provider.getBalance(user2.address);

      await expect(
        flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.1") })
      ).to.emit(flowActionsContract, "WorkflowExecuted");

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.1"));

      const workflow = await flowActionsContract.getWorkflow(1);
      expect(workflow.status).to.equal(WorkflowStatus.Completed);
    });

    it("Should execute multiple actions in sequence", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Transfer 1"
        },
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.2"),
          description: "Transfer 2"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Multi Transfer", false);

      const initialBalance = await ethers.provider.getBalance(user2.address);

      await flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.3") });

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.3"));
    });

    it("Should only allow creator to execute workflow", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);

      await expect(
        flowActionsContract.connect(user2).executeWorkflow(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Not workflow creator");
    });

    it("Should not allow executing same workflow twice", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);
      await flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.1") });

      await expect(
        flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Workflow not pending");
    });

    it("Should handle partial failures when allowed", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Good transfer"
        },
        {
          actionType: ActionType.Custom,
          target: ethers.ZeroAddress,
          data: "0x",
          value: 0,
          description: "Bad action"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Partial Failure Test", true);

      // Should not revert even though second action fails
      await expect(
        flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.1") })
      ).to.emit(flowActionsContract, "WorkflowExecuted");
    });

    it("Should revert on failure when allowPartialFailure is false", async function () {
      // Deploy a test contract to call with invalid function
      const TestContract = await ethers.getContractFactory("AddressBook");
      const testContract = await TestContract.deploy();
      await testContract.waitForDeployment();

      const iface = new ethers.Interface([
        "function nonExistentFunction()"
      ]);

      const actions = [
        {
          actionType: ActionType.Custom,
          target: await testContract.getAddress(),
          data: iface.encodeFunctionData("nonExistentFunction"),
          value: 0,
          description: "Bad action"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Fail Test", false);

      await flowActionsContract.connect(user1).executeWorkflow(1, { value: 0 });

      // Check workflow status is Failed
      const workflow = await flowActionsContract.getWorkflow(1);
      expect(workflow.status).to.equal(WorkflowStatus.Failed);
    });
  });

  describe("Create and Execute Workflow", function () {
    it("Should create and execute in one transaction", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Quick transfer"
        }
      ];

      const initialBalance = await ethers.provider.getBalance(user2.address);

      await expect(
        flowActionsContract.connect(user1).createAndExecuteWorkflow(
          actions,
          "Quick Workflow",
          false,
          { value: ethers.parseEther("0.1") }
        )
      ).to.emit(flowActionsContract, "WorkflowCreated").and.to.emit(flowActionsContract, "WorkflowExecuted");

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.1"));
    });
  });

  describe("Cancel Workflow", function () {
    it("Should allow creator to cancel pending workflow", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);

      await expect(
        flowActionsContract.connect(user1).cancelWorkflow(1)
      ).to.emit(flowActionsContract, "WorkflowCancelled");

      const workflow = await flowActionsContract.getWorkflow(1);
      expect(workflow.status).to.equal(WorkflowStatus.Cancelled);
    });

    it("Should not allow non-creator to cancel", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: 0,
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);

      await expect(
        flowActionsContract.connect(user2).cancelWorkflow(1)
      ).to.be.revertedWith("Not workflow creator");
    });

    it("Should not allow cancelling executed workflow", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: ethers.parseEther("0.1"),
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);
      await flowActionsContract.connect(user1).executeWorkflow(1, { value: ethers.parseEther("0.1") });

      await expect(
        flowActionsContract.connect(user1).cancelWorkflow(1)
      ).to.be.revertedWith("Workflow not pending");
    });
  });

  describe("Get Workflow Action", function () {
    it("Should retrieve action details", async function () {
      const actions = [
        {
          actionType: ActionType.Swap,
          target: user2.address,
          data: "0xabcd1234",
          value: ethers.parseEther("1.0"),
          description: "Swap tokens"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);

      const action = await flowActionsContract.getWorkflowAction(1, 0);
      expect(action.actionType).to.equal(ActionType.Swap);
      expect(action.target).to.equal(user2.address);
      expect(action.value).to.equal(ethers.parseEther("1.0"));
      expect(action.description).to.equal("Swap tokens");
    });

    it("Should revert for invalid action index", async function () {
      const actions = [
        {
          actionType: ActionType.Transfer,
          target: user2.address,
          data: "0x",
          value: 0,
          description: "Test"
        }
      ];

      await flowActionsContract.connect(user1).createWorkflow(actions, "Test", false);

      await expect(
        flowActionsContract.getWorkflowAction(1, 5)
      ).to.be.revertedWith("Invalid action index");
    });
  });

  describe("Connector Registration", function () {
    it("Should allow owner to register connectors", async function () {
      await expect(
        flowActionsContract.registerConnector("UniswapV3", user2.address)
      ).to.emit(flowActionsContract, "ConnectorRegistered");

      expect(
        await flowActionsContract.isConnectorRegistered("UniswapV3", user2.address)
      ).to.be.true;
    });

    it("Should not allow non-owner to register connectors", async function () {
      await expect(
        flowActionsContract.connect(user1).registerConnector("Test", user2.address)
      ).to.be.reverted;
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({
        to: await flowActionsContract.getAddress(),
        value: ethers.parseEther("1.0")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      await flowActionsContract.withdrawETH();

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        flowActionsContract.connect(user1).withdrawETH()
      ).to.be.reverted;
    });
  });
});
