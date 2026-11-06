import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { getShellData } from "@/features/shell/queries";
import { getCurrentUser } from "@/lib/auth";

/**
 * Signed-in users get the app shell (sidebar + workspaces); visitors get the public
 * header/footer. Public pages (events, clubs, projects) render in both.
 */
export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) return <PublicShell>{children}</PublicShell>;

  const shell = await getShellData(user.id);
  return (
    <AppShell user={user} {...shell}>
      {children}
    </AppShell>
  );
}
