/**
 * Branding and university-level settings. Everything comes from environment variables
 * so the same code base can be deployed for any university (see .env.example).
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Level Up",
  description:
    "Events, clubs, projects and team collaboration for university students and student organizations.",
  university: {
    name: process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "Your University",
    shortName: process.env.NEXT_PUBLIC_UNIVERSITY_SHORT_NAME || "YU",
    timezone: process.env.NEXT_PUBLIC_UNIVERSITY_TIMEZONE || "UTC",
    telegramUrl: process.env.NEXT_PUBLIC_UNIVERSITY_TELEGRAM_URL || "",
    instagramUrl: process.env.NEXT_PUBLIC_UNIVERSITY_INSTAGRAM_URL || "",
    websiteUrl: process.env.NEXT_PUBLIC_UNIVERSITY_WEBSITE_URL || "",
  },
} as const;

export const EVENT_CATEGORIES = [
  "Academic",
  "Career",
  "Culture",
  "Sports",
  "Technology",
  "Social",
  "Volunteering",
  "Workshop",
  "General",
] as const;

export const ORG_CATEGORIES = [
  "Academic",
  "Arts & Culture",
  "Business",
  "Community Service",
  "Media",
  "Sports",
  "Technology",
  "Student Government",
  "General",
] as const;
