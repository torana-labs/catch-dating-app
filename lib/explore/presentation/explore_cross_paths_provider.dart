import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_cross_paths_provider.g.dart';

const int maximumCrossPathsExploreSuggestions = 2;
const int maximumCrossPathsExploreEventIds = 12;

/// One opaque identifier for the lifetime of a mounted Explore session.
///
/// It intentionally auto-disposes with the Explore enrichment graph. The
/// server hashes this value before storage and enforces the two-person cap.
@riverpod
String crossPathsExploreSessionId(Ref ref) {
  final random = Random.secure();
  return 'xp_${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}_'
      '${random.nextInt(1 << 31).toRadixString(36)}_'
      '${random.nextInt(1 << 31).toRadixString(36)}';
}

/// Optional, failure-isolated enrichment for the default Explore list.
///
/// The primary event feed never waits on this provider. Signed-out viewers,
/// active search, and an unavailable event set all resolve to an empty list
/// without invoking the callable.
@riverpod
Future<List<CrossPathsSuggestion>> exploreCrossPathsSuggestions(Ref ref) async {
  final uidAsync = ref.watch(uidProvider);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final uid = uidState.value;
  if (uid == null) return const [];

  final query = ref.watch(exploreSearchQueryProvider).trim();
  if (query.isNotEmpty) return const [];

  final feedState = catchAsyncStateFromAsyncValue(
    ref.watch(exploreFeedViewModelProvider),
  );
  final feed = feedState.value;
  if (feed == null || feed.items.isEmpty) return const [];

  final eventIds = crossPathsExploreEventIds(feed);
  if (eventIds.isEmpty) return const [];

  final response = await ref
      .watch(crossPathsRepositoryProvider)
      .getSuggestions(
        eventIds: eventIds,
        sessionId: ref.watch(crossPathsExploreSessionIdProvider),
      );
  final eventIdSet = eventIds.toSet();
  final now = DateTime.now();
  final suggestions = List<CrossPathsSuggestion>.unmodifiable(
    response.suggestions
        .where(
          (suggestion) =>
              eventIdSet.contains(suggestion.event.eventId) &&
              suggestion.tokenExpiresAt.isAfter(now),
        )
        .take(maximumCrossPathsExploreSuggestions),
  );
  if (suggestions.isNotEmpty) {
    final earliestExpiry = suggestions
        .map((suggestion) => suggestion.tokenExpiresAt)
        .reduce((left, right) => left.isBefore(right) ? left : right);
    final timer = Timer(earliestExpiry.difference(now), ref.invalidateSelf);
    ref.onDispose(timer.cancel);
  }
  return suggestions;
}

List<String> crossPathsExploreEventIds(ExploreFeedViewModel feed) => <String>[
  for (final item in feed.items)
    if (item.event.crossPathsDiscoveryEnabled &&
        (item.availability?.canBookNow == true ||
            item.availability?.status == ViewerEventAvailabilityStatus.joined))
      item.event.id,
].take(maximumCrossPathsExploreEventIds).toList(growable: false);
