/**
 * Thin fetch facade for ForgeIR `extern fn ... = "@forgeir/http.get"`.
 * Returns the same tagged Result shape that emit-ts uses.
 * @param {string} url
 * @returns {Promise<{ tag: "ok"; value: string } | { tag: "err"; value: string }>}
 */
export async function get(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { tag: "err", value: `http ${res.status}` };
    }
    return { tag: "ok", value: await res.text() };
  } catch (err) {
    return {
      tag: "err",
      value: err instanceof Error ? err.message : String(err),
    };
  }
}
