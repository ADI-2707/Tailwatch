import React from "react";
import styles from "./Card.module.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "bordered" | "elevated" | "flush";
  className?: string;
}

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
} = ({ children, variant = "bordered", className = "", ...props }) => {
  const variantClass = styles[variant] || styles.bordered;
  return (
    <div className={`${styles.card} ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => {
  return (
    <div className={`${styles.header} ${className}`}>
      {children ? (
        children
      ) : (
        <>
          <div className={styles.titleGroup}>
            {title && <span className={styles.title}>{title}</span>}
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </>
      )}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({
  children,
  noPadding = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${styles.body} ${noPadding ? styles.bodyNoPadding : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`${styles.footer} ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

