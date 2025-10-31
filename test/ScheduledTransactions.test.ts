import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { ScheduledTransactions } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ScheduledTransactions", function () {
  let scheduledContract: ScheduledTransactions;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const ScheduledFactory = await ethers.getContractFactory("ScheduledTransactions");
    scheduledContract = await ScheduledFactory.deploy();
    await scheduledContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await scheduledContract.owner()).to.equal(owner.address);
    });

    it("Should have correct default configuration", async function () {
      expect(await scheduledContract.minDelay()).to.equal(60); // 1 minute
      expect(await scheduledContract.maxDelay()).to.equal(31536000); // 365 days
      expect(await scheduledContract.defaultWindow()).to.equal(604800); // 7 days
    });

    it("Should start with schedule ID 1", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test transaction",
        { value: ethers.parseEther("1.0") }
      );

      const schedule = await scheduledContract.getSchedule(1);
      expect(schedule.id).to.equal(1);
    });
  });

  describe("Schedule Transaction", function () {
    it("Should schedule a transaction successfully", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120; // 2 minutes from now

      await expect(
        scheduledContract.connect(user1).scheduleTransaction(
          user2.address,
          ethers.parseEther("1.0"),
          "0x",
          executeAfter,
          0,
          "Send 1 FLOW to user2",
          { value: ethers.parseEther("1.0") }
        )
      ).to.emit(scheduledContract, "TransactionScheduled");
    });

    it("Should store schedule details correctly", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      const schedule = await scheduledContract.getSchedule(1);
      expect(schedule.creator).to.equal(user1.address);
      expect(schedule.target).to.equal(user2.address);
      expect(schedule.value).to.equal(ethers.parseEther("1.0"));
      expect(schedule.status).to.equal(0); // Pending
    });

    it("Should reject execution time in the past", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime - 60; // 1 minute ago

      await expect(
        scheduledContract.connect(user1).scheduleTransaction(
          user2.address,
          ethers.parseEther("1.0"),
          "0x",
          executeAfter,
          0,
          "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Execution time must be in future");
    });

    it("Should reject execution time too soon", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 30; // 30 seconds (less than minDelay)

      await expect(
        scheduledContract.connect(user1).scheduleTransaction(
          user2.address,
          ethers.parseEther("1.0"),
          "0x",
          executeAfter,
          0,
          "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Execution time too soon");
    });

    it("Should reject execution time too far in future", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 32000000; // More than maxDelay

      await expect(
        scheduledContract.connect(user1).scheduleTransaction(
          user2.address,
          ethers.parseEther("1.0"),
          "0x",
          executeAfter,
          0,
          "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Execution time too far in future");
    });

    it("Should require sufficient ETH", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await expect(
        scheduledContract.connect(user1).scheduleTransaction(
          user2.address,
          ethers.parseEther("1.0"),
          "0x",
          executeAfter,
          0,
          "Test",
          { value: ethers.parseEther("0.5") } // Insufficient
        )
      ).to.be.revertedWith("Insufficient ETH sent");
    });

    it("Should track user schedules", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      const schedules = await scheduledContract.getUserSchedules(user1.address);
      expect(schedules.length).to.equal(1);
      expect(schedules[0]).to.equal(1);
    });
  });

  describe("Execute Scheduled Transaction", function () {
    it("Should execute scheduled transaction after time passes", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      // Fast forward time
      await time.increaseTo(executeAfter + 1);

      const initialBalance = await ethers.provider.getBalance(user2.address);

      await expect(
        scheduledContract.executeScheduledTransaction(1)
      ).to.emit(scheduledContract, "TransactionExecuted");

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));

      const schedule = await scheduledContract.getSchedule(1);
      expect(schedule.status).to.equal(1); // Executed
    });

    it("Should reject execution before scheduled time", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      await expect(
        scheduledContract.executeScheduledTransaction(1)
      ).to.be.revertedWith("Too early to execute");
    });

    it("Should reject execution after window expires", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;
      const executeWindow = 300; // 5 minutes

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        executeWindow,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      // Fast forward past the window
      await time.increaseTo(executeAfter + executeWindow + 1);

      await expect(
        scheduledContract.executeScheduledTransaction(1)
      ).to.be.revertedWith("Execution window expired");
    });

    it("Should allow anyone to execute", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      await time.increaseTo(executeAfter + 1);

      // User2 executes user1's scheduled transaction
      await expect(
        scheduledContract.connect(user2).executeScheduledTransaction(1)
      ).to.emit(scheduledContract, "TransactionExecuted");
    });

    it("Should not allow double execution", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      await time.increaseTo(executeAfter + 1);

      await scheduledContract.executeScheduledTransaction(1);

      await expect(
        scheduledContract.executeScheduledTransaction(1)
      ).to.be.revertedWith("Not pending");
    });
  });

  describe("Cancel Scheduled Transaction", function () {
    it("Should allow creator to cancel", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      const initialBalance = await ethers.provider.getBalance(user1.address);

      await expect(
        scheduledContract.connect(user1).cancelScheduledTransaction(1)
      ).to.emit(scheduledContract, "TransactionCancelled");

      // Check refund was received
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);

      const schedule = await scheduledContract.getSchedule(1);
      expect(schedule.status).to.equal(2); // Cancelled
    });

    it("Should not allow non-creator to cancel", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      await expect(
        scheduledContract.connect(user2).cancelScheduledTransaction(1)
      ).to.be.revertedWith("Not creator");
    });

    it("Should not allow cancelling executed transaction", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      await time.increaseTo(executeAfter + 1);
      await scheduledContract.executeScheduledTransaction(1);

      await expect(
        scheduledContract.connect(user1).cancelScheduledTransaction(1)
      ).to.be.revertedWith("Not pending");
    });
  });

  describe("Query Functions", function () {
    it("Should check if ready to execute", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test",
        { value: ethers.parseEther("1.0") }
      );

      expect(await scheduledContract.isReadyToExecute(1)).to.be.false;

      await time.increaseTo(executeAfter + 1);

      expect(await scheduledContract.isReadyToExecute(1)).to.be.true;
    });

    it("Should get pending schedules count", async function () {
      const currentTime = await time.latest();
      const executeAfter = currentTime + 120;

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test 1",
        { value: ethers.parseEther("1.0") }
      );

      await scheduledContract.connect(user1).scheduleTransaction(
        user2.address,
        ethers.parseEther("1.0"),
        "0x",
        executeAfter,
        0,
        "Test 2",
        { value: ethers.parseEther("1.0") }
      );

      expect(await scheduledContract.getPendingSchedulesCount(user1.address)).to.equal(2);

      // Cancel one
      await scheduledContract.connect(user1).cancelScheduledTransaction(1);

      expect(await scheduledContract.getPendingSchedulesCount(user1.address)).to.equal(1);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update min delay", async function () {
      await scheduledContract.setMinDelay(120);
      expect(await scheduledContract.minDelay()).to.equal(120);
    });

    it("Should allow owner to update max delay", async function () {
      await scheduledContract.setMaxDelay(60 * 60 * 24 * 30); // 30 days
      expect(await scheduledContract.maxDelay()).to.equal(60 * 60 * 24 * 30);
    });

    it("Should not allow non-owner to update delays", async function () {
      await expect(
        scheduledContract.connect(user1).setMinDelay(120)
      ).to.be.reverted;
    });
  });
});
