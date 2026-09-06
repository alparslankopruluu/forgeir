module examples.wrap

extern fn basename(p: str) -> str = "node:path.basename"

fn demo() -> str {
  basename("/tmp/main.fir")
}
