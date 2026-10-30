import { revalidatePath } from "next/cache";

/**
 * Every page in the app renders per request, so after a mutation we simply mark the whole
 * router cache as stale. The current page re-renders with fresh data immediately.
 */
export function refreshAll() {
  revalidatePath("/", "layout");
}
