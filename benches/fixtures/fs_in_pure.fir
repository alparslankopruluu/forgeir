module benches.fs_in_pure

extern fn exists(p: str) -> bool ! { fs } = "node:fs.existsSync"

fn demo() -> bool {
  exists("/tmp")
}
