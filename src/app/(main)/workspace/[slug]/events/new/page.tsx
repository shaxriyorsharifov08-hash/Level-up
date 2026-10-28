import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEvent } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { getWorkspace } from "@/features/organizations/queries";
import { TIMEZONE } from "@/lib/dates";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ params }: PageProps<"/workspace/[slug]/events/new">) {
  const { slug } = await params;
  const { org } = await getWorkspace(slug, { manage: true });
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>New event</CardTitle>
      </CardHeader>
      <CardContent>
        <EventForm action={createEvent.bind(null, org.id)} submitLabel="Create event" timezone={TIMEZONE} />
      </CardContent>
    </Card>
  );
}
