import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { httpJson, nowPlaying } from "../lib/api";
import {
  activeLineIndex,
  litWordCount,
  parseSynced,
  type LyricLine,
} from "../lib/karaoke";

interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

/** Jendela karaoke terpisah: lirik besar, baris aktif tersinkron dengan
 *  posisi lagu (MPRIS/playerctl), kata terisi = aproksimasi. */
export default function KaraokeWindow() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") ?? "";
  const artist = params.get("artist") ?? "";
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [pos, setPos] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    const fetchLyrics = async () => {
      try {
        const url =
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}` +
          (artist ? `&artist_name=${encodeURIComponent(artist)}` : "");
        const r = await httpJson<LrclibTrack[]>(url);
        if (stop) return;
        const first = r?.[0];
        if (!first) {
          setErr("Lirik tidak ditemukan untuk lagu itu.");
        } else {
          const parsed = parseSynced(first.syncedLyrics);
          if (parsed.length === 0) {
            setErr("Lirik tersinkron tidak tersedia untuk lagu ini.");
          } else {
            setLines(parsed);
          }
        }
      } catch {
        if (!stop) setErr("Tidak bisa mengambil lirik — periksa koneksi internetmu.");
      } finally {
        if (!stop) setLoading(false);
      }
    };
    void fetchLyrics();
    const t = setInterval(async () => {
      const np = await nowPlaying();
      if (!stop && np?.position_secs !== undefined && np.position_secs !== null) {
        setPos(np.position_secs);
      }
    }, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = activeLineIndex(lines, pos);
  const lit = litWordCount(lines, idx, pos);

  async function close() {
    try {
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  }

  return (
    <div className="karaoke-full">
      <button className="widget-close" onClick={() => void close()} aria-label="Tutup karaoke">
        ×
      </button>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
        {track}
        {artist ? ` — ${artist}` : ""}
      </div>
      {loading ? (
        <p className="muted">Mengambil lirik…</p>
      ) : err ? (
        <p className="muted">{err}</p>
      ) : (
        <div style={{ width: "100%", maxHeight: "70vh", overflowY: "auto" }}>
          {lines.map((l, i) => {
            const words = l.text.split(/\s+/).filter(Boolean);
            return (
              <div key={i} className={i === idx ? "karaoke-line active" : "karaoke-line"}>
                {i === idx
                  ? words.map((w, wi) => (
                      <span key={wi} className={wi < lit ? "word lit" : "word"}>
                        {w}{" "}
                      </span>
                    ))
                  : l.text}
              </div>
            );
          })}
        </div>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Pewarnaan kata adalah aproksimasi (durasi baris dibagi jumlah kata).
      </p>
    </div>
  );
}
