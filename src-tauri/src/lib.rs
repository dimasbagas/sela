// Sela — notch interaktif ala Poni, versi original.
// Backend Rust: command HTTP generik (API publik gratis, tanpa key),
// info lagu via playerctl/MPRIS (Linux), tray, dan geometri jendela notch.

use serde::Serialize;
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

// Ukuran jendela notch (logical px).
const COLLAPSED_W: f64 = 380.0;
const COLLAPSED_H: f64 = 56.0;
const EXPANDED_W: f64 = 520.0;
const EXPANDED_H: f64 = 600.0;
const TOP_Y: f64 = 10.0;

#[derive(Serialize)]
struct NowPlaying {
    title: String,
    artist: String,
    album: String,
    status: String, // "Playing" | "Paused" | "Stopped"
    length_secs: Option<u64>,
    position_secs: Option<u64>,
}

fn playerctl(args: &[&str]) -> Option<String> {
    let out = Command::new("playerctl").args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

/// Info lagu yang sedang diputar di pemutar apa pun (MPRIS via playerctl).
/// None kalau playerctl tidak terpasang atau tidak ada lagu yang diputar.
#[tauri::command]
fn now_playing() -> Option<NowPlaying> {
    let raw = playerctl(&[
        "metadata",
        "--format",
        "{{title}}|{{artist}}|{{album}}|{{status}}|{{mpris:length}}|{{position}}",
    ])?;
    let mut parts = raw.split('|');
    let title = parts.next().unwrap_or("").to_string();
    if title.is_empty() {
        return None;
    }
    let artist = parts.next().unwrap_or("").to_string();
    let album = parts.next().unwrap_or("").to_string();
    let status = parts.next().unwrap_or("").to_string();
    let length_secs = parts
        .next()
        .and_then(|s| s.parse::<u64>().ok())
        .map(|us| us / 1_000_000);
    let position_secs = parts
        .next()
        .and_then(|s| s.parse::<u64>().ok())
        .map(|us| us / 1_000_000);
    Some(NowPlaying {
        title,
        artist,
        album,
        status,
        length_secs,
        position_secs,
    })
}

/// Kontrol pemutar: "play-pause" | "next" | "previous" | "stop".
/// false kalau playerctl tidak ada / tidak ada pemutar aktif.
#[tauri::command]
fn media_control(action: &str) -> bool {
    let arg = match action {
        "play-pause" => "play-pause",
        "next" => "next",
        "previous" => "previous",
        "stop" => "stop",
        _ => return false,
    };
    playerctl(&[arg]).is_some()
}

/// GET HTTP generik ke API publik (tanpa key). Dipakai semua modul online.
/// Mengembalikan body sebagai teks; error berupa string yang ramah ditampilkan.
#[tauri::command]
async fn http_get(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Sela/0.1 (Tauri)")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status.as_u16()));
    }
    resp.text().await.map_err(|e| e.to_string())
}

/// Posisikan jendela di tengah-atas monitor tempat jendela berada.
fn place_top_center(window: &tauri::WebviewWindow, width: f64, height: f64) {
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
    if let Ok(Some(monitor)) = window.current_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let x = (size.width as f64 / scale - width) / 2.0;
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x,
            y: TOP_Y,
        }));
    }
}

/// Dipanggil frontend saat notch dibuka/ditutup.
#[tauri::command]
fn set_notch_open(window: tauri::WebviewWindow, open: bool) {
    if open {
        place_top_center(&window, EXPANDED_W, EXPANDED_H);
    } else {
        place_top_center(&window, COLLAPSED_W, COLLAPSED_H);
    }
}

fn toggle_window_visibility(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("jendela main tidak ada");
            place_top_center(&window, COLLAPSED_W, COLLAPSED_H);
            let _ = window.set_always_on_top(true);
            let _ = window.set_skip_taskbar(true);

            // Tray: klik kiri = tampil/sembunyi; menu kanan = tampil/sembunyi + keluar.
            let toggle =
                MenuItem::with_id(app, "toggle", "Tampilkan / Sembunyikan", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &quit])?;

            let mut tray = TrayIconBuilder::new().menu(&menu).show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            let _tray = tray
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => toggle_window_visibility(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window_visibility(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            http_get,
            now_playing,
            media_control,
            set_notch_open
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
