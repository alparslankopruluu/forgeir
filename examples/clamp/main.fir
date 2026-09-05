module examples.clamp

record Bounds {
  lo: int
  hi: int
}

fn clamp(x: int, b: Bounds) -> int {
  if x < b.lo {
    b.lo
  } else {
    if x > b.hi {
      b.hi
    } else {
      x
    }
  }
}

fn clamp10(x: int) -> int {
  clamp(x, Bounds { lo: 0, hi: 10 })
}
