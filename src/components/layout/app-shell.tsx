import Link from "next/link";
import { CalendarDays, LayoutDashboard, Plus, Settings, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { CurrentUser } from "@/lib/auth";
import type { ShellData } from "@/features/shell/queries";
import { Logo } from "./logo";
import { MobileDrawer } from "./mobile-drawer";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";

type Props = ShellData & { user: CurrentUser; children: React.ReactNode };

function SidebarContent({ user, workspaces }: Omit<Props, "children">) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Logo href="/dashboard" />
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Main">
        <div className="space-y-0.5">
          <NavLink href="/dashboard">
            <LayoutDashboard /> Dashboard
          </NavLink>
        </div>

        <div className="space-y-0.5">
          <p className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Discover</p>
          <NavLink href="/events">
            <CalendarDays /> Events
          </NavLink>
          <NavLink href="/clubs">
            <Users /> Clubs
          </NavLink>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Workspaces</p>
            <Link
              href="/clubs/new"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Create organization"
              title="Create organization"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>
          {workspaces.length === 0 ? (
            <p className="px-3 py-1 text-xs text-muted-foreground">Join or create a club to collaborate with a team.</p>
          ) : (
            <div className="space-y-0.5">
              {workspaces.map((w) => (
                <NavLink key={w.id} href={`/workspace/${w.slug}`}>
                  <Avatar name={w.name} src={w.logoUrl} seed={w.id} size="xs" square />
                  <span className="truncate">{w.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="border-t border-border p-3">
        <NavLink href="/settings" className="mb-1">
          <Settings /> Settings
        </NavLink>
        <UserMenu user={user} />
      </div>
    </div>
  );
}

/** Layout for signed-in users: sidebar on desktop, top bar + drawer on mobile. */
export function AppShell({ children, ...props }: Props) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 self-start shrink-0 border-r border-border bg-card lg:block">
        <SidebarContent {...props} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur lg:hidden">
          <MobileDrawer>
            <SidebarContent {...props} />
          </MobileDrawer>
          <Logo href="/dashboard" />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
