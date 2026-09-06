module examples.option

fn first_or(xs: list[int], fallback: int) -> int {
  match xs[0] {
    Some(v) => v
    None => fallback
  }
}

fn parse_pos(x: int) -> Result[int, str] {
  if x > 0 {
    Ok(x)
  } else {
    Err("not positive")
  }
}

fn demo() -> int {
  first_or([10, 20], 0)
}

fn empty() -> int {
  first_or([], 7)
}
