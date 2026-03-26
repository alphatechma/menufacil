#![allow(dead_code)]
use serde::{Deserialize, Deserializer};

/// Deserialize a value that can be either a number or a numeric string
fn deserialize_optional_f64<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where D: Deserializer<'de> {
    use serde::de;

    struct F64OrString;
    impl<'de> de::Visitor<'de> for F64OrString {
        type Value = Option<f64>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a number or numeric string")
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<Self::Value, E> { Ok(Some(v)) }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<Self::Value, E> { Ok(Some(v as f64)) }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<Self::Value, E> { Ok(Some(v as f64)) }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
            if v.is_empty() { return Ok(None); }
            v.parse::<f64>().map(Some).map_err(de::Error::custom)
        }
        fn visit_none<E: de::Error>(self) -> Result<Self::Value, E> { Ok(None) }
        fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> { Ok(None) }
        fn visit_some<D2: Deserializer<'de>>(self, d: D2) -> Result<Self::Value, D2::Error> {
            d.deserialize_any(F64OrString)
        }
    }
    deserializer.deserialize_any(F64OrString)
}

// ── ESC/POS Command Constants ──────────────────────────────────────────────

/// Initialize printer
pub const INIT: &[u8] = &[0x1B, 0x40];

/// Bold on
pub const BOLD_ON: &[u8] = &[0x1B, 0x45, 0x01];

/// Bold off
pub const BOLD_OFF: &[u8] = &[0x1B, 0x45, 0x00];

/// Double height on
pub const DOUBLE_HEIGHT_ON: &[u8] = &[0x1B, 0x21, 0x10];

/// Double height off / normal size
pub const DOUBLE_HEIGHT_OFF: &[u8] = &[0x1B, 0x21, 0x00];

/// Double width+height (emphasized)
pub const DOUBLE_SIZE_ON: &[u8] = &[0x1D, 0x21, 0x11];

/// Normal size
pub const NORMAL_SIZE: &[u8] = &[0x1D, 0x21, 0x00];

/// Align left
pub const ALIGN_LEFT: &[u8] = &[0x1B, 0x61, 0x00];

/// Align center
pub const ALIGN_CENTER: &[u8] = &[0x1B, 0x61, 0x01];

/// Align right
pub const ALIGN_RIGHT: &[u8] = &[0x1B, 0x61, 0x02];

/// Underline on
pub const UNDERLINE_ON: &[u8] = &[0x1B, 0x2D, 0x01];

/// Underline off
pub const UNDERLINE_OFF: &[u8] = &[0x1B, 0x2D, 0x00];

/// Full cut
pub const CUT: &[u8] = &[0x1D, 0x56, 0x00];

/// Partial cut
pub const PARTIAL_CUT: &[u8] = &[0x1D, 0x56, 0x01];

/// Line feed
pub const LF: &[u8] = &[0x0A];

/// Open cash drawer (pulse pin 2)
pub const OPEN_DRAWER: &[u8] = &[0x1B, 0x70, 0x00, 0x19, 0xFA];

// ── Order Data Structures ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct OrderItem {
    name: Option<String>,
    product_name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    quantity: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    unit_price: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    total: Option<f64>,
    notes: Option<String>,
    observation: Option<String>,
    complements: Option<Vec<ComplementGroup>>,
}

#[derive(Debug, Deserialize)]
struct ComplementGroup {
    name: Option<String>,
    group_name: Option<String>,
    items: Option<Vec<ComplementItem>>,
}

#[derive(Debug, Deserialize)]
struct ComplementItem {
    name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    quantity: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    price: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct OrderAddress {
    street: Option<String>,
    number: Option<String>,
    complement: Option<String>,
    neighborhood: Option<String>,
    city: Option<String>,
    reference: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OrderData {
    id: Option<String>,
    order_number: Option<String>,
    order_type: Option<String>,
    status: Option<String>,
    items: Option<Vec<OrderItem>>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    subtotal: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    delivery_fee: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    discount: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    total: Option<f64>,
    payment_method: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    change_for: Option<f64>,
    notes: Option<String>,
    observation: Option<String>,
    customer_name: Option<String>,
    customer_phone: Option<String>,
    address: Option<OrderAddress>,
    table_number: Option<String>,
    created_at: Option<String>,
}

// ── Helper Functions ───────────────────────────────────────────────────────

/// Create a separator line that fills the paper width
fn separator(width: usize) -> String {
    "-".repeat(width) + "\n"
}

/// Create a double separator line
fn double_separator(width: usize) -> String {
    "=".repeat(width) + "\n"
}

/// Format a line with left text and right-aligned price
fn format_line(left: &str, right: &str, width: usize) -> String {
    let right_len = right.len();
    if left.len() + right_len + 1 >= width {
        // Truncate left side
        let max_left = width.saturating_sub(right_len + 2);
        let truncated = if left.len() > max_left {
            &left[..max_left]
        } else {
            left
        };
        let spaces = width.saturating_sub(truncated.len() + right_len);
        format!("{}{}{}\n", truncated, " ".repeat(spaces), right)
    } else {
        let spaces = width - left.len() - right_len;
        format!("{}{}{}\n", left, " ".repeat(spaces), right)
    }
}

/// Format currency value in BRL
fn format_brl(value: f64) -> String {
    let abs = value.abs();
    let int_part = abs as u64;
    let dec_part = ((abs - int_part as f64) * 100.0).round() as u64;
    if value < 0.0 {
        format!("-R$ {},{:02}", int_part, dec_part)
    } else {
        format!("R$ {},{:02}", int_part, dec_part)
    }
}

/// Translate order type to Portuguese
fn translate_order_type(order_type: &str) -> &str {
    match order_type {
        "delivery" => "ENTREGA",
        "pickup" => "RETIRADA",
        "dine_in" => "MESA",
        _ => order_type,
    }
}

/// Translate payment method to Portuguese
fn translate_payment(method: &str) -> &str {
    match method {
        "cash" | "dinheiro" => "Dinheiro",
        "credit" | "credit_card" => "Cartao Credito",
        "debit" | "debit_card" => "Cartao Debito",
        "pix" => "PIX",
        "voucher" | "vale_refeicao" => "Vale Refeicao",
        _ => method,
    }
}

/// Get paper width in characters for a given mm width
fn chars_for_width(paper_width_mm: u32) -> usize {
    match paper_width_mm {
        58 => 32,
        57 => 30,
        _ => 48, // 80mm default
    }
}

// ── Main Receipt Builder ───────────────────────────────────────────────────

/// Build an ESC/POS receipt from order JSON
pub fn build_receipt(order_json: &str, tenant_name: &str, paper_width_mm: u32) -> Result<Vec<u8>, String> {
    let order: OrderData =
        serde_json::from_str(order_json).map_err(|e| format!("Failed to parse order JSON: {}", e))?;

    let w = chars_for_width(paper_width_mm);
    let mut out: Vec<u8> = Vec::new();

    // Initialize printer
    out.extend_from_slice(INIT);

    // ── Header ──
    out.extend_from_slice(ALIGN_CENTER);
    out.extend_from_slice(DOUBLE_SIZE_ON);
    out.extend_from_slice(tenant_name.as_bytes());
    out.extend_from_slice(b"\n");
    out.extend_from_slice(NORMAL_SIZE);

    // Order number & type
    let order_num = order
        .order_number
        .as_deref()
        .or_else(|| order.id.as_deref().map(|id| &id[..6.min(id.len())]))
        .unwrap_or("---");

    out.extend_from_slice(b"\n");
    out.extend_from_slice(BOLD_ON);
    let order_type_str = order
        .order_type
        .as_deref()
        .map(translate_order_type)
        .unwrap_or("PEDIDO");
    out.extend_from_slice(format!("{} #{}\n", order_type_str, order_num).as_bytes());
    out.extend_from_slice(BOLD_OFF);

    // Table number for dine_in
    if let Some(table) = &order.table_number {
        out.extend_from_slice(BOLD_ON);
        out.extend_from_slice(format!("Mesa: {}\n", table).as_bytes());
        out.extend_from_slice(BOLD_OFF);
    }

    // Timestamp
    if let Some(created_at) = &order.created_at {
        out.extend_from_slice(format!("{}\n", created_at).as_bytes());
    }

    out.extend_from_slice(double_separator(w).as_bytes());

    // ── Customer Info ──
    out.extend_from_slice(ALIGN_LEFT);
    if let Some(name) = &order.customer_name {
        out.extend_from_slice(format!("Cliente: {}\n", name).as_bytes());
    }
    if let Some(phone) = &order.customer_phone {
        out.extend_from_slice(format!("Tel: {}\n", phone).as_bytes());
    }

    // ── Delivery Address ──
    if let Some(addr) = &order.address {
        out.extend_from_slice(separator(w).as_bytes());
        out.extend_from_slice(BOLD_ON);
        out.extend_from_slice(b"ENDERECO:\n");
        out.extend_from_slice(BOLD_OFF);

        let mut addr_line = String::new();
        if let Some(street) = &addr.street {
            addr_line.push_str(street);
        }
        if let Some(number) = &addr.number {
            addr_line.push_str(&format!(", {}", number));
        }
        if !addr_line.is_empty() {
            out.extend_from_slice(format!("{}\n", addr_line).as_bytes());
        }
        if let Some(complement) = &addr.complement {
            if !complement.is_empty() {
                out.extend_from_slice(format!("{}\n", complement).as_bytes());
            }
        }
        if let Some(neighborhood) = &addr.neighborhood {
            out.extend_from_slice(format!("{}\n", neighborhood).as_bytes());
        }
        if let Some(city) = &addr.city {
            out.extend_from_slice(format!("{}\n", city).as_bytes());
        }
        if let Some(reference) = &addr.reference {
            if !reference.is_empty() {
                out.extend_from_slice(format!("Ref: {}\n", reference).as_bytes());
            }
        }
    }

    out.extend_from_slice(double_separator(w).as_bytes());

    // ── Items ──
    out.extend_from_slice(BOLD_ON);
    out.extend_from_slice(b"ITENS\n");
    out.extend_from_slice(BOLD_OFF);
    out.extend_from_slice(separator(w).as_bytes());

    if let Some(items) = &order.items {
        for item in items {
            let item_name = item
                .name
                .as_deref()
                .or(item.product_name.as_deref())
                .unwrap_or("Item");
            let qty = item.quantity.unwrap_or(1.0);
            let total = item
                .total
                .or_else(|| item.unit_price.map(|p| p * qty))
                .unwrap_or(0.0);

            // Quantity x Name                 Price
            let left = format!("{}x {}", qty as u32, item_name);
            let right = format_brl(total);
            out.extend_from_slice(format_line(&left, &right, w).as_bytes());

            // Unit price if quantity > 1
            if qty > 1.0 {
                if let Some(unit_price) = item.unit_price {
                    let unit_line = format!("   ({} cada)", format_brl(unit_price));
                    out.extend_from_slice(format!("{}\n", unit_line).as_bytes());
                }
            }

            // Complements
            if let Some(groups) = &item.complements {
                for group in groups {
                    let group_name = group
                        .name
                        .as_deref()
                        .or(group.group_name.as_deref())
                        .unwrap_or("");
                    if !group_name.is_empty() {
                        out.extend_from_slice(format!("  [{}]\n", group_name).as_bytes());
                    }
                    if let Some(comp_items) = &group.items {
                        for ci in comp_items {
                            let ci_name = ci.name.as_deref().unwrap_or("");
                            let ci_qty = ci.quantity.unwrap_or(1.0) as u32;
                            let ci_price = ci.price.unwrap_or(0.0);
                            if ci_price > 0.0 {
                                let left = format!("  + {}x {}", ci_qty, ci_name);
                                let right = format_brl(ci_price * ci_qty as f64);
                                out.extend_from_slice(format_line(&left, &right, w).as_bytes());
                            } else {
                                out.extend_from_slice(
                                    format!("  + {}x {}\n", ci_qty, ci_name).as_bytes(),
                                );
                            }
                        }
                    }
                }
            }

            // Item notes/observation
            let note = item.notes.as_deref().or(item.observation.as_deref());
            if let Some(note) = note {
                if !note.is_empty() {
                    out.extend_from_slice(format!("  * {}\n", note).as_bytes());
                }
            }
        }
    }

    out.extend_from_slice(double_separator(w).as_bytes());

    // ── Totals ──
    if let Some(subtotal) = order.subtotal {
        out.extend_from_slice(format_line("Subtotal", &format_brl(subtotal), w).as_bytes());
    }
    if let Some(delivery_fee) = order.delivery_fee {
        if delivery_fee > 0.0 {
            out.extend_from_slice(
                format_line("Taxa de entrega", &format_brl(delivery_fee), w).as_bytes(),
            );
        }
    }
    if let Some(discount) = order.discount {
        if discount > 0.0 {
            out.extend_from_slice(
                format_line("Desconto", &format!("-{}", format_brl(discount)), w).as_bytes(),
            );
        }
    }

    out.extend_from_slice(separator(w).as_bytes());
    out.extend_from_slice(BOLD_ON);
    out.extend_from_slice(DOUBLE_HEIGHT_ON);
    let total = order.total.unwrap_or(0.0);
    out.extend_from_slice(format_line("TOTAL", &format_brl(total), w).as_bytes());
    out.extend_from_slice(DOUBLE_HEIGHT_OFF);
    out.extend_from_slice(BOLD_OFF);

    // ── Payment ──
    out.extend_from_slice(separator(w).as_bytes());
    if let Some(method) = &order.payment_method {
        out.extend_from_slice(
            format!("Pagamento: {}\n", translate_payment(method)).as_bytes(),
        );
    }
    if let Some(change_for) = order.change_for {
        if change_for > 0.0 {
            out.extend_from_slice(format!("Troco para: {}\n", format_brl(change_for)).as_bytes());
            let change = change_for - total;
            if change > 0.0 {
                out.extend_from_slice(format!("Troco: {}\n", format_brl(change)).as_bytes());
            }
        }
    }

    // ── Notes ──
    let order_note = order.notes.as_deref().or(order.observation.as_deref());
    if let Some(note) = order_note {
        if !note.is_empty() {
            out.extend_from_slice(separator(w).as_bytes());
            out.extend_from_slice(BOLD_ON);
            out.extend_from_slice(b"OBS: ");
            out.extend_from_slice(BOLD_OFF);
            out.extend_from_slice(format!("{}\n", note).as_bytes());
        }
    }

    // ── Footer ──
    out.extend_from_slice(b"\n");
    out.extend_from_slice(ALIGN_CENTER);
    out.extend_from_slice(separator(w).as_bytes());
    out.extend_from_slice(b"MenuFacil - Sistema de Pedidos\n");
    out.extend_from_slice(b"\n\n\n");

    // Cut paper
    out.extend_from_slice(PARTIAL_CUT);

    Ok(out)
}
