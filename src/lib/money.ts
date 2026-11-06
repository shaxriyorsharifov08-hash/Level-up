import { siteConfig } from "@/config/site";

/** "$10", "UZS 50,000"… in the platform's currency (NEXT_PUBLIC_CURRENCY). */
export function formatMoney(amount: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: siteConfig.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${siteConfig.currency}`;
  }
}

/** Price after a percentage discount, rounded to whole units. */
export function discountedPrice(price: number, discountPercent: number | null | undefined) {
  if (!discountPercent) return price;
  return Math.round((price * (100 - discountPercent)) / 100);
}
