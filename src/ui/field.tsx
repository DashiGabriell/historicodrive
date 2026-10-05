import type { ReactNode } from "react";
import { cx } from "./cx";

type ControlKind = "input" | "select" | "textarea";

export function controlClass(kind: ControlKind = "input", error = false): string {
  return cx(kind, error && "input-error");
}

type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <span className="hint text-destructive">{error}</span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}
