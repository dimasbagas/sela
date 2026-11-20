import { useEffect, useRef, useState } from "react";
import { httpJson } from "../lib/api";
import { load, save } from "../lib/store";
import { formatAngka, parseJumlahId } from "../lib/format";

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "JPY", "MYR", "AUD", "GBP", "CNY", "KRW"];
const FAV_KEY = "sela.currency.favs";
const DEFAULT_FAVS = ["USD→IDR", "EUR→IDR", "SGD→IDR", "JPY→IDR"];

interface FrankResp {
  rates: Record<string, number>;
  base: string;
  date: string;
}

export default function Kurs() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("IDR");
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [favs, setFavs] = useState<string[]>(() => load<string[]>(FAV_KEY, DEFAULT_FAVS));
  const timer = useRef<number | undefined>(undefined);

  async function fetchRate(f: string, t: string) {
    if (f === t) {
      setRate(1);
      setRateDate("");
      setErr("");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await httpJson<FrankResp>(
        `https://api.frankfurter.dev/v1/latest?from=${f}&to=${t}`,
      );
      const v = r.rates?.[t];
      if (typeof v !== "number") throw new Error("no rate");
      setRate(v);
      setRateDate(r.date ?? "");
    } catch {
      setErr("Tidak bisa mengambil kurs — periksa koneksi internetmu.");
      setRate(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void fetchRate(from, to);
    }, 400);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const parsed = parseJumlahId(amount);
  const result = parsed !== null && rate !== null ? parsed * rate : null;
  const pair = `${from}→${to}`;

  function saveFav() {
    if (favs.includes(pair)) return;
    const next = [...favs, pair];
    setFavs(next);
    save(FAV_KEY, next);
  }

  function removeFav(p: string) {
    const next = favs.filter((x) => x !== p);
    setFavs(next);
    save(FAV_KEY, next);
  }

  function pickFav(p: string) {
    const [f, t] = p.split("→");
    if (f && t) {
      setFrom(f);
      setTo(t);
    }
  }

  return (
    <div>
      <h2>Kurs</h2>
      <p className="sub">
        Konversi ketik-langsung dari Frankfurter. Boleh ketik “50rb” atau “1,5jt”.
      </p>

      <div className="row">
        <input
          className="grow"
          type="text"
          inputMode="decimal"
          placeholder="Jumlah (mis. 50rb)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="muted">→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Ke">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        {loading ? (
          <span className="muted" style={{ fontSize: 13 }}>
            Mengambil kurs…
          </span>
        ) : result !== null && rate !== null ? (
          <>
            <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>
              {formatAngka(result, 2)} {to}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              1 {from} = {formatAngka(rate, 4)} {to}
              {rateDate ? ` · kurs ${rateDate}` : ""}
            </div>
          </>
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>
            {parsed === null
              ? "Jumlah tidak dikenali — coba “100”, “50rb”, atau “1,5jt”."
              : "Belum ada kurs."}
          </span>
        )}
      </div>

      <div className="row-wrap">
        {favs.map((p) => (
          <span className="chip" key={p}>
            <button
              style={{ all: "unset", cursor: "pointer" }}
              onClick={() => pickFav(p)}
            >
              {p}
            </button>
            <button
              className="x"
              style={{ all: "unset", cursor: "pointer", marginLeft: 6 }}
              onClick={() => removeFav(p)}
              aria-label={`Hapus favorit ${p}`}
            >
              ×
            </button>
          </span>
        ))}
        {!favs.includes(pair) && (
          <button className="btn-ghost btn-mini" onClick={saveFav}>
            ★ Simpan {pair}
          </button>
        )}
      </div>
    </div>
  );
}
