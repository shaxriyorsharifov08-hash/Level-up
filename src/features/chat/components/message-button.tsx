import { MessageSquare } from "lucide-react";
import type { ButtonProps } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { startDirectConversationFromForm } from "../actions";

/** Opens (or creates) a direct conversation with the given user. */
export function MessageButton({
  userId,
  label = "Message",
  ...props
}: { userId: string; label?: string } & Pick<ButtonProps, "size" | "variant" | "className">) {
  return (
    <form action={startDirectConversationFromForm}>
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton size="sm" variant="outline" {...props}>
        <MessageSquare /> {label}
      </SubmitButton>
    </form>
  );
}
