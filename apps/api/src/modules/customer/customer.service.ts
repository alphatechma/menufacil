import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Customer } from './entities/customer.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
  ) {}

  async create(dto: CreateCustomerDto, tenantId: string): Promise<Customer> {
    const existing = await this.customerRepo.findOne({
      where: { phone: dto.phone, tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const customer = this.customerRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      tenant_id: tenantId,
    });

    return this.customerRepo.save(customer);
  }

  async findById(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['addresses', 'orders', 'orders.items'],
      order: { orders: { created_at: 'DESC' } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findAllByTenant(tenantId: string): Promise<Customer[]> {
    return this.customerRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      select: ['id', 'name', 'phone', 'email', 'loyalty_points', 'created_at'],
    });
  }

  async updateProfile(
    id: string,
    tenantId: string,
    data: { name?: string; email?: string; password?: string; birth_date?: string; gender?: string; cpf?: string },
  ): Promise<Customer> {
    const customer = await this.findById(id, tenantId);

    if (data.email && data.email !== customer.email) {
      const existing = await this.customerRepo.findOne({
        where: { email: data.email, tenant_id: tenantId },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Este email ja esta em uso');
      }
      customer.email = data.email;
    }

    if (data.name) customer.name = data.name;
    if (data.birth_date !== undefined) customer.birth_date = data.birth_date;
    if (data.gender !== undefined) customer.gender = data.gender;
    if (data.cpf !== undefined) customer.cpf = data.cpf;

    if (data.password) {
      customer.password_hash = await bcrypt.hash(data.password, 10);
    }

    return this.customerRepo.save(customer);
  }

  async addAddress(customerId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
    if (dto.is_default) {
      await this.addressRepo.update({ customer_id: customerId }, { is_default: false });
    }

    const address = this.addressRepo.create({ ...dto, customer_id: customerId });
    return this.addressRepo.save(address);
  }

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return this.addressRepo.find({
      where: { customer_id: customerId },
      order: { is_default: 'DESC' },
    });
  }

  async removeAddress(addressId: string, customerId: string): Promise<void> {
    await this.addressRepo.delete({ id: addressId, customer_id: customerId });
  }
}
