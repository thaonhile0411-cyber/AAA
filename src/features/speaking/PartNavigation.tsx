import Link from "next/link";
import { partInfo, speakingParts, type SpeakingPart } from "./types";
import styles from "./speaking.module.css";

export function PartNavigation({ part }: { part: SpeakingPart }) {
  return (
    <nav className={styles.partNav} aria-label="Chọn phần thi Speaking">
      {speakingParts.map((item, index) => (
        <Link
          key={item}
          href={`/speaking/${item}`}
          className={part === item ? styles.partActive : ""}
          aria-current={part === item ? "page" : undefined}
        >
          <span className={styles.partNumber}>0{index + 1}</span>
          <span>
            <strong>{partInfo[item].title}</strong>
            <small>{partInfo[item].name}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
