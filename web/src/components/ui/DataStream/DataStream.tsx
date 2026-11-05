import React, { useEffect, useRef } from "react";
import styles from "./DataStream.module.css";

const PATH_1 =
  "M -40 160 C 450 360, 900 200, 1480 420";
const PATH_2 =
  "M -40 680 C 420 440, 960 520, 1480 180";
const PATH_3 =
  "M -40 500 C 360 260, 820 620, 1480 560";

export const DataStream: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let mouseX = -500;
    let mouseY = -500;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.style.setProperty("--mouse-x", `${mouseX}px`);
            containerRef.current.style.setProperty("--mouse-y", `${mouseY}px`);
            containerRef.current.style.setProperty("--mouse-active", "1");
          }
          rafId = null;
        });
      }
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.setProperty("--mouse-active", "0");
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.container} aria-hidden="true">
      <div className={styles.baseGrid} />
      <div className={styles.spotlightHalo} />
      <div className={styles.spotlightGrid} />
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

          <linearGradient id="packetGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
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
