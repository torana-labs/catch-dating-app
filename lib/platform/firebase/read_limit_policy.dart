/// Canonical Firestore read limits by surface class.
///
/// A repository may use a smaller limit for a deliberately compact surface,
/// but growing lists must not invent a larger value at the call site. Pair
/// every capped growing list with a cursor path (see `cursor_page.dart`).
abstract final class ReadLimitPolicy {
  /// Discovery feeds and other high-density, chronological browse surfaces.
  static const int feedPage = 40;

  /// A larger first window for the mixed internal Explore feed.
  static const int exploreInternalFeedPage = 80;

  /// External supply is secondary and intentionally receives a smaller page.
  static const int exploreExternalFeedPage = 40;

  /// Directories and other medium-density entity lists.
  static const int directoryPage = 30;

  /// Compact manager inventory of saved private event setups.
  static const int privateEventSetupPage = 20;

  /// Message, notification, payment, and audit histories.
  static const int historyPage = 50;

  /// Candidate event entries with current admission revalidated per row.
  static const int eventChatDirectoryPage = 10;

  /// Server-projected event messages with identity and block checks.
  static const int eventChatPage = 30;

  /// Contract-bounded operational sets such as event rosters (max 1,000).
  /// These reads must also be listed in the reviewed exception registry.
  static const int boundedWorkingSet = 1000;

  /// Search result windows returned to interactive clients.
  static const int searchResults = 20;

  /// Small ranked recommendation rails that never imply exhaustive supply.
  static const int recommendationRail = 10;

  /// Firestore `whereIn` / `arrayContainsAny` fan-out ceiling.
  static const int multiIdChunk = 30;

  /// Deterministic edge and latest-record lookups.
  static const int lookup = 1;

  /// The fixed provider-account set for one Host organizer.
  static const int hostPaymentProviders = 2;
}
