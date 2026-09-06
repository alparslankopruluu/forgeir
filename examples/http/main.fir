module examples.http

extern fn http_get(url: str) -> Result[str, str] ! { net } = "@forgeir/http.get"

fn ping(url: str) -> Result[str, str] ! { net } {
  http_get(url)
}

fn status_ok(url: str) -> int ! { net } {
  match ping(url) {
    Ok(_) => 1
    Err(_) => 0
  }
}
