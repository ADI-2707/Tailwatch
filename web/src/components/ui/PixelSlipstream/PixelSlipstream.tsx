import React from "react";
import styles from "./PixelSlipstream.module.css";

type ColorVariant = "warm" | "amber" | "gold" | "ember";

interface PixelDef {
  w: number;
  c: ColorVariant;
}

const CLUSTERS_LANE_1: PixelDef[][] = [
  [
    { w: 4, c: "gold" },
    { w: 6, c: "amber" },
    { w: 14, c: "warm" },
    { w: 4, c: "warm" },
    { w: 48, c: "ember" },
    { w: 8, c: "warm" },
    { w: 4, c: "amber" },
  ],
  [
    { w: 6, c: "amber" },
    { w: 20, c: "warm" },
    { w: 4, c: "gold" },
    { w: 64, c: "warm" },
    { w: 10, c: "ember" },
    { w: 4, c: "amber" },
  ],
  [
    { w: 4, c: "gold" },
    { w: 12, c: "amber" },
    { w: 32, c: "warm" },
    { w: 6, c: "ember" },
    { w: 18, c: "warm" },
    { w: 4, c: "gold" },
  ],
];

const CLUSTERS_LANE_2: PixelDef[][] = [
  [
    { w: 8, c: "amber" },
    { w: 4, c: "gold" },
    { w: 56, c: "warm" },
    { w: 14, c: "ember" },
    { w: 4, c: "amber" },
    { w: 24, c: "warm" },
    { w: 6, c: "gold" },
  ],
  [
    { w: 4, c: "gold" },
    { w: 16, c: "warm" },
    { w: 4, c: "ember" },
    { w: 40, c: "amber" },
    { w: 8, c: "warm" },
  ],
  [
    { w: 6, c: "warm" },
    { w: 36, c: "ember" },
    { w: 4, c: "gold" },
    { w: 72, c: "warm" },
    { w: 12, c: "amber" },
    { w: 4, c: "gold" },
  ],
];

const CLUSTERS_LANE_3: PixelDef[][] = [
  [
    { w: 4, c: "amber" },
    { w: 10, c: "gold" },
    { w: 28, c: "warm" },
    { w: 4, c: "ember" },
    { w: 52, c: "warm" },
    { w: 6, c: "amber" },
  ],
  [
    { w: 8, c: "gold" },
    { w: 4, c: "warm" },
    { w: 44, c: "ember" },
    { w: 16, c: "warm" },
    { w: 4, c: "amber" },
  ],
  [
    { w: 6, c: "warm" },
    { w: 22, c: "amber" },
    { w: 4, c: "gold" },
    { w: 60, c: "warm" },
    { w: 8, c: "ember" },
    { w: 4, c: "gold" },
  ],
];

const CLUSTERS_LANE_4: PixelDef[][] = [
  [
    { w: 4, c: "gold" },
    { w: 18, c: "warm" },
    { w: 6, c: "amber" },
    { w: 68, c: "ember" },
    { w: 10, c: "warm" },
    { w: 4, c: "gold" },
  ],
  [
    { w: 6, c: "amber" },
    { w: 30, c: "warm" },
    { w: 4, c: "gold" },
    { w: 42, c: "warm" },
    { w: 8, c: "ember" },
  ],
  [
    { w: 4, c: "gold" },
    { w: 14, c: "amber" },
    { w: 4, c: "warm" },
    { w: 50, c: "warm" },
    { w: 12, c: "ember" },
    { w: 4, c: "amber" },
  ],
];

const CLUSTERS_LANE_5: PixelDef[][] = [
  [
    { w: 6, c: "amber" },
    { w: 24, c: "warm" },
    { w: 4, c: "gold" },
    { w: 46, c: "ember" },
    { w: 8, c: "warm" },
  ],
  [
    { w: 4, c: "gold" },
    { w: 8, c: "amber" },
    { w: 64, c: "warm" },
    { w: 12, c: "ember" },
    { w: 4, c: "gold" },
  ],
  [
    { w: 8, c: "warm" },
    { w: 32, c: "amber" },
    { w: 4, c: "gold" },
    { w: 54, c: "warm" },
    { w: 6, c: "ember" },
  ],
];

const colorClassMap: Record<ColorVariant, string> = {
  warm: styles.pixelWarm,
  amber: styles.pixelAmber,
  gold: styles.pixelGold,
  ember: styles.pixelEmber,
};

const renderClusterSet = (clusters: PixelDef[][], prefix: string) => {
  return clusters.map((cluster, cIdx) => (
    <div key={`${prefix}-c-${cIdx}`} className={styles.cluster}>
      {cluster.map((p, pIdx) => (
        <div
          key={`${prefix}-c-${cIdx}-p-${pIdx}`}
          className={`${styles.pixel} ${colorClassMap[p.c]}`}
          style={{ width: `${p.w}px` }}
        />
      ))}
    </div>
  ));
};

export const PixelSlipstream: React.FC = () => {
  return (
    <div className={styles.container} aria-hidden="true">
      <div className={`${styles.lane} ${styles.lane1}`}>
        {renderClusterSet(CLUSTERS_LANE_1, "l1-a")}
        {renderClusterSet(CLUSTERS_LANE_1, "l1-b")}
      </div>
      <div className={`${styles.lane} ${styles.lane2}`}>
        {renderClusterSet(CLUSTERS_LANE_2, "l2-a")}
        {renderClusterSet(CLUSTERS_LANE_2, "l2-b")}
      </div>
      <div className={`${styles.lane} ${styles.lane3}`}>
        {renderClusterSet(CLUSTERS_LANE_3, "l3-a")}
        {renderClusterSet(CLUSTERS_LANE_3, "l3-b")}
      </div>
      <div className={`${styles.lane} ${styles.lane4}`}>
        {renderClusterSet(CLUSTERS_LANE_4, "l4-a")}
        {renderClusterSet(CLUSTERS_LANE_4, "l4-b")}
      </div>
      <div className={`${styles.lane} ${styles.lane5}`}>
        {renderClusterSet(CLUSTERS_LANE_5, "l5-a")}
        {renderClusterSet(CLUSTERS_LANE_5, "l5-b")}
      </div>
    </div>
  );
};
