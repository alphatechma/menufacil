import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToOrderItems1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "notes" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "notes"`);
  }
}
