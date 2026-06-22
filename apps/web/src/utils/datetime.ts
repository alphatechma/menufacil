/**
 * Helpers para o fuso fixo do restaurante (America/Sao_Paulo).
 *
 * Inputs `<input type="datetime-local">` trabalham com hora "de parede" (sem fuso),
 * enquanto o backend guarda `timestamptz` (instante em UTC). Estas funções normalizam
 * o ida-e-volta sempre em America/Sao_Paulo, evitando o deslocamento de horário.
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';

/**
 * Faz parse de uma data vinda de séries por dia para gráficos. Aceita tanto `"YYYY-MM-DD"`
 * (interpretado como meia-noite local) quanto um ISO completo (ex.: `"2026-06-22T03:00:00.000Z"`).
 * Retorna um Date possivelmente inválido — quem chama deve checar `isNaN(d.getTime())`.
 */
export function parseDayDate(v: unknown): Date {
  if (typeof v !== 'string' || !v) return new Date(NaN);
  // "YYYY-MM-DD" → meia-noite local (evita o shift de fuso do parse UTC de data pura)
  return v.length === 10 ? new Date(`${v}T00:00:00`) : new Date(v);
}

/**
 * Converte um instante ISO/UTC para a string `YYYY-MM-DDTHH:mm` na hora de parede
 * de São Paulo, pronta para um `<input type="datetime-local">`.
 * Retorna '' para valores vazios/nulos.
 */
export function isoToSaoPauloInput(iso?: string | null): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // evita meia-noite virar "24:00"
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Converte uma string `YYYY-MM-DDTHH:mm` (hora de parede de São Paulo) para um
 * instante ISO UTC canônico, pronto para gravar.
 * Retorna null para valores vazios/nulos.
 *
 * São Paulo é fixo em -03:00 (o Brasil não tem horário de verão desde 2019), então o
 * offset explícito torna a gravação determinística — independente do fuso da sessão do banco.
 */
export function saoPauloInputToIso(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(`${value}:00-03:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}
