module examples.env

extern fn homedir() -> str ! { env } = "node:os.homedir"

fn demo() -> str ! { env } {
  homedir()
}
