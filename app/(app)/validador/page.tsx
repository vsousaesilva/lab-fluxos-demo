import { PageHeader } from "@/components/page-header";
import { ValidatorRunner } from "./validator-runner";

export default function ValidadorPage() {
  return (
    <>
      <PageHeader
        title="Validador XML"
        description="Rule-engine determinístico (6 regras de lint) para fluxos PJe jPDL 3.2 e BPMN 2.0. Carregue um arquivo .xml ou cole o conteúdo abaixo."
      />
      <ValidatorRunner />
    </>
  );
}
