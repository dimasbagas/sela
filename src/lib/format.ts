export const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
export const HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function tanggalId(d: Date): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function tanggalSingkat(d: Date): string {
  return `${HARI_SINGKAT[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`;
}

const dua = (n: number) => String(n).padStart(2, "0");

export function jamMenit(d: Date): string {
  return `${dua(d.getHours())}:${dua(d.getMinutes())}`;
}

export function jamMenitDetik(d: Date): string {
  return `${dua(d.getHours())}:${dua(d.getMinutes())}:${dua(d.getSeconds())}`;
}

export function mmss(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${m}:${dua(s)}`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** Kode cuaca WMO (Open-Meteo) -> teks Indonesia. */
export function cuacaText(code: number): string {
  if (code === 0) return "Cerah";
  if (code === 1) return "Cerah berawan";
  if (code === 2) return "Berawan";
  if (code === 3) return "Mendung";
  if (code === 45 || code === 48) return "Berkabut";
  if (code >= 51 && code <= 55) return "Gerimis";
  if (code === 56 || code === 57) return "Gerimis membeku";
  if (code >= 61 && code <= 65) return "Hujan";
  if (code === 66 || code === 67) return "Hujan membeku";
  if (code >= 71 && code <= 77) return "Salju";
  if (code >= 80 && code <= 82) return "Hujan deras";
  if (code === 85 || code === 86) return "Hujan salju";
  if (code === 95) return "Badai petir";
  if (code === 96 || code === 99) return "Badai petir + hujan es";
  return "Tidak diketahui";
}

/**
 * "50rb" -> 50000, "1,5jt" -> 1500000, "2.500" -> 2500.
 * Koma = desimal, titik = pemisah ribuan (format Indonesia).
 */
export function parseJumlahId(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^([\d.,]+)(rb|ribu|jt|juta|m|k)?$/);
  if (!m) return null;
  let numStr = m[1];
  if (numStr.includes(",")) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(numStr)) {
    numStr = numStr.replace(/\./g, "");
  }
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return null;
  const mult =
    { rb: 1e3, ribu: 1e3, jt: 1e6, juta: 1e6, m: 1e6, k: 1e3 }[m[2] ?? ""] ?? 1;
  return num * mult;
}

export function formatAngka(n: number, maxDigit = 2): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: maxDigit }).format(n);
}
