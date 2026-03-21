use rusb::GlobalContext;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Known thermal printer vendor IDs
const KNOWN_VENDORS: &[(u16, &str)] = &[
    (0x04B8, "Epson"),
    (0x0B1B, "Bematech"),
    (0x0519, "Star Micronics"),
    (0x0DD4, "Elgin"),
    (0x0483, "Daruma"),
    (0x1504, "Generic POS"),
    (0x0FE6, "Generic POS"),
    (0x1A86, "Generic POS"),
    (0x0416, "Generic POS"),
];

/// USB device class for printers
const USB_CLASS_PRINTER: u8 = 7;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub manufacturer: String,
    pub serial: String,
}

impl PrinterInfo {
    /// A unique key to identify this printer
    pub fn key(&self) -> String {
        format!("{:04x}:{:04x}", self.vendor_id, self.product_id)
    }
}

/// List connected USB printers by checking known vendor IDs and USB printer class
pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
    let devices = rusb::devices().map_err(|e| format!("Failed to enumerate USB devices: {}", e))?;

    let mut printers: Vec<PrinterInfo> = Vec::new();

    for device in devices.iter() {
        let desc = match device.device_descriptor() {
            Ok(d) => d,
            Err(_) => continue,
        };

        let vendor_id = desc.vendor_id();
        let product_id = desc.product_id();

        // Check if vendor is a known printer manufacturer
        let vendor_match = KNOWN_VENDORS
            .iter()
            .find(|(vid, _)| *vid == vendor_id)
            .map(|(_, name)| name.to_string());

        // Check if any interface has USB printer class
        let has_printer_class = (0..desc.num_configurations()).any(|i| {
            if let Ok(config) = device.config_descriptor(i) {
                config.interfaces().any(|iface| {
                    iface
                        .descriptors()
                        .any(|d| d.class_code() == USB_CLASS_PRINTER)
                })
            } else {
                false
            }
        });

        if vendor_match.is_none() && !has_printer_class {
            continue;
        }

        let handle = device.open().ok();

        let manufacturer = handle
            .as_ref()
            .and_then(|h| h.read_manufacturer_string_ascii(&desc).ok())
            .or_else(|| vendor_match.clone())
            .unwrap_or_else(|| format!("VID:{:04X}", vendor_id));

        let product = handle
            .as_ref()
            .and_then(|h| h.read_product_string_ascii(&desc).ok())
            .unwrap_or_else(|| {
                if has_printer_class {
                    "Thermal Printer".to_string()
                } else {
                    format!("PID:{:04X}", product_id)
                }
            });

        let serial = handle
            .as_ref()
            .and_then(|h| h.read_serial_number_string_ascii(&desc).ok())
            .unwrap_or_default();

        let name = format!("{} {}", manufacturer, product);

        printers.push(PrinterInfo {
            name,
            vendor_id,
            product_id,
            manufacturer,
            serial,
        });
    }

    Ok(printers)
}

/// Find the bulk OUT endpoint for a USB printer device
fn find_bulk_out_endpoint(
    device: &rusb::Device<GlobalContext>,
) -> Option<(u8, u8, u8)> {
    let desc = device.device_descriptor().ok()?;

    for i in 0..desc.num_configurations() {
        if let Ok(config) = device.config_descriptor(i) {
            for iface in config.interfaces() {
                for iface_desc in iface.descriptors() {
                    // Prefer printer class interface, but accept any with bulk OUT
                    for endpoint in iface_desc.endpoint_descriptors() {
                        if endpoint.direction() == rusb::Direction::Out
                            && endpoint.transfer_type() == rusb::TransferType::Bulk
                        {
                            return Some((
                                config.number(),
                                iface_desc.interface_number(),
                                endpoint.address(),
                            ));
                        }
                    }
                }
            }
        }
    }
    None
}

/// Send raw bytes to a USB printer identified by vendor_id:product_id
pub fn print_raw(printer_key: &str, data: &[u8]) -> Result<(), String> {
    let parts: Vec<&str> = printer_key.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid printer key format. Expected 'vendor_id:product_id'".to_string());
    }

    let vendor_id =
        u16::from_str_radix(parts[0], 16).map_err(|_| "Invalid vendor ID".to_string())?;
    let product_id =
        u16::from_str_radix(parts[1], 16).map_err(|_| "Invalid product ID".to_string())?;

    let devices =
        rusb::devices().map_err(|e| format!("Failed to enumerate USB devices: {}", e))?;

    let device = devices
        .iter()
        .find(|d| {
            if let Ok(desc) = d.device_descriptor() {
                desc.vendor_id() == vendor_id && desc.product_id() == product_id
            } else {
                false
            }
        })
        .ok_or_else(|| "Printer not found. Check USB connection.".to_string())?;

    let (config_num, iface_num, endpoint_addr) =
        find_bulk_out_endpoint(&device).ok_or_else(|| {
            "No bulk OUT endpoint found on printer. Device may not be a supported printer."
                .to_string()
        })?;

    let handle = device
        .open()
        .map_err(|e| format!("Failed to open printer: {}. Check permissions.", e))?;

    // Detach kernel driver if active (Linux)
    #[cfg(target_os = "linux")]
    {
        if handle.kernel_driver_active(iface_num).unwrap_or(false) {
            handle
                .detach_kernel_driver(iface_num)
                .map_err(|e| format!("Failed to detach kernel driver: {}", e))?;
        }
    }

    // Set active configuration if needed
    if let Ok(current_config) = handle.active_configuration() {
        if current_config != config_num {
            handle
                .set_active_configuration(config_num)
                .map_err(|e| format!("Failed to set USB configuration: {}", e))?;
        }
    }

    handle
        .claim_interface(iface_num)
        .map_err(|e| format!("Failed to claim printer interface: {}. Another program may be using it.", e))?;

    // Send data in chunks (max 4096 bytes per transfer)
    let chunk_size = 4096;
    let timeout = Duration::from_secs(5);

    for chunk in data.chunks(chunk_size) {
        handle
            .write_bulk(endpoint_addr, chunk, timeout)
            .map_err(|e| format!("Failed to send data to printer: {}", e))?;
    }

    handle.release_interface(iface_num).ok();

    Ok(())
}

/// Print a test page on the specified printer
pub fn test_print(printer_key: &str) -> Result<(), String> {
    use crate::escpos;

    let mut data: Vec<u8> = Vec::new();

    // Initialize
    data.extend_from_slice(escpos::INIT);

    // Center align
    data.extend_from_slice(escpos::ALIGN_CENTER);

    // Bold on
    data.extend_from_slice(escpos::BOLD_ON);
    data.extend_from_slice(b"TESTE DE IMPRESSORA\n");
    data.extend_from_slice(escpos::BOLD_OFF);

    data.extend_from_slice(b"================================\n");

    // Left align
    data.extend_from_slice(escpos::ALIGN_LEFT);

    data.extend_from_slice(b"MenuFacil Desktop\n");
    data.extend_from_slice(b"Impressora configurada!\n\n");

    data.extend_from_slice(b"Caracteres especiais:\n");
    data.extend_from_slice("  R$ 10,50 | 100% OK\n".as_bytes());

    data.extend_from_slice(b"\n");
    data.extend_from_slice(escpos::ALIGN_CENTER);
    data.extend_from_slice(b"================================\n");
    data.extend_from_slice(b"Impressao de teste concluida\n");

    // Feed and cut
    data.extend_from_slice(b"\n\n\n");
    data.extend_from_slice(escpos::CUT);

    print_raw(printer_key, &data)
}
