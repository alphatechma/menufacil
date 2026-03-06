import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveryPerson1709654400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "delivery_persons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "vehicle" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_delivery_persons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_delivery_persons_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" ADD COLUMN "delivery_person_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_delivery_person"
      FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_delivery_person"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_person_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_persons"`);
  }
}
