import { listStudentsForAwards } from "@/features/rewards/queries";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { slugify } from "@/lib/utils";

/**
 * Bulk award template: every student (optionally of one faculty) with an empty tokens
 * column. Fill in tokens for the students to reward and upload it on /admin/tokens.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Not found", { status: 404 });

  const faculty = new URL(request.url).searchParams.get("faculty")?.trim() || undefined;
  const students = await listStudentsForAwards(faculty);
  const csv = toCsv([
    ["email", "tokens", "reason", "name", "faculty", "year"],
    ...students.map((s) => [s.email, "", "", s.name, s.faculty, s.studyYear]),
  ]);

  const name = faculty ? `token-awards-${slugify(faculty) || "faculty"}.csv` : "token-awards.csv";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
