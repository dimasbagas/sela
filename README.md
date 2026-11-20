# Sela — prototipe aplikasi notch (Tauri v2)

**Sela** adalah aplikasi desktop *notch* interaktif ala Poni — pil kecil di tengah-atas
layar yang mengembang jadi panel berisi modul harian. Dibangun dari nol (kode original,
bukan salinan Poni) memakai **Tauri v2 (Rust) + React + Vite**, mengikuti hasil studi
`../poni-study/FINDINGS.md` (arsitektur Tauri, dependensi, dan API gratis yang dipakai Poni).

> Status: **prototipe v0.1.0**. Kode Rust lolos `cargo check`/`cargo build` dan frontend
> lolos `tsc` + `vite build`. **GUI sudah dijalankan dan diverifikasi di VM ini
> memakai Xvfb** (display virtual 1280×800, tanpa compositor): pil, panel, ke-8 tab,
> API live, dan hitung mundur Pomodoro semuanya terlihat lewat screenshot (lihat
> “Verifikasi GUI” di bawah). Yang belum terverifikasi: tampilan di desktop nyata
> (transparansi dengan compositor, menu tray yang diklik), build Windows, dan
> integrasi musik Windows.

## Verifikasi GUI (Xvfb, 20 Nov 2026)

Aplikasi dijalankan dengan `dbus-run-session` di bawah Xvfb dan diuji dengan
`xdotool` + screenshot (`import -window root`). Hasilnya:

- **Pil tertutup**: muncul di tengah-atas, menampilkan jam live (`07:01:47`), tanggal
  (`Jum, 20 Nov`), status `Tidak ada musik`, dan titik status. ✓
- **Klik pil → panel mengembang** (520×600) dengan header `Sela / notch kamu`,
  tombol ×, dan ke-8 tab. **Esc → mengecil lagi.** ✓
- **Ke-8 tab muat** di bilah tab setelah perbaikan CSS (sebelumnya tab Lirik
  terpotong dan harus di-scroll). ✓
- **Cuaca (live)**: Jakarta, Indonesia — 32° Gerimis, kelembapan 68%, angin 6 km/jam,
  prakiraan 5 hari dari Open-Meteo. ✓
- **Sholat (live)**: KOTA JAKARTA · Jumat, 20/11/2026, 10 Jumādā al-ākhirah 1448 H,
  “Berikutnya: Ashar · 0j 55m lagi”, Imsak 03:55, Subuh 04:05, Terbit 05:23,
  Dhuha 05:51, Dzuhur 11:42, Ashar 15:04 (MyQuran + Aladhan). ✓
- **Kurs (live)**: 1 USD = 18.261 IDR · kurs 2026-11-19, chip favorit USD/EUR/SGD/JPY
  → IDR (Frankfurter). Dropdown `<select>` sempat tampil putih-putih di WebKitGTK;
  diperbaiki dengan `appearance: none` + panah SVG, kini gelap dan terbaca. ✓
- **Pomodoro (live)**: klik Mulai → hitung mundur jalan (24:55 → 24:52 dalam 3 detik),
  tombol berubah jadi Jeda, progress bar terisi. ✓
- **Kalender**: grid November 2026 (Senin dulu), hari ini (20) disorot oranye ember. ✓
- **Todo**: keadaan kosong + input + tombol Tambah tampil benar. ✓
- **Musik**: tampil dengan pesan jujur “Tidak ada lagu yang terdeteksi” (playerctl
  tidak terpasang di VM) + kolom pencarian Deezer. ✓
- **Lirik**: formulir pencarian (judul + artis opsional) tampil benar. ✓
- Log aplikasi bersih — hanya peringatan lingkungan headless (AT-SPI, portal,
  DRI3), tanpa error JS/panic.

Belum diuji lewat klik: pencarian Deezer dan LRCLIB (query sungguhan), tambah/
coret/hapus Todo, tambah acara Kalender, dan menu tray (ikon tray dibuat tanpa
error, tapi tidak ada panel tray di Xvfb untuk melihatnya).

## Cara kerja

- Jendela notch: transparan, tanpa frame, selalu di atas, posisi tengah-atas layar.
- Keadaan tertutup: pil kecil berisi **jam live + status musik**. Klik pil → mengembang
  jadi panel (520×600). Klik × atau tekan **Esc** → mengecil lagi.
- Panel berisi 8 tab modul. Data lokal (todo, acara kalender, kota favorit, dll.)
  tersimpan di `localStorage` webview; tidak ada akun, tidak ada server.
- Semua panggilan API lewat command Rust `http_get` (menghindari CORS) ke API publik
  gratis — **tanpa API key apa pun**.

## Modul

| Modul | Sumber data | Status |
|---|---|---|
| Musik | `playerctl` / MPRIS (Linux) untuk lagu yang diputar + kontrol; pencarian Deezer | UI terverifikasi di Xvfb; now-playing butuh `playerctl` (tidak ada di VM); pencarian Deezer belum diuji dengan query |
| Kalender | Lokal (acara tersimpan di perangkat) | Grid + hari ini terverifikasi; tambah acara belum diuji lewat klik |
| Todo | Lokal | UI terverifikasi; tambah/coret/hapus belum diuji lewat klik |
| Pomodoro | Lokal (timer 25/5/15 menit, hitung sesi) | Hitung mundur terverifikasi live (24:55 → 24:52) |
| Cuaca | Open-Meteo (geocoding + forecast), default Jakarta | Data live terverifikasi (Jakarta 32° Gerimis) |
| Kurs | Frankfurter (`api.frankfurter.dev`), konversi ketik-langsung, dukung “50rb” / “1,5jt” | Data live terverifikasi (1 USD = 18.261 IDR) |
| Sholat | MyQuran (jadwal kota Indonesia) + Aladhan (tanggal Hijriah) | Data live terverifikasi (Jakarta, Ashar berikutnya) |
| Lirik | LRCLIB | UI terverifikasi; pencarian belum diuji dengan query |

Setiap modul online punya pesan fallback yang sopan saat offline (bukan crash):
“tidak bisa terhubung — periksa koneksi internetmu”.

## Identitas visual

Konsisten dengan landing page Sela: latar arang kecoklatan (`#1E1813`), teks putih
kertas (`#F5EFE6`), **satu aksen oranye ember `#E8622C` dipakai rata tanpa gradasi**,
judul Bricolage Grotesque, isi Archivo, angka/label mono IBM Plex Mono (font di-bundle
di `src/assets/fonts/`, aplikasi tetap jalan offline). Tanpa glow neon, tanpa palet
emerald-cyan.

## Prasyarat

| | Linux (Ubuntu 24.04) | Windows 10/11 |
|---|---|---|
| Rust | stable (di sini terpasang manual 1.100.0 di `~/.rust`; `rustup` resmi gagal ekstrak di VM ini) | `rustup` resmi |
| Node.js | 20+ (di sini v24) | 20+ |
| Sistem | `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev build-essential` | WebView2 (biasanya sudah ada) + Visual Studio Build Tools (C++ desktop) |

> Catatan VM: `apt-get update` di VM ini lambat/macet lewat egress proxy (pernah 10 menit
> tanpa progres). Bila `apt-get install` gagal menemukan paket, jalankan `apt-get update`
> sekali lagi sampai selesai tanpa error, lalu ulangi install.

## Menjalankan & build (Linux)

```bash
cd sela-app
npm install
npm run tauri dev        # mode pengembangan (butuh display + webkit runtime)

# Build rilis -> menghasilkan .deb + AppImage di src-tauri/target/release/bundle/
npm run tauri build

# Verifikasi tanpa GUI (yang sudah dilakukan di VM ini):
npm run build            # tsc + vite build (frontend)
cargo check --manifest-path src-tauri/Cargo.toml   # perlu PATH cargo + dev libs
```

Instal hasil build di Ubuntu/Debian:

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/Sela_0.1.0_amd64.deb
sudo apt-get install -f   # bila ada dependensi yang kurang
sela-app                  # jalankan dari terminal / peluncur aplikasi
```

## Build Windows (dari Windows)

Prototipe ini **tidak bisa** di-cross-compile ke Windows dari Linux (Tauri butuh
WebView2 + toolchain MSVC). Build di laptop Windows milikmu:

```powershell
# 1. Pasang Rust (https://rustup.rs) dan Node.js 20+ (https://nodejs.org)
# 2. Pasang Visual Studio Build Tools: workload "Desktop development with C++"
git clone <repo sela-app> ; cd sela-app
npm install
npm run tauri build
# Hasil: src-tauri\target\release\bundle\nsis\Sela_0.1.0_x64-setup.exe
# (dan .msi bila target msi diaktifkan)
```

## Cara mengetes (di laptop)

1. Jalankan `sela-app` — pil kecil muncul di tengah-atas layar berisi jam + “Tidak ada musik”.
2. Putar musik (Spotify/pemutar apa pun) → pil menampilkan judul lagu (Linux: perlu
   `playerctl`; Windows: info lagu belum didukung di v0.1, pakai pencarian Deezer).
3. Klik pil → panel terbuka; coba 8 tab. Matikan Wi-Fi → modul online menampilkan
   pesan offline, modul lokal (Todo, Kalender, Pomodoro) tetap jalan.
4. Tutup dari tray (klik kanan ikon tray → Keluar) dan dari tombol ×.

## Struktur proyek

```
src/
  App.tsx            # shell: pil tertutup + panel + tab
  App.css            # seluruh gaya + @font-face (identitas Sela)
  main.tsx
  lib/
    api.ts           # invoke: http_get, now_playing, media_control, set_notch_open
    store.ts         # localStorage (kunci "sela.*")
    format.ts        # tanggal Indonesia, kode cuaca WMO, parse "50rb"/"1,5jt"
  modules/           # Musik, Kalender, Todo, Pomodoro, Cuaca, Kurs, Sholat, Lirik
  assets/fonts/      # Bricolage Grotesque, Archivo, IBM Plex Mono (woff2, lokal)
src-tauri/
  src/lib.rs         # command Rust, tray, geometri notch (tengah-atas)
  src/main.rs
  tauri.conf.json    # jendela notch: transparan, tanpa frame, always-on-top
  capabilities/default.json
  icons/             # ikon Sela (ember + "S", digambar ulang dari scaffold)
```

## Batasan yang diketahui (v0.1.0)

- **Transparansi & tray di desktop nyata belum terverifikasi** — di Xvfb (tanpa
  compositor) area transparan tampil hitam, bukan tembus pandang; di desktop nyata
  dengan compositor seharusnya tembus pandang, tapi itu belum terlihat langsung.
  Ikon tray dibuat tanpa error, tetapi menu tray belum pernah diklik/dilihat
  (tidak ada panel tray di Xvfb).
- **Wayland**: `set_position` dibatasi protokol Wayland — di Wayland, posisi
  tengah-atas mungkin tidak persis (compositor yang menentukan). Di X11/Windows/macOS
  posisi diatur eksplisit. Poni mengatasi ini dengan layer-shell; Sela belum.
- **Musik di Windows**: `playerctl`/MPRIS hanya ada di Linux; di Windows modul Musik
  saat ini hanya pencarian Deezer (belum ada integrasi System Media Transport Controls).
- **Penyimpanan**: masih `localStorage` webview (cukup untuk prototipe); versi
  berikutnya sebaiknya pindah ke file JSON di app-data dir via command Rust.
- **Ikon macOS** (`icon.icns`) masih ikon bawaan scaffold Tauri; ikon PNG/ICO
  Windows+Linux sudah bergambar Sela.
- **Tidak ada auto-update** dan tidak ada AI chat (butuh kunci pengguna sendiri,
  sama seperti Poni — sengaja tidak disertakan di prototipe).
- **Rust di VM ini** terpasang manual dari tarball komponen (rustup gagal ekstrak
  karena batasan sandbox); di mesin biasa pakai `rustup` resmi.
