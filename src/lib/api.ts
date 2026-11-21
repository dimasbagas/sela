import { invoke } from "@tauri-apps/api/core";

/** GET HTTP via Rust (menghindari masalah CORS di webview). */
export async function httpGet(url: string): Promise<string> {
  return invoke<string>("http_get", { url });
}

/** Request HTTP generik via Rust: method, body, content-type, token Bearer. */
export async function httpReq(
  method: string,
  url: string,
  body?: string,
  contentType?: string,
  auth?: string,
): Promise<string> {
  return invoke<string>("http_req", {
    method,
    url,
    body: body ?? null,
    contentType: contentType ?? null,
    auth: auth ?? null,
  });
}

export async function httpJson<T>(url: string): Promise<T> {
  const text = await httpGet(url);
  return JSON.parse(text) as T;
}

/** POST form-urlencoded (dipakai tukar kode OAuth jadi token). */
export async function httpPostForm(
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const body = new URLSearchParams(params).toString();
  return httpReq("POST", url, body, "application/x-www-form-urlencoded");
}

/** GET dengan token Bearer (Google Calendar/Tasks). */
export async function httpGetAuth(url: string, token: string): Promise<string> {
  return httpReq("GET", url, undefined, undefined, token);
}

export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  status: string; // "Playing" | "Paused" | "Stopped"
  length_secs?: number | null;
  position_secs?: number | null;
}

/** Lagu yang sedang diputar (Linux: playerctl/MPRIS). null kalau tidak ada. */
export async function nowPlaying(): Promise<NowPlaying | null> {
  try {
    return await invoke<NowPlaying | null>("now_playing");
  } catch {
    return null;
  }
}

export async function mediaControl(
  action: "play-pause" | "next" | "previous" | "stop",
): Promise<boolean> {
  try {
    return await invoke<boolean>("media_control", { action });
  } catch {
    return false;
  }
}

/** Ubah ukuran jendela notch (buka/tutup). `tall` = varian 268px. Aman dipanggil di luar Tauri. */
export async function setNotchOpen(open: boolean, tall = false): Promise<void> {
  try {
    await invoke("set_notch_open", { open, tall });
  } catch {
    // preview browser biasa — abaikan
  }
}

export interface SysStats {
  cpu_percent: number;
  mem_used_mb: number;
  mem_total_mb: number;
  mem_percent: number;
  load1: number;
  load5: number;
  load15: number;
}

export async function sysStats(): Promise<SysStats | null> {
  try {
    return await invoke<SysStats>("sys_stats");
  } catch {
    return null;
  }
}

export interface Removable {
  name: string;
  size_gb: number;
  model: string;
}

export async function listRemovable(): Promise<Removable[]> {
  try {
    return await invoke<Removable[]>("list_removable");
  } catch {
    return [];
  }
}

export async function whichTool(name: string): Promise<boolean> {
  try {
    return await invoke<boolean>("which_tool", { name });
  } catch {
    return false;
  }
}

export async function openPath(path: string): Promise<string> {
  return invoke<string>("open_path", { path });
}

export async function powerAction(
  action: "hibernate" | "suspend",
): Promise<string> {
  return invoke<string>("power_action", { action });
}

export async function nightLight(on: boolean): Promise<string> {
  return invoke<string>("night_light", { on });
}

export async function shrinkVideo(
  input: string,
  width: number,
  output: string,
): Promise<string> {
  return invoke<string>("shrink_video", { input, width, output });
}

export interface WifiNet {
  ssid: string;
  signal: number;
  security: string;
}

export async function wifiList(): Promise<WifiNet[]> {
  return invoke<WifiNet[]>("wifi_list");
}
