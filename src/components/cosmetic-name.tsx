import {
  COSMETIC_CSS_WHITELIST,
  type EquippedView,
} from "@/lib/cosmetics/serialize";

type Props = {
  fullName: string;
  equipped?: EquippedView | null;
  className?: string;
};

function safeClass(value: string | null | undefined): string {
  if (!value) return "";
  return COSMETIC_CSS_WHITELIST.has(value) ? value : "";
}

export function CosmeticName({ fullName, equipped, className }: Props) {
  const prefix = equipped?.prefix?.icon ?? null;
  const suffix = equipped?.suffix?.icon ?? null;
  const colorClass = safeClass(equipped?.color?.cssClass);
  const effectClass = safeClass(equipped?.effect?.cssClass);
  const gradient = equipped?.color?.gradient ?? null;

  const inlineStyle =
    !colorClass && gradient && gradient.length > 1
      ? {
          backgroundImage: `linear-gradient(90deg, ${gradient.join(", ")})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : undefined;

  const nameClass = [colorClass, effectClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className="inline-flex items-center gap-1">
      {prefix ? <span aria-hidden>{prefix}</span> : null}
      <span className={nameClass || undefined} style={inlineStyle}>
        {fullName}
      </span>
      {suffix ? <span aria-hidden>{suffix}</span> : null}
    </span>
  );
}
