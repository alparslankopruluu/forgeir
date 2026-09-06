export function extractFir(text: string): string | null {
  const fence = /```(?:fir)?[ \t]*\n([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) {
    const body = fence[1].trim();
    if (body.startsWith("module ")) {
      return `${body}\n`;
    }
  }
  const idx = text.indexOf("module ");
  if (idx === -1) {
    return null;
  }
  return `${text.slice(idx).trim()}\n`;
}
