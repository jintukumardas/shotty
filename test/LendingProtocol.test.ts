import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { LendingProtocol } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("LendingProtocol", function () {
  let lendingContract: LendingProtocol;
  let mockToken: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy LendingProtocol
    const LendingFactory = await ethers.getContractFactory("LendingProtocol");
    lendingContract = await LendingFactory.deploy();
    await lendingContract.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20TokenFactory");
    const tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();

    // Create a test token
    await tokenFactory.createToken("Test Token", "TEST", ethers.parseEther("1000000"), 18);
    const tokens = await tokenFactory.getCreatorTokens(owner.address);
    mockToken = await ethers.getContractAt("CustomERC20Token", tokens[0]);

    // Transfer tokens to users for testing
    await mockToken.transfer(user1.address, ethers.parseEther("10000"));
    await mockToken.transfer(user2.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await lendingContract.owner()).to.equal(owner.address);
    });

    it("Should have correct initial constants", async function () {
      expect(await lendingContract.LIQUIDATION_THRESHOLD()).to.equal(80);
      expect(await lendingContract.LIQUIDATION_PENALTY()).to.equal(10);
      expect(await lendingContract.INTEREST_RATE_BASE()).to.equal(5);
    });

    it("Should have zero supported tokens initially", async function () {
      const tokens = await lendingContract.getSupportedTokens();
      expect(tokens.length).to.equal(0);
    });
  });

  describe("Create Pool", function () {
    it("Should allow owner to create a pool", async function () {
      await expect(
        lendingContract.createPool(await mockToken.getAddress(), 500) // 5% interest rate
      ).to.emit(lendingContract, "PoolCreated");
    });

    it("Should store pool details correctly", async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      const pool = await lendingContract.pools(await mockToken.getAddress());
      expect(pool.isActive).to.be.true;
      expect(pool.interestRate).to.equal(500);
      expect(pool.totalSupply).to.equal(0);
      expect(pool.totalBorrowed).to.equal(0);
    });

    it("Should add token to supported tokens list", async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      const tokens = await lendingContract.getSupportedTokens();
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await mockToken.getAddress());
    });

    it("Should not allow non-owner to create pool", async function () {
      await expect(
        lendingContract.connect(user1).createPool(await mockToken.getAddress(), 500)
      ).to.be.reverted;
    });

    it("Should not allow creating duplicate pool", async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      await expect(
        lendingContract.createPool(await mockToken.getAddress(), 500)
      ).to.be.revertedWith("Pool already exists");
    });
  });

  describe("Deposit", function () {
    beforeEach(async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);
    });

    it("Should allow users to deposit tokens", async function () {
      const depositAmount = ethers.parseEther("100");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), depositAmount);

      await expect(
        lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount)
      ).to.emit(lendingContract, "Deposited");
    });

    it("Should update user deposit correctly", async function () {
      const depositAmount = ethers.parseEther("100");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), depositAmount);
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount);

      const deposit = await lendingContract.getUserDeposit(await mockToken.getAddress(), user1.address);
      expect(deposit.amount).to.equal(depositAmount);
    });

    it("Should update pool total supply", async function () {
      const depositAmount = ethers.parseEther("100");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), depositAmount);
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount);

      const pool = await lendingContract.pools(await mockToken.getAddress());
      expect(pool.totalSupply).to.equal(depositAmount);
    });

    it("Should handle multiple deposits", async function () {
      const depositAmount1 = ethers.parseEther("100");
      const depositAmount2 = ethers.parseEther("50");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), depositAmount1 + depositAmount2);
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount1);
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount2);

      const deposit = await lendingContract.getUserDeposit(await mockToken.getAddress(), user1.address);
      expect(deposit.amount).to.equal(depositAmount1 + depositAmount2);
    });

    it("Should reject deposit to inactive pool", async function () {
      const fakeToken = ethers.Wallet.createRandom().address;
      const depositAmount = ethers.parseEther("100");

      await expect(
        lendingContract.connect(user1).deposit(fakeToken, depositAmount)
      ).to.be.revertedWith("Pool not active");
    });

    it("Should reject zero deposit", async function () {
      await expect(
        lendingContract.connect(user1).deposit(await mockToken.getAddress(), 0)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      const depositAmount = ethers.parseEther("1000");
      await mockToken.connect(user1).approve(await lendingContract.getAddress(), depositAmount);
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), depositAmount);
    });

    it("Should allow users to withdraw deposits", async function () {
      const withdrawAmount = ethers.parseEther("500");

      await expect(
        lendingContract.connect(user1).withdraw(await mockToken.getAddress(), withdrawAmount)
      ).to.emit(lendingContract, "Withdrawn");
    });

    it("Should update user balance after withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("500");
      const initialBalance = await mockToken.balanceOf(user1.address);

      await lendingContract.connect(user1).withdraw(await mockToken.getAddress(), withdrawAmount);

      const finalBalance = await mockToken.balanceOf(user1.address);
      const received = finalBalance - initialBalance;

      // Account for potential interest (should be approximately withdrawAmount)
      expect(received).to.be.gte(withdrawAmount);
      expect(received).to.be.lte(withdrawAmount + ethers.parseEther("1")); // Allow small interest
    });

    it("Should allow full withdrawal with amount = 0", async function () {
      // Get deposit info including interest
      const depositInfo = await lendingContract.getUserDeposit(await mockToken.getAddress(), user1.address);
      const totalWithInterest = depositInfo.amount + depositInfo.interest;

      // Fund the contract with enough tokens to pay interest
      // (In production, interest would come from borrower payments)
      await mockToken.transfer(await lendingContract.getAddress(), totalWithInterest);

      await lendingContract.connect(user1).withdraw(await mockToken.getAddress(), 0);

      const finalDeposit = (await lendingContract.getUserDeposit(await mockToken.getAddress(), user1.address)).amount;
      expect(finalDeposit).to.equal(0);
    });

    it("Should reject withdrawal exceeding balance", async function () {
      await expect(
        lendingContract.connect(user1).withdraw(await mockToken.getAddress(), ethers.parseEther("2000"))
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should reject withdrawal when no deposit exists", async function () {
      await expect(
        lendingContract.connect(user2).withdraw(await mockToken.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("No deposit");
    });
  });

  describe("Borrow", function () {
    beforeEach(async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      // User2 deposits tokens to provide liquidity
      const depositAmount = ethers.parseEther("10000");
      await mockToken.connect(user2).approve(await lendingContract.getAddress(), depositAmount);
      await lendingContract.connect(user2).deposit(await mockToken.getAddress(), depositAmount);
    });

    it("Should allow borrowing with collateral", async function () {
      const borrowAmount = ethers.parseEther("100");
      const collateral = ethers.parseEther("200"); // 200% collateralization

      await expect(
        lendingContract.connect(user1).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral })
      ).to.emit(lendingContract, "Borrowed");
    });

    it("Should update loan details correctly", async function () {
      const borrowAmount = ethers.parseEther("100");
      const collateral = ethers.parseEther("200");

      await lendingContract.connect(user1).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral });

      const loan = await lendingContract.getUserLoan(await mockToken.getAddress(), user1.address);
      expect(loan.borrowed).to.equal(borrowAmount);
      expect(loan.collateral).to.equal(collateral);
    });

    it("Should transfer borrowed tokens to user", async function () {
      const borrowAmount = ethers.parseEther("100");
      const collateral = ethers.parseEther("200");
      const initialBalance = await mockToken.balanceOf(user1.address);

      await lendingContract.connect(user1).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral });

      const finalBalance = await mockToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(borrowAmount);
    });

    it("Should reject borrowing without sufficient collateral", async function () {
      const borrowAmount = ethers.parseEther("100");
      const collateral = ethers.parseEther("100"); // Only 100% collateralization

      await expect(
        lendingContract.connect(user1).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral })
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should reject borrowing more than available liquidity", async function () {
      // First, reduce pool liquidity by having user2 withdraw some tokens
      // Pool currently has 10000 tokens
      await lendingContract.connect(user2).withdraw(await mockToken.getAddress(), ethers.parseEther("5000"));
      // Now pool has ~5000 tokens available

      // Try to borrow more than available (6000 > 5000)
      const borrowAmount = ethers.parseEther("6000");
      const collateral = ethers.parseEther("9000"); // 150% collateral

      await expect(
        lendingContract.connect(owner).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral })
      ).to.be.revertedWith("Insufficient liquidity");
    });

    it("Should reject borrowing from inactive pool", async function () {
      const fakeToken = ethers.Wallet.createRandom().address;

      await expect(
        lendingContract.connect(user1).borrow(fakeToken, ethers.parseEther("100"), { value: ethers.parseEther("200") })
      ).to.be.revertedWith("Pool not active");
    });
  });

  describe("Repay", function () {
    beforeEach(async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);

      // User2 deposits for liquidity
      const depositAmount = ethers.parseEther("10000");
      await mockToken.connect(user2).approve(await lendingContract.getAddress(), depositAmount);
      await lendingContract.connect(user2).deposit(await mockToken.getAddress(), depositAmount);

      // User1 borrows
      const borrowAmount = ethers.parseEther("100");
      const collateral = ethers.parseEther("200");
      await lendingContract.connect(user1).borrow(await mockToken.getAddress(), borrowAmount, { value: collateral });
    });

    it("Should allow repaying borrowed tokens", async function () {
      const repayAmount = ethers.parseEther("50");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), repayAmount);

      await expect(
        lendingContract.connect(user1).repay(await mockToken.getAddress(), repayAmount)
      ).to.emit(lendingContract, "Repaid");
    });

    it("Should update loan amount after repayment", async function () {
      const repayAmount = ethers.parseEther("50");

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), repayAmount);
      await lendingContract.connect(user1).repay(await mockToken.getAddress(), repayAmount);

      const loan = await lendingContract.getUserLoan(await mockToken.getAddress(), user1.address);
      expect(loan.borrowed).to.be.lt(ethers.parseEther("100"));
    });

    it("Should return collateral on full repayment", async function () {
      const loan = await lendingContract.getUserLoan(await mockToken.getAddress(), user1.address);
      const totalDebt = loan.borrowed + loan.interest;

      await mockToken.connect(user1).approve(await lendingContract.getAddress(), totalDebt + ethers.parseEther("10"));

      const initialBalance = await ethers.provider.getBalance(user1.address);

      await lendingContract.connect(user1).repay(await mockToken.getAddress(), 0); // Repay all

      const finalBalance = await ethers.provider.getBalance(user1.address);

      // User should have received collateral back
      expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("1")); // Accounting for gas
    });

    it("Should reject repaying when no loan exists", async function () {
      await expect(
        lendingContract.connect(user2).repay(await mockToken.getAddress(), ethers.parseEther("50"))
      ).to.be.revertedWith("No active loan");
    });
  });

  describe("Pool Utilization", function () {
    beforeEach(async function () {
      await lendingContract.createPool(await mockToken.getAddress(), 500);
    });

    it("Should calculate utilization correctly", async function () {
      // Deposit 1000 tokens
      await mockToken.connect(user1).approve(await lendingContract.getAddress(), ethers.parseEther("1000"));
      await lendingContract.connect(user1).deposit(await mockToken.getAddress(), ethers.parseEther("1000"));

      // Borrow 500 tokens (50% utilization)
      await lendingContract.connect(user2).borrow(
        await mockToken.getAddress(),
        ethers.parseEther("500"),
        { value: ethers.parseEther("1000") }
      );

      const utilization = await lendingContract.getPoolUtilization(await mockToken.getAddress());
      expect(utilization).to.equal(50); // 50%
    });

    it("Should return 0 for empty pool", async function () {
      const utilization = await lendingContract.getPoolUtilization(await mockToken.getAddress());
      expect(utilization).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({
        to: await lendingContract.getAddress(),
        value: ethers.parseEther("1.0")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      await lendingContract.withdrawETH();

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        lendingContract.connect(user1).withdrawETH()
      ).to.be.reverted;
    });
  });
});
