import { useRef, useState } from "react";
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
interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  country: string;
  tags: string;
  votes: number;
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

  // Radio Browser
  const [rq, setRq] = useState("");
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioErr, setRadioErr] = useState("");
  const [playingStation, setPlayingStation] = useState<RadioStation | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function searchRadio(e?: React.FormEvent) {
    e?.preventDefault();
    const query = rq.trim();
    if (!query) return;
    setRadioLoading(true);
    setRadioErr("");
    try {
      const data = await httpJson<RadioStation[]>(
        `https://all.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=8&order=votes&reverse=true`,
      );
      const list = (data ?? []).filter((s) => s.url_resolved);
      setStations(list);
      if (list.length === 0) setRadioErr("Tidak ada stasiun radio untuk pencarian itu.");
    } catch {
      setRadioErr("Tidak bisa terhubung ke Radio Browser — periksa koneksi internetmu.");
    } finally {
      setRadioLoading(false);
    }
  }

  function playStation(s: RadioStation) {
    setPlayingStation(s);
    const audio = audioRef.current;
    if (audio) {
      audio.src = s.url_resolved;
      void audio.play().catch(() => {
        setRadioErr(`Tidak bisa memutar stream “${s.name}”.`);
      });
    }
  }

  function stopStation() {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlayingStation(null);
  }

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

      <div className="divider" />
      <h2 style={{ fontSize: 17 }}>Radio</h2>
      <p className="sub">
        Stasiun radio internet dari Radio Browser (gratis, tanpa kunci).
      </p>
      <audio ref={audioRef} preload="none" />
      {playingStation && (
        <div className="card">
          <div className="row">
            <div className="grow">
              <div className="card-title">▶ {playingStation.name}</div>
              <div className="list-sub">
                {playingStation.country}
                {playingStation.tags ? ` · ${playingStation.tags}` : ""}
              </div>
            </div>
            <button className="btn-ghost btn-mini" onClick={stopStation}>
              Berhenti
            </button>
          </div>
        </div>
      )}
      <form className="row" onSubmit={searchRadio}>
        <input
          className="grow"
          type="text"
          placeholder="Cari stasiun radio… (mis. Prambors)"
          value={rq}
          onChange={(e) => setRq(e.target.value)}
        />
        <button className="btn" type="submit" disabled={radioLoading}>
          {radioLoading ? "Mencari…" : "Cari"}
        </button>
      </form>
      {radioErr && (
        <div className="err" style={{ marginTop: 10 }}>
          {radioErr}
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        {stations.map((s) => (
          <div className="list-row" key={s.stationuuid}>
            <div className="list-main">
              <div className="list-title">{s.name}</div>
              <div className="list-sub">
                {s.country}
                {s.tags ? ` · ${s.tags}` : ""} · {s.votes} suara
              </div>
            </div>
            <button
              className="btn-ghost btn-mini"
              onClick={() =>
                playingStation?.stationuuid === s.stationuuid
                  ? stopStation()
                  : playStation(s)
              }
            >
              {playingStation?.stationuuid === s.stationuuid
                ? "Berhenti"
                : "Putar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
