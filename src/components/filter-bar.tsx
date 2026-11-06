import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/** GET search form: works without JavaScript and navigates client-side when JS is available. */
export function SearchForm({
  action,
  q,
  placeholder,
  hidden = {},
  children,
}: {
  action: string;
  q?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  return (
    <Form action={action} className="flex flex-col gap-2 sm:flex-row">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-9" aria-label="Search" />
      </div>
      {children}
      <Button type="submit" variant="outline">
        Search
      </Button>
    </Form>
  );
}

/** Pill-shaped links used as filter tabs. */
export function FilterPills({
  options,
  active,
}: {
  options: { label: string; href: string; value: string }[];
  active: string;
}) {
  return (
    <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            o.value === active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

/** Build a URL with updated search params, dropping empty values. */
export function buildHref(path: string, params: Record<string, string | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
