import { Globe } from "lucide-react";
import { cn, safeUrl } from "@/lib/utils";

type IconProps = { className?: string };

export function TelegramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} fill="currentColor" aria-hidden>
      <path d="M21.94 4.3a1.2 1.2 0 0 0-1.27-.2L2.9 11.06c-.82.32-.8 1.5.04 1.78l4.36 1.43 1.67 5.26c.22.7 1.1.9 1.6.37l2.42-2.5 4.38 3.22c.6.44 1.46.11 1.62-.62l3.27-14.5c.08-.4-.04-.9-.32-1.2ZM9.87 14.6l-.46 3.07-1.05-3.6 9.46-6.06-7.95 6.6Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Buttons linking to an organization's (or the university's) official channels. */
export function SocialLinks({
  telegramUrl,
  instagramUrl,
  websiteUrl,
  variant = "pill",
  className,
}: {
  telegramUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  variant?: "pill" | "icon";
  className?: string;
}) {
  const links = [
    { url: safeUrl(telegramUrl), label: "Telegram", icon: TelegramIcon, color: "hover:text-sky-500" },
    { url: safeUrl(instagramUrl), label: "Instagram", icon: InstagramIcon, color: "hover:text-pink-500" },
    { url: safeUrl(websiteUrl), label: "Website", icon: Globe, color: "hover:text-primary-text" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map(({ url, label, icon: Icon, color }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground transition-colors",
            variant === "pill" ? "px-3 py-1.5" : "size-9 justify-center",
            color,
          )}
        >
          <Icon className="size-4" />
          {variant === "pill" && label}
        </a>
      ))}
    </div>
  );
}
