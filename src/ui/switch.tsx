"use client";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
    />
  );
}
