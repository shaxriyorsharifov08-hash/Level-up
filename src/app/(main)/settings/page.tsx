import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PasswordForm, ProfileForm } from "@/features/auth/components/settings-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      name: true,
      email: true,
      faculty: true,
      studyYear: true,
      bio: true,
      avatarUrl: true,
      telegram: true,
      instagram: true,
    },
  });
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your public profile and account security." />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This is what other students see on your profile.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing your password signs you out on all other devices.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
