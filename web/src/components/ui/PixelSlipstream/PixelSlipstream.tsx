import React from "react";
import styles from "./PixelSlipstream.module.css";

const LANE_1_WIDTHS = [24, 8, 48, 12, 80, 16, 32, 60, 8, 40, 70, 14];
const LANE_2_WIDTHS = [60, 14, 28, 90, 8, 44, 18, 72, 10, 36, 50, 12];
const LANE_3_WIDTHS = [16, 70, 10, 32, 54, 8, 88, 20, 40, 14, 64, 8];
const LANE_4_WIDTHS = [40, 12, 84, 18, 30, 64, 8, 52, 14, 26, 76, 10];

const renderLaneSegments = (widths: number[], variant: "warm" | "amber" | "ember") => {
  const variantClass =
    variant === "warm"
      ? styles.segWarm
      : variant === "amber"
      ? styles.segAmber
      : styles.segEmber;

  return (
    <>
      <div className={styles.segmentGroup}>
        {widths.map((w, idx) => (
          <div
            key={`a-${idx}`}
            className={`${styles.segment} ${variantClass}`}
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <div className={styles.segmentGroup}>
        {widths.map((w, idx) => (
          <div
            key={`b-${idx}`}
            className={`${styles.segment} ${variantClass}`}
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
    </>
  );
};

export const PixelSlipstream: React.FC = () => {
  return (
    <div className={styles.container} aria-hidden="true">
      <div className={`${styles.lane} ${styles.lane1}`}>
        {renderLaneSegments(LANE_1_WIDTHS, "warm")}
      </div>
      <div className={`${styles.lane} ${styles.lane2}`}>
        {renderLaneSegments(LANE_2_WIDTHS, "amber")}
      </div>
      <div className={`${styles.lane} ${styles.lane3}`}>
        {renderLaneSegments(LANE_3_WIDTHS, "warm")}
      </div>
      <div className={`${styles.lane} ${styles.lane4}`}>
        {renderLaneSegments(LANE_4_WIDTHS, "ember")}
      </div>
    </div>
  );
};
