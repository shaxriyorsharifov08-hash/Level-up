import { redirect } from "next/navigation";
import { CalendarDays, MessagesSquare, Users } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Logo />
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_25%,white_0,transparent_35%),radial-gradient(circle_at_75%_60%,white_0,transparent_30%)]" />
        <div className="relative max-w-md">
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {siteConfig.university.name}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">
            Everything happening on campus, in one place.
          </h2>
          <ul className="mt-8 space-y-4 text-white/90">
            <li className="flex gap-3">
              <CalendarDays className="size-5 shrink-0" /> Discover events and register in one click
            </li>
            <li className="flex gap-3">
              <Users className="size-5 shrink-0" /> Join clubs and follow what they&apos;re up to
            </li>
            <li className="flex gap-3">
              <MessagesSquare className="size-5 shrink-0" /> Plan projects and chat with your team
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
