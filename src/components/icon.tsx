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
