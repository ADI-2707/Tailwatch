import React from "react";
import styles from "./DataStream.module.css";

const PATH_1 =
  "M -60 220 C 320 100, 680 340, 1040 180 C 1220 110, 1380 260, 1520 230";
const PATH_2 =
  "M -60 500 C 260 640, 620 390, 980 570 C 1210 690, 1370 460, 1520 520";
const PATH_3 =
  "M -60 740 C 310 860, 700 650, 1050 790 C 1250 870, 1390 740, 1520 770";

export const DataStream: React.FC = () => {
  return (
    <div className={styles.container} aria-hidden="true">
      <svg
        className={styles.svgCanvas}
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="packetGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="#ff6b35" />
            <stop offset="95%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ffeedd" />
          </linearGradient>

          <linearGradient id="packetGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="90%" stopColor="#ffc83b" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          <linearGradient id="packetGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="92%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <path d={PATH_1} className={styles.wire} />
        <path d={PATH_1} className={`${styles.packet} ${styles.packet1}`} />

        <path d={PATH_2} className={styles.wire} />
        <path d={PATH_2} className={`${styles.packet} ${styles.packet2}`} />

        <path d={PATH_3} className={styles.wire} />
        <path d={PATH_3} className={`${styles.packet} ${styles.packet3}`} />
      </svg>
    </div>
  );
};
