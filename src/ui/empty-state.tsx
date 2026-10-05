import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="card card-pad"
      style={{ textAlign: "center", paddingBlock: "2.5rem" }}
    >
      <div
        className="avatar avatar-lg"
        style={{ margin: "0 auto 1rem" }}
        aria-hidden="true"
      >
        {icon ?? "?"}
      </div>
      <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem", fontWeight: 700 }}>
        {title}
      </h3>
      {description ? (
        <p style={{ margin: "0 0 1.1rem", color: "hsl(var(--muted-foreground))" }}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
