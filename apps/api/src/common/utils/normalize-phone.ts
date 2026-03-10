/**
 * Normaliza números de telefone brasileiros para formato consistente: 55 + DDD(2) + 9 + número(8)
 *
 * Exemplos de entrada → saída:
 *   "98991741075"     → "5598991741075"  (local → adiciona 55)
 *   "559891741075"    → "5598991741075"  (WhatsApp sem nono dígito → adiciona 9)
 *   "5598991741075"   → "5598991741075"  (já normalizado)
 *   "+55 (98) 99174-1075" → "5598991741075"  (com formatação)
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // Já no formato completo: 55 + DDD(2) + 9 + 8 dígitos = 13 dígitos
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits;
  }

  // Com 55 mas sem nono dígito: 55 + DDD(2) + 8 dígitos = 12 dígitos
  // Adiciona o 9 após o DDD
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.substring(2, 4);
    const number = digits.substring(4);
    return `55${ddd}9${number}`;
  }

  // Local com nono dígito: DDD(2) + 9 + 8 dígitos = 11 dígitos
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // Local sem nono dígito: DDD(2) + 8 dígitos = 10 dígitos
  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const number = digits.substring(2);
    return `55${ddd}9${number}`;
  }

  // Formato não reconhecido, retorna só os dígitos
  return digits;
}
