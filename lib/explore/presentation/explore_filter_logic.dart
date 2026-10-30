import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';

/// Minimum club rating that counts as "high rated" for the Explore filters.
/// Shared by the club list and the events feed so the two surfaces can never
/// disagree on the threshold.
const double kExploreHighRatedMinimum = 4.5;

/// Case- and whitespace-insensitive equality for free-text filter values
/// (activity tag, area). Shared so both Explore view models compare values the
/// same way.
bool exploreFilterValuesMatch(String? left, String right) {
  return left?.trim().toLowerCase() == right.trim().toLowerCase();
}

/// Club-scope predicate shared by the Explore club list and the events feed.
///
/// Keeps the "high rated / joined / activity tag / area" rules identical across
/// both surfaces — the previous copies had already drifted. Distance and time
/// are intentionally NOT handled here: clubs carry no coordinates (distance is
/// an events-only filter) and the two surfaces scope time differently
/// (`organizer.nextEventAt` vs `event.startTime`).
///
/// [activityHandledByEventFilter] short-circuits the club-tag match when the
/// selected activity tag already maps to an activity kind that the events query
/// filtered on; in that case the events feed must not additionally require the
/// club to carry the tag as free text.
bool organizerMatchesScopeFilters({
  required Organizer organizer,
  required ExploreFilterSelection filters,
  required Set<String> joinedOrganizerIds,
  bool activityHandledByEventFilter = false,
}) {
  if (filters.highRatedOnly && organizer.rating < kExploreHighRatedMinimum) {
    return false;
  }
  if (filters.joinedOnly && !joinedOrganizerIds.contains(organizer.id)) {
    return false;
  }
  final activityTag = filters.activityTag;
  if (activityTag != null &&
      !activityHandledByEventFilter &&
      !organizer.tags.any((tag) => exploreFilterValuesMatch(tag, activityTag))) {
    return false;
  }
  final area = filters.area;
  if (area != null && !exploreFilterValuesMatch(organizer.area, area)) {
    return false;
  }
  return true;
}
