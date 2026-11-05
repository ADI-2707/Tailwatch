import React, { useState, useRef, useEffect, useId } from "react";
import styles from "./Tooltip.module.css";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  delayMs?: number;
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  delayMs = 150,
  className = "",
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const timerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const handleOpen = () => {
    if (disabled || !content) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsRendered(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delayMs);
  };

  const handleClose = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
    timerRef.current = window.setTimeout(() => {
      setIsRendered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <span
      className={`${styles.container} ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
    >
      {React.cloneElement(children, {
        "aria-describedby": isVisible ? tooltipId : undefined,
      } as React.HTMLAttributes<HTMLElement>)}
      {isRendered && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`${styles.tooltip} ${styles[position]} ${isVisible ? styles.visible : ""}`}
        >
          {content}
          <span className={styles.arrow} />
        </span>
      )}
    </span>
  );
};
