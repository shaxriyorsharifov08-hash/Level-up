import type { Metadata } from "next";
import { Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { awardToStudent, bulkAward } from "@/features/rewards/actions";
import { AwardForm, BulkAwardForm } from "@/features/rewards/components/award-forms";
import { listFaculties, listRecentAwards } from "@/features/rewards/queries";
import { requirePlatformAdmin } from "@/lib/auth";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Award tokens" };

export default async function AdminTokensPage() {
  await requirePlatformAdmin("/admin/tokens");
  const [awards, faculties] = await Promise.all([listRecentAwards(), listFaculties()]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Award many students from a file</CardTitle>
              <CardDescription>
                Reward study results per faculty or field: download the student list, fill in the tokens column for the
                students you want to reward, and upload it back.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              method="get"
              action="/api/admin/award-template"
              className="flex flex-col gap-2 rounded-lg bg-muted p-3 sm:flex-row sm:items-center"
            >
              <span className="shrink-0 text-sm font-medium">1. Download the list</span>
              <Select name="faculty" aria-label="Faculty" defaultValue="" className="sm:ml-auto sm:w-56">
                <option value="">All faculties</option>
                {faculties.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
              <Button type="submit" variant="outline">
                <Download /> Download CSV
              </Button>
            </form>
            <BulkAwardForm action={bulkAward} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Award one student</CardTitle>
              <CardDescription>For a competition win, volunteering or another achievement.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AwardForm action={awardToStudent} />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent awards</CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length === 0 ? (
            <EmptyState icon={Award} title="No awards yet" className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {awards.map(({ tx, user }) => (
                <li key={tx.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.description} · {formatRelative(tx.createdAt)}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", tx.amount > 0 ? "text-success" : "text-destructive")}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
