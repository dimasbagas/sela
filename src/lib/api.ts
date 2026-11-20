import { invoke } from "@tauri-apps/api/core";

/** GET HTTP via Rust (menghindari masalah CORS di webview). */
export async function httpGet(url: string): Promise<string> {
  return invoke<string>("http_get", { url });
}

export async function httpJson<T>(url: string): Promise<T> {
  const text = await httpGet(url);
  return JSON.parse(text) as T;
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

/** Ubah ukuran jendela notch (buka/tutup). Aman dipanggil di luar Tauri. */
export async function setNotchOpen(open: boolean): Promise<void> {
  try {
    await invoke("set_notch_open", { open });
  } catch {
    // preview browser biasa — abaikan
  }
}
