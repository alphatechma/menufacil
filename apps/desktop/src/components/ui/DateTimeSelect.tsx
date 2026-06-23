/**
 * Seletores de data/hora baseados em <select> nativos.
 *
 * O webview do Tauri (WebKitGTK antigo) não abre o popup de <input type="date">
 * nem de <input type="time"> — só permite digitar. Estes componentes usam
 * <select>, que abre uma lista clicável, e produzem strings no formato esperado
 * pelo backend ("HH:MM" e "YYYY-MM-DD").
 */

const fieldClass =
  'flex-1 min-w-0 bg-white px-3 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-xl cursor-pointer transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

interface TimeSelectProps {
  value: string;
  onChange: (v: string) => void;
  /** Quando true, permite limpar (opção "--"); senão exibe placeholder "Hora". */
  clearable?: boolean;
  /** Passo do minuto (1 = qualquer minuto 00–59, 5 = de 5 em 5). Default 5. */
  minuteStep?: number;
}

/** Dois <select> (hora : minuto) que produzem "HH:MM". */
export function TimeSelect({ value, onChange, clearable = false, minuteStep = 5 }: TimeSelectProps) {
  const [h, m] = value && value.includes(':') ? value.split(':') : ['', ''];
  const step = minuteStep > 0 ? minuteStep : 5;
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => String(i * step).padStart(2, '0'));
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Hora"
        value={h}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m || '00'}` : '')}
        className={fieldClass}
      >
        {clearable ? <option value="">--</option> : <option value="" disabled>Hora</option>}
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className="text-base font-semibold text-gray-300 select-none">:</span>
      <select
        aria-label="Minuto"
        value={m}
        disabled={!h}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className={fieldClass}
      >
        <option value="" disabled>min</option>
        {minutes.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

const MONTHS = [
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' }, { v: '04', l: 'Abr' },
  { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' }, { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' },
  { v: '09', l: 'Set' }, { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
];

interface DateSelectProps {
  value: string;
  onChange: (v: string) => void;
  /** Quando true, os três campos são obrigatórios (placeholder não selecionável). */
  required?: boolean;
}

/** Três <select> (dia / mês / ano) que produzem "YYYY-MM-DD". */
export function DateSelect({ value, onChange, required = false }: DateSelectProps) {
  const [y, m, d] = value && value.includes('-') ? value.split('-') : ['', '', ''];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - 2 + i));
  const maxDay = new Date(Number(y || currentYear), Number(m || '01'), 0).getDate();
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));

  const emit = (ny: string, nm: string, nd: string) => {
    const yy = ny || String(currentYear);
    const mm = nm || '01';
    let dd = nd || '01';
    const max = new Date(Number(yy), Number(mm), 0).getDate();
    if (Number(dd) > max) dd = String(max).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
  };

  const onPart = (part: 'y' | 'm' | 'd', v: string) => {
    if (!required && v === '') { onChange(''); return; }
    if (part === 'y') emit(v, m, d);
    else if (part === 'm') emit(y, v, d);
    else emit(y, m, v);
  };

  return (
    <div className="flex items-center gap-2">
      <select aria-label="Dia" value={d} required={required} onChange={(e) => onPart('d', e.target.value)} className={fieldClass}>
        <option value="" disabled={required}>Dia</option>
        {days.map((dd) => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select aria-label="Mês" value={m} required={required} onChange={(e) => onPart('m', e.target.value)} className={fieldClass}>
        <option value="" disabled={required}>Mês</option>
        {MONTHS.map((mo) => <option key={mo.v} value={mo.v}>{mo.l}</option>)}
      </select>
      <select aria-label="Ano" value={y} required={required} onChange={(e) => onPart('y', e.target.value)} className={fieldClass}>
        <option value="" disabled={required}>Ano</option>
        {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
    </div>
  );
}
