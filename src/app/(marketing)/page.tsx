import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq, gte, and } from "drizzle-orm";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  MessagesSquare,
  Search,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { InstagramIcon, TelegramIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import { events, organizations, users } from "@/db/schema";
import { EventCard } from "@/features/events/components/event-card";
import { listEvents } from "@/features/events/queries";
import { OrgCard } from "@/features/organizations/components/org-card";
import { listOrganizations } from "@/features/organizations/queries";
import { getCurrentUser } from "@/lib/auth";
import { safeUrl } from "@/lib/utils";

const studentFeatures = [
  { icon: Search, title: "Discover events & projects", text: "Workshops, talks, competitions and student projects in one feed." },
  { icon: CalendarCheck2, title: "Register in one click", text: "Get your seat, join waitlists automatically and add events to your calendar." },
  { icon: Users, title: "Join & follow clubs", text: "Find your community and never miss their updates." },
  { icon: MessagesSquare, title: "Talk to other students", text: "Direct messages and group chats with classmates and teammates." },
];

const orgFeatures = [
  { icon: CalendarDays, title: "Run events", text: "Publish events, manage capacity, check attendees in and export lists." },
  { icon: FolderKanban, title: "Manage projects & tasks", text: "Kanban boards, assignees, due dates and progress tracking." },
  { icon: UsersRound, title: "Organize your team", text: "Roles, responsibilities, join requests and the clubs you manage." },
  { icon: ClipboardList, title: "Meet & chat", text: "A shared calendar for meetings and internal team channels." },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  const now = new Date();
  const [upcoming, clubs, [eventCount], [clubCount], [studentCount]] = await Promise.all([
    listEvents({ limit: 6 }),
    listOrganizations({ limit: 24 }),
    db.select({ n: count() }).from(events).where(and(eq(events.status, "published"), gte(events.endsAt, now))),
    db.select({ n: count() }).from(organizations),
    db.select({ n: count() }).from(users),
  ]);
  const featuredClubs = [...clubs].sort((a, b) => b.members - a.members).slice(0, 6);
  const telegram = safeUrl(siteConfig.university.telegramUrl);
  const instagram = safeUrl(siteConfig.university.instagramUrl);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_70%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary-text" /> {siteConfig.university.name} · student platform
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Everything happening on campus, <span className="text-primary-text">in one place.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Discover events, join clubs and build projects with your team: event management, student communities
              and collaboration, together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Create your account <ArrowRight />
              </Link>
              <Link href="/events" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Explore events
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                { label: "Upcoming events", value: eventCount.n },
                { label: "Clubs & orgs", value: clubCount.n },
                { label: "Students", value: studentCount.n },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="grid gap-4">
              {upcoming.slice(0, 2).map((e, i) => (
                <div key={e.id} className={i === 1 ? "ml-16" : "mr-16"}>
                  <EventCard event={e} />
                </div>
              ))}
              {upcoming.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  Events published by clubs will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Upcoming events</h2>
              <p className="mt-1 text-muted-foreground">Register in seconds once you&apos;ve signed in.</p>
            </div>
            <Link href="/events" className="text-sm font-medium text-primary-text hover:underline">
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          {[
            { title: "For students", items: studentFeatures },
            { title: "For student organizations", items: orgFeatures },
          ].map((group) => (
            <div key={group.title}>
              <h2 className="text-2xl font-semibold tracking-tight">{group.title}</h2>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                {group.items.map(({ icon: Icon, title, text }) => (
                  <li key={title}>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-3 font-medium">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {featuredClubs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Popular clubs & organizations</h2>
              <p className="mt-1 text-muted-foreground">Find your people.</p>
            </div>
            <Link href="/clubs" className="text-sm font-medium text-primary-text hover:underline">
              Browse all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        </section>
      )}

      {(telegram || instagram) && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Official {siteConfig.university.shortName} channels</h2>
          <p className="mt-1 text-muted-foreground">News and announcements straight from the university.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {telegram && (
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-sky-500 text-white">
                  <TelegramIcon className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Telegram</span>
                  <span className="block text-sm text-muted-foreground">Join the official channel</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            )}
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white">
                  <InstagramIcon className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Instagram</span>
                  <span className="block text-sm text-muted-foreground">Follow campus life</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to level up your student life?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Create a free account with your university e-mail, or start a workspace for your club.
          </p>
          <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary", className: "mt-6 bg-white text-indigo-700 hover:bg-white/90" })}>
            Get started <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
