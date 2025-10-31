/**
 * AddressBook Service
 * Handles on-chain contact management using the AddressBook smart contract
 */

import { ethers } from 'ethers';
import { AddressBook } from '../../typechain-types/contracts/AddressBook';
import { AddressBook__factory } from '../../typechain-types/factories/contracts/AddressBook__factory';

const ADDRESSBOOK_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC;

export interface Contact {
  name: string;
  wallet: string;
  notes: string;
  addedAt: number;
  active: boolean;
}

export interface AddContactParams {
  name: string;
  wallet: string;
  notes?: string;
}

export interface UpdateContactParams {
  name: string;
  newWallet: string;
  notes?: string;
}

/**
 * AddressBook Service Class
 */
export class AddressBookService {
  private contract: AddressBook;
  private signer: ethers.Signer;

  constructor(signer: ethers.Signer) {
    if (!ADDRESSBOOK_CONTRACT_ADDRESS) {
      throw new Error('AddressBook contract address not configured');
    }

    this.signer = signer;
    this.contract = AddressBook__factory.connect(
      ADDRESSBOOK_CONTRACT_ADDRESS,
      signer
    );
  }

  /**
   * Add a new contact
   */
  async addContact(params: AddContactParams): Promise<{ txHash: string }> {
    const { name, wallet, notes = '' } = params;

    // Validate address
    if (!ethers.isAddress(wallet)) {
      throw new Error(`Invalid Ethereum address: ${wallet}`);
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Contact name cannot be empty');
    }

    const tx = await this.contract.addContact(name.trim(), wallet, notes);
    const txHash = tx.hash;
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return { txHash };
  }

  /**
   * Update an existing contact
   */
  async updateContact(params: UpdateContactParams): Promise<{ txHash: string }> {
    const { name, newWallet, notes = '' } = params;

    // Validate address
    if (!ethers.isAddress(newWallet)) {
      throw new Error(`Invalid Ethereum address: ${newWallet}`);
    }

    const tx = await this.contract.updateContact(name, newWallet, notes);
    const txHash = tx.hash;
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return { txHash };
  }

  /**
   * Remove a contact (soft delete)
   */
  async removeContact(name: string): Promise<{ txHash: string }> {
    const tx = await this.contract.removeContact(name);
    const txHash = tx.hash;
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return { txHash };
  }

  /**
   * Get a specific contact by name
   */
  async getContact(name: string): Promise<Contact | null> {
    try {
      const result = await this.contract.getContact(name);

      // Check if contact exists and is active
      if (!result.active) {
        return null;
      }

      return {
        name: result.name,
        wallet: result.wallet,
        notes: result.notes,
        addedAt: Number(result.addedAt),
        active: result.active,
      };
    } catch (error) {
      // Contact doesn't exist
      return null;
    }
  }

  /**
   * Get all contacts for the current user
   */
  async getAllContacts(): Promise<Contact[]> {
    const results = await this.contract.getAllContacts();

    return results.map((contact) => ({
      name: contact.name,
      wallet: contact.wallet,
      notes: contact.notes,
      addedAt: Number(contact.addedAt),
      active: contact.active,
    }));
  }

  /**
   * Search contacts by query string
   */
  async searchContacts(query: string): Promise<Contact[]> {
    const results = await this.contract.searchContacts(query);

    return results.map((contact) => ({
      name: contact.name,
      wallet: contact.wallet,
      notes: contact.notes,
      addedAt: Number(contact.addedAt),
      active: contact.active,
    }));
  }

  /**
   * Resolve a contact name to wallet address
   */
  async resolveContact(name: string): Promise<string> {
    const address = await this.contract.resolveContact(name);

    if (address === ethers.ZeroAddress) {
      throw new Error(`Contact "${name}" not found`);
    }

    return address;
  }

  /**
   * Check if a contact exists
   */
  async contactExists(name: string): Promise<boolean> {
    const contact = await this.getContact(name);
    return contact !== null;
  }

  /**
   * Get contact count for current user
   */
  async getContactCount(): Promise<number> {
    const count = await this.contract.getContactCount();
    return Number(count);
  }
}

/**
 * Get AddressBook service instance
 * Creates a new instance with the browser's wallet provider
 */
export async function getAddressBookService(): Promise<AddressBookService> {
  if (!ADDRESSBOOK_CONTRACT_ADDRESS) {
    throw new Error('AddressBook contract address not configured');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not available. Please connect your wallet.');
  }

  // Get signer from browser wallet
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new AddressBookService(signer);
}

/**
 * Create read-only instance for querying
 */
export function createReadOnlyAddressBookService(): AddressBookService {
  if (!RPC_URL) {
    throw new Error('RPC URL not configured');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new AddressBookService(provider as any);
}
