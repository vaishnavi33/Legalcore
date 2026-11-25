// Line icons drawn on a 24px grid with a 1.6 stroke, so they sit together as one set.

export const Chevron = () => (
  <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/** The Legal Core Solutions mark (LC monogram with gold scales), cropped from the full logo in public/brand/logo-full.jpg.
    It sits on an ivory tile wherever the background is dark, so the navy letters stay visible. */
export const Logo = ({ size = 40 }: { size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/brand/logo-mark.png" alt="" aria-hidden="true" width={Math.round((size * 346) / 144)} height={size} className="logo" />
);

const I = ({ children, size = 26 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const FileIcon = () => (
  <I>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" />
  </I>
);

export const ChatIcon = () => (
  <I>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    <path d="M9 10h6M9 14h4" />
  </I>
);

export const ScaleIcon = () => (
  <I>
    <path d="M12 4v16M6 7h12M6 7l-3 6h6zM18 7l-3 6h6zM8 20h8" />
  </I>
);

export const PersonIcon = () => (
  <I>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </I>
);

export const BuildingIcon = () => (
  <I>
    <path d="M4 20V6l8-3 8 3v14M9 20v-4h6v4M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M3 20h18" />
  </I>
);

export const ShieldIcon = () => (
  <I>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </I>
);

export const UploadIcon = () => (
  <I size={22}>
    <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </I>
);

export const ClockIcon = () => (
  <I>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
);

export const SearchIcon = () => (
  <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
