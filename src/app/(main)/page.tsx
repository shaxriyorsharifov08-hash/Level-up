import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <p className="text-sm font-medium text-primary-text">{siteConfig.university.name}</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Everything happening on campus, in one place.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">{siteConfig.description}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          Create your account
        </Link>
        <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </section>
  );
}
