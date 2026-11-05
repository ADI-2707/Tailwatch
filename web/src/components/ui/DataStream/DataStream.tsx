import React from "react";
import styles from "./DataStream.module.css";

export const DataStream: React.FC = () => {
  return (
    <div className={styles.container} aria-hidden="true">
      <div className={`${styles.fiber} ${styles.fiber1}`}>
        <div className={`${styles.packet} ${styles.packet1}`} />
      </div>
      <div className={`${styles.fiber} ${styles.fiber2}`}>
        <div className={`${styles.packet} ${styles.packet2}`} />
      </div>
      <div className={`${styles.fiber} ${styles.fiber3}`}>
        <div className={`${styles.packet} ${styles.packet3}`} />
      </div>
      <div className={`${styles.fiber} ${styles.fiber4}`}>
        <div className={`${styles.packet} ${styles.packet4}`} />
      </div>
    </div>
  );
};
