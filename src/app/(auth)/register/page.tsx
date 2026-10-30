import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/auth-forms";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Join {siteConfig.name}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Create your student account for {siteConfig.university.name}.
      </p>
      <RegisterForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
