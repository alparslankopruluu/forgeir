# Security

Report vulnerabilities privately via GitHub Security Advisories on this repository.

The compiler itself does not fetch packages or open a shell. `forge run` executes emitted JavaScript in the local Node process, including `extern` imports and `@forgeir/http` `fetch`. Effectful entry functions require `--allow net|fs|env`. Treat untrusted `.fir` like untrusted source.

MCP `forge_patch` defaults to preview. `--apply` / `mode: apply` writes `.fir` source. Destructive tools must default to preview.

Do not open issues that include secrets or production credentials.
