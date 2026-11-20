import { useEffect, useState } from "react";
import { httpJson } from "../lib/api";
import { load, save } from "../lib/store";

interface Kota {
  id: string;
  lokasi: string;
}
interface Jadwal {
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  tanggal: string;
}
interface JadwalResp {
  status: boolean;
  data: { jadwal: Jadwal; lokasi: string; daerah: string };
}
interface KotaResp {
  status: boolean;
  data: Kota[];
}
interface HijriResp {
  data: { hijri: { day: string; month: { en: string }; year: string } };
}

const CITY_KEY = "sela.prayer.city";

/** Waktu "sekarang" dalam WIB, apa pun zona waktu sistem. */
function wibNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

const p2 = (n: number) => String(n).padStart(2, "0");

const PRAYERS: { key: keyof Jadwal; label: string }[] = [
  { key: "imsak", label: "Imsak" },
  { key: "subuh", label: "Subuh" },
  { key: "terbit", label: "Terbit" },
  { key: "dhuha", label: "Dhuha" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
];

export default function Sholat() {
  const [city, setCity] = useState<Kota | null>(() => load<Kota | null>(CITY_KEY, null));
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Kota[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal | null>(null);
  const [hijri, setHijri] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(() => wibNow());

  useEffect(() => {
    const t = setInterval(() => setNow(wibNow()), 20000);
    return () => clearInterval(t);
  }, []);

  async function fetchJadwal(k: Kota) {
    const d = wibNow();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    setLoading(true);
    setErr("");
    try {
      const r = await httpJson<JadwalResp>(
        `https://api.myquran.com/v2/sholat/jadwal/${k.id}/${y}/${p2(m)}/${p2(dd)}`,
      );
      setJadwal(r.data.jadwal);
      const h = await httpJson<HijriResp>(
        `https://api.aladhan.com/v1/gToH/${p2(dd)}-${p2(m)}-${y}`,
      );
      setHijri(`${h.data.hijri.day} ${h.data.hijri.month.en} ${h.data.hijri.year} H`);
    } catch {
      setErr("Tidak bisa mengambil jadwal sholat — periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity(name: string, auto = false) {
    setLoading(true);
    setErr("");
    try {
      const r = await httpJson<KotaResp>(
        `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(name)}`,
      );
      const list = r.data ?? [];
      if (auto) {
        if (list.length > 0) pick(list[0]);
        else setErr("Tidak bisa menemukan kota Jakarta.");
      } else {
        setOptions(list.slice(0, 5));
        if (list.length === 0) setErr("Kota tidak ditemukan.");
      }
    } catch {
      setErr("Tidak bisa mencari kota — periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }

  function pick(k: Kota) {
    setCity(k);
    save(CITY_KEY, k);
    setOptions([]);
    setQuery("");
    void fetchJadwal(k);
  }

  // Saat modul dibuka: pakai kota tersimpan, atau cari Jakarta sekali.
  useEffect(() => {
    if (city) void fetchJadwal(city);
    else void searchCity("Jakarta", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toMinutes(hhmm: string): number | null {
    const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextLabel = "";
  let nextInMin: number | null = null;
  if (jadwal) {
    for (const p of PRAYERS) {
      const t = toMinutes(jadwal[p.key]);
      if (t !== null && t > nowMin) {
        nextLabel = p.label;
        nextInMin = t - nowMin;
        break;
      }
    }
  }
  const countdown =
    nextInMin !== null
      ? `${Math.floor(nextInMin / 60)}j ${nextInMin % 60}m lagi`
      : "";

  return (
    <div>
      <h2>Sholat</h2>
      <p className="sub">Jadwal dari MyQuran · tanggal Hijriah dari Aladhan.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) void searchCity(query.trim());
        }}
      >
        <input
          className="grow"
          type="text"
          placeholder="Cari kota… (mis. Surabaya)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit" disabled={loading}>
          Cari
        </button>
      </form>

      {options.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {options.map((k) => (
            <div className="list-row" key={k.id}>
              <button
                className="btn-ghost grow"
                style={{ textAlign: "left" }}
                onClick={() => pick(k)}
              >
                {k.lokasi}
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
        {city && (
          <div className="card-title">
            {city.lokasi}
            {jadwal ? ` · ${jadwal.tanggal}` : ""}
          </div>
        )}
        {hijri && (
          <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
            {hijri}
          </p>
        )}
        {nextLabel && (
          <p style={{ fontSize: 13, margin: "8px 0 0" }}>
            Berikutnya: <strong>{nextLabel}</strong> · {countdown}
          </p>
        )}
        {loading && !jadwal ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Mengambil jadwal…
          </p>
        ) : jadwal ? (
          <div style={{ marginTop: 8 }}>
            {PRAYERS.map((p) => (
              <div className="list-row" key={p.key}>
                <div className="list-main">
                  <div
                    className="list-title"
                    style={
                      p.label === nextLabel
                        ? { color: "var(--accent)", fontWeight: 700 }
                        : undefined
                    }
                  >
                    {p.label}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 14 }}>
                  {jadwal[p.key]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="muted" style={{ fontSize: 13 }}>
              Belum ada jadwal.
            </p>
          )
        )}
      </div>
    </div>
  );
}
