import type { Span } from "@forgeir/core";

export type Severity = "error" | "warning";

export type DiagnosticFix = {
  kind: string;
  message: string;
};

export type Diagnostic = {
  severity: Severity;
  code: string;
  message: string;
  span?: Span;
  qid?: string;
  expected?: string;
  received?: string;
  fixes?: DiagnosticFix[];
};

export type DiagnosticReport = {
  schema: "forge.diag/v1";
  diagnostics: Diagnostic[];
};

export function report(diagnostics: Diagnostic[]): DiagnosticReport {
  return { schema: "forge.diag/v1", diagnostics };
}

export function formatDiagnostic(d: Diagnostic): string {
  const loc = d.span
    ? `${d.span.file}:${d.span.start}-${d.span.end}`
    : "unknown";
  return `${d.severity} ${d.code} at ${loc}: ${d.message}`;
}

export function formatReport(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return "ok";
  }
  return diagnostics.map(formatDiagnostic).join("\n");
}

export const Codes = {
  PARSE_UNEXPECTED: "PARSE-001",
  PARSE_EOF: "PARSE-002",
  TYPE_UNKNOWN: "TYPE-001",
  TYPE_MISMATCH: "TYPE-002",
  TYPE_UNKNOWN_TYPE: "TYPE-003",
  TYPE_DUPLICATE: "TYPE-004",
  EFFECT_MISSING: "EFFECT-001",
  EFFECT_UNKNOWN: "EFFECT-002",
  EXTERN_TARGET: "EXTERN-001",
  USE_RESOLVE: "USE-001",
  USE_EXPORT: "USE-002",
  USE_CYCLE: "USE-003",
  USE_DUPLICATE: "USE-004",
} as const;
