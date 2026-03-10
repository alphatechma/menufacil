import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantColorsAndVariationDescription1709827200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "secondary_color" varchar`);
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "accent_color" varchar`);
    await queryRunner.query(`ALTER TABLE "product_variations" ADD COLUMN IF NOT EXISTS "description" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variations" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "accent_color"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "secondary_color"`);
  }
}
