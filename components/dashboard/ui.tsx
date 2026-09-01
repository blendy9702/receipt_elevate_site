"use client";

import { useCountUp } from "@/components/count-up";
import { Icon } from "@/components/icon";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="section-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safe = Math.min(100, Math.max(0, Math.round(value)));
  const shown = useCountUp(safe);
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${shown * 3.6}deg` } as React.CSSProperties}
    >
      <div>
        <strong>{shown}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function LoadingPanel() {
  return (
    <div className="empty-panel" aria-live="polite">
      <span className="loader" />
      <p>데이터를 불러오고 있습니다.</p>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>다시 시도</button>
    </div>
  );
}

export function EmptyPanel({
  icon,
  message,
}: {
  icon?: "bell" | "users";
  message: string;
}) {
  return (
    <div className="empty-panel">
      {icon ? <Icon name={icon} size={28} /> : null}
      <p>{message}</p>
    </div>
  );
}
