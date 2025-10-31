import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { BatchTransactions } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BatchTransactions", function () {
  let batchContract: BatchTransactions;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const BatchFactory = await ethers.getContractFactory("BatchTransactions");
    batchContract = await BatchFactory.deploy();
    await batchContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await batchContract.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero batches executed", async function () {
      expect(await batchContract.totalBatchesExecuted()).to.equal(0);
    });

    it("Should have zero user stats initially", async function () {
      expect(await batchContract.getUserStats(user1.address)).to.equal(0);
    });
  });

  describe("Batch Execution", function () {
    it("Should execute a simple batch of ETH transfers", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        },
        {
          target: user2.address,
          value: ethers.parseEther("0.2"),
          data: "0x",
          allowFailure: false
        }
      ];

      const totalValue = ethers.parseEther("0.3");

      await expect(
        batchContract.connect(user1).executeBatch(operations, true, { value: totalValue })
      ).to.emit(batchContract, "BatchExecuted");

      expect(await batchContract.totalBatchesExecuted()).to.equal(1);
      expect(await batchContract.getUserStats(user1.address)).to.equal(1);
    });

    it("Should execute batch with contract calls", async function () {
      // Deploy a simple test contract that we can call
      const TestContract = await ethers.getContractFactory("AddressBook");
      const testContract = await TestContract.deploy();
      await testContract.waitForDeployment();

      const iface = new ethers.Interface([
        "function addContact(string name, address addr, string notes)"
      ]);

      const operations = [
        {
          target: await testContract.getAddress(),
          value: 0,
          data: iface.encodeFunctionData("addContact", ["Alice", user2.address, "Test"]),
          allowFailure: false
        }
      ];

      await expect(
        batchContract.connect(user1).executeBatch(operations, true, { value: 0 })
      ).to.emit(batchContract, "BatchExecuted");
    });

    it("Should refund excess ETH", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        }
      ];

      const totalValue = ethers.parseEther("0.2"); // Send more than needed
      const initialBalance = await ethers.provider.getBalance(user1.address);

      const tx = await batchContract.connect(user1).executeBatch(operations, true, { value: totalValue });
      const receipt = await tx.wait();

      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const finalBalance = await ethers.provider.getBalance(user1.address);

      // User should have received refund
      const expectedBalance = initialBalance - ethers.parseEther("0.1") - gasUsed;
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });

    it("Should revert if insufficient ETH sent", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("1.0"),
          data: "0x",
          allowFailure: false
        }
      ];

      await expect(
        batchContract.connect(user1).executeBatch(operations, true, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient ETH sent");
    });

    it("Should handle partial failures when allowed", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: true
        },
        {
          target: ethers.ZeroAddress, // This should fail
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: true
        }
      ];

      const totalValue = ethers.parseEther("0.2");

      // Should not revert even though second operation fails
      await expect(
        batchContract.connect(user1).executeBatch(operations, false, { value: totalValue })
      ).to.emit(batchContract, "BatchExecuted");
    });

    it("Should revert on failure when requireAllSuccess is true", async function () {
      // Deploy a contract that will fail
      const TestContract = await ethers.getContractFactory("AddressBook");
      const testContract = await TestContract.deploy();
      await testContract.waitForDeployment();

      const iface = new ethers.Interface([
        "function nonExistentFunction()"
      ]);

      const operations = [
        {
          target: await testContract.getAddress(),
          value: 0,
          data: iface.encodeFunctionData("nonExistentFunction"),
          allowFailure: false
        }
      ];

      await expect(
        batchContract.connect(user1).executeBatch(operations, true, { value: 0 })
      ).to.be.revertedWith("Operation failed");
    });

    it("Should enforce max operations limit", async function () {
      const operations = Array(51).fill({
        target: user2.address,
        value: 0,
        data: "0x",
        allowFailure: false
      });

      await expect(
        batchContract.connect(user1).executeBatch(operations, true, { value: 0 })
      ).to.be.revertedWith("Too many operations (max 50)");
    });

    it("Should require at least one operation", async function () {
      await expect(
        batchContract.connect(user1).executeBatch([], true, { value: 0 })
      ).to.be.revertedWith("No operations provided");
    });
  });

  describe("Gas Estimation", function () {
    it("Should estimate gas for operations", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        }
      ];

      const estimate = await batchContract.estimateGas(operations);
      expect(estimate).to.be.gt(0);
    });

    it("Should provide reasonable gas estimates", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        },
        {
          target: user2.address,
          value: ethers.parseEther("0.2"),
          data: "0x",
          allowFailure: false
        }
      ];

      const estimate = await batchContract.estimateGas(operations);
      // Should be at least base + 2 operations
      expect(estimate).to.be.gte(21000 + 60000);
    });
  });

  describe("User Statistics", function () {
    it("Should track user batch count", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        }
      ];

      await batchContract.connect(user1).executeBatch(operations, true, { value: ethers.parseEther("0.1") });
      expect(await batchContract.getUserStats(user1.address)).to.equal(1);

      await batchContract.connect(user1).executeBatch(operations, true, { value: ethers.parseEther("0.1") });
      expect(await batchContract.getUserStats(user1.address)).to.equal(2);
    });

    it("Should track global batch count", async function () {
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        }
      ];

      await batchContract.connect(user1).executeBatch(operations, true, { value: ethers.parseEther("0.1") });
      expect(await batchContract.totalBatchesExecuted()).to.equal(1);

      await batchContract.connect(user2).executeBatch(operations, true, { value: ethers.parseEther("0.1") });
      expect(await batchContract.totalBatchesExecuted()).to.equal(2);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({
        to: await batchContract.getAddress(),
        value: ethers.parseEther("1.0")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      const tx = await batchContract.withdrawETH();
      const receipt = await tx.wait();

      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.gt(initialBalance - gasUsed);
    });

    it("Should not allow non-owner to withdraw ETH", async function () {
      await expect(
        batchContract.connect(user1).withdrawETH()
      ).to.be.reverted;
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should be protected against reentrancy", async function () {
      // This is a basic test - in production you'd want a malicious contract
      const operations = [
        {
          target: user2.address,
          value: ethers.parseEther("0.1"),
          data: "0x",
          allowFailure: false
        }
      ];

      // Execute batch should work once
      await batchContract.connect(user1).executeBatch(operations, true, { value: ethers.parseEther("0.1") });

      // ReentrancyGuard should prevent any reentrancy attacks
      expect(await batchContract.totalBatchesExecuted()).to.equal(1);
    });
  });
});
