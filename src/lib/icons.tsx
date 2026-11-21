/** Ikon toolbar Sela — digambar sendiri (stroke sederhana, gaya Feather).
 *  Bukan aset Poni. Semua ikon 24x24, stroke currentColor. */

type P = { size?: number };

function Svg({
  size = 16,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IHome = (p: P) => (
  <Svg {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10.5V20h13v-9.5" />
  </Svg>
);
export const IKalender = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);
export const ITodo = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8.5 12.5l2.5 2.5 5-5.5" />
  </Svg>
);
export const IPomodoro = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.5 1.5M10 2.5h4" />
  </Svg>
);
export const ICuaca = (p: P) => (
  <Svg {...p}>
    <path d="M7 18.5a4 4 0 0 1-.8-7.9A5.5 5.5 0 0 1 17 9a3.8 3.8 0 0 1 .5 7.5" />
    <path d="M7 18.5h10.5" />
  </Svg>
);
export const IKurs = (p: P) => (
  <Svg {...p}>
    <path d="M7 4v13M7 4 4 7M7 4l3 3M17 20V7M17 20l-3-3M17 20l3-3" />
  </Svg>
);
export const ISholat = (p: P) => (
  <Svg {...p}>
    <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4 6.8 6.8 0 0 0 20 13.5Z" />
    <path d="M17.5 4.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z" />
  </Svg>
);
export const ILirik = (p: P) => (
  <Svg {...p}>
    <path d="M9 18V6l11-2.5V15" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="15" r="2.5" />
  </Svg>
);
export const IJamDunia = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.8 3.4 2.8 13.6 0 17M12 3.5c-2.8 3.4-2.8 13.6 0 17" />
  </Svg>
);
export const ITerjemah = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h8.5M8.5 4v2.2c0 3.2-1.8 6-4.3 7.6M6 9.8c1.3 1.9 3 3.6 5.2 4.4" />
    <path d="M13.5 21 18 11l4.5 10M15.3 17.2h5.4" />
  </Svg>
);
export const ISehat = (p: P) => (
  <Svg {...p}>
    <path d="M12 20.5S4 15.5 4 10a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 10c0 5.5-8 10.5-8 10.5Z" />
  </Svg>
);
export const ITeleprompter = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9.5h10M7 13.5h10M7 17.5h6" />
  </Svg>
);
export const IFile = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.5l2 2.5H18a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17Z" />
  </Svg>
);
export const IHud = (p: P) => (
  <Svg {...p}>
    <path d="M5 19a9 9 0 1 1 14 0" />
    <path d="M12 14.5 16 9.5" />
    <circle cx="12" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);
export const IShrink = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
  </Svg>
);
export const IDaya = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v8" />
    <path d="M6.3 6.5a8 8 0 1 0 11.4 0" />
  </Svg>
);
export const IAiChat = (p: P) => (
  <Svg {...p}>
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4.5Z" />
    <path d="M8 10.5h8M8 13.5h5" />
  </Svg>
);
export const IWifi = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 10.5a11 11 0 0 1 15 0M8 14.5a6 6 0 0 1 8 0" />
    <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);
export const IGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
  </Svg>
);
export const IX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IMusicNote = (p: P) => (
  <Svg {...p}>
    <path d="M9 18V6l11-2.5V15" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="15" r="2.5" />
  </Svg>
);

/** Kucing oranye mengintip — digambar sendiri (SVG), bukan aset Poni.
 *  Wajah kucing ginger: telinga + kepala oranye, mata hijau, moncong putih.
 *  viewBox 76x76; gambar kepala utuh, wadah yang memotong bagian bawah
 *  supaya tampak mengintip dari balik notch. */
export function CatPeek({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 76 76"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* telinga */}
      <path d="M13 28 19 3l20 15Z" fill="#f0a04b" stroke="#d97f2b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18.5 23 21.5 10l11 8Z" fill="#f6c9a0" />
      <path d="M63 28 57 3 37 18Z" fill="#f0a04b" stroke="#d97f2b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M57.5 23 54.5 10l-11 8Z" fill="#f6c9a0" />
      {/* kepala */}
      <path
        d="M38 11c20 0 30 13 30 28 0 16-13 27-30 27S8 55 8 39c0-15 10-28 30-28Z"
        fill="#f0a04b"
        stroke="#d97f2b"
        strokeWidth="1.5"
      />
      {/* belang dahi */}
      <path d="M27 17q3 4.5 0 9M38 15q3 4.5 0 9M49 17q3 4.5 0 9" fill="none" stroke="#d97f2b" strokeWidth="1.6" strokeLinecap="round" />
      {/* mata hijau */}
      <ellipse cx="26" cy="37" rx="4.6" ry="5.6" fill="#7fb069" />
      <ellipse cx="50" cy="37" rx="4.6" ry="5.6" fill="#7fb069" />
      <ellipse cx="26" cy="37.5" rx="2" ry="3.4" fill="#1c1c1c" />
      <ellipse cx="50" cy="37.5" rx="2" ry="3.4" fill="#1c1c1c" />
      {/* moncong putih */}
      <ellipse cx="30.5" cy="50" rx="7.5" ry="5.5" fill="#fff8ef" />
      <ellipse cx="45.5" cy="50" rx="7.5" ry="5.5" fill="#fff8ef" />
      {/* hidung + mulut */}
      <path d="M34 47h8l-4 5.5Z" fill="#e88a8a" />
      <path d="M38 52.5q0 4-4.5 4M38 52.5q0 4 4.5 4" fill="none" stroke="#b06a2a" strokeWidth="1.4" strokeLinecap="round" />
      {/* kumis */}
      <path d="M7 45l12 2.5M9 53l11-2M69 45 57 47.5M67 53 56 51" stroke="#e8d9c0" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
