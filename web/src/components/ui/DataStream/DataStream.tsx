import React from "react";
import styles from "./DataStream.module.css";

export const DataStream: React.FC = () => {
  return (
    <div className={styles.container} aria-hidden="true">
      <div className={`${styles.track} ${styles.track1}`}>
        <div className={`${styles.beam} ${styles.beam1}`} />
      </div>
      <div className={`${styles.track} ${styles.track2}`}>
        <div className={`${styles.beam} ${styles.beam2}`} />
      </div>
      <div className={`${styles.track} ${styles.track3}`}>
        <div className={`${styles.beam} ${styles.beam3}`} />
      </div>
    </div>
  );
};
