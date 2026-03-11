import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImplicitUuidCast1710000100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow PostgreSQL to implicitly cast varchar to uuid,
    // fixing "operator does not exist: uuid = character varying" errors
    // when using TypeORM's createQueryBuilder with UUID columns.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_cast
          WHERE castsource = 'character varying'::regtype
            AND casttarget = 'uuid'::regtype
        ) THEN
          CREATE CAST (character varying AS uuid) WITH INOUT AS IMPLICIT;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP CAST IF EXISTS (character varying AS uuid)`);
  }
}
