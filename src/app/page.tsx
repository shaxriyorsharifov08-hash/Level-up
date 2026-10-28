import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="mt-2 text-muted-foreground">Foundation is ready. Features arrive in the next steps.</p>
    </main>
  );
}
