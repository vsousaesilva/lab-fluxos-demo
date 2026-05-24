import { PageHeader } from "@/components/page-header";
import { ChatRunner } from "./chat-runner";

export default function ConsultorPage() {
  return (
    <>
      <PageHeader
        title="Consultor de Fluxos"
        description="Chat RAG sobre os 212 fluxos PJe indexados. Responde citando os fluxos usados como fonte."
      />
      <ChatRunner />
    </>
  );
}
