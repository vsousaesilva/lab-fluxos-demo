import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config mínima — usa cache padrão (em memória).
// Para cache em R2 com NX-Cache, adicione `incrementalCache: r2IncrementalCache`
// e crie um bucket R2 dedicado para o cache do Next/ISR.
export default defineCloudflareConfig({});
