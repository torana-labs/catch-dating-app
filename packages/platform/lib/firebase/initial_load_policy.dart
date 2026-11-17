import 'package:catch_platform/cache/cache_policies.dart';

/// Deadlines for the first user-visible resolution of asynchronous content.
///
/// The values live in the freshness table ([CachePolicies]); a cached read
/// uses its own class's `firstLoad` and `refresh` instead. These deadlines
/// apply at the presentation/provider boundary. They must not be applied to
/// long-lived Firestore streams: realtime streams remain alive after their
/// first value and are governed by their own lifecycle policy.
abstract final class InitialLoadPolicy {
  /// Maximum time a full-screen or section skeleton may remain visible before
  /// it becomes an actionable timeout state.
  static const standard = CachePolicies.defaultFirstLoad;

  /// Refresh indicators settle within the default refresh deadline.
  static const refresh = CachePolicies.defaultRefresh;

  /// Poll cadence used only while waiting for a composed provider to settle.
  static const settlementPoll = Duration(milliseconds: 50);
}
