import { Body, Controller, Get, Header, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
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

  @Get('certificate/download')
  downloadCertificate(@Res() res: Response) {
    const cert = this.qzTrayService.getCertificate();
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="menufacil-qz.crt"',
    );
    res.send(cert);
  }

  @Get('setup-script')
  getSetupScript(@Query('os') os: string, @Res() res: Response) {
    const script = this.qzTrayService.generateSetupScript(os || 'windows');
    const isWindows = os !== 'linux' && os !== 'macos';

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="setup-qz-tray.${isWindows ? 'bat' : 'sh'}"`,
    );
    res.send(script);
  }
}
