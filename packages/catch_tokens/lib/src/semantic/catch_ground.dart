/// What a component sits on (the system's `Ground`). A component reads it from
/// the scope above it to pick its own fill, outline and ink: a tile on the
/// white ground is grey, a tile inside a tile is the nested block, and
/// anything inside a coloured spotlight goes translucent white.
///
/// `@catch/web-ui` names the same six, in kebab case (`night-tile`).
enum CatchGround {
  /// The screen itself: white by day.
  ground,

  /// Inside a grey tile.
  tile,

  /// Inside a block nested in a tile.
  nested,

  /// Inside a spotlight or band in a format colour.
  colour,

  /// The night screen, or an ink spotlight or band.
  night,

  /// Inside a tile on a night screen.
  nightTile;

  /// Whether this is one of the two night grounds.
  bool get isNight => this == night || this == nightTile;
}
