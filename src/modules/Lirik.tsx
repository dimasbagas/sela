import { useEffect, useState } from "react";
import { httpJson, type NowPlaying } from "../lib/api";
import type { LyricQuery } from "../App";

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
          <div className="card-title">{selected.trackName}</div>
          <div className="list-sub" style={{ marginBottom: 8 }}>
            {selected.artistName}
            {selected.albumName ? ` · ${selected.albumName}` : ""}
          </div>
          <div className="lyrics">{lyricText(selected)}</div>
        </div>
      )}
    </div>
  );
}
