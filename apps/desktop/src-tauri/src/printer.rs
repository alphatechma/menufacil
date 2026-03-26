use rusb::GlobalContext;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::process::Command;
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

const USB_CLASS_PRINTER: u8 = 7;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub key: String,
    pub connection: String, // "usb", "network", "system"
    pub address: String,    // USB vid:pid, IP:port, or system queue name
    pub manufacturer: String,
    pub serial: String,
    pub is_default: bool,
}

/// List ALL printers: USB direct + system-installed (network and local)
pub fn list_all_printers() -> Result<Vec<PrinterInfo>, String> {
    let mut printers: Vec<PrinterInfo> = Vec::new();
    let mut seen_keys: std::collections::HashSet<String> = std::collections::HashSet::new();

    // 1. USB printers via rusb
    if let Ok(usb_printers) = list_usb_printers() {
        for p in usb_printers {
            seen_keys.insert(p.key.clone());
            printers.push(p);
        }
    }

    // 2. System printers (includes network, USB via drivers, shared printers)
    if let Ok(sys_printers) = list_system_printers() {
        for p in sys_printers {
            if !seen_keys.contains(&p.key) {
                seen_keys.insert(p.key.clone());
                printers.push(p);
            }
        }
    }

    // 3. Saved network printers from previous manual additions
    // (handled in frontend via localStorage)

    Ok(printers)
}

/// List USB printers via rusb
fn list_usb_printers() -> Result<Vec<PrinterInfo>, String> {
    let devices = rusb::devices().map_err(|e| format!("Erro ao enumerar dispositivos USB: {}", e))?;
    let mut printers: Vec<PrinterInfo> = Vec::new();

    for device in devices.iter() {
        let desc = match device.device_descriptor() {
            Ok(d) => d,
            Err(_) => continue,
        };

        let vendor_id = desc.vendor_id();
        let product_id = desc.product_id();

        let vendor_match = KNOWN_VENDORS
            .iter()
            .find(|(vid, _)| *vid == vendor_id)
            .map(|(_, name)| name.to_string());

        let has_printer_class = (0..desc.num_configurations()).any(|i| {
            if let Ok(config) = device.config_descriptor(i) {
                config.interfaces().any(|iface| {
                    iface.descriptors().any(|d| d.class_code() == USB_CLASS_PRINTER)
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
                if has_printer_class { "Impressora Térmica".to_string() }
                else { format!("PID:{:04X}", product_id) }
            });

        let serial = handle
            .as_ref()
            .and_then(|h| h.read_serial_number_string_ascii(&desc).ok())
            .unwrap_or_default();

        let key = format!("{:04x}:{:04x}", vendor_id, product_id);

        printers.push(PrinterInfo {
            name: format!("{} {}", manufacturer, product),
            key: key.clone(),
            connection: "usb".to_string(),
            address: key,
            manufacturer,
            serial,
            is_default: false,
        });
    }

    Ok(printers)
}

/// List system-installed printers (macOS: lpstat, Linux: lpstat, Windows: wmic)
fn list_system_printers() -> Result<Vec<PrinterInfo>, String> {
    let mut printers: Vec<PrinterInfo> = Vec::new();

    #[cfg(target_os = "macos")]
    {
        // Get default printer (force English output)
        let default_printer = Command::new("lpstat")
            .args(["-d"])
            .env("LANG", "C")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .and_then(|s| s.split(':').last().map(|p| p.trim().to_string()));

        // List all printers with their URIs (force English output)
        if let Ok(output) = Command::new("lpstat").args(["-v"]).env("LANG", "C").output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    // Format: "device for PRINTER_NAME: URI" (English)
                    // Also handle: "dispositivo para PRINTER_NAME: URI" (Portuguese)
                    let rest = line.strip_prefix("device for ")
                        .or_else(|| line.strip_prefix("dispositivo para "));
                    if let Some(rest) = rest {
                        if let Some((name, uri)) = rest.split_once(": ") {
                            let name = name.trim().to_string();
                            let uri = uri.trim().to_string();
                            let connection = detect_connection_type(&uri);
                            let is_default = default_printer.as_deref() == Some(&name);

                            printers.push(PrinterInfo {
                                name: name.clone(),
                                key: format!("sys:{}", name),
                                connection,
                                address: uri,
                                manufacturer: "Sistema".to_string(),
                                serial: String::new(),
                                is_default,
                            });
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let default_printer = Command::new("lpstat")
            .args(["-d"])
            .env("LANG", "C")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .and_then(|s| s.split(':').last().map(|p| p.trim().to_string()));

        if let Ok(output) = Command::new("lpstat").args(["-v"]).env("LANG", "C").output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let rest = line.strip_prefix("device for ")
                        .or_else(|| line.strip_prefix("dispositivo para "));
                    if let Some(rest) = rest {
                        if let Some((name, uri)) = rest.split_once(": ") {
                            let name = name.trim().to_string();
                            let uri = uri.trim().to_string();
                            let connection = detect_connection_type(&uri);
                            let is_default = default_printer.as_deref() == Some(&name);

                            printers.push(PrinterInfo {
                                name: name.clone(),
                                key: format!("sys:{}", name),
                                connection,
                                address: uri,
                                manufacturer: "Sistema".to_string(),
                                serial: String::new(),
                                is_default,
                            });
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell for reliable printer listing
        let ps_script = r#"Get-Printer | ForEach-Object { "$($_.Name)|$($_.PortName)|$($_.Default)|$($_.DriverName)|$($_.Type)" }"#;
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_script])
            .output()
        {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 4 {
                        let name = parts[0].trim().to_string();
                        let port = parts[1].trim().to_string();
                        let is_default = parts[2].trim().eq_ignore_ascii_case("True");
                        let driver = parts[3].trim().to_string();

                        if name.is_empty() || name == "Name" { continue; }

                        let connection = if port.contains('.') || port.to_uppercase().starts_with("IP_") || port.to_uppercase().contains("TCP") {
                            "network".to_string()
                        } else if port.to_uppercase().starts_with("USB") {
                            "usb".to_string()
                        } else {
                            "system".to_string()
                        };

                        printers.push(PrinterInfo {
                            name: name.clone(),
                            key: format!("sys:{}", name),
                            connection,
                            address: if port == "null" || port.is_empty() { "N/A".to_string() } else { port },
                            manufacturer: driver,
                            serial: String::new(),
                            is_default,
                        });
                    }
                }
            }
        }
    }

    Ok(printers)
}

/// Detect connection type from printer URI
fn detect_connection_type(uri: &str) -> String {
    let uri_lower = uri.to_lowercase();
    if uri_lower.starts_with("socket://") || uri_lower.starts_with("ipp://")
        || uri_lower.starts_with("ipps://") || uri_lower.starts_with("http://")
        || uri_lower.starts_with("https://") || uri_lower.starts_with("lpd://")
    {
        "network".to_string()
    } else if uri_lower.starts_with("usb://") {
        "usb".to_string()
    } else {
        "system".to_string()
    }
}

/// Find the bulk OUT endpoint for a USB printer device
fn find_bulk_out_endpoint(device: &rusb::Device<GlobalContext>) -> Option<(u8, u8, u8)> {
    let desc = device.device_descriptor().ok()?;
    for i in 0..desc.num_configurations() {
        if let Ok(config) = device.config_descriptor(i) {
            for iface in config.interfaces() {
                for iface_desc in iface.descriptors() {
                    for endpoint in iface_desc.endpoint_descriptors() {
                        if endpoint.direction() == rusb::Direction::Out
                            && endpoint.transfer_type() == rusb::TransferType::Bulk
                        {
                            return Some((config.number(), iface_desc.interface_number(), endpoint.address()));
                        }
                    }
                }
            }
        }
    }
    None
}

/// Send raw bytes to a USB printer identified by vendor_id:product_id
pub fn print_raw_usb(printer_key: &str, data: &[u8]) -> Result<(), String> {
    let parts: Vec<&str> = printer_key.split(':').collect();
    if parts.len() != 2 {
        return Err("Formato de chave inválido. Esperado 'vendor_id:product_id'".to_string());
    }

    let vendor_id = u16::from_str_radix(parts[0], 16).map_err(|_| "Vendor ID inválido".to_string())?;
    let product_id = u16::from_str_radix(parts[1], 16).map_err(|_| "Product ID inválido".to_string())?;

    let devices = rusb::devices().map_err(|e| format!("Erro ao enumerar USB: {}", e))?;

    let device = devices
        .iter()
        .find(|d| {
            if let Ok(desc) = d.device_descriptor() {
                desc.vendor_id() == vendor_id && desc.product_id() == product_id
            } else { false }
        })
        .ok_or_else(|| "Impressora não encontrada. Verifique a conexão USB.".to_string())?;

    let (config_num, iface_num, endpoint_addr) = find_bulk_out_endpoint(&device)
        .ok_or_else(|| "Endpoint de saída não encontrado na impressora.".to_string())?;

    let handle = device.open().map_err(|e| format!("Erro ao abrir impressora: {}", e))?;

    #[cfg(target_os = "linux")]
    {
        if handle.kernel_driver_active(iface_num).unwrap_or(false) {
            handle.detach_kernel_driver(iface_num).map_err(|e| format!("Erro ao desconectar driver: {}", e))?;
        }
    }

    if let Ok(current_config) = handle.active_configuration() {
        if current_config != config_num {
            handle.set_active_configuration(config_num).map_err(|e| format!("Erro ao configurar USB: {}", e))?;
        }
    }

    handle.claim_interface(iface_num).map_err(|e| format!("Erro ao acessar impressora: {}", e))?;

    let chunk_size = 4096;
    let timeout = Duration::from_secs(5);
    for chunk in data.chunks(chunk_size) {
        handle.write_bulk(endpoint_addr, chunk, timeout).map_err(|e| format!("Erro ao enviar dados: {}", e))?;
    }

    handle.release_interface(iface_num).ok();
    Ok(())
}

/// Send raw bytes to a network printer via TCP
pub fn print_raw_network(address: &str, data: &[u8]) -> Result<(), String> {
    let addr: SocketAddr = address
        .parse()
        .map_err(|_| format!("Endereço inválido: {}. Use IP:PORTA (ex: 192.168.0.100:9100)", address))?;

    let stream = TcpStream::connect_timeout(&addr, Duration::from_secs(5))
        .map_err(|e| format!("Não foi possível conectar em {}: {}", address, e))?;

    stream.set_write_timeout(Some(Duration::from_secs(10)))
        .map_err(|e| format!("Erro de timeout: {}", e))?;

    let mut writer = std::io::BufWriter::new(stream);
    writer.write_all(data).map_err(|e| format!("Erro ao enviar dados: {}", e))?;
    writer.flush().map_err(|e| format!("Erro ao finalizar: {}", e))?;

    Ok(())
}

/// Send raw bytes via system print queue
fn print_raw_system(queue_name: &str, data: &[u8]) -> Result<(), String> {
    use std::process::Stdio;

    #[cfg(not(target_os = "windows"))]
    {
        let mut child = Command::new("lp")
            .args(["-d", queue_name, "-o", "raw", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Erro ao iniciar impressão: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(data).map_err(|e| format!("Erro ao enviar dados: {}", e))?;
        }

        let output = child.wait_with_output().map_err(|e| format!("Erro na impressão: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Erro na impressão: {}", stderr));
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Write data to temp file, then print via PowerShell
        let temp_path = std::env::temp_dir().join(format!("menufacil_print_{}.bin", std::process::id()));
        std::fs::write(&temp_path, data).map_err(|e| format!("Erro ao criar arquivo temporário: {}", e))?;

        let ps_cmd = format!(
            "Get-Content -Path '{}' -Encoding Byte -Raw | Out-Printer -Name '{}'",
            temp_path.display(),
            queue_name.replace("'", "''")
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .output()
            .map_err(|e| format!("Erro ao iniciar impressão: {}", e))?;

        let _ = std::fs::remove_file(&temp_path);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Erro na impressão: {}", stderr));
        }
    }

    Ok(())
}

/// Unified print function - routes to USB, network, or system based on key
pub fn print_to(printer_key: &str, data: &[u8]) -> Result<(), String> {
    if printer_key.starts_with("net:") {
        let address = &printer_key[4..];
        print_raw_network(address, data)
    } else if printer_key.starts_with("sys:") {
        let queue_name = &printer_key[4..];
        print_raw_system(queue_name, data)
    } else {
        // USB vid:pid format — try direct USB first, fall back to system queue
        match print_raw_usb(printer_key, data) {
            Ok(()) => Ok(()),
            Err(usb_err) => {
                // On macOS, USB direct access often fails due to permissions
                // Try to find a system printer that matches and use lp instead
                #[cfg(target_os = "macos")]
                {
                    if let Ok(sys_printers) = list_system_printers() {
                        // Find a system printer with USB connection
                        if let Some(sys) = sys_printers.iter().find(|p| p.connection == "usb") {
                            let queue_name = sys.name.clone();
                            return print_raw_system(&queue_name, data);
                        }
                    }
                }
                Err(usb_err)
            }
        }
    }
}

/// Print a test page
pub fn test_print(printer_key: &str) -> Result<(), String> {
    use crate::escpos;

    let mut data: Vec<u8> = Vec::new();

    data.extend_from_slice(escpos::INIT);
    data.extend_from_slice(escpos::ALIGN_CENTER);
    data.extend_from_slice(escpos::BOLD_ON);
    data.extend_from_slice("TESTE DE IMPRESSORA\n".as_bytes());
    data.extend_from_slice(escpos::BOLD_OFF);
    data.extend_from_slice(b"================================\n");
    data.extend_from_slice(escpos::ALIGN_LEFT);
    data.extend_from_slice("MenuFácil Desktop\n".as_bytes());
    data.extend_from_slice("Impressora configurada!\n\n".as_bytes());

    let conn_type = if printer_key.starts_with("net:") {
        "Rede (TCP/IP)"
    } else if printer_key.starts_with("sys:") {
        "Sistema (Driver)"
    } else {
        "USB (Direto)"
    };
    data.extend_from_slice(format!("Conexão: {}\n", conn_type).as_bytes());
    data.extend_from_slice(format!("Chave: {}\n", printer_key).as_bytes());
    data.extend_from_slice("R$ 10,50 | 100% OK\n".as_bytes());

    data.extend_from_slice(b"\n");
    data.extend_from_slice(escpos::ALIGN_CENTER);
    data.extend_from_slice(b"================================\n");
    data.extend_from_slice("Impressão de teste concluída\n".as_bytes());
    data.extend_from_slice(b"\n\n\n");
    data.extend_from_slice(escpos::CUT);

    print_to(printer_key, &data)
}

// ── System Print Queue ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemJob {
    pub id: String,
    pub printer: String,
    pub user: String,
    pub size: String,
    pub status: String,
}

/// List system print queue jobs
pub fn get_system_queue() -> Result<Vec<SystemJob>, String> {
    let mut jobs: Vec<SystemJob> = Vec::new();

    #[cfg(not(target_os = "windows"))]
    {
        // lpstat -o gives active jobs, lpstat -W completed gives recent completed
        if let Ok(output) = Command::new("lpstat").args(["-o"]).env("LANG", "C").output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    // Format: "PRINTER-123 user 1024 Mon 01 Jan 2026 12:00:00"
                    let parts: Vec<&str> = line.splitn(4, ' ').collect();
                    if parts.len() >= 3 {
                        let job_id = parts[0].trim().to_string();
                        let user = parts[1].trim().to_string();
                        let size_and_rest = parts.get(2).unwrap_or(&"").trim().to_string();
                        let printer = job_id.rsplitn(2, '-').last().unwrap_or("").to_string();

                        jobs.push(SystemJob {
                            id: job_id,
                            printer,
                            user,
                            size: size_and_rest.split_whitespace().next().unwrap_or("?").to_string(),
                            status: "active".to_string(),
                        });
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps = r#"Get-PrintJob -PrinterName * 2>$null | ForEach-Object { "$($_.Id)|$($_.PrinterName)|$($_.UserName)|$($_.Size)|$($_.JobStatus)" }"#;
        if let Ok(output) = Command::new("powershell").args(["-NoProfile", "-Command", ps]).output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 5 {
                        jobs.push(SystemJob {
                            id: parts[0].trim().to_string(),
                            printer: parts[1].trim().to_string(),
                            user: parts[2].trim().to_string(),
                            size: parts[3].trim().to_string(),
                            status: parts[4].trim().to_lowercase(),
                        });
                    }
                }
            }
        }
    }

    Ok(jobs)
}

/// Cancel a system print job
pub fn cancel_system_job(job_id: &str) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("cancel")
            .arg(job_id)
            .output()
            .map_err(|e| format!("Erro ao cancelar: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Erro ao cancelar job: {}", stderr));
        }
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, need printer name and job ID separately
        let parts: Vec<&str> = job_id.splitn(2, ':').collect();
        if parts.len() == 2 {
            let ps = format!("Remove-PrintJob -PrinterName '{}' -ID {} -ErrorAction Stop", parts[0], parts[1]);
            let output = Command::new("powershell")
                .args(["-NoProfile", "-Command", &ps])
                .output()
                .map_err(|e| format!("Erro ao cancelar: {}", e))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Erro ao cancelar job: {}", stderr));
            }
        }
    }

    Ok(())
}

/// Test TCP connection to a network printer
pub fn test_network_connection(ip: &str, port: u16) -> Result<(), String> {
    let address = format!("{}:{}", ip, port);
    let addr: SocketAddr = address
        .parse()
        .map_err(|_| format!("Endereço inválido: {}", address))?;
    TcpStream::connect_timeout(&addr, Duration::from_secs(3))
        .map_err(|e| format!("Não foi possível conectar em {}: {}", address, e))?;
    Ok(())
}
