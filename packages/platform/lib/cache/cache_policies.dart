// Owner: Suvrat Garg (product owner). Every value below is a product decision:
// how stale each class of data may be shown, how long it stays in memory
// after its screen closes and how long a load may take before the screen says
// it timed out. The lifetimes are the answers the owner approved on
// 1 November 2026 to the caching contract's product questions (issue #1323,
// docs/screen_data_caching.md); the load deadlines are the timeout policy the
// owner approved on 17 November 2026. Change a value only with the owner's
// approval, and keep every caching Duration in this file: no read owner
// writes one inline (CACHE-POLICY-001).

import 'package:catch_platform/cache/cache_policy.dart';

/// The freshness table: one policy per class of screen data.
///
/// `retain` is how long a read stays in memory after its screen closes
/// (null: the signed-in period). `staleAfter` is how old data may be shown on
/// return without a background refetch (zero: always refetched on return;
/// null: never, because a listener delivers its own updates). No policy here
/// writes data to disk; the persisted-read store (#1330) owns that tier.
///
/// `firstLoad` and `refresh` are the load deadlines: how long a first load
/// (nothing on screen) or a background refetch (data on screen) may take
/// before it fails with a timeout. A class the table gives no deadline takes
/// [defaultFirstLoad] and [defaultRefresh].
abstract final class CachePolicies {
  /// The first-load deadline of a read class with none of its own, and of a
  /// screen that is not a cached read, such as a listener or a composition.
  static const defaultFirstLoad = Duration(seconds: 10);

  /// The refresh deadline of a read class with none of its own.
  static const defaultRefresh = Duration(seconds: 10);

  /// Host reports and counts: analytics, form analytics, attendance report,
  /// roster insights, CRM and programme counts (question 1).
  /// Reports aggregate a period server-side, so they may take 20 seconds.
  static const hostReports = CachePolicy(
    retain: Duration(minutes: 10),
    staleAfter: Duration(minutes: 5),
    firstLoad: Duration(seconds: 20),
    refresh: Duration(seconds: 20),
  );

  /// Host customer records with personal data: contact, form response,
  /// application (question 2). Kept two minutes in memory, refetched in the
  /// background on every return, never written to disk.
  static const hostCustomerRecords = CachePolicy(
    retain: Duration(minutes: 2),
    staleAfter: Duration.zero,
  );

  /// Live event operations read through functions: help requests,
  /// departures, checkpoints, presence, assistance roster (question 3).
  /// Listeners stay live; function views are kept 60 seconds and refetched on
  /// every return, with cached rows shown as updating.
  /// A host at a live event needs an answer fast: a first load gets six
  /// seconds and a refetch five.
  static const liveOperations = CachePolicy(
    retain: Duration(seconds: 60),
    staleAfter: Duration.zero,
    firstLoad: Duration(seconds: 6),
    refresh: Duration(seconds: 5),
  );

  /// Booking state: price, seats, eligibility, waitlist (question 4).
  /// A booking decision waits at most eight seconds.
  static const bookingState = CachePolicy(
    retain: Duration(minutes: 5),
    staleAfter: Duration(seconds: 60),
    firstLoad: Duration(seconds: 8),
    refresh: Duration(seconds: 8),
  );

  /// Discovery: search results, recommendations, cross-paths suggestions,
  /// "who's going" avatars (question 5).
  /// Its load deadlines are the defaults, ten seconds each.
  static const discovery = CachePolicy(
    retain: Duration(minutes: 10),
    staleAfter: Duration(minutes: 2),
  );

  /// The swipe deck (question 6): leaving and returning within ten minutes
  /// resumes the same cards; the deck refetches when it runs out.
  static const swipeDeck = CachePolicy(
    retain: Duration(minutes: 10),
    staleAfter: Duration(minutes: 10),
  );

  /// Event chat messages and participants (question 7): kept 60 seconds,
  /// with the chat's own polling unchanged.
  static const eventChat = CachePolicy(
    retain: Duration(seconds: 60),
    staleAfter: Duration(seconds: 60),
  );

  /// Per-account reference data: operable organizers, form templates,
  /// programme list, messaging setup, tracking settings (question 8). Kept
  /// for the session, refetched in the background when older than an hour.
  static const accountReference = CachePolicy(
    retain: null,
    staleAfter: Duration(hours: 1),
  );

  /// Guest profile analytics (question 9): kept for the session, refetched
  /// in the background when older than ten minutes.
  static const guestProfileAnalytics = CachePolicy(
    retain: null,
    staleAfter: Duration(minutes: 10),
  );

  /// Firestore listeners on detail screens (question 14): kept open 60
  /// seconds after leaving. The listener keeps the data current, so a return
  /// never refetches.
  static const listener = CachePolicy(
    retain: Duration(seconds: 60),
    staleAfter: null,
  );

  /// Per-account state held for the session with no refetch on return, such
  /// as the selected organizer or search text. It sets no duration, so it is
  /// the default for `retainForSession`.
  static const sessionState = CachePolicy(retain: null, staleAfter: null);
}
