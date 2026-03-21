// PIX BRCode EMV QR Code generator (static codes)
// Follows BCB/BR Code Manual spec

import QRCode from 'qrcode';

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

interface PixPayload {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txId?: string;
  description?: string;
}

export function generatePixPayload(params: PixPayload): string {
  const { pixKey, merchantName, merchantCity, amount, txId, description } = params;

  let merchantAccInfo = tlv('00', 'br.gov.bcb.pix');
  merchantAccInfo += tlv('01', pixKey);
  if (description) {
    merchantAccInfo += tlv('02', description.slice(0, 25));
  }

  let payload = '';
  payload += tlv('00', '01');
  payload += tlv('01', '12'); // static QR
  payload += tlv('26', merchantAccInfo);
  payload += tlv('52', '0000');
  payload += tlv('53', '986'); // BRL

  if (amount && amount > 0) {
    payload += tlv('54', amount.toFixed(2));
  }

  payload += tlv('58', 'BR');
  payload += tlv('59', merchantName.slice(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  payload += tlv('60', merchantCity.slice(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const additionalData = tlv('05', txId || '***');
  payload += tlv('62', additionalData);

  payload += '6304';
  payload += crc16(payload);

  return payload;
}

export async function generatePixQrCodeDataUrl(params: PixPayload): Promise<string> {
  const payload = generatePixPayload(params);
  return QRCode.toDataURL(payload, { width: 300, margin: 2 });
}
