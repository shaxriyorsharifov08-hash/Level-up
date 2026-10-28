import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SocialLinks } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { MobileDrawer } from "./mobile-drawer";

const links: { href: string; label: string }[] = [];

/** Layout for visitors who are not signed in. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <div className="lg:hidden">
            <MobileDrawer>
              <div className="flex h-16 items-center px-4">
                <Logo />
              </div>
              <nav className="space-y-1 px-3">
                {links.map((l) => (
                  <NavLink key={l.href} href={l.href}>
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </MobileDrawer>
          </div>
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Join now
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              The student platform of {siteConfig.university.name}: events, clubs, projects and teams.
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Official university channels</p>
            <SocialLinks
              telegramUrl={siteConfig.university.telegramUrl}
              instagramUrl={siteConfig.university.instagramUrl}
              websiteUrl={siteConfig.university.websiteUrl}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
