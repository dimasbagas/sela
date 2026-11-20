import { useState } from "react";
import { httpJson, mediaControl, type NowPlaying } from "../lib/api";
import { mmss } from "../lib/format";
import type { LyricQuery } from "../App";

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string };
  duration: number;
}
interface DeezerResp {
  data: DeezerTrack[];
}

function IconPrev() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="2" height="10" />
      <path d="M13 3 L5 8 L13 13 Z" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 2 L13 8 L4 14 Z" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="3.5" height="12" />
      <rect x="9.5" y="2" width="3.5" height="12" />
    </svg>
  );
}
function IconNext() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="12" y="3" width="2" height="10" />
      <path d="M3 3 L11 8 L3 13 Z" />
    </svg>
  );
}

export default function Musik({
  np,
  onLyrics,
}: {
  np: NowPlaying | null;
  onLyrics: (q: LyricQuery) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setErr("");
    try {
      const data = await httpJson<DeezerResp>(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}`,
      );
      const list = (data.data ?? []).slice(0, 8);
      setResults(list);
      if (list.length === 0) setErr("Tidak ada hasil untuk pencarian itu.");
    } catch {
      setErr("Tidak bisa terhubung ke Deezer — periksa koneksi internetmu, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const playing = np?.status === "Playing";

  return (
    <div>
      <h2>Musik</h2>
      <p className="sub">Lagu yang sedang diputar + cari lagu di Deezer.</p>

      <div className="card">
        {np ? (
          <>
            <div className="list-title" style={{ fontWeight: 600 }}>
              {np.title}
            </div>
            <div className="list-sub">
              {np.artist}
              {np.album ? ` · ${np.album}` : ""}
            </div>
            <div className="list-sub mono" style={{ marginTop: 4 }}>
              {playing ? "Diputar" : "Dijeda"}
              {np.length_secs
                ? ` · ${mmss(np.position_secs ?? 0)} / ${mmss(np.length_secs)}`
                : ""}
            </div>
          </>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>
            Tidak ada lagu yang terdeteksi. Di Linux, pasang{" "}
            <span className="mono">playerctl</span> (
            <span className="mono">sudo apt install playerctl</span>) lalu putar
            musik di pemutar apa pun.
          </div>
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="btn-ghost"
            disabled={!np}
            onClick={() => mediaControl("previous")}
            aria-label="Sebelumnya"
          >
            <IconPrev />
          </button>
          <button
            className="btn-ghost"
            disabled={!np}
            onClick={() => mediaControl("play-pause")}
            aria-label={playing ? "Jeda" : "Putar"}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button
            className="btn-ghost"
            disabled={!np}
            onClick={() => mediaControl("next")}
            aria-label="Berikutnya"
          >
            <IconNext />
          </button>
          {np && (
            <button
              className="btn-ghost"
              onClick={() => onLyrics({ track: np.title, artist: np.artist })}
            >
              Lirik lagu ini
            </button>
          )}
        </div>
      </div>

      <form className="row" onSubmit={search}>
        <input
          className="grow"
          type="text"
          placeholder="Cari lagu atau artis di Deezer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Mencari…" : "Cari"}
        </button>
      </form>
      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        {results.map((t) => (
          <div className="list-row" key={t.id}>
            <div className="list-main">
              <div className="list-title">{t.title}</div>
              <div className="list-sub">
                {t.artist.name} · {t.album.title}
              </div>
            </div>
            <span className="muted mono" style={{ fontSize: 12 }}>
              {mmss(t.duration)}
            </span>
            <button
              className="btn-ghost btn-mini"
              onClick={() => onLyrics({ track: t.title, artist: t.artist.name })}
            >
              Lirik
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
