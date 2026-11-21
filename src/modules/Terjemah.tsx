import { useState } from "react";
import { httpGet } from "../lib/api";

const LANGS: { code: string; label: string }[] = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "Inggris" },
  { code: "ja", label: "Jepang" },
  { code: "ko", label: "Korea" },
  { code: "zh-CN", label: "Mandarin" },
  { code: "ar", label: "Arab" },
  { code: "fr", label: "Prancis" },
  { code: "de", label: "Jerman" },
  { code: "es", label: "Spanyol" },
  { code: "nl", label: "Belanda" },
];

interface MyMemoryResp {
  responseData?: { translatedText?: string; match?: number };
  responseStatus?: number;
  responseDetails?: string;
  matches?: { translation?: string; quality?: string }[];
}

export default function Terjemah() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("id");
  const [to, setTo] = useState("en");
  const [result, setResult] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function translate(e?: React.FormEvent) {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setErr("");
    setResult("");
    setNote("");
    try {
      const url =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}` +
        `&langpair=${from}|${to}`;
      const raw = await httpGet(url);
      const data = JSON.parse(raw) as MyMemoryResp;
      const out = data.responseData?.translatedText ?? "";
      if (!out) {
        setErr(
          "Terjemahan kosong. API gratis MyMemory membatasi pemakaian anonim " +
            "(kuota harian) — coba lagi nanti atau teks yang lebih pendek.",
        );
        return;
      }
      setResult(out);
      const match = data.responseData?.match;
      if (typeof match === "number" && match < 1) {
        setNote(
          `Kecocokan terjemahan ${Math.round(match * 100)}% — hasil dari memori ` +
            `terjemahan komunitas, periksa lagi bila penting.`,
        );
      }
    } catch (e) {
      const msg = String(e);
      // MyMemory membalas HTTP 429 bila kuota anonim (per IP bersama) habis.
      if (/429|MYMEMORY WARNING/i.test(msg)) {
        // Pesan API: "NEXT AVAILABLE IN 08 HOURS 24 MINUTES 19 SECONDS
        // VISIT HTTPS://..." — ambil hanya durasinya, bukan sisanya.
        const m = msg.match(
          /NEXT AVAILABLE IN\s*(\d+\s*HOURS?\s*\d+\s*MINUTES?\s*\d+\s*SECONDS?)/i,
        );
        setErr(
          "Kuota gratis MyMemory untuk hari ini sudah habis (kuota anonim " +
            "dipakai bersama semua pengguna IP ini)" +
            (m ? ` — tersedia lagi dalam ${m[1].trim()}.` : ".") +
            " Coba lagi nanti.",
        );
      } else {
        setErr(
          "Tidak bisa menghubungi MyMemory — periksa koneksi internetmu, lalu coba lagi.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setResult("");
    setNote("");
  }

  return (
    <div>
      <h2>Terjemah</h2>
      <p className="sub">
        Terjemahan gratis via MyMemory — tanpa kunci, tanpa akun.
      </p>

      <form onSubmit={translate}>
        <textarea
          rows={4}
          placeholder="Tulis teks yang mau diterjemahkan…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost btn-mini"
            onClick={swap}
            aria-label="Tukar bahasa"
          >
            ⇄
          </button>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button className="btn grow" type="submit" disabled={loading}>
            {loading ? "Menerjemahkan…" : "Terjemahkan"}
          </button>
        </div>
      </form>

      {err && (
        <div className="err" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div className="card-title" style={{ marginBottom: 6 }}>
            Hasil
          </div>
          <div className="lyrics" style={{ maxHeight: 220 }}>
            {result}
          </div>
          {note && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
