import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createSign } from 'crypto';

@Injectable()
export class QzTrayService {
  private readonly logger = new Logger(QzTrayService.name);
  private readonly certificate: string;
  private readonly privateKey: string;

  constructor() {
    const certsDir = join(__dirname, '..', '..', '..', 'certs');

    try {
      this.certificate = readFileSync(join(certsDir, 'qz-cert.pem'), 'utf-8');
      this.privateKey = readFileSync(join(certsDir, 'qz-private.pem'), 'utf-8');
      this.logger.log('QZ Tray certificates loaded successfully');
    } catch (error) {
      this.logger.warn(
        'QZ Tray certificates not found. Printing will require manual approval.',
      );
      this.certificate = '';
      this.privateKey = '';
    }
  }

  getCertificate(): string {
    return this.certificate;
  }

  sign(message: string): string {
    if (!this.privateKey) {
      return '';
    }

    const signer = createSign('SHA512');
    signer.update(message);
    return signer.sign(this.privateKey, 'base64');
  }
}
