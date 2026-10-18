import React, { useRef, useEffect, useState } from "react";
import styles from "./Histogram.module.css";

export interface HistogramBucket {
  bucket: string;
  total: number;
  levels?: Record<string, number>;
}

export interface HistogramProps {
  buckets: HistogramBucket[];
  onRangeSelect?: (startIdx: number, endIdx: number) => void;
  className?: string;
}

export const Histogram: React.FC<HistogramProps> = ({
  buckets,
  onRangeSelect,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 600;
    const height = 64;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    if (buckets.length === 0) return;

    const maxVal = Math.max(...buckets.map((b) => b.total), 1);
    const barWidth = Math.max(width / buckets.length - 2, 2);

    buckets.forEach((b, i) => {
      const x = i * (width / buckets.length);
      const barHeight = (b.total / maxVal) * (height - 8);
      const y = height - barHeight;

      const errorCount = (b.levels?.["50"] || 0) + (b.levels?.["60"] || 0);
      const warnCount = b.levels?.["40"] || 0;

      if (errorCount > 0) {
        ctx.fillStyle = "#F2575C";
      } else if (warnCount > 0) {
        ctx.fillStyle = "#F0B429";
      } else {
        ctx.fillStyle = "#38BDF8";
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    });
  }, [buckets]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setDragStart(x);
    setDragCurrent(x);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setDragCurrent(x);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStart === null || dragCurrent === null) return;
    setIsDragging(false);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || buckets.length === 0) return;

    const minX = Math.min(dragStart, dragCurrent);
    const maxX = Math.max(dragStart, dragCurrent);

    if (maxX - minX > 10) {
      const startIdx = Math.floor((minX / rect.width) * buckets.length);
      const endIdx = Math.min(Math.floor((maxX / rect.width) * buckets.length), buckets.length - 1);
      onRangeSelect?.(startIdx, endIdx);
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  const selectionLeft = dragStart !== null && dragCurrent !== null ? Math.min(dragStart, dragCurrent) : 0;
  const selectionWidth = dragStart !== null && dragCurrent !== null ? Math.abs(dragCurrent - dragStart) : 0;

  return (
    <div className={`${styles.histogramWrapper} ${className}`}>
      <div className={styles.header}>
        <span>Event Volume</span>
        <span>Drag to zoom in time</span>
      </div>
      <div
        ref={containerRef}
        className={styles.canvasContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {isDragging && selectionWidth > 0 && (
          <div
            className={styles.selectionOverlay}
            style={{ left: `${selectionLeft}px`, width: `${selectionWidth}px` }}
          />
        )}
      </div>
    </div>
  );
};
