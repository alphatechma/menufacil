import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private s3: S3Client;
  private bucket: string;
  private endpoint: string;
  private port: number;
  private useSSL: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('MINIO_BUCKET', 'menufacil');
    this.endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
    this.port = parseInt(this.config.get('MINIO_PORT', '9000'), 10);
    this.useSSL = this.config.get('MINIO_USE_SSL', 'false') === 'true';

    const protocol = this.useSSL ? 'https' : 'http';

    this.s3 = new S3Client({
      endpoint: `${protocol}://${this.endpoint}:${this.port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get('MINIO_ACCESS_KEY', 'menufacil'),
        secretAccessKey: this.config.get('MINIO_SECRET_KEY', 'menufacil123'),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        console.log(`Bucket "${this.bucket}" created`);
      } catch (err) {
        console.warn('Could not create MinIO bucket:', (err as Error).message);
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    const ext = extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const key = `uploads/${filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${key}`;

    return { url, filename, size: file.size };
  }
}
