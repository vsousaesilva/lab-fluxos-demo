import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export function ComingSoon({
  phase,
  bullets,
}: {
  phase: "Fase 2" | "Fase 3" | "Fase 4" | "Fase 5";
  bullets: string[];
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-warning/15 p-2 text-warning">
            <Construction className="h-5 w-5" />
          </div>
          <Badge variant="warning">{phase}</Badge>
        </div>
        <h2 className="text-lg font-medium">Em construção</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Esta tela faz parte do roadmap do MVP. A Fase 1 (bootstrap) está
          concluída. O conteúdo desta feature será implementado em:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
