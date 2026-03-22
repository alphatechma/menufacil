import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction, WalletTransactionType } from './wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  async getOrCreateWallet(customerId: string, tenantId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: { customer_id: customerId, tenant_id: tenantId },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        customer_id: customerId,
        tenant_id: tenantId,
        balance: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    return wallet;
  }

  async getBalance(customerId: string, tenantId: string): Promise<{ balance: number }> {
    const wallet = await this.getOrCreateWallet(customerId, tenantId);
    return { balance: Number(wallet.balance) };
  }

  async addCredit(
    customerId: string,
    tenantId: string,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(customerId, tenantId);

    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      wallet_id: wallet.id,
      type: WalletTransactionType.CREDIT,
      amount,
      description,
      order_id: orderId || null,
      tenant_id: tenantId,
    });

    return this.txRepo.save(tx);
  }

  async debit(
    customerId: string,
    tenantId: string,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(customerId, tenantId);

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Saldo insuficiente na carteira');
    }

    wallet.balance = Number(wallet.balance) - amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      wallet_id: wallet.id,
      type: WalletTransactionType.DEBIT,
      amount,
      description,
      order_id: orderId || null,
      tenant_id: tenantId,
    });

    return this.txRepo.save(tx);
  }

  async getTransactions(customerId: string, tenantId: string): Promise<WalletTransaction[]> {
    const wallet = await this.getOrCreateWallet(customerId, tenantId);

    return this.txRepo.find({
      where: { wallet_id: wallet.id, tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async addCashback(
    customerId: string,
    tenantId: string,
    orderTotal: number,
    cashbackPercent: number,
  ): Promise<WalletTransaction | null> {
    if (cashbackPercent <= 0 || orderTotal <= 0) return null;

    const cashbackAmount = Math.round((orderTotal * cashbackPercent) / 100 * 100) / 100;
    if (cashbackAmount <= 0) return null;

    return this.addCredit(
      customerId,
      tenantId,
      cashbackAmount,
      `Cashback de ${cashbackPercent}% do pedido`,
    );
  }

  async getWalletInfo(customerId: string, tenantId: string) {
    const wallet = await this.getOrCreateWallet(customerId, tenantId);
    const transactions = await this.txRepo.find({
      where: { wallet_id: wallet.id, tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return {
      ...wallet,
      balance: Number(wallet.balance),
      transactions,
    };
  }
}
