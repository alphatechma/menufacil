import { Body, Controller, Get, Post } from '@nestjs/common';
import { QzTrayService } from './qz-tray.service';

@Controller('qz-tray')
export class QzTrayController {
  constructor(private readonly qzTrayService: QzTrayService) {}

  @Get('certificate')
  getCertificate() {
    return { certificate: this.qzTrayService.getCertificate() };
  }

  @Post('sign')
  sign(@Body('message') message: string) {
    return { signature: this.qzTrayService.sign(message) };
  }
}
