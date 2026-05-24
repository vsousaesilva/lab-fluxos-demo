// Reverte mojibake "UTF-8 lido como Latin-1".
// Padrão: bytes UTF-8 (ex: 0xC3 0xA7 = 'ç') foram decodificados como Latin-1,
// virando 2 caracteres ASCII-ish ('Ã' + '§'). Aqui pegamos esses caracteres
// como bytes Latin-1 e re-decodificamos como UTF-8.
//
// Heurística: só aplica se detectar padrão típico (Ã/Â/â seguidos de chars
// no intervalo 0x80-0xBF). Caso contrário, devolve a string intacta.

const MOJIBAKE_PATTERN = /[ÃÂâ][-¿]/;

export function looksLikeMojibake(s: string): boolean {
  return MOJIBAKE_PATTERN.test(s);
}

export function fixMojibake(s: string): string {
  if (!s) return s;
  if (!looksLikeMojibake(s)) return s;

  // Cada caractere precisa caber em 1 byte (Latin-1) — se houver char > 0xFF,
  // já não é mojibake puro, devolve original.
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s;
    bytes[i] = c & 0xff;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Decoder rejeitou - não era UTF-8 válido nesses bytes. Mantém original.
    return s;
  }
}
