/**
 * Demo data for local development and demos: `npm run db:seed`.
 * All dates are relative to "now" so the demo always looks current.
 * Every demo account uses the password `password123`.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

// Scripts use the session connection (Supabase session pooler) when one is configured.
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

async function main() {
  // Imported after dotenv so DATABASE_URL is set before the connection is created.
  const { db } = await import("../src/db");
  const s = await import("../src/db/schema");
  const { hashPassword } = await import("../src/lib/auth/password");
  const { zonedTimeToUtc, getZonedParts } = await import("../src/lib/dates");
  const { count, eq } = await import("drizzle-orm");

  const [{ n: existingUsers }] = await db.select({ n: count() }).from(s.users);
  if (existingUsers > 0 && !process.argv.includes("--force")) {
    console.log("The database already has users. Run `npm run db:reset` for a clean demo, or pass --force.");
    process.exit(0);
  }

  const today = getZonedParts(new Date());
  /** A time `days` from today at hh:mm in the university time zone. */
  const at = (days: number, hour: number, minute = 0) =>
    zonedTimeToUtc(today.year, today.month, today.day + days, hour, minute);
  const hours = (date: Date, h: number) => new Date(date.getTime() + h * 3600 * 1000);

  const passwordHash = await hashPassword("password123");

  /* --------------------------------- Users --------------------------------- */
  const people = [
    { key: "admin", name: "Platform Admin", email: "admin@demo.edu", role: "admin" as const, faculty: "Student Affairs Office" },
    { key: "amina", name: "Amina Yusupova", email: "organizer@demo.edu", faculty: "Computer Science", studyYear: 3, bio: "President of the Student Union. I love hackathons and good coffee." },
    { key: "timur", name: "Timur Rashidov", email: "student@demo.edu", faculty: "Software Engineering", studyYear: 2, bio: "Backend dev, chess player, always up for a side project.", telegram: "timur_demo" },
    { key: "sara", name: "Sara Kim", email: "sara@demo.edu", faculty: "Business Administration", studyYear: 4, bio: "Building a startup and running the Entrepreneurship Club." },
    { key: "lucas", name: "Lucas Martin", email: "lucas@demo.edu", faculty: "International Relations", studyYear: 3, bio: "Debate captain. Ask me about MUN." },
    { key: "nodira", name: "Nodira Aliyeva", email: "nodira@demo.edu", faculty: "Design", studyYear: 2, bio: "UI/UX and photography." },
    { key: "javier", name: "Javier Ortega", email: "javier@demo.edu", faculty: "Mechanical Engineering", studyYear: 1 },
    { key: "malika", name: "Malika Saidova", email: "malika@demo.edu", faculty: "Journalism", studyYear: 3, bio: "Host of the morning show on Campus Radio." },
    { key: "ethan", name: "Ethan Brooks", email: "ethan@demo.edu", faculty: "Computer Science", studyYear: 4 },
    { key: "zarina", name: "Zarina Tursunova", email: "zarina@demo.edu", faculty: "Medicine", studyYear: 2, bio: "Volunteer coordinator." },
    { key: "omar", name: "Omar Haddad", email: "omar@demo.edu", faculty: "Economics", studyYear: 1 },
    { key: "laylo", name: "Laylo Ergasheva", email: "laylo@demo.edu", faculty: "Mathematics", studyYear: 3 },
    { key: "daniel", name: "Daniel Novak", email: "daniel@demo.edu", faculty: "Physics", studyYear: 2 },
  ];
  const insertedUsers = await db
    .insert(s.users)
    .values(
      people.map((p) => ({
        name: p.name,
        email: p.email,
        passwordHash,
        role: p.role ?? ("student" as const),
        faculty: p.faculty,
        studyYear: p.studyYear ?? null,
        bio: p.bio ?? null,
        telegram: p.telegram ?? null,
      })),
    )
    .returning({ id: s.users.id, email: s.users.email });
  const u = Object.fromEntries(people.map((p) => [p.key, insertedUsers.find((x) => x.email === p.email)!.id])) as Record<
    (typeof people)[number]["key"],
    string
  >;

  /* ---------------------------- Organizations ---------------------------- */
  type OrgSeed = {
    key: string;
    name: string;
    kind: "organization" | "club";
    parent?: string;
    category: string;
    tagline: string;
    description: string;
    joinPolicy?: "open" | "request";
    verified?: boolean;
  };
  const orgSeeds: OrgSeed[] = [
    {
      key: "union",
      name: "Student Union",
      kind: "organization",
      category: "Student Government",
      tagline: "The voice of every student on campus",
      description:
        "We represent students, run campus-wide events and support clubs with funding, rooms and mentorship.\n\nWant to start a club? Talk to us!",
      joinPolicy: "request",
      verified: true,
    },
    {
      key: "coding",
      name: "Coding Club",
      kind: "club",
      parent: "union",
      category: "Technology",
      tagline: "Build things, ship things, learn together",
      description: "Weekly workshops, hackathons and open-source projects. All levels welcome. Bring a laptop!",
      verified: true,
    },
    {
      key: "debate",
      name: "Debate Society",
      kind: "club",
      parent: "union",
      category: "Academic",
      tagline: "Think fast, argue well",
      description: "British Parliamentary debates every Wednesday, Model UN delegations and public speaking workshops.",
      joinPolicy: "request",
    },
    {
      key: "photo",
      name: "Photography Club",
      kind: "club",
      parent: "union",
      category: "Arts & Culture",
      tagline: "See campus differently",
      description: "Photo walks, editing nights and an end-of-year exhibition.",
    },
    {
      key: "football",
      name: "Football Club",
      kind: "club",
      parent: "union",
      category: "Sports",
      tagline: "Training twice a week, matches every weekend",
      description: "Men's and women's teams plus a casual Friday kickabout for everyone.",
    },
    {
      key: "startup",
      name: "Entrepreneurship Club",
      kind: "club",
      category: "Business",
      tagline: "From idea to first customer",
      description: "Founder talks, pitch nights and a startup incubator for student teams.",
    },
    {
      key: "volunteers",
      name: "Volunteers Network",
      kind: "organization",
      category: "Community Service",
      tagline: "Small actions, real impact",
      description: "We coordinate volunteering across campus and the city: tutoring, clean-ups, charity drives.",
      verified: true,
    },
    {
      key: "radio",
      name: "Campus Radio",
      kind: "club",
      category: "Media",
      tagline: "Your campus, on air",
      description: "Student-run radio and podcasts. We train hosts, producers and sound engineers.",
    },
  ];

  const orgIds: Record<string, string> = {};
  for (const o of orgSeeds) {
    const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const [org] = await db
      .insert(s.organizations)
      .values({
        name: o.name,
        slug,
        kind: o.kind,
        parentId: o.parent ? orgIds[o.parent] : null,
        category: o.category,
        tagline: o.tagline,
        description: o.description,
        joinPolicy: o.joinPolicy ?? "open",
        verified: o.verified ?? false,
        telegramUrl: `https://t.me/levelup_demo_${slug.replace(/-/g, "_")}`,
        instagramUrl: `https://instagram.com/levelup_demo_${slug.replace(/-/g, "")}`,
        createdById: u.amina,
      })
      .returning({ id: s.organizations.id });
    orgIds[o.key] = org.id;
  }

  /* ------------------------------ Memberships ------------------------------ */
  type M = [org: string, user: keyof typeof u, role: "owner" | "admin" | "member", responsibility?: string];
  const memberSeeds: M[] = [
    ["union", "amina", "owner", "President"],
    ["union", "lucas", "admin", "Vice President"],
    ["union", "malika", "member", "Head of Communications"],
    ["union", "zarina", "member", "Treasurer"],
    ["coding", "amina", "owner", "Club lead"],
    ["coding", "timur", "admin", "Workshop coordinator"],
    ["coding", "ethan", "member", "Mentor"],
    ["coding", "nodira", "member", "Designer"],
    ["coding", "laylo", "member"],
    ["coding", "daniel", "member"],
    ["debate", "lucas", "owner", "Captain"],
    ["debate", "omar", "member"],
    ["debate", "laylo", "member", "Adjudicator"],
    ["photo", "nodira", "owner", "Club lead"],
    ["photo", "javier", "member"],
    ["football", "javier", "owner", "Captain"],
    ["football", "daniel", "member", "Goalkeeper"],
    ["football", "timur", "member"],
    ["startup", "sara", "owner", "Founder"],
    ["startup", "omar", "member", "Events"],
    ["startup", "timur", "member"],
    ["volunteers", "zarina", "owner", "Coordinator"],
    ["volunteers", "malika", "member"],
    ["radio", "malika", "owner", "Station manager"],
    ["radio", "ethan", "member", "Sound engineer"],
  ];
  await db.insert(s.memberships).values(
    memberSeeds.map(([org, user, role, responsibility]) => ({
      organizationId: orgIds[org],
      userId: u[user],
      role,
      responsibility: responsibility ?? null,
    })),
  );
  // A pending request so organizers can try the approval flow.
  await db.insert(s.memberships).values({ organizationId: orgIds.debate, userId: u.timur, status: "pending" });

  const follows = [
    ...memberSeeds.map(([org, user]) => ({ organizationId: orgIds[org], userId: u[user] })),
    { organizationId: orgIds.union, userId: u.timur },
    { organizationId: orgIds.photo, userId: u.timur },
    { organizationId: orgIds.radio, userId: u.timur },
    { organizationId: orgIds.volunteers, userId: u.sara },
    { organizationId: orgIds.coding, userId: u.sara },
  ];
  await db.insert(s.follows).values(follows).onConflictDoNothing();

  /* --------------------------------- Events -------------------------------- */
  type E = { org: string; title: string; category: string; location: string; start: Date; durationH: number; capacity?: number; description: string };
  const eventSeeds: E[] = [
    { org: "coding", title: "Intro to Git & GitHub Workshop", category: "Workshop", location: "Lab 204, IT Building", start: at(2, 17), durationH: 2, capacity: 4, description: "Learn branching, pull requests and code review. Bring your laptop with Git installed." },
    { org: "union", title: "Welcome Back Festival", category: "Social", location: "Main Campus Square", start: at(5, 15), durationH: 5, description: "Food trucks, live music and stalls from every club on campus. Free entry for students!" },
    { org: "debate", title: "Open Debate Night: Should AI write our essays?", category: "Academic", location: "Auditorium B", start: at(3, 18, 30), durationH: 2, capacity: 60, description: "British Parliamentary format. Spectators welcome; speakers sign up at the door." },
    { org: "startup", title: "Pitch Night #4", category: "Career", location: "Innovation Hub", start: at(9, 18), durationH: 3, capacity: 80, description: "Five student startups pitch to a panel of local founders and investors." },
    { org: "photo", title: "Golden Hour Photo Walk", category: "Culture", location: "Meet at the Library entrance", start: at(6, 17, 30), durationH: 2, capacity: 20, description: "A relaxed walk around campus at sunset. Any camera (or phone) is fine." },
    { org: "volunteers", title: "City Park Clean-up", category: "Volunteering", location: "Central Park, north gate", start: at(12, 10), durationH: 3, capacity: 40, description: "Gloves and bags provided. Volunteering hours certificates for everyone who attends." },
    { org: "coding", title: "Hackathon: Build for Campus", category: "Technology", location: "IT Building, floor 2", start: at(16, 10), durationH: 30, capacity: 50, description: "30 hours to build something that makes student life better. Teams of 2-4, mentors on site, prizes for the top three." },
    { org: "football", title: "Inter-Faculty Football Cup: Final", category: "Sports", location: "University Stadium", start: at(19, 16), durationH: 2, description: "Come cheer for your faculty!" },
    { org: "radio", title: "Podcasting 101", category: "Workshop", location: "Media Studio", start: at(23, 14), durationH: 2, capacity: 12, description: "Plan, record and edit your first episode with our studio team." },
    { org: "union", title: "Career Fair", category: "Career", location: "Sports Hall", start: at(-10, 10), durationH: 6, description: "Over 40 employers looking for interns and graduates." },
  ];
  const eventIds: string[] = [];
  for (const e of eventSeeds) {
    const [row] = await db
      .insert(s.events)
      .values({
        organizationId: orgIds[e.org],
        title: e.title,
        category: e.category,
        location: e.location,
        startsAt: e.start,
        endsAt: hours(e.start, e.durationH),
        capacity: e.capacity ?? null,
        description: e.description,
        createdById: u.amina,
        createdAt: hours(new Date(), -Math.floor(Math.random() * 72) - 1),
      })
      .returning({ id: s.events.id });
    eventIds.push(row.id);
  }
  // Git workshop (capacity 4) is full with a waitlist; others have a few attendees.
  const regs: { eventId: string; userId: string; status: "registered" | "waitlisted"; checkedInAt?: Date }[] = [
    ...["laylo", "daniel", "nodira", "omar"].map((k) => ({ eventId: eventIds[0], userId: u[k as keyof typeof u], status: "registered" as const })),
    ...["javier", "sara"].map((k) => ({ eventId: eventIds[0], userId: u[k as keyof typeof u], status: "waitlisted" as const })),
    ...["timur", "sara", "lucas", "malika", "zarina", "omar", "ethan"].map((k) => ({ eventId: eventIds[1], userId: u[k as keyof typeof u], status: "registered" as const })),
    ...["timur", "omar", "laylo"].map((k) => ({ eventId: eventIds[2], userId: u[k as keyof typeof u], status: "registered" as const })),
    ...["sara", "timur", "omar"].map((k) => ({ eventId: eventIds[3], userId: u[k as keyof typeof u], status: "registered" as const })),
    ...["ethan", "laylo", "daniel"].map((k) => ({ eventId: eventIds[6], userId: u[k as keyof typeof u], status: "registered" as const })),
    ...["timur", "sara", "ethan"].map((k) => ({ eventId: eventIds[9], userId: u[k as keyof typeof u], status: "registered" as const, checkedInAt: hours(eventSeeds[9].start, 1) })),
  ];
  for (const [i, r] of regs.entries()) {
    await db.insert(s.eventRegistrations).values({ ...r, updatedAt: new Date(Date.now() - (regs.length - i) * 60000) });
  }

  /* --------------------------- Projects & tasks --------------------------- */
  const [campusApp] = await db
    .insert(s.projects)
    .values({
      organizationId: orgIds.coding,
      title: "Campus Companion App",
      summary: "A mobile app that helps first-years find rooms, events and clubs.",
      description: "Goals for this semester:\n• Interactive campus map\n• Event reminders\n• Club directory\n\nTech: React Native + this platform's data.",
      status: "active",
      lookingForContributors: true,
      dueDate: at(45, 12),
      createdById: u.amina,
    })
    .returning({ id: s.projects.id });
  const [hackathon] = await db
    .insert(s.projects)
    .values({
      organizationId: orgIds.coding,
      title: "Hackathon 2026 organisation",
      summary: "Everything needed to run Build for Campus.",
      status: "active",
      isPublic: false,
      dueDate: eventSeeds[6].start,
      createdById: u.amina,
    })
    .returning({ id: s.projects.id });
  const [festival] = await db
    .insert(s.projects)
    .values({
      organizationId: orgIds.union,
      title: "Welcome Back Festival",
      summary: "Planning the biggest social event of the semester.",
      status: "active",
      dueDate: eventSeeds[1].start,
      createdById: u.amina,
    })
    .returning({ id: s.projects.id });
  await db.insert(s.projects).values({
    organizationId: orgIds.volunteers,
    title: "Tutoring for local schools",
    summary: "Weekly maths and English tutoring by student volunteers.",
    status: "planning",
    lookingForContributors: true,
    createdById: u.zarina,
  });

  type T = [project: string, org: string, title: string, status: "todo" | "in_progress" | "review" | "done", priority: "low" | "medium" | "high", assignee?: keyof typeof u, dueDays?: number];
  const taskSeeds: T[] = [
    [campusApp.id, "coding", "Design onboarding screens", "in_progress", "high", "nodira", 4],
    [campusApp.id, "coding", "Set up React Native project", "done", "high", "timur", -5],
    [campusApp.id, "coding", "Campus map data: buildings & rooms", "todo", "medium", "laylo", 10],
    [campusApp.id, "coding", "Event reminders (push notifications)", "todo", "medium", "timur", 14],
    [campusApp.id, "coding", "Write contributor guide", "review", "low", "ethan", 2],
    [campusApp.id, "coding", "Usability test with 5 first-years", "todo", "medium", undefined, 20],
    [hackathon.id, "coding", "Book rooms on floor 2", "done", "high", "amina", -3],
    [hackathon.id, "coding", "Find 3 sponsors", "in_progress", "high", "timur", 6],
    [hackathon.id, "coding", "Order food & drinks", "todo", "medium", "daniel", 12],
    [hackathon.id, "coding", "Prepare judging criteria", "todo", "low", "ethan", 13],
    [hackathon.id, "coding", "Announce on Telegram & Instagram", "todo", "medium", "timur", -1],
    [festival.id, "union", "Confirm food trucks", "in_progress", "high", "zarina", 2],
    [festival.id, "union", "Stage & sound equipment", "done", "high", "lucas", -2],
    [festival.id, "union", "Club stalls layout", "todo", "medium", "malika", 3],
  ];
  await db.insert(s.tasks).values(
    taskSeeds.map(([projectId, org, title, status, priority, assignee, dueDays]) => ({
      projectId,
      organizationId: orgIds[org],
      title,
      status,
      priority,
      assigneeId: assignee ? u[assignee] : null,
      dueDate: dueDays !== undefined ? at(dueDays, 23, 59) : null,
      completedAt: status === "done" ? new Date() : null,
      createdById: u.amina,
    })),
  );

  /* -------------------------------- Meetings ------------------------------- */
  await db.insert(s.meetings).values([
    { organizationId: orgIds.coding, title: "Weekly sync", location: "Lab 204", meetingUrl: "https://meet.example.com/coding-sync", startsAt: at(1, 18), endsAt: at(1, 19), description: "Project updates and workshop planning.", createdById: u.amina },
    { organizationId: orgIds.coding, title: "Hackathon sponsors call", location: "", meetingUrl: "https://meet.example.com/hack-sponsors", startsAt: at(4, 16), endsAt: at(4, 16, 45), createdById: u.timur },
    { organizationId: orgIds.coding, title: "Weekly sync", location: "Lab 204", startsAt: at(8, 18), endsAt: at(8, 19), createdById: u.amina },
    { organizationId: orgIds.union, title: "Board meeting", location: "Student Union office", startsAt: at(2, 13), endsAt: at(2, 14), description: "Budget for the festival; club funding requests.", createdById: u.amina },
    { organizationId: orgIds.football, title: "Team talk before the final", location: "Locker room", startsAt: at(18, 18), endsAt: at(18, 19), createdById: u.javier },
  ]);

  /* --------------------------------- Posts --------------------------------- */
  await db.insert(s.posts).values([
    { organizationId: orgIds.coding, authorId: u.amina, content: "Registration for Build for Campus is open! Form your teams of 2-4. Mentors from three local companies will be on site 💻", createdAt: hours(new Date(), -3) },
    { organizationId: orgIds.union, authorId: u.amina, content: "Club funding applications for this semester close in two weeks. Any registered club can apply.", createdAt: hours(new Date(), -20) },
    { organizationId: orgIds.photo, authorId: u.nodira, content: "Last week's photo walk shots are up on our Instagram. Thanks to everyone who came! 📸", createdAt: hours(new Date(), -30) },
    { organizationId: orgIds.radio, authorId: u.malika, content: "We're looking for two new morning-show co-hosts. No experience needed, just good energy!", createdAt: hours(new Date(), -50) },
  ]);

  /* ------------------------------- Messaging ------------------------------- */
  const orgMemberIds = (org: string) => memberSeeds.filter(([o]) => o === org).map(([, user]) => u[user]);
  for (const org of Object.keys(orgIds)) {
    const [channel] = await db
      .insert(s.conversations)
      .values({ type: "channel", name: "general", organizationId: orgIds[org], createdById: u.amina })
      .returning({ id: s.conversations.id });
    await db.insert(s.conversationMembers).values(orgMemberIds(org).map((userId) => ({ conversationId: channel.id, userId })));
    if (org === "coding") {
      const lines: [keyof typeof u, string][] = [
        ["amina", "Welcome to the Coding Club channel! 👋"],
        ["timur", "Git workshop is already full, should we open a second session?"],
        ["ethan", "I can run a repeat next week if we get a room."],
        ["amina", "Great idea, I'll ask the Student Union for Lab 204."],
      ];
      for (const [i, [author, body]] of lines.entries()) {
        await db.insert(s.messages).values({ conversationId: channel.id, senderId: u[author], body, createdAt: hours(new Date(), -(lines.length - i)) });
      }
      await db.update(s.conversations).set({ lastMessageAt: hours(new Date(), -1) }).where(eq(s.conversations.id, channel.id));
    }
  }
  const [dm] = await db
    .insert(s.conversations)
    .values({ type: "direct", directKey: [u.timur, u.sara].sort().join(":"), createdById: u.sara, lastMessageAt: hours(new Date(), -2) })
    .returning({ id: s.conversations.id });
  await db.insert(s.conversationMembers).values([
    { conversationId: dm.id, userId: u.timur, lastReadAt: hours(new Date(), -5) },
    { conversationId: dm.id, userId: u.sara, lastReadAt: new Date() },
  ]);
  await db.insert(s.messages).values({
    conversationId: dm.id,
    senderId: u.sara,
    body: "Hey Timur! Would you be up for helping with the tech side of our startup demo at Pitch Night?",
    createdAt: hours(new Date(), -2),
  });

  /* ----------------------------- Notifications ----------------------------- */
  await db.insert(s.notifications).values([
    { userId: u.timur, title: "Amina Yusupova assigned you: Find 3 sponsors", body: "Due soon", link: "/workspace/coding-club/tasks" },
    { userId: u.timur, title: "New event by Coding Club: Hackathon: Build for Campus", link: `/events/${eventIds[6]}` },
    { userId: u.lucas, title: "Timur Rashidov wants to join Debate Society", body: "Review the request in the members tab.", link: "/workspace/debate-society/members" },
  ]);

  console.log("✔ Demo data created.\n");
  console.log("  Sign in with any of these (password: password123):");
  console.log("    student@demo.edu    – student, member of Coding Club");
  console.log("    organizer@demo.edu  – runs the Student Union and Coding Club");
  console.log("    admin@demo.edu      – platform administrator");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
