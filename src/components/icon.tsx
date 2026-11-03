const paths = {
  headphones: "M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v8h5v-8ZM20 12h1v8h-5v-8Z",
  play: "m9 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  pen: "m15 3 6 6L8 22H2v-6ZM12 6l6 6",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  chevron: "m9 5 7 7-7 7",
  target: "M21 12a9 9 0 1 1-9-9m5 0v4h4m-9 5 5-5M16 12a4 4 0 1 1-4-4",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2m2 10h2m4 0h2m-8 4h2",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  book: "M12 6v15M3 3c4-1 6 0 9 3 3-3 5-4 9-3v15c-4-1-6 0-9 3-3-3-5-4-9-3Z",
  route:
    "M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 5h8a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h8",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z",
  shield: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 9 3 3 5-5",
  info: "M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  sparkle:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4",
  flag: "M5 22V3c5-4 9 4 15 0v12c-6 4-10-4-15 0",
  play: "M6 4l14 8-14 8V4z",
  pause: "M6 4h4v16H6zm8 0h4v16h-4z",
  stop: "M6 6h12v12H6z",
  mic: "M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8",
  micOff:
    "M1 1l22 22 M9 9v2a3 3 0 0 0 5.12 2.12 M15 9.34V5a3 3 0 0 0-5.68-1.33 M19 10v1a7 7 0 0 1-1.39 4.22 M5 10v1a7 7 0 0 0 7 7 M12 18v4 M8 22h8",
  volume:
    "M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14",
  headphones:
    "M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
  refresh:
    "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  fileText:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  alert:
    "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  x: "M18 6L6 18M6 6l12 12",
  award:
    "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.11",
} as const;
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: keyof typeof paths;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
