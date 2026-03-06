import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVariationLimitsToProduct1709740800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "min_variations" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "max_variations" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "max_variations"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "min_variations"`);
  }
}
