"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describeElAction } from "./actions";

type Props = {
  elId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  label?: string;
  className?: string;
};

export function DescribeButton({
  elId,
  variant = "outline",
  size = "sm",
  label = "Descrever com IA",
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await describeElAction({ id: elId });
      if (!result.ok) {
        toast.error(result.error, { duration: 6000 });
        return;
      }
      toast.success("EL descrita pela IA");
      router.refresh();
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={pending}
      className={cn(className)}
    >
      <Sparkles
        className={pending ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"}
      />
      {size !== "icon" ? (pending ? "Descrevendo…" : label) : null}
    </Button>
  );
}
