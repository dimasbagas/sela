import { useEffect, useState } from "react";
import { httpJson, nowPlaying, type NowPlaying } from "../lib/api";
import type { LyricQuery } from "../App";
import {
  activeLineIndex,
  litWordCount,
  parseSynced,
  type LyricLine,
} from "../lib/karaoke";
import { openKaraokeWindow } from "../lib/windows";

interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export default function Lirik({
  np,
  query,
}: {
  np: NowPlaying | null;
  query: LyricQuery | null;
}) {
  const [track, setTrack] = useState(query?.track ?? "");
  const [artist, setArtist] = useState(query?.artist ?? "");
  const [results, setResults] = useState<LrclibTrack[]>([]);
  const [selected, setSelected] = useState<LrclibTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [karaoke, setKaraoke] = useState(false);
  const [pos, setPos] = useState(0);
  const [winErr, setWinErr] = useState("");

  // Posisi lagu untuk mode karaoke (poll tiap detik saat aktif).
  useEffect(() => {
    if (!karaoke) return;
    let stop = false;
    const t = setInterval(async () => {
      const n = await nowPlaying();
      if (!stop && n?.position_secs !== undefined && n.position_secs !== null) {
        setPos(n.position_secs);
      }
    }, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [karaoke]);

  const syncedLines: LyricLine[] = selected
    ? parseSynced(selected.syncedLyrics)
    : [];
  const activeIdx = activeLineIndex(syncedLines, pos);
  const lit = litWordCount(syncedLines, activeIdx, pos);

  async function openKaraoke() {
    if (!selected) return;
    const ok = await openKaraokeWindow(selected.trackName, selected.artistName);
    if (ok !== true) {
      setWinErr(`Jendela karaoke gagal dibuka: ${ok}`);
    }
  }

  async function search(t = track, a = artist) {
    const tr = t.trim();
    if (!tr) return;
    setLoading(true);
    setErr("");
    setSelected(null);
    try {
      const url =
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(tr)}` +
        (a.trim() ? `&artist_name=${encodeURIComponent(a.trim())}` : "");
      const r = await httpJson<LrclibTrack[]>(url);
      const list = (r ?? []).slice(0, 5);
      setResults(list);
      if (list.length === 0) {
        setErr("Lirik tidak ditemukan untuk lagu itu.");
      } else {
        setSelected(list[0]);
      }
    } catch {
      setErr("Tidak bisa mencari lirik — periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  // Dipicu dari tab Musik ("Lirik lagu ini").
  useEffect(() => {
    if (query) {
      setTrack(query.track);
      setArtist(query.artist);
      void search(query.track, query.artist);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function lyricText(t: LrclibTrack): string {
    if (t.plainLyrics) return t.plainLyrics;
    if (t.syncedLyrics) {
      return t.syncedLyrics
        .replace(/\[\d+:\d+\.\d+\]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    return "Lirik tidak tersedia untuk lagu ini.";
  }

  return (
    <div>
      <h2>Lirik</h2>
      <p className="sub">Pencarian lirik dari LRCLIB (gratis, tanpa kunci).</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input
          className="grow"
          type="text"
          placeholder="Judul lagu"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
        />
        <input
          className="grow"
          type="text"
          placeholder="Artis (opsional)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Mencari…" : "Cari"}
        </button>
      </form>

      {np && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn-ghost btn-mini"
            onClick={() => {
              setTrack(np.title);
              setArtist(np.artist);
              void search(np.title, np.artist);
            }}
          >
            Pakai lagu yang sedang diputar: {np.title}
          </button>
        </div>
      )}

      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      {results.length > 1 && (
        <div style={{ marginTop: 10 }}>
          {results.map((r) => (
            <div className="list-row" key={r.id}>
              <button
                className="btn-ghost grow"
                style={{ textAlign: "left" }}
                onClick={() => setSelected(r)}
              >
                {r.trackName} — {r.artistName}
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="grow">
              <div className="card-title">{selected.trackName}</div>
              <div className="list-sub">
                {selected.artistName}
                {selected.albumName ? ` · ${selected.albumName}` : ""}
              </div>
            </div>
            <button
              className={karaoke ? "btn-ghost active" : "btn-ghost btn-mini"}
              onClick={() => setKaraoke(!karaoke)}
              disabled={syncedLines.length === 0}
            >
              {karaoke ? "Tutup karaoke" : "Mode karaoke"}
            </button>
            <button className="btn-ghost btn-mini" onClick={() => void openKaraoke()}>
              Jendela karaoke
            </button>
          </div>
          {winErr && <div className="err">{winErr}</div>}
          {karaoke && syncedLines.length > 0 ? (
            <>
              <div className="lyrics" style={{ maxHeight: 260 }}>
                {syncedLines.map((l, i) => {
                  const words = l.text.split(/\s+/).filter(Boolean);
                  return (
                    <div
                      key={i}
                      className={i === activeIdx ? "karaoke-line active" : "karaoke-line"}
                    >
                      {i === activeIdx
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
              <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                Baris aktif mengikuti posisi lagu (playerctl/MPRIS). Pewarnaan
                kata adalah aproksimasi — durasi baris dibagi jumlah kata.
                {np ? "" : " Putar lagu dulu supaya baris bergerak."}
              </p>
            </>
          ) : (
            <div className="lyrics">{lyricText(selected)}</div>
          )}
        </div>
      )}
    </div>
  );
}
