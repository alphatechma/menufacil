import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerNameToOrder1709913600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_name" varchar`);
    await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "notes" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "customer_name"`);
  }
}
