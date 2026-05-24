import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MojibakeRunner } from "./mojibake-runner";

export default function MojibakePage() {
  return (
    <>
      <PageHeader
        title="Limpar mojibake"
        description="Corrige nomes de fluxos com caracteres corrompidos (ex.: 'ElaboraÃ§Ã£o' → 'Elaboração'). Atua só nas colunas processName/fileName de flow_source."
      />

      <Card>
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p>
            <strong>O que é:</strong> bytes UTF-8 dos XMLs originais (ex.:{" "}
            <code>C3 A7</code> para <code>ç</code>) foram lidos como Latin-1
            durante a ingestão, produzindo <code>Ã§</code> nos campos. O
            algoritmo reverte: trata cada caractere como byte Latin-1 e
            re-decodifica como UTF-8.
          </p>
          <p>
            <strong>Idempotente:</strong> só altera valores que casam o padrão
            de mojibake. Rodar 2 vezes não estraga nada.
          </p>
          <p>
            <strong>Escopo:</strong> só <code>flow_source.processName</code> e{" "}
            <code>flow_source.fileName</code>. <code>flow_chunk.content</code>{" "}
            e embeddings em Vectorize permanecem como estão (mojibake no chunk
            não afeta a busca semântica significativamente).
          </p>
        </CardContent>
      </Card>

      <MojibakeRunner />
    </>
  );
}
