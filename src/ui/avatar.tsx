import { cx } from "./cx";

type AvatarProps = {
  initials?: string;
  src?: string | null;
  size?: "md" | "lg";
  label?: string;
  className?: string;
};

export function Avatar({ initials, src, size = "md", label, className }: AvatarProps) {
  return (
    <div
      className={cx("avatar", size === "lg" && "avatar-lg", className)}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {src ? (
        // Avatar tem 40-56px e a URL é temporária (assinada): otimizar não traz nada.
        <img src={src} alt={label ?? ""} />
      ) : (
        initials
      )}
    </div>
  );
}
