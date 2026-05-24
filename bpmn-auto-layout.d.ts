declare module "bpmn-auto-layout" {
  /**
   * Recebe XML BPMN 2.0 com apenas o `<bpmn:process>` (sem DI) e devolve
   * o XML completo com `<bpmndi:BPMNDiagram>` calculado.
   */
  export function layoutProcess(xml: string): Promise<string>;
}
