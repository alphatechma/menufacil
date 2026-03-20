import qz from 'qz-tray';
import { formatPrice } from './formatPrice';
import { formatPhone } from './formatPhone';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
  quantity: number;
  product_name?: string;
  product?: { name?: string };
  name?: string;
  variation_name?: string;
  variation?: { name?: string };
  unit_price?: number;
  price?: number;
  extras?: Array<{
    extra_name?: string;
    name?: string;
    extra_price?: number;
    price?: number;
  }>;
  notes?: string;
}

interface PrintableOrder {
  id: string;
  order_number?: number;
  order_type?: string;
  created_at?: string;
  customer?: { name?: string; phone?: string };
  items?: OrderItem[];
  subtotal?: number;
  delivery_fee?: number;
  discount?: number;
  total?: number;
  payment_method?: string;
  change_for?: number;
  address_snapshot?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
  };
  notes?: string;
  table?: { number?: number };
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'ENTREGA',
  pickup: 'RETIRADA',
  dine_in: 'MESA',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao Credito',
  debit_card: 'Cartao Debito',
  cash: 'Dinheiro',
};

// ─── QZ Tray Connection ─────────────────────────────────────────────────────

let _connected = false;
let _connecting: Promise<void> | null = null;
let _selectedPrinter: string | null = null;

const PRINTER_STORAGE_KEY = 'menufacil_thermal_printer';
const PAPER_WIDTH_KEY = 'menufacil_paper_width';

// Paper width presets: chars per line based on paper mm width
export const PAPER_WIDTHS = [
  { mm: 80, chars: 48, label: '80mm (PDV/Fiscal)' },
  { mm: 58, chars: 32, label: '58mm (Compacta)' },
  { mm: 57, chars: 32, label: '57mm (Maquininha)' },
] as const;

export function getPaperWidth(): number {
  try {
    const saved = localStorage.getItem(PAPER_WIDTH_KEY);
    if (saved) return parseInt(saved, 10);
  } catch { /* */ }
  return 48; // default 80mm
}

export function setPaperWidth(chars: number) {
  try { localStorage.setItem(PAPER_WIDTH_KEY, String(chars)); } catch { /* */ }
}

// ─── Receipt Layout Config ──────────────────────────────────────────────────

const LAYOUT_KEY = 'menufacil_receipt_layout';

export interface ReceiptSection {
  id: string;
  label: string;
  enabled: boolean;
}

export const DEFAULT_RECEIPT_SECTIONS: ReceiptSection[] = [
  { id: 'header', label: 'Cabecalho (nome do estabelecimento)', enabled: true },
  { id: 'datetime', label: 'Data e hora', enabled: true },
  { id: 'order_number', label: 'Numero do pedido', enabled: true },
  { id: 'order_type', label: 'Tipo do pedido (delivery/retirada/mesa)', enabled: true },
  { id: 'table', label: 'Numero da mesa', enabled: true },
  { id: 'customer', label: 'Dados do cliente (nome/telefone)', enabled: true },
  { id: 'items', label: 'Itens do pedido', enabled: true },
  { id: 'totals', label: 'Subtotal / Taxa / Desconto / Total', enabled: true },
  { id: 'payment', label: 'Forma de pagamento', enabled: true },
  { id: 'change', label: 'Troco (quando dinheiro)', enabled: true },
  { id: 'address', label: 'Endereco de entrega', enabled: true },
  { id: 'notes', label: 'Observacoes do pedido', enabled: true },
  { id: 'footer', label: 'Mensagem de agradecimento', enabled: true },
];

export function getReceiptLayout(): ReceiptSection[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ReceiptSection[];
      // Merge with defaults (add new sections that didn't exist when saved)
      const ids = new Set(parsed.map((s) => s.id));
      for (const def of DEFAULT_RECEIPT_SECTIONS) {
        if (!ids.has(def.id)) parsed.push(def);
      }
      return parsed;
    }
  } catch { /* */ }
  return DEFAULT_RECEIPT_SECTIONS;
}

export function saveReceiptLayout(sections: ReceiptSection[]) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(sections)); } catch { /* */ }
}

const DEFAULT_FOOTER = 'Obrigado pela preferencia!\n\nMenuFacil Pedidos\nmenufacil.maistechtecnologia.com.br';

export function getFooterMessage(): string {
  try { return localStorage.getItem('menufacil_receipt_footer') || DEFAULT_FOOTER; } catch { return DEFAULT_FOOTER; }
}

export function setFooterMessage(msg: string) {
  try { localStorage.setItem('menufacil_receipt_footer', msg); } catch { /* */ }
}

function loadSavedPrinter(): string | null {
  try {
    return localStorage.getItem(PRINTER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function savePrinter(name: string) {
  try {
    localStorage.setItem(PRINTER_STORAGE_KEY, name);
  } catch {
    // ignore
  }
}

let _securitySetup = false;

function setupSecurity() {
  if (_securitySetup) return;
  _securitySetup = true;

  // Busca certificado público do backend
  qz.security.setCertificatePromise(function (
    resolve: (value: string) => void,
    reject: (err: unknown) => void,
  ) {
    fetch('/api/qz-tray/certificate')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => resolve(data.certificate || ''))
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm('SHA256');

  // Busca assinatura do backend (chave privada fica no servidor)
  qz.security.setSignaturePromise(function (toSign: string) {
    return function (resolve: (value: string) => void, reject: (err: unknown) => void) {
      fetch('/api/qz-tray/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: toSign }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
        .then((data) => resolve(data.signature || ''))
        .catch(reject);
    };
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

async function ensureConnected(): Promise<boolean> {
  // Already connected
  if (qz.websocket.isActive()) {
    _connected = true;
    return true;
  }

  if (_connecting) {
    try {
      await _connecting;
      return _connected;
    } catch {
      _connecting = null;
    }
  }

  _connecting = (async () => {
    try {
      setupSecurity();
      await withTimeout(qz.websocket.connect({ retries: 0, delay: 0 }), 5000);
      _connected = true;

      qz.websocket.setClosedCallbacks(() => {
        _connected = false;
        _connecting = null;
      });
    } catch (err) {
      _connected = false;
      _connecting = null;
      console.error('[QZ Tray] Falha ao conectar:', err);
      throw new Error('QZ Tray nao encontrado.');
    }
  })();

  await _connecting;
  return _connected;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Check if QZ Tray is available (running on this machine). */
export async function isQzAvailable(): Promise<boolean> {
  try {
    return await ensureConnected();
  } catch {
    return false;
  }
}

/** List available printers. */
export async function listPrinters(): Promise<string[]> {
  await ensureConnected();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

/** Get or auto-detect the thermal printer. */
export async function getSelectedPrinter(): Promise<string | null> {
  if (_selectedPrinter) return _selectedPrinter;

  const saved = loadSavedPrinter();
  if (saved) {
    _selectedPrinter = saved;
    return saved;
  }

  // Try to auto-detect common thermal printer names
  try {
    const printers = await listPrinters();
    const thermalKeywords = ['thermal', 'epson', 'elgin', 'bematech', 'pos', 'receipt', 'tm-', 'mp-', 'i9'];
    const match = printers.find((p) =>
      thermalKeywords.some((k) => p.toLowerCase().includes(k)),
    );
    if (match) {
      _selectedPrinter = match;
      savePrinter(match);
      return match;
    }
  } catch {
    // ignore
  }

  return null;
}

/** Select and save a printer by name. */
export function selectPrinter(name: string) {
  _selectedPrinter = name;
  savePrinter(name);
}

/** Check if auto-print is enabled. */
export function isAutoPrintEnabled(): boolean {
  try {
    return localStorage.getItem('menufacil_auto_print') !== 'false';
  } catch {
    return true;
  }
}

/** Get the configured number of print copies. */
export function getPrintCopies(): number {
  try {
    return parseInt(localStorage.getItem('menufacil_print_copies') || '1', 10);
  } catch {
    return 1;
  }
}

/** Get the kitchen printer name (null if disabled). */
export function getKitchenPrinter(): string | null {
  try {
    if (localStorage.getItem('menufacil_print_kitchen') !== 'true') return null;
    return localStorage.getItem('menufacil_kitchen_printer');
  } catch {
    return null;
  }
}

// ─── ESC/POS Receipt Builder ─────────────────────────────────────────────────

const ESC = '\x1B';
const GS = '\x1D';

const CMD = {
  INIT: ESC + '@',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  ALIGN_LEFT: ESC + 'a\x00',
  ALIGN_RIGHT: ESC + 'a\x02',
  DOUBLE_HEIGHT: ESC + '!\x10',
  DOUBLE_WIDTH: ESC + '!\x20',
  DOUBLE_BOTH: ESC + '!\x30',
  NORMAL: ESC + '!\x00',
  CUT: GS + 'V\x00',
  PARTIAL_CUT: GS + 'V\x01',
  FEED_3: ESC + 'd\x03',
  FEED_5: ESC + 'd\x05',
  LINE: '------------------------------------------------',
  DASH: '- - - - - - - - - - - - - - - - - - - - - - - -',
};

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function formatLine(left: string, right: string, width = 48): string {
  const maxLeft = width - right.length - 1;
  return padRight(left, maxLeft) + ' ' + right;
}

function buildReceipt(order: PrintableOrder, tenantName?: string): string {
  const lines: string[] = [];
  const w = getPaperWidth();
  const layout = getReceiptLayout();
  const enabled = new Set(layout.filter((s) => s.enabled).map((s) => s.id));
  const sectionOrder = layout.filter((s) => s.enabled).map((s) => s.id);

  lines.push(CMD.INIT);

  const orderNum = String(order.order_number || order.id.slice(0, 8));
  const orderType = ORDER_TYPE_LABELS[order.order_type || ''] || '';
  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || 0);
  const changeFor = Number(order.change_for || 0);

  // Build sections in configured order
  for (const section of sectionOrder) {
    switch (section) {
      case 'header':
        lines.push(CMD.ALIGN_CENTER);
        lines.push(CMD.BOLD_ON);
        lines.push(CMD.DOUBLE_BOTH);
        lines.push(tenantName || 'PEDIDO');
        lines.push(CMD.NORMAL);
        lines.push(CMD.BOLD_OFF);
        break;

      case 'datetime':
        lines.push(CMD.ALIGN_CENTER);
        if (order.created_at) {
          lines.push(new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
        }
        break;

      case 'order_number':
        lines.push(CMD.ALIGN_CENTER);
        lines.push('');
        lines.push(CMD.DOUBLE_BOTH);
        lines.push(CMD.BOLD_ON);
        lines.push(`PEDIDO #${orderNum}`);
        lines.push(CMD.NORMAL);
        break;

      case 'order_type':
        if (orderType) {
          lines.push(CMD.ALIGN_CENTER);
          lines.push(CMD.BOLD_ON);
          lines.push(orderType);
          lines.push(CMD.BOLD_OFF);
        }
        break;

      case 'table':
        if (order.order_type === 'dine_in' && order.table?.number) {
          lines.push(CMD.ALIGN_CENTER);
          lines.push(CMD.DOUBLE_BOTH);
          lines.push(`MESA #${order.table.number}`);
          lines.push(CMD.NORMAL);
        }
        break;

      case 'customer':
        lines.push(CMD.ALIGN_LEFT);
        lines.push(CMD.LINE);
        if (order.customer?.name) lines.push(`Cliente: ${order.customer.name}`);
        if (order.customer?.phone) lines.push(`Tel: ${formatPhone(order.customer.phone)}`);
        break;

      case 'items':
        lines.push(CMD.ALIGN_LEFT);
        lines.push(CMD.LINE);
        lines.push(CMD.BOLD_ON);
        lines.push(formatLine('ITEM', 'TOTAL', w));
        lines.push(CMD.BOLD_OFF);
        lines.push(CMD.DASH);
        for (const item of order.items || []) {
          const name = item.product_name || item.product?.name || item.name || 'Produto';
          const unitPrice = Number(item.unit_price || item.price || 0);
          const extrasTotal = (item.extras || []).reduce((s, e) => s + Number(e.extra_price || e.price || 0), 0);
          const lineTotal = (unitPrice + extrasTotal) * (item.quantity || 1);
          lines.push(CMD.BOLD_ON);
          lines.push(formatLine(`${item.quantity}x ${name}`, formatPrice(lineTotal), w));
          lines.push(CMD.BOLD_OFF);
          const variation = item.variation_name || item.variation?.name;
          if (variation) lines.push(`   ${variation}`);
          if (item.extras?.length) { for (const e of item.extras) lines.push(`   + ${e.extra_name || e.name}`); }
          if (item.notes) lines.push(`   OBS: ${item.notes}`);
        }
        break;

      case 'totals':
        lines.push(CMD.ALIGN_LEFT);
        lines.push(CMD.LINE);
        lines.push(formatLine('Subtotal', formatPrice(subtotal), w));
        if (deliveryFee > 0) lines.push(formatLine('Taxa entrega', formatPrice(deliveryFee), w));
        if (discount > 0) lines.push(formatLine('Desconto', `-${formatPrice(discount)}`, w));
        lines.push(CMD.DASH);
        lines.push(CMD.BOLD_ON);
        lines.push(CMD.DOUBLE_HEIGHT);
        lines.push(formatLine('TOTAL', formatPrice(total), w));
        lines.push(CMD.NORMAL);
        lines.push(CMD.BOLD_OFF);
        break;

      case 'payment':
        lines.push(CMD.ALIGN_LEFT);
        lines.push('');
        lines.push(formatLine('Pagamento:', PAYMENT_LABELS[order.payment_method || ''] || order.payment_method || '-', w));
        break;

      case 'change':
        if (changeFor > 0) {
          lines.push(CMD.ALIGN_LEFT);
          lines.push(formatLine('Troco para:', formatPrice(changeFor), w));
          lines.push(formatLine('Troco:', formatPrice(changeFor - total), w));
        }
        break;

      case 'address':
        if (order.order_type === 'delivery' && order.address_snapshot) {
          const a = order.address_snapshot;
          lines.push('');
          lines.push(CMD.ALIGN_LEFT);
          lines.push(CMD.LINE);
          lines.push(CMD.BOLD_ON);
          lines.push('ENDERECO DE ENTREGA');
          lines.push(CMD.BOLD_OFF);
          lines.push(`${a.street || ''}${a.number ? `, ${a.number}` : ''}`);
          if (a.complement) lines.push(a.complement);
          if (a.neighborhood) lines.push(a.neighborhood);
        }
        break;

      case 'notes':
        if (order.notes) {
          lines.push('');
          lines.push(CMD.ALIGN_LEFT);
          lines.push(CMD.LINE);
          lines.push(CMD.BOLD_ON);
          lines.push(`OBS: ${order.notes}`);
          lines.push(CMD.BOLD_OFF);
        }
        break;

      case 'footer':
        lines.push('');
        lines.push(CMD.LINE);
        lines.push(CMD.ALIGN_CENTER);
        for (const footerLine of getFooterMessage().split('\n')) {
          lines.push(footerLine);
        }
        break;
    }
  }
  lines.push(CMD.ALIGN_LEFT);

  // Feed and cut
  lines.push(CMD.FEED_5);
  lines.push(CMD.PARTIAL_CUT);

  return lines.join('\n');
}

// ─── Print Functions ─────────────────────────────────────────────────────────

/**
 * Print an order receipt via QZ Tray (ESC/POS, silent, no dialog).
 * Returns true if printed via QZ, false if fell back to browser print.
 */
export async function printOrder(order: PrintableOrder, tenantName?: string): Promise<boolean> {
  try {
    const connected = await ensureConnected();
    if (!connected) throw new Error('Not connected');

    let printer = await getSelectedPrinter();
    if (!printer) {
      printer = await qz.printers.getDefault();
      if (printer) {
        _selectedPrinter = printer;
        savePrinter(printer);
      }
    }

    if (!printer) throw new Error('No printer found');

    const receipt = buildReceipt(order, tenantName);
    const config = qz.configs.create(printer, { encoding: 'CP860', copies: getPrintCopies() });
    const data = [{ type: 'raw', format: 'plain', data: receipt }];

    await qz.print(config, data);

    // Print to kitchen printer if configured
    const kitchenPrinterName = getKitchenPrinter();
    if (kitchenPrinterName) {
      try {
        const kitchenConfig = qz.configs.create(kitchenPrinterName, { encoding: 'CP860' });
        await qz.print(kitchenConfig, data);
      } catch {
        // Kitchen print failure should not affect main print result
      }
    }

    return true;
  } catch {
    printOrderBrowser(order, tenantName);
    return false;
  }
}

/**
 * Fallback: open browser print dialog with thermal-formatted HTML.
 * Same as the original printOrderReceipt function.
 */
export function printOrderBrowser(order: PrintableOrder, tenantName?: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const orderNum = order.order_number || order.id.slice(0, 8);
  const orderType = ORDER_TYPE_LABELS[order.order_type || ''] || '';
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const itemsHtml = (order.items || [])
    .map((item) => {
      const name = item.product_name || item.product?.name || item.name || 'Produto';
      const unitPrice = Number(item.unit_price || item.price || 0);
      const extrasTotal = (item.extras || []).reduce(
        (s, e) => s + Number(e.extra_price || e.price || 0),
        0,
      );
      const lineTotal = (unitPrice + extrasTotal) * (item.quantity || 1);
      const variation = item.variation_name || item.variation?.name;

      let html = `<tr>
        <td style="text-align:left;padding:2px 0;"><strong>${item.quantity}x</strong> ${name}</td>
        <td style="text-align:right;padding:2px 0;white-space:nowrap;">${formatPrice(lineTotal)}</td>
      </tr>`;
      if (variation) {
        html += `<tr><td colspan="2" style="padding:0 0 0 16px;font-size:11px;color:#555;">  ${variation}</td></tr>`;
      }
      if (item.extras && item.extras.length > 0) {
        html += `<tr><td colspan="2" style="padding:0 0 0 16px;font-size:11px;color:#555;">  ${item.extras.map((e) => `+ ${e.extra_name || e.name}`).join(', ')}</td></tr>`;
      }
      if (item.notes) {
        html += `<tr><td colspan="2" style="padding:0 0 2px 16px;font-size:11px;font-style:italic;color:#777;">  Obs: ${item.notes}</td></tr>`;
      }
      return html;
    })
    .join('');

  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || 0);
  const changeFor = Number(order.change_for || 0);

  let addressHtml = '';
  if (order.order_type === 'delivery' && order.address_snapshot) {
    const a = order.address_snapshot;
    addressHtml = `<div style="margin:8px 0;padding:6px 0;border-top:1px dashed #000;">
      <strong>Endereco:</strong><br/>
      ${a.street || ''}${a.number ? `, ${a.number}` : ''}<br/>
      ${a.complement ? `${a.complement}<br/>` : ''}${a.neighborhood || ''}
    </div>`;
  }

  let tableHtml = '';
  if (order.order_type === 'dine_in' && order.table?.number) {
    tableHtml = `<div style="text-align:center;font-size:16px;font-weight:bold;margin:4px 0;">MESA #${order.table.number}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pedido #${orderNum}</title>
<style>
  @page{margin:0;size:80mm auto}*{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;width:80mm;padding:8px;color:#000}
  .center{text-align:center}.bold{font-weight:bold}.divider{border-top:1px dashed #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}.total-row td{font-weight:bold;font-size:15px;padding-top:4px}
</style></head><body>
  <div class="center bold" style="font-size:16px;margin-bottom:2px;">${tenantName || 'PEDIDO'}</div>
  <div class="center" style="font-size:11px;color:#555;">${date}</div>
  <div class="divider"></div>
  <div class="center bold" style="font-size:18px;margin:4px 0;">PEDIDO #${orderNum}</div>
  <div class="center bold" style="font-size:14px;margin-bottom:2px;">${orderType}</div>
  ${tableHtml}
  ${order.customer?.name ? `<div style="margin:4px 0;"><strong>Cliente:</strong> ${order.customer.name}</div>` : ''}
  ${order.customer?.phone ? `<div style="margin-bottom:4px;"><strong>Tel:</strong> ${formatPhone(order.customer.phone)}</div>` : ''}
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right;">${formatPrice(subtotal)}</td></tr>
    ${deliveryFee > 0 ? `<tr><td>Taxa entrega</td><td style="text-align:right;">${formatPrice(deliveryFee)}</td></tr>` : ''}
    ${discount > 0 ? `<tr><td>Desconto</td><td style="text-align:right;color:green;">-${formatPrice(discount)}</td></tr>` : ''}
    <tr class="total-row"><td style="border-top:1px dashed #000;padding-top:6px;">TOTAL</td><td style="text-align:right;border-top:1px dashed #000;padding-top:6px;">${formatPrice(total)}</td></tr>
  </table>
  <div style="margin-top:6px;"><strong>Pagamento:</strong> ${PAYMENT_LABELS[order.payment_method || ''] || order.payment_method || '-'}</div>
  ${changeFor > 0 ? `<div><strong>Troco para:</strong> ${formatPrice(changeFor)} (troco: ${formatPrice(changeFor - total)})</div>` : ''}
  ${addressHtml}
  ${order.notes ? `<div class="divider"></div><div><strong>Obs:</strong> ${order.notes}</div>` : ''}
  <div class="divider"></div>
  <div class="center" style="font-size:11px;color:#555;margin-top:4px;">Obrigado pela preferencia!</div>
  <script>window.onload=function(){window.print();};</script>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
