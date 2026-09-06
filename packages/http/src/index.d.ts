export type Result<T, E> = { tag: "ok"; value: T } | { tag: "err"; value: E };

export function get(url: string): Promise<Result<string, string>>;
