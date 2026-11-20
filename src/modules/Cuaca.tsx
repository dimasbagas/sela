import { useEffect, useState } from "react";
import { httpJson } from "../lib/api";
import { load, save } from "../lib/store";
import { cuacaText, formatAngka, HARI_SINGKAT } from "../lib/format";

interface Geo {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}
interface GeoResp {
  results?: Geo[];
}
interface Forecast {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    time: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

const CITY_KEY = "sela.weather.city";
const DATA_KEY = "sela.weather.data";
const DEFAULT_CITY: Geo = {
  name: "Jakarta",
  country: "Indonesia",
  latitude: -6.2088,
  longitude: 106.8456,
};

export default function Cuaca() {
  const [city, setCity] = useState<Geo>(() => load<Geo>(CITY_KEY, DEFAULT_CITY));
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Geo[]>([]);
  const [data, setData] = useState<Forecast | null>(() =>
    load<Forecast | null>(DATA_KEY, null),
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [stale, setStale] = useState(false);

  async function fetchForecast(g: Geo) {
    setLoading(true);
    setErr("");
    setStale(false);
    try {
      const f = await httpJson<Forecast>(
        `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`,
      );
      setData(f);
      save(DATA_KEY, f);
    } catch {
      setErr("Tidak bisa mengambil cuaca — periksa koneksi internetmu.");
      if (data) setStale(true);
    } finally {
      setLoading(false);
    }
  }

  // Ambil cuaca kota tersimpan saat modul dibuka.
  useEffect(() => {
    void fetchForecast(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchCity(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setErr("");
    try {
      const r = await httpJson<GeoResp>(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=id&format=json`,
      );
      const list = r.results ?? [];
      setOptions(list);
      if (list.length === 0) setErr("Kota tidak ditemukan.");
    } catch {
      setErr("Tidak bisa mencari kota — periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  function pick(g: Geo) {
    setCity(g);
    save(CITY_KEY, g);
    setOptions([]);
    setQuery("");
    void fetchForecast(g);
  }

  return (
    <div>
      <h2>Cuaca</h2>
      <p className="sub">Prakiraan dari Open-Meteo (gratis, tanpa kunci).</p>

      <form className="row" onSubmit={searchCity}>
        <input
          className="grow"
          type="text"
          placeholder="Cari kota… (mis. Bandung)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit" disabled={loading}>
          Cari
        </button>
      </form>

      {options.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {options.map((g) => (
            <div className="list-row" key={`${g.latitude},${g.longitude}`}>
              <button className="btn-ghost grow" style={{ textAlign: "left" }} onClick={() => pick(g)}>
                {g.name}
                {g.country ? `, ${g.country}` : ""}
              </button>
            </div>
          ))}
        </div>
      )}

      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div className="card-title">
          {city.name}
          {city.country ? `, ${city.country}` : ""}
        </div>
        {loading && !data ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Mengambil cuaca…
          </p>
        ) : data ? (
          <>
            {stale && (
              <p className="muted" style={{ fontSize: 12 }}>
                Menampilkan data terakhir (offline).
              </p>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span className="mono" style={{ fontSize: 38, fontWeight: 600 }}>
                {formatAngka(data.current.temperature_2m, 0)}°
              </span>
              <span>{cuacaText(data.current.weather_code)}</span>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              Kelembapan {data.current.relative_humidity_2m}% · Angin{" "}
              {formatAngka(data.current.wind_speed_10m, 0)} km/jam
            </p>
            <div className="divider" />
            {data.daily.time.map((t, i) => {
              const d = new Date(`${t}T12:00:00`);
              return (
                <div className="list-row" key={t}>
                  <div className="list-main">
                    <div className="list-title">
                      {i === 0 ? "Hari ini" : HARI_SINGKAT[d.getDay()]}
                    </div>
                    <div className="list-sub">
                      {cuacaText(data.daily.weather_code[i])}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {formatAngka(data.daily.temperature_2m_min[i], 0)}° /{" "}
                    {formatAngka(data.daily.temperature_2m_max[i], 0)}°
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          !loading && (
            <p className="muted" style={{ fontSize: 13 }}>
              Belum ada data cuaca.
            </p>
          )
        )}
      </div>
    </div>
  );
}
