#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod escpos;
mod print_queue;
mod printer;

use print_queue::PrintQueue;
use serde::Serialize;
use std::sync::Arc;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

// ── Tauri IPC Commands ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
struct PrinterInfoResponse {
    name: String,
    key: String,
    vendor_id: u16,
    product_id: u16,
    manufacturer: String,
    serial: String,
}

#[tauri::command]
fn list_printers() -> Result<Vec<PrinterInfoResponse>, String> {
    let printers = printer::list_printers()?;
    Ok(printers
        .into_iter()
        .map(|p| PrinterInfoResponse {
            name: p.name.clone(),
            key: p.key(),
            vendor_id: p.vendor_id,
            product_id: p.product_id,
            manufacturer: p.manufacturer,
            serial: p.serial,
        })
        .collect())
}

#[tauri::command]
fn print_receipt(
    order_json: String,
    printer_key: String,
    tenant_name: String,
    paper_width: u32,
    queue: tauri::State<'_, Arc<PrintQueue>>,
) -> Result<String, String> {
    let data = escpos::build_receipt(&order_json, &tenant_name, paper_width)?;
    let label = {
        let order: serde_json::Value = serde_json::from_str(&order_json).unwrap_or_default();
        let num = order
            .get("order_number")
            .and_then(|v| v.as_str())
            .or_else(|| {
                order
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|id| &id[..6.min(id.len())])
            })
            .unwrap_or("---");
        format!("Pedido #{}", num)
    };
    let job_id = queue.add_job(label, printer_key, data);
    Ok(job_id)
}

#[tauri::command]
fn test_print(printer_key: String) -> Result<(), String> {
    printer::test_print(&printer_key)
}

#[derive(Debug, Clone, Serialize)]
struct QueueJobResponse {
    id: String,
    label: String,
    printer_key: String,
    status: String,
    retries: u32,
    error_message: Option<String>,
    created_at: String,
}

#[tauri::command]
fn get_print_queue(queue: tauri::State<'_, Arc<PrintQueue>>) -> Vec<QueueJobResponse> {
    queue
        .get_queue()
        .into_iter()
        .map(|j| QueueJobResponse {
            id: j.id,
            label: j.label,
            printer_key: j.printer_key,
            status: match j.status {
                print_queue::JobStatus::Pending => "pending".to_string(),
                print_queue::JobStatus::Printing => "printing".to_string(),
                print_queue::JobStatus::Done => "done".to_string(),
                print_queue::JobStatus::Error => "error".to_string(),
            },
            retries: j.retries,
            error_message: j.error_message,
            created_at: j.created_at,
        })
        .collect()
}

#[tauri::command]
fn clear_print_queue(queue: tauri::State<'_, Arc<PrintQueue>>) {
    queue.clear_queue();
}

// ── Main ───────────────────────────────────────────────────────────────────

fn main() {
    let print_queue = Arc::new(PrintQueue::new());

    tauri::Builder::default()
        .manage(print_queue)
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            list_printers,
            print_receipt,
            test_print,
            get_print_queue,
            clear_print_queue,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // --- System Tray ---
            let open_item = MenuItemBuilder::with_id("open", "Abrir MenuFácil").build(app)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Sair").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[&open_item, &separator, &quit_item])
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("MenuFácil | Desktop")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // --- Hide to tray on window close instead of quitting ---
            let app_handle = app.handle().clone();
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(win) = app_handle.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
