// Sela — notch interaktif ala Poni, versi original.
// Backend Rust: command HTTP generik (API publik gratis, tanpa key),
// info lagu via playerctl/MPRIS (Linux), tray, dan geometri jendela notch.

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

// Ukuran jendela notch (logical px).
const COLLAPSED_W: f64 = 200.0;
const COLLAPSED_H: f64 = 76.0;
const EXPANDED_W: f64 = 680.0;
const EXPANDED_H: f64 = 196.0;
const EXPANDED_H_TALL: f64 = 268.0;
const TOP_Y: f64 = 0.0;

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
    http_req("GET".to_string(), url, None, None, None).await
}

/// Request HTTP generik (GET/POST/PATCH/DELETE) dengan body, content-type,
/// dan token Bearer opsional. Dipakai Google OAuth/Calendar/Tasks + AI Chat.
#[tauri::command]
async fn http_req(
    method: String,
    url: String,
    body: Option<String>,
    content_type: Option<String>,
    auth: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Sela/0.2 (Tauri)")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "PATCH" => client.patch(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };
    if let Some(ct) = content_type {
        req = req.header("Content-Type", ct);
    }
    if let Some(token) = auth {
        req = req.header("Authorization", format!("Bearer {}", token));
    }
    if let Some(b) = body {
        req = req.body(b);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), text));
    }
    Ok(text)
}

#[derive(Serialize)]
struct SysStats {
    cpu_percent: f64,
    mem_used_mb: u64,
    mem_total_mb: u64,
    mem_percent: f64,
    load1: f64,
    load5: f64,
    load15: f64,
}

fn read_cpu_times() -> Option<(u64, u64)> {
    let s = std::fs::read_to_string("/proc/stat").ok()?;
    let line = s.lines().next()?;
    let nums: Vec<u64> = line
        .split_whitespace()
        .skip(1)
        .filter_map(|x| x.parse().ok())
        .collect();
    if nums.len() < 4 {
        return None;
    }
    let idle = nums[3] + nums.get(4).copied().unwrap_or(0);
    let total: u64 = nums.iter().sum();
    Some((idle, total))
}

/// Statistik sistem sederhana (Linux): CPU % (2 sampel 300ms), RAM, load avg.
#[tauri::command]
fn sys_stats() -> Result<SysStats, String> {
    let (idle1, total1) = read_cpu_times().ok_or("tidak bisa membaca /proc/stat")?;
    std::thread::sleep(std::time::Duration::from_millis(300));
    let (idle2, total2) = read_cpu_times().ok_or("tidak bisa membaca /proc/stat")?;
    let total_d = (total2 - total1) as f64;
    let idle_d = (idle2 - idle1) as f64;
    let cpu_percent = if total_d > 0.0 {
        (1.0 - idle_d / total_d) * 100.0
    } else {
        0.0
    };
    let meminfo = std::fs::read_to_string("/proc/meminfo").map_err(|e| e.to_string())?;
    let mut total_kb = 0u64;
    let mut avail_kb = 0u64;
    for line in meminfo.lines() {
        let mut p = line.split_whitespace();
        match p.next() {
            Some("MemTotal:") => total_kb = p.next().and_then(|v| v.parse().ok()).unwrap_or(0),
            Some("MemAvailable:") => {
                avail_kb = p.next().and_then(|v| v.parse().ok()).unwrap_or(0)
            }
            _ => {}
        }
    }
    let loadavg = std::fs::read_to_string("/proc/loadavg").unwrap_or_default();
    let mut lp = loadavg.split_whitespace();
    let load1: f64 = lp.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let load5: f64 = lp.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let load15: f64 = lp.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let mem_total_mb = total_kb / 1024;
    let mem_used_mb = (total_kb.saturating_sub(avail_kb)) / 1024;
    let mem_percent = if total_kb > 0 {
        (total_kb - avail_kb) as f64 / total_kb as f64 * 100.0
    } else {
        0.0
    };
    Ok(SysStats {
        cpu_percent,
        mem_used_mb,
        mem_total_mb,
        mem_percent,
        load1,
        load5,
        load15,
    })
}

#[derive(Serialize)]
struct Removable {
    name: String,
    size_gb: f64,
    model: String,
}

/// Perangkat block removable (USB/SD): baca /sys/block/*/removable.
/// Tidak me-mount apa pun — hanya daftar.
#[tauri::command]
fn list_removable() -> Vec<Removable> {
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir("/sys/block") else {
        return out;
    };
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with("loop") || name.starts_with("ram") {
            continue;
        }
        let rem = std::fs::read_to_string(e.path().join("removable"))
            .unwrap_or_default()
            .trim()
            .to_string();
        if rem != "1" {
            continue;
        }
        let sectors: u64 = std::fs::read_to_string(e.path().join("size"))
            .unwrap_or_default()
            .trim()
            .parse()
            .unwrap_or(0);
        let model = std::fs::read_to_string(e.path().join("device/model"))
            .unwrap_or_default()
            .trim()
            .to_string();
        out.push(Removable {
            name,
            size_gb: sectors as f64 * 512.0 / 1e9,
            model,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// true bila sebuah binary ada di PATH (cek: ffmpeg, redshift, nmcli, tesseract).
#[tauri::command]
fn which_tool(name: String) -> bool {
    Command::new("which")
        .arg(&name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Buka file/folder dengan aplikasi default sistem (xdg-open di Linux).
#[tauri::command]
fn open_path(path: String) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    let cmd = ("xdg-open", vec![path.as_str()]);
    #[cfg(target_os = "windows")]
    let cmd = ("cmd", vec!["/C", "start", "", path.as_str()]);
    #[cfg(target_os = "macos")]
    let cmd = ("open", vec![path.as_str()]);
    let (prog, args) = cmd;
    let out = Command::new(prog)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok("ok".to_string())
    } else {
        Err(format!(
            "gagal membuka: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ))
    }
}

/// Aksi daya Linux via systemctl. Hanya hibernate/suspend; dipanggil UI
/// setelah konfirmasi pengguna.
#[tauri::command]
fn power_action(action: String) -> Result<String, String> {
    let arg = match action.as_str() {
        "hibernate" => "hibernate",
        "suspend" => "suspend",
        _ => return Err("aksi daya tidak dikenal".to_string()),
    };
    let out = Command::new("systemctl")
        .arg(arg)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok("ok".to_string())
    } else {
        Err(format!(
            "systemctl {} gagal: {}",
            arg,
            String::from_utf8_lossy(&out.stderr).trim()
        ))
    }
}

/// Night light via redshift: on = 3500K hangat, off = kembalikan normal.
#[tauri::command]
fn night_light(on: bool) -> Result<String, String> {
    let args: &[&str] = if on { &["-O", "3500K"] } else { &["-x"] };
    let out = Command::new("redshift")
        .args(args)
        .output()
        .map_err(|e| format!("redshift tidak ditemukan: {}", e))?;
    if out.status.success() {
        Ok("ok".to_string())
    } else {
        Err(format!(
            "redshift gagal: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ))
    }
}

/// Perkecil video via ffmpeg: skala lebar ke `width` px (tinggi otomatis).
#[tauri::command]
fn shrink_video(input: String, width: u32, output: String) -> Result<String, String> {
    let out = Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            &input,
            "-vf",
            &format!("scale={}:-2", width),
            "-c:a",
            "copy",
            &output,
        ])
        .output()
        .map_err(|e| format!("ffmpeg tidak ditemukan: {}", e))?;
    if out.status.success() {
        Ok(output)
    } else {
        let err = String::from_utf8_lossy(&out.stderr);
        let tail: Vec<&str> = err.lines().rev().take(3).collect();
        Err(format!("ffmpeg gagal: {}", tail.join(" | ")))
    }
}

#[derive(Serialize, Deserialize)]
struct WifiNet {
    ssid: String,
    signal: u32,
    security: String,
}

/// Daftar jaringan Wi-Fi via nmcli (Linux). Kosong/error bila nmcli tidak ada.
#[tauri::command]
fn wifi_list() -> Result<Vec<WifiNet>, String> {
    let out = Command::new("nmcli")
        .args(["-t", "-f", "SSID,SIGNAL,SECURITY", "dev", "wifi", "list", "--rescan", "no"])
        .output()
        .map_err(|e| format!("nmcli tidak ditemukan: {}", e))?;
    if !out.status.success() {
        return Err(format!(
            "nmcli gagal: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let mut nets = Vec::new();
    for line in String::from_utf8_lossy(&out.stdout).lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() < 3 || parts[0].is_empty() {
            continue;
        }
        nets.push(WifiNet {
            ssid: parts[0].to_string(),
            signal: parts[1].parse().unwrap_or(0),
            security: parts[2].to_string(),
        });
    }
    nets.sort_by(|a, b| b.signal.cmp(&a.signal));
    nets.dedup_by(|a, b| a.ssid == b.ssid);
    Ok(nets)
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
/// `tall` = varian tinggi 268px (modul yang butuh ruang lebih).
#[tauri::command]
fn set_notch_open(window: tauri::WebviewWindow, open: bool, tall: bool) {
    if open {
        let h = if tall { EXPANDED_H_TALL } else { EXPANDED_H };
        place_top_center(&window, EXPANDED_W, h);
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
            http_req,
            now_playing,
            media_control,
            set_notch_open,
            sys_stats,
            list_removable,
            which_tool,
            open_path,
            power_action,
            night_light,
            shrink_video,
            wifi_list
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
