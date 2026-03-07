import { Module } from '@nestjs/common';
import { QzTrayController } from './qz-tray.controller';
import { QzTrayService } from './qz-tray.service';

@Module({
  controllers: [QzTrayController],
  providers: [QzTrayService],
})
export class QzTrayModule {}
