module examples.calc

use examples.add.{add}

fn twice(x: int) -> int {
  add(x, x)
}
