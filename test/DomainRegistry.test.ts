import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { DomainRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DomainRegistry", function () {
  let domainRegistry: DomainRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const REGISTRATION_FEE = ethers.parseEther("0.01");
  const DOMAIN_NAME = "mytest.push";
  const CHAIN_ID = 42101;
  const METADATA = JSON.stringify({ description: "Test domain", avatar: "ipfs://..." });

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const DomainRegistryFactory = await ethers.getContractFactory("DomainRegistry");
    domainRegistry = await DomainRegistryFactory.deploy();
    await domainRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await domainRegistry.owner()).to.equal(owner.address);
    });

    it("Should set correct initial values", async function () {
      expect(await domainRegistry.registrationFee()).to.equal(REGISTRATION_FEE);
      expect(await domainRegistry.expirationPeriod()).to.equal(365 * 24 * 60 * 60); // 1 year
    });
  });

  describe("Domain Registration", function () {
    it("Should register a new domain successfully", async function () {
      await expect(
        domainRegistry.connect(user1).registerDomain(
          DOMAIN_NAME,
          CHAIN_ID,
          user1.address,
          METADATA,
          { value: REGISTRATION_FEE }
        )
      ).to.emit(domainRegistry, "DomainRegistered");

      expect(await domainRegistry.domainExists(DOMAIN_NAME)).to.be.true;
    });

    it("Should fail if registration fee is insufficient", async function () {
      await expect(
        domainRegistry.connect(user1).registerDomain(
          DOMAIN_NAME,
          CHAIN_ID,
          user1.address,
          METADATA,
          { value: ethers.parseEther("0.005") } // Less than required
        )
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should fail if domain name is empty", async function () {
      await expect(
        domainRegistry.connect(user1).registerDomain(
          "",
          CHAIN_ID,
          user1.address,
          METADATA,
          { value: REGISTRATION_FEE }
        )
      ).to.be.revertedWith("Domain name cannot be empty");
    });

    it("Should fail if resolved address is zero", async function () {
      await expect(
        domainRegistry.connect(user1).registerDomain(
          DOMAIN_NAME,
          CHAIN_ID,
          ethers.ZeroAddress,
          METADATA,
          { value: REGISTRATION_FEE }
        )
      ).to.be.revertedWith("Invalid resolved address");
    });

    it("Should fail if domain already exists", async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      await expect(
        domainRegistry.connect(user2).registerDomain(
          DOMAIN_NAME,
          CHAIN_ID,
          user2.address,
          METADATA,
          { value: REGISTRATION_FEE }
        )
      ).to.be.revertedWith("Domain already registered");
    });

    it("Should return correct domain details", async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      const domain = await domainRegistry.getDomainDetails(DOMAIN_NAME);
      expect(domain.name).to.equal(DOMAIN_NAME);
      expect(domain.owner).to.equal(user1.address);
      expect(domain.chainId).to.equal(CHAIN_ID);
      expect(domain.resolvedAddress).to.equal(user1.address);
      expect(domain.metadata).to.equal(METADATA);
      expect(domain.active).to.be.true;
    });
  });

  describe("Batch Registration", function () {
    it("Should batch register multiple domains", async function () {
      const domains = ["test1.push", "test2.push", "test3.push"];
      const chainIds = [CHAIN_ID, CHAIN_ID, CHAIN_ID];
      const addresses = [user1.address, user1.address, user1.address];
      const metadatas = [METADATA, METADATA, METADATA];

      await domainRegistry.connect(user1).batchRegisterDomains(
        domains,
        chainIds,
        addresses,
        metadatas,
        { value: REGISTRATION_FEE * BigInt(domains.length) }
      );

      for (const domain of domains) {
        expect(await domainRegistry.domainExists(domain)).to.be.true;
      }
    });

    it("Should fail if array lengths mismatch", async function () {
      const domains = ["test1.push", "test2.push"];
      const chainIds = [CHAIN_ID];
      const addresses = [user1.address, user1.address];
      const metadatas = [METADATA, METADATA];

      await expect(
        domainRegistry.connect(user1).batchRegisterDomains(
          domains,
          chainIds,
          addresses,
          metadatas,
          { value: REGISTRATION_FEE * BigInt(2) }
        )
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("Domain Resolution", function () {
    beforeEach(async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );
    });

    it("Should resolve domain correctly", async function () {
      const [chainId, resolvedAddress] = await domainRegistry.resolveDomain(DOMAIN_NAME);
      expect(chainId).to.equal(CHAIN_ID);
      expect(resolvedAddress).to.equal(user1.address);
    });

    it("Should fail to resolve non-existent domain", async function () {
      await expect(
        domainRegistry.resolveDomain("nonexistent.push")
      ).to.be.revertedWith("Domain does not exist");
    });

    it("Should update domain resolution", async function () {
      const newChainId = 1; // Ethereum Mainnet
      await domainRegistry.connect(user1).updateDomainResolution(
        DOMAIN_NAME,
        newChainId,
        user2.address
      );

      const [chainId, resolvedAddress] = await domainRegistry.resolveDomain(DOMAIN_NAME);
      expect(chainId).to.equal(newChainId);
      expect(resolvedAddress).to.equal(user2.address);
    });

    it("Should fail to update if not owner", async function () {
      await expect(
        domainRegistry.connect(user2).updateDomainResolution(
          DOMAIN_NAME,
          1,
          user2.address
        )
      ).to.be.revertedWith("Not the domain owner");
    });
  });

  describe("Domain Transfer", function () {
    beforeEach(async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );
    });

    it("Should transfer domain successfully", async function () {
      await expect(
        domainRegistry.connect(user1).transferDomain(DOMAIN_NAME, user2.address)
      ).to.emit(domainRegistry, "DomainTransferred");

      const domain = await domainRegistry.getDomainDetails(DOMAIN_NAME);
      expect(domain.owner).to.equal(user2.address);
    });

    it("Should fail to transfer if not owner", async function () {
      await expect(
        domainRegistry.connect(user2).transferDomain(DOMAIN_NAME, user2.address)
      ).to.be.revertedWith("Not the domain owner");
    });

    it("Should fail to transfer to zero address", async function () {
      await expect(
        domainRegistry.connect(user1).transferDomain(DOMAIN_NAME, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });
  });

  describe("Domain Renewal", function () {
    beforeEach(async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );
    });

    it("Should renew domain successfully", async function () {
      const domainBefore = await domainRegistry.getDomainDetails(DOMAIN_NAME);
      const expiresAtBefore = domainBefore.expiresAt;

      await domainRegistry.connect(user1).renewDomain(DOMAIN_NAME, {
        value: REGISTRATION_FEE
      });

      const domainAfter = await domainRegistry.getDomainDetails(DOMAIN_NAME);
      expect(domainAfter.expiresAt).to.be.greaterThan(expiresAtBefore);
    });

    it("Should fail to renew if not owner", async function () {
      await expect(
        domainRegistry.connect(user2).renewDomain(DOMAIN_NAME, {
          value: REGISTRATION_FEE
        })
      ).to.be.revertedWith("Not the domain owner");
    });
  });

  describe("Domain Metadata", function () {
    beforeEach(async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );
    });

    it("Should update metadata successfully", async function () {
      const newMetadata = JSON.stringify({ description: "Updated", avatar: "ipfs://new" });
      await domainRegistry.connect(user1).updateDomainMetadata(DOMAIN_NAME, newMetadata);

      const domain = await domainRegistry.getDomainDetails(DOMAIN_NAME);
      expect(domain.metadata).to.equal(newMetadata);
    });

    it("Should fail to update metadata if not owner", async function () {
      await expect(
        domainRegistry.connect(user2).updateDomainMetadata(DOMAIN_NAME, "new metadata")
      ).to.be.revertedWith("Not the domain owner");
    });
  });

  describe("Domain Queries", function () {
    it("Should check domain availability correctly", async function () {
      expect(await domainRegistry.isDomainAvailable(DOMAIN_NAME)).to.be.true;

      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      expect(await domainRegistry.isDomainAvailable(DOMAIN_NAME)).to.be.false;
    });

    it("Should get owned domains", async function () {
      await domainRegistry.connect(user1).registerDomain(
        "test1.push",
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      await domainRegistry.connect(user1).registerDomain(
        "test2.push",
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      const ownedDomains = await domainRegistry.getOwnedDomains(user1.address);
      expect(ownedDomains.length).to.equal(2);
    });

    it("Should compute domain hash correctly", async function () {
      const hash1 = await domainRegistry.getDomainHash(DOMAIN_NAME);
      const hash2 = await domainRegistry.getDomainHash(DOMAIN_NAME);
      expect(hash1).to.equal(hash2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set registration fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await domainRegistry.connect(owner).setRegistrationFee(newFee);
      expect(await domainRegistry.registrationFee()).to.equal(newFee);
    });

    it("Should fail to set fee if not owner", async function () {
      await expect(
        domainRegistry.connect(user1).setRegistrationFee(ethers.parseEther("0.02"))
      ).to.be.reverted;
    });

    it("Should allow owner to set expiration period", async function () {
      const newPeriod = 180 * 24 * 60 * 60; // 180 days
      await domainRegistry.connect(owner).setExpirationPeriod(newPeriod);
      expect(await domainRegistry.expirationPeriod()).to.equal(newPeriod);
    });

    it("Should allow owner to withdraw fees", async function () {
      await domainRegistry.connect(user1).registerDomain(
        DOMAIN_NAME,
        CHAIN_ID,
        user1.address,
        METADATA,
        { value: REGISTRATION_FEE }
      );

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await domainRegistry.connect(owner).withdrawFees();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
    });
  });
});
