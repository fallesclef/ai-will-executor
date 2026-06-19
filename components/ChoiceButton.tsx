"use client";

import type { ReactNode } from "react";

interface ChoiceButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}

export function ChoiceButton({
  label,
  onClick,
  variant = "default",
  disabled = false,
}: ChoiceButtonProps) {
  const variantClass = {
    default: "choice-btn",
    danger: "choice-btn choice-btn--danger",
    primary: "choice-btn choice-btn--primary",
  }[variant];

  return (
    <button
      type="button"
      className={variantClass}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="choice-btn__marker">{">"}</span>
      {label}
    </button>
  );
}

interface NavButtonProps {
  label: string;
  subtitle?: string;
  onClick: () => void;
  viewed?: boolean;
  active?: boolean;
  disabled?: boolean;
}

export function NavButton({
  label,
  subtitle,
  onClick,
  viewed = false,
  active = false,
  disabled = false,
}: NavButtonProps) {
  return (
    <button
      type="button"
      className={`nav-btn${active ? " nav-btn--active" : ""}${viewed ? " nav-btn--viewed" : ""}${disabled ? " nav-btn--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="nav-btn__label">{label}</span>
      {subtitle && <span className="nav-btn__sub">{subtitle}</span>}
      {viewed && <span className="nav-btn__badge">已閱</span>}
    </button>
  );
}

export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <h3 className="panel-section__title">{title}</h3>
      {children}
    </section>
  );
}
