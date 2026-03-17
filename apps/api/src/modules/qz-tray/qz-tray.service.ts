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
    // Try env var first, then file fallback
    const envKey = process.env.QZ_PRIVATE_KEY;
    const certsDir = join(__dirname, '..', '..', '..', 'certs');

    try {
      this.privateKey = envKey
        ? envKey.replace(/\\n/g, '\n')
        : readFileSync(join(certsDir, 'private.key'), 'utf-8');

      try {
        this.certificate = readFileSync(join(certsDir, 'digital-certificate.txt'), 'utf-8');
      } catch {
        // Fallback to old name
        this.certificate = readFileSync(join(certsDir, 'qz-cert.pem'), 'utf-8');
      }

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

    const signer = createSign('SHA256');
    signer.update(message);
    return signer.sign(this.privateKey, 'base64');
  }

  generateSetupScript(os: string): string {
    const certContent = this.certificate.trim();

    if (os === 'linux') {
      return [
        '#!/bin/bash',
        '# MenuFacil - Script de configuracao do QZ Tray',
        '# Instala o certificado automaticamente para impressao sem popups',
        '',
        'set -e',
        '',
        'QZ_AUTH_DIR="/opt/qz-tray/auth"',
        'CERT_FILE="$QZ_AUTH_DIR/menufacil.crt"',
        '',
        'echo "=== MenuFacil - Configuracao QZ Tray ==="',
        'echo ""',
        '',
        '# Verifica se QZ Tray esta instalado',
        'if [ ! -d "/opt/qz-tray" ]; then',
        '  echo "ERRO: QZ Tray nao encontrado em /opt/qz-tray"',
        '  echo "Baixe em: https://qz.io/download/"',
        '  exit 1',
        'fi',
        '',
        '# Cria diretorio auth se nao existir',
        'sudo mkdir -p "$QZ_AUTH_DIR"',
        '',
        '# Escreve o certificado',
        `sudo bash -c 'cat > "$CERT_FILE" << CERT_EOF`,
        certContent,
        `CERT_EOF'`,
        '',
        'echo "Certificado instalado em: $CERT_FILE"',
        '',
        '# Reinicia QZ Tray',
        'if pgrep -x "qz-tray" > /dev/null; then',
        '  echo "Reiniciando QZ Tray..."',
        '  pkill -x "qz-tray" || true',
        '  sleep 2',
        '  nohup /opt/qz-tray/qz-tray &>/dev/null &',
        '  echo "QZ Tray reiniciado."',
        'else',
        '  echo "QZ Tray nao esta rodando. Inicie manualmente."',
        'fi',
        '',
        'echo ""',
        'echo "Configuracao concluida! Recarregue a pagina do MenuFacil."',
      ].join('\n');
    }

    if (os === 'macos') {
      return [
        '#!/bin/bash',
        '# MenuFacil - Script de configuracao do QZ Tray (macOS)',
        '# Instala o certificado automaticamente para impressao sem popups',
        '',
        'set -e',
        '',
        'QZ_AUTH_DIR="/Applications/QZ Tray.app/Contents/Resources/auth"',
        'CERT_FILE="$QZ_AUTH_DIR/menufacil.crt"',
        '',
        'echo "=== MenuFacil - Configuracao QZ Tray ==="',
        'echo ""',
        '',
        'if [ ! -d "/Applications/QZ Tray.app" ]; then',
        '  echo "ERRO: QZ Tray nao encontrado em /Applications"',
        '  echo "Baixe em: https://qz.io/download/"',
        '  exit 1',
        'fi',
        '',
        'sudo mkdir -p "$QZ_AUTH_DIR"',
        '',
        `sudo bash -c 'cat > "$CERT_FILE" << CERT_EOF`,
        certContent,
        `CERT_EOF'`,
        '',
        'echo "Certificado instalado em: $CERT_FILE"',
        '',
        '# Reinicia QZ Tray',
        'if pgrep -x "qz-tray" > /dev/null; then',
        '  echo "Reiniciando QZ Tray..."',
        '  pkill -x "qz-tray" || true',
        '  sleep 2',
        '  open "/Applications/QZ Tray.app"',
        '  echo "QZ Tray reiniciado."',
        'else',
        '  echo "QZ Tray nao esta rodando. Inicie manualmente."',
        'fi',
        '',
        'echo ""',
        'echo "Configuracao concluida! Recarregue a pagina do MenuFacil."',
      ].join('\n');
    }

    // Windows .bat — write cert line by line
    const certLines = certContent.split('\n').filter((l) => l.trim());
    const writeLines = certLines.map((line, i) => {
      const op = i === 0 ? '>' : '>>';
      return `echo ${line}${op}"%CERT_FILE%"`;
    });

    return [
      '@echo off',
      'REM MenuFacil - Script de configuracao do QZ Tray',
      'REM Instala o certificado automaticamente para impressao sem popups',
      '',
      'echo === MenuFacil - Configuracao QZ Tray ===',
      'echo.',
      '',
      'set "QZ_AUTH_DIR=%ProgramFiles%\\QZ Tray\\auth"',
      'set "CERT_FILE=%QZ_AUTH_DIR%\\menufacil.crt"',
      '',
      'if not exist "%ProgramFiles%\\QZ Tray" (',
      '  echo ERRO: QZ Tray nao encontrado em %ProgramFiles%\\QZ Tray',
      '  echo Baixe em: https://qz.io/download/',
      '  pause',
      '  exit /b 1',
      ')',
      '',
      'if not exist "%QZ_AUTH_DIR%" mkdir "%QZ_AUTH_DIR%"',
      '',
      ...writeLines,
      '',
      'echo Certificado instalado em: %CERT_FILE%',
      '',
      'REM Reinicia QZ Tray',
      'tasklist /FI "IMAGENAME eq qz-tray.exe" 2>NUL | find /I "qz-tray.exe" >NUL',
      'if %ERRORLEVEL%==0 (',
      '  echo Reiniciando QZ Tray...',
      '  taskkill /IM qz-tray.exe /F >NUL 2>&1',
      '  timeout /t 2 /nobreak >NUL',
      '  start "" "%ProgramFiles%\\QZ Tray\\qz-tray.exe"',
      '  echo QZ Tray reiniciado.',
      ') else (',
      '  echo QZ Tray nao esta rodando. Inicie manualmente.',
      ')',
      '',
      'echo.',
      'echo Configuracao concluida! Recarregue a pagina do MenuFacil.',
      'pause',
    ].join('\r\n');
  }
}
