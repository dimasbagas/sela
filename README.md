# Sela — aplikasi notch (Tauri v2)

**Sela** adalah aplikasi desktop *notch* interaktif ala Poni — pil kecil di tengah-atas
layar yang mengembang jadi panel berisi modul harian. Dibangun dari nol (kode original,
bukan salinan Poni) memakai **Tauri v2 (Rust) + React + Vite**, mengikuti hasil studi
`../poni-study/FINDINGS.md` (arsitektur Tauri, dependensi, dan API gratis yang dipakai Poni).

> Status: **v0.2.0** (21 Nov 2026). Tema gelap kaca ala Poni, 18 tab modul, AI Chat,
> sinkron Google Calendar/Tasks, radio, karaoke, widget jam/cuaca lepas, HUD, dan
> panel Daya. GUI sudah dijalankan dan diverifikasi di VM ini memakai Xvfb
> (display virtual 1280×800, tanpa compositor): pil, panel, **ke-18 tab**,
> API live, pencarian radio & lirik live, jendela dock jam/cuaca, jendela
> karaoke, mode karaoke in-panel, dan hitung mundur Pomodoro semuanya
> terlihat lewat screenshot (`../previews/sela/v100/`). Yang belum
> terverifikasi: tampilan di desktop nyata (transparansi dengan compositor,
> menu tray yang diklik), build Windows, dan integrasi musik Windows.
> Paritas ~100% adalah perkiraan terhadap checklist 27 fitur Poni v1.8.0
> (`../previews/sela/perbandingan.md`) — Poni closed-source dan terus
> berubah, jadi angka pastinya tidak bisa diklaim mutlak.

## Verifikasi GUI (Xvfb, 21 Nov 2026, folder `../previews/sela/v100/`)

Aplikasi dijalankan dengan `dbus-run-session` di bawah Xvfb dan diuji dengan
`xdotool` + screenshot (`import -window root`). Hasilnya:

- **Pil tertutup**: 380×56 (diperbaiki dari 380×200 — GTK mengabaikan `set_size`
  pada jendela `resizable:false`; kini `resizable: true`), jam live, tanggal,
  status musik. ✓ (`10-pill-fixed.png`)
- **Panel mengembang** 520×600, **Esc → mengecil lagi** ke 380×56. ✓ (`12-pill-after-esc.png`)
- **Ke-18 tab dicek satu per satu** (`tab-2-kalender.png` s.d. `tab-18-wifi.png`):
  tema gelap konsisten, tidak ada teks terpotong/meluber (kecuali konten yang
  memang bisa di-scroll). ✓
- **Cuaca (live)**: Jakarta 25° Berawan, kelembapan 99%, prakiraan 5 hari
  (Open-Meteo). ✓
- **Kurs (live)**: 1 USD = 18.263 IDR · kurs 2026-11-20 (Frankfurter). ✓
- **Sholat (live)**: Kota Jakarta, Sabtu 21/11/2026, berikutnya Dhuha
  (MyQuran + Aladhan). ✓
- **HUD (live)**: CPU 13%, load 0.92, RAM 6450 MB / 81% dari 7934 MB. ✓
- **Jam Dunia (live)**: Jakarta 05:54:35 / London 22:54:35 / Tokyo 07:54:35 (benar). ✓
- **Kalender**: header hari diperbaiki — 1 Nov 2026 (Minggu) kini jatuh di kolom
  Min, bukan Sab. ✓
- **Musik**: bagian Radio Browser tampil; pencarian radio & lirik sempat gagal
  di VM (reqwest native-tls menggantung ke lrclib.net & radio-browser) —
  diperbaiki dengan pindah reqwest ke rustls, **terverifikasi live**:
  "Prambors FM · Indonesia · pop · 182 suara" (`31-radio-live.png`). ✓
- **Terjemah**: MyMemory sempat membalas HTTP 429 (kuota anonim harian IP bersama
  habis, terulang ~00:40 WIB); pesan error kini membedakan kuota habis vs
  koneksi gagal dan menampilkan sisa waktu dari pesan API
  (`60-terjemah-ok.png`). ✓
- **Daya / Wi-Fi**: melaporkan dengan jujur bila tool tidak ada
  (`sudo apt install redshift`, `sudo apt install network-manager`). ✓
- **Dock widgets (terverifikasi live 00:23 WIB)**: "Sela — Jam" 260×120
  menampilkan `00:23:16, Sab, 21 Nov` (`41-dock-clock.png`); "Sela — Cuaca"
  260×120 menampilkan `27°, Jakarta · Cerah berawan` (`44-karaoke-window.png`). ✓
- **Jendela karaoke (terverifikasi live 00:3x WIB)**: "Sela — Karaoke" 640×480,
  lirik besar tersinkron "Imagine there's no Heaven…" + label aproksimasi
  (`58-karaoke-final.png`); mode karaoke in-panel juga terverifikasi
  (tombol jadi "Tutup karaoke", `59-mode-karaoke-ok.png`). ✓
- Log aplikasi bersih — hanya peringatan lingkungan headless (AT-SPI, portal,
  DRI3), tanpa error JS/panic.

Belum diuji live: Google Calendar/Tasks + AI Chat (butuh kredensial pengguna
— lihat di bawah), menu tray yang diklik.

## Cara kerja

- Jendela notch: transparan, tanpa frame, selalu di atas, posisi tengah-atas layar.
- Keadaan tertutup: pil kecil berisi **jam live + status musik**. Klik pil → mengembang
  jadi panel (520×600). Klik × atau tekan **Esc** → mengecil lagi.
- Panel berisi 18 tab modul. Data lokal (todo, acara kalender, kota favorit, dll.)
  tersimpan di `localStorage` webview; tidak ada akun, tidak ada server.
- Semua panggilan API lewat command Rust `http_req`/`http_get` (menghindari CORS)
  ke API publik gratis — **tanpa API key apa pun**, kecuali AI Chat dan Google
  (kunci milik pengguna sendiri, tersimpan lokal).
- **Swipe 2 jari**: geser horizontal (deltaX dominan) pada bilah tab untuk pindah
  tab; scroll vertikal konten tidak terganggu.
- **Notifikasi USB/SD**: pemindaian perangkat removable tiap 10 detik; toast muncul
  bila ada perangkat baru. Tidak ada auto-mount.
- **Pengingat Sehat**: pengingat air/peregangan/istirahat mata dengan interval yang
  bisa diatur; banner muncul di panel saat waktunya tiba.
- **Outline panel berdenyut** halus saat musik sedang diputar (status `nowPlaying`).

## Modul (18 tab)

| Modul | Sumber data | Status |
|---|---|---|
| Musik | `playerctl` / MPRIS (Linux) + pencarian Deezer + **Radio Browser** (`all.api.radio-browser.info`, putar via `<audio>`) | Pencarian radio terverifikasi live ("Prambors FM", `31-radio-live.png`) |
| Kalender | Lokal + **Google Calendar** (OAuth2, lihat di bawah) | Grid + header hari diperbaiki; sinkron Google butuh kredensial pengguna |
| Todo | Lokal + **Google Tasks** (token yang sama dengan Kalender) | UI terverifikasi; sinkron Google butuh kredensial pengguna |
| Pomodoro | Lokal (timer 25/5/15 menit, hitung sesi) | Hitung mundur terverifikasi live |
| Cuaca | Open-Meteo (geocoding + forecast), default Jakarta | Data live terverifikasi (Jakarta 25° Berawan) |
| Kurs | Frankfurter (`api.frankfurter.dev`), konversi ketik-langsung, dukung “50rb” / “1,5jt” | Data live terverifikasi (1 USD = 18.263 IDR) |
| Sholat | MyQuran (jadwal kota Indonesia) + Aladhan (tanggal Hijriah) | Data live terverifikasi (Jakarta, Dhuha berikutnya) |
| Lirik | LRCLIB + **mode karaoke di dalam panel** + **jendela karaoke terpisah** (lirik besar tersinkron; pewarnaan kata-per-kata adalah aproksimasi interpolasi — ditulis jujur di UI) | Pencarian + karaoke terverifikasi live (`33-lirik-live.png`, `58-karaoke-final.png`, `59-mode-karaoke-ok.png`) |
| Jam Dunia | `Intl.DateTimeFormat`, tambah/hapus zona | Data live terverifikasi (Jakarta/London/Tokyo benar) |
| Terjemah | MyMemory (tanpa kunci; kuota anonim harian dipakai bersama) | Pesan error membedakan kuota 429 vs koneksi gagal; kuota sempat habis 21 Nov ~22:55 WIB, lalu tersedia lagi |
| Sehat | Lokal (pengingat air/peregangan/mata, interval bisa diatur) | Banner + pengaturan terverifikasi |
| Teleprompter | Lokal (teks berjalan, kecepatan, ukuran font) | UI terverifikasi |
| File Shelf | Lokal (shortcut file/folder, buka via `xdg-open`) | UI terverifikasi; tambah via input path teks (tanpa plugin dialog) |
| HUD | Jam + tanggal + cuaca singkat + CPU/RAM/load (`/proc/stat`, `/proc/meminfo`) | Data live terverifikasi (CPU 13%, RAM 81%) |
| Shrink | Gambar: resize/kompres di frontend (canvas) lalu unduh; Video: ffmpeg bila terpasang | UI terverifikasi; ffmpeg ada di VM |
| Daya | Night light (`redshift`), Hibernate (`systemctl hibernate`), Sleep (`systemctl suspend`), timer tidur — **semua aksi daya wajib konfirmasi dulu** | UI terverifikasi; redshift tidak ada di VM (pesan install tampil) |
| Wi-Fi | Daftar jaringan via `nmcli` | UI terverifikasi; nmcli tidak ada di VM (pesan install tampil) |
| AI Chat | OpenAI-compatible custom (base URL + API key + model, **kunci milikmu sendiri, tersimpan lokal**); attach gambar sebagai base64 untuk model vision | UI terverifikasi; belum diuji live (butuh kunci pengguna). **PDF attach belum didukung.** |

**Widget lepas** (footer panel): tombol "Widget jam" / "Widget cuaca" membuka
jendela mini terpisah (jam / cuaca) — terverifikasi live di Xvfb
(`41-dock-clock.png`, `44-karaoke-window.png`).

Setiap modul online punya pesan fallback yang sopan saat offline (bukan crash):
“tidak bisa terhubung — periksa koneksi internetmu”.

## Yang dibutuhkan dari pengguna

- **AI Chat**: kunci API sendiri + base URL + nama model. Di UI sudah ditulis
  "Pakai kunci kamu sendiri"; contoh endpoint gratis hanya teks placeholder
  (`https://kenari.id/v1`, `https://api.respan.ai/api/`) — **tanpa nilai kunci
  apa pun di kode**. Tanpa kunci, modul ini tidak bisa dipakai.
- **Google Calendar + Google Tasks**: Client ID + Client Secret OAuth2 milikmu
  (lihat "Menyiapkan Google OAuth" di bawah). Tanpa itu, Kalender/Todo hanya
  memakai data lokal.
- **Linux (opsional)**: `redshift` (night light), `ffmpeg` (shrink video),
  `network-manager` (`nmcli`, daftar Wi-Fi), `playerctl` (status lagu yang
  diputar). Bila tidak ada, modul terkait menampilkan cara install, bukan crash:
  ```bash
  sudo apt install redshift ffmpeg network-manager playerctl
  ```
- **OCR**: belum tersedia — butuh `tesseract` (`sudo apt install tesseract-ocr`);
  modul OCR belum dibangun karena tool tidak ada di VM saat build
  (dicatat blocked, bukan gagal diam-diam).

## Menyiapkan Google OAuth (Calendar + Tasks)

1. Buka [Google Cloud Console](https://console.cloud.google.com) → buat project baru.
2. **APIs & Services → Library**: aktifkan **Google Calendar API** dan
   **Google Tasks API**.
3. **APIs & Services → OAuth consent screen**: isi nama aplikasi, tambahkan
   emailmu sebagai test user (cukup untuk pemakaian pribadi).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   tipe **Desktop app**. Salin **Client ID** dan **Client Secret**.
5. Di Sela: tab **Kalender** (atau **Todo**) → bagian Google → tempel Client ID
   + Client Secret (tersimpan lokal di perangkatmu saja) → klik **Hubungkan
   Google** → browser membuka halaman izin Google → salin authorization code →
   tempel di Sela → token ditukar dan disimpan lokal. Event Google muncul
   bergabung dengan acara lokal (ditandai lencana hijau "Google"); task Google
   bergabung dengan todo lokal dengan cara yang sama.
6. Redirect URI yang dipakai: `http://localhost` (loopback desktop app).

## Catatan jaringan di VM ini (bukan bug aplikasi)

- **LRCLIB & Radio Browser sempat hang (timeout 20 dtk) dari aplikasi di VM**,
  padahal `curl` dan `openssl s_client` ke host yang sama berhasil. Diagnosis
  (21 Nov, proyek uji `~/workspace/tmp-reqtest`): reqwest dengan TLS bawaan
  **native-tls/OpenSSL menggantung** ke `lrclib.net` dan
  `all.api.radio-browser.info` lewat proxy egress MITM di VM ini, sementara
  host lain (Open-Meteo, MyMemory) lewat reqwest yang sama langsung OK.
  **Perbaikan**: reqwest dipindah ke `rustls-tls-native-roots` (di `Cargo.toml`,
  dengan `system-proxy` tetap aktif) — uji replika: lrclib 200 dalam 0,9 dtk,
  radio 200 dalam 1,0 dtk; **terverifikasi live di aplikasi** 21 Nov 00:16 WIB
  (`31-radio-live.png`, `33-lirik-live.png`). Di laptop pengguna (internet
  langsung, tanpa proxy MITM) kedua host ini semestinya juga jalan.
- **MyMemory 429**: kuota anonim harian dipakai bersama semua pengguna IP yang
  sama; bila habis, API membalas 429 "YOU USED ALL AVAILABLE FREE TRANSLATIONS
  FOR TODAY" dan modul menampilkan sisa waktu tunggu dari pesan API.
- Koneksi langsung (tanpa proxy) diblok total di VM ini; semua HTTP lewat proxy
  egress (`https_proxy` di environment).

## Identitas visual

Tema **gelap kaca ala Poni**: latar panel ~`#08090d`, kaca semi-transparan
(`rgba(13,17,24,0.92)` + blur, cukup opak agar terbaca tanpa compositor),
border tipis terang, **aksen utama sky `#38bdf8`**, aksen sekunder hijau
`#34d399` / ungu `#a78bfa` dipakai hemat. Font tetap woff2 yang di-bundle
(Bricolage Grotesque, Archivo, IBM Plex Mono — offline).

## Prasyarat

| | Linux (Ubuntu 24.04) | Windows 10/11 |
|---|---|---|
| Rust | stable (di sini terpasang manual 1.100.0 di `~/.rust`; `rustup` resmi gagal ekstrak di VM ini) | `rustup` resmi |
| Node.js | 20+ (di sini v24) | 20+ |
| Sistem | `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev build-essential` | WebView2 (biasanya sudah ada) + Visual Studio Build Tools (C++ desktop) |

> Catatan VM: `apt-get update` di VM ini lambat lewat egress proxy (pernah 10 menit
> tanpa progres). Bila `apt-get install` gagal menemukan paket, jalankan `apt-get update`
> sekali lagi sampai selesai tanpa error, lalu ulangi install. Setelah restart VM,
> paket di `/usr` (webkit, appindicator, xdotool) dan symlink `.so` manual bisa
> hilang — instal ulang + buat ulang symlink (lihat `PROGRESS.md` bagian
> "Workaround build di VM") sebelum `npm run tauri build`.

## Menjalankan & build (Linux)

```bash
cd sela-app
npm install
npm run tauri dev        # mode pengembangan (butuh display + webkit runtime)

# Build rilis -> menghasilkan .deb + .rpm + AppImage di src-tauri/target/release/bundle/
npm run tauri build

# Verifikasi tanpa GUI (yang sudah dilakukan di VM ini):
npm run build            # tsc + vite build (frontend)
cargo check --manifest-path src-tauri/Cargo.toml   # perlu PATH cargo + dev libs
```

Perintah yang lolos (21 Nov 2026, v0.2.0):

```bash
npm run build            # ✓ tsc + vite
cargo check              # ✓ (dengan reqwest rustls)
npm run tauri build      # ✓ terakhir 21 Nov ~00:40 WIB (final, setelah
                         # perbaikan rustls + izin webview + pesan kuota)
```

Hasil build terakhir (`src-tauri/target/release/bundle/`):

- `deb/Sela_0.2.0_amd64.deb` (3,84 MiB)
- `rpm/Sela-0.2.0-1.x86_64.rpm` (3,85 MiB)
- `appimage/Sela_0.2.0_amd64.AppImage` (78,64 MiB)
- biner `src-tauri/target/release/sela-app` (~8,9 MB)

Instal hasil build di Ubuntu/Debian:

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/Sela_0.2.0_amd64.deb
sudo apt-get install -f   # bila ada dependensi yang kurang
sela-app                  # jalankan dari terminal / peluncur aplikasi
```

## Build Windows (dari Windows)

Aplikasi ini **tidak bisa** di-cross-compile ke Windows dari Linux (Tauri butuh
WebView2 + toolchain MSVC). Build di laptop Windows milikmu:

```powershell
# 1. Pasang Rust (https://rustup.rs) dan Node.js 20+ (https://nodejs.org)
# 2. Pasang Visual Studio Build Tools: workload "Desktop development with C++"
git clone <repo sela-app> ; cd sela-app
npm install
npm run tauri build
# Hasil: src-tauri\target\release\bundle\nsis\Sela_0.2.0_x64-setup.exe
# (dan .msi bila target msi diaktifkan)
```

## Cara mengetes (di laptop)

1. Jalankan `sela-app` — pil kecil muncul di tengah-atas layar berisi jam + “Tidak ada musik”.
2. Putar musik (Spotify/pemutar apa pun) → pil menampilkan judul lagu (Linux: perlu
   `playerctl`; Windows: info lagu belum didukung, pakai pencarian Deezer/Radio).
3. Klik pil → panel terbuka; coba 18 tab. Matikan Wi-Fi → modul online menampilkan
   pesan offline, modul lokal (Todo, Kalender, Pomodoro) tetap jalan.
4. Tutup dari tray (klik kanan ikon tray → Keluar) dan dari tombol ×.

## Struktur proyek

```
src/
  App.tsx            # shell: pil tertutup + panel + 18 tab + toast USB + pengingat Sehat
  App.css            # seluruh gaya gelap kaca + @font-face
  main.tsx
  lib/
    api.ts           # invoke: http_req/http_get, sys_stats, list_removable, open_path,
                     #   power_action, night_light, shrink_video, wifi_list, which_tool
    google.ts        # OAuth2 Google (Calendar + Tasks), token lokal
    karaoke.ts       # parser lirik tersinkron [mm:ss.xx]
    windows.ts       # buka jendela dock/karaoke
    store.ts         # localStorage (kunci "sela.*")
    format.ts        # tanggal Indonesia, kode cuaca WMO, parse "50rb"/"1,5jt"
  modules/           # Musik, Kalender, Todo, Pomodoro, Cuaca, Kurs, Sholat, Lirik,
                     #   JamDunia, Terjemah, Sehat, Teleprompter, FileShelf, HUD,
                     #   Shrink, Daya, Wifi, AiChat
  windows/           # KaraokeWindow.tsx, DockWidgets.tsx (jam/cuaca lepas)
  assets/fonts/      # Bricolage Grotesque, Archivo, IBM Plex Mono (woff2, lokal)
src-tauri/
  src/lib.rs         # command Rust, tray, geometri notch (tengah-atas)
  src/main.rs
  tauri.conf.json    # jendela notch: transparan, tanpa frame, always-on-top
  capabilities/default.json   # izin window: main + dock-clock + dock-weather + karaoke
  icons/             # ikon Sela (ember + "S", digambar ulang dari scaffold)
```

## Batasan yang diketahui (v0.2.0)

- **Transparansi & tray di desktop nyata belum terverifikasi** — di Xvfb (tanpa
  compositor) area transparan tampil hitam, bukan tembus pandang; di desktop nyata
  dengan compositor seharusnya tembus pandang, tapi itu belum terlihat langsung.
  Ikon tray dibuat tanpa error, tetapi menu tray belum pernah diklik/dilihat
  (tidak ada panel tray di Xvfb).
- **Wayland**: `set_position` dibatasi protokol Wayland — di Wayland, posisi
  tengah-atas mungkin tidak persis (compositor yang menentukan). Di X11/Windows/macOS
  posisi diatur eksplisit. Poni mengatasi ini dengan layer-shell; Sela belum.
- **Musik di Windows**: `playerctl`/MPRIS hanya ada di Linux; di Windows modul Musik
  saat ini hanya pencarian Deezer/Radio (belum ada integrasi System Media Transport Controls).
- **Penyimpanan**: masih `localStorage` webview (cukup untuk prototipe); versi
  berikutnya sebaiknya pindah ke file JSON di app-data dir via command Rust.
- **Ikon macOS** (`icon.icns`) masih ikon bawaan scaffold Tauri; ikon PNG/ICO
  Windows+Linux sudah bergambar Sela.
- **Tidak ada auto-update.**
- **AI Chat: attach PDF belum didukung** (hanya gambar sebagai base64 untuk model vision).
- **OCR**: belum ada modulnya (tesseract tidak tersedia saat build; lihat di atas).
- **File Shelf**: tambah item via input path teks (tanpa plugin dialog file Tauri).
- **Rust di VM ini** terpasang manual dari tarball komponen (rustup gagal ekstrak
  karena batasan sandbox); di mesin biasa pakai `rustup` resmi.
