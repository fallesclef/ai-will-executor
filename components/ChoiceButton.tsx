"use client";

import type { ReactNode } from "react";

interface ChoiceButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  highlighted?: boolean;
}

export function ChoiceButton({
  label,
  onClick,
  variant = "default",
  disabled = false,
  highlighted = false,
}: ChoiceButtonProps) {
  const variantClass = {
    default: "choice-btn",
    danger: "choice-btn choice-btn--danger",
    primary: "choice-btn choice-btn--primary",
  }[variant];

  return (
    <button
      type="button"
      className={`${variantClass}${highlighted ? " choice-btn--glow" : ""}`}
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
  pendingChoice?: boolean;
  active?: boolean;
  disabled?: boolean;
}

export function NavButton({
  label,
  subtitle,
  onClick,
  viewed = false,
  pendingChoice = false,
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
      {(viewed || pendingChoice) && (
        <span className="nav-btn__badges">
          {viewed && (
            <span className="nav-btn__badge nav-btn__badge--viewed">已閱</span>
          )}
          {pendingChoice && (
            <span className="nav-btn__badge nav-btn__badge--pending">
              未做出選擇
            </span>
          )}
        </span>
      )}
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
