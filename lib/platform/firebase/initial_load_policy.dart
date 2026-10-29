/// Deadlines for the first user-visible resolution of asynchronous content.
///
/// These deadlines apply at the presentation/provider boundary. They must not
/// be applied to long-lived Firestore streams: realtime streams remain alive
/// after their first value and are governed by their own lifecycle policy.
abstract final class InitialLoadPolicy {
  /// Maximum time a full-screen or section skeleton may remain visible before
  /// it becomes an actionable timeout state.
  static const standard = Duration(seconds: 12);

  /// Refresh indicators should settle sooner than initial full-screen loads.
  static const refresh = Duration(seconds: 10);

  /// Poll cadence used only while waiting for a composed provider to settle.
  static const settlementPoll = Duration(milliseconds: 50);
}
