import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Buka jendela karaoke terpisah (lirik besar tersinkron).
 *  Mengembalikan true bila berhasil, atau pesan error bila gagal —
 *  supaya kegagalan terlihat di UI (bukan diam-diam false). */
export async function openKaraokeWindow(
  track: string,
  artist: string,
): Promise<true | string> {
  try {
    const label = "karaoke";
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.setFocus();
      return true;
    }
    const win = new WebviewWindow(label, {
      url: `/?window=karaoke&track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`,
      title: "Sela — Karaoke",
      width: 640,
      height: 480,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
    });
    // Kegagalan pembuatan TIDAK melempar — datang lewat event tauri://error,
    // jadi dengarkan keduanya (dulu hanya tauri://created → gagal diam-diam).
    return await new Promise<true | string>((resolve) => {
      void win.once("tauri://created", () => resolve(true));
      void win.once("tauri://error", (e) =>
        resolve(typeof e === "string" ? e : JSON.stringify(e)),
      );
    });
  } catch (e) {
    return String(e);
  }
}

/** Buka mini-window dock (jam / cuaca) yang lepas dari panel. */
export async function openDockWindow(
  kind: "dock-clock" | "dock-weather",
): Promise<true | string> {
  try {
    const existing = await WebviewWindow.getByLabel(kind);
    if (existing) {
      await existing.setFocus();
      return true;
    }
    const win = new WebviewWindow(kind, {
      url: `/?window=${kind}`,
      title: kind === "dock-clock" ? "Sela — Jam" : "Sela — Cuaca",
      width: 260,
      height: 120,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
    });
    // Sama seperti karaoke: kegagalan datang lewat tauri://error.
    return await new Promise<true | string>((resolve) => {
      void win.once("tauri://created", () => resolve(true));
      void win.once("tauri://error", (e) =>
        resolve(typeof e === "string" ? e : JSON.stringify(e)),
      );
    });
  } catch (e) {
    return String(e);
  }
}
