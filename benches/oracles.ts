export type Oracle =
  | {
      id: string;
      kind: "run";
      file: string;
      fn?: string;
      args?: string[];
      allow?: string[];
      stdout: string;
    }
  | {
      id: string;
      kind: "run_homedir";
      file: string;
      fn: string;
      allow: string[];
    }
  | {
      id: string;
      kind: "check_ok";
      file: string;
    }
  | {
      id: string;
      kind: "check_code";
      file: string;
      code: string;
    }
  | {
      id: string;
      kind: "http_ok";
      file: string;
      fn: string;
    };

export const oracles: Oracle[] = [
  {
    id: "T01",
    kind: "run",
    file: "examples/add/main.fir",
    stdout: "5",
  },
  {
    id: "T03",
    kind: "run",
    file: "examples/clamp/main.fir",
    fn: "clamp10",
    args: ["15"],
    stdout: "10",
  },
  {
    id: "T04",
    kind: "run",
    file: "examples/option/main.fir",
    fn: "demo",
    stdout: "10",
  },
  {
    id: "T04.empty",
    kind: "run",
    file: "examples/option/main.fir",
    fn: "empty",
    stdout: "7",
  },
  {
    id: "T05",
    kind: "check_ok",
    file: "examples/option/main.fir",
  },
  {
    id: "T11",
    kind: "http_ok",
    file: "examples/http/main.fir",
    fn: "status_ok",
  },
  {
    id: "T13",
    kind: "run_homedir",
    file: "examples/env/main.fir",
    fn: "demo",
    allow: ["env"],
  },
  {
    id: "T17",
    kind: "check_code",
    file: "benches/fixtures/type_mismatch.fir",
    code: "TYPE-002",
  },
  {
    id: "T21",
    kind: "check_code",
    file: "benches/fixtures/fs_in_pure.fir",
    code: "EFFECT-001",
  },
  {
    id: "T-wrap",
    kind: "run",
    file: "examples/wrap/main.fir",
    fn: "demo",
    stdout: "main.fir",
  },
  {
    id: "T-add-check",
    kind: "check_ok",
    file: "examples/add/main.fir",
  },
  {
    id: "T23",
    kind: "run",
    file: "examples/calc/main.fir",
    fn: "twice",
    args: ["3"],
    stdout: "6",
  },
];
