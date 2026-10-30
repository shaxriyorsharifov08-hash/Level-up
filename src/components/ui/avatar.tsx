/* eslint-disable @next/next/no-img-element -- user-provided image URLs from arbitrary hosts */
import { avatarColorFor, cn, initials, safeUrl } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
};

export function Avatar({
  name,
  src,
  seed,
  size = "md",
  square = false,
  className,
}: {
  name: string;
  src?: string | null;
  seed?: string;
  size?: keyof typeof sizes;
  square?: boolean;
  className?: string;
}) {
  const url = safeUrl(src);
  const shape = square ? "rounded-xl" : "rounded-full";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn("shrink-0 object-cover bg-muted", shape, sizes[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold text-white select-none",
        shape,
        avatarColorFor(seed ?? name),
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
}: {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} src={p.avatarUrl} seed={p.id} size="sm" className="ring-2 ring-card" />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  );
}
