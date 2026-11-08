import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter/foundation.dart';

/// Whose People tab this is: still resolving, signed out, no organizer to
/// run, an organizer selected, or unable to read the organizers.
enum HostPeopleScope { loading, signedOut, noOrganizer, ready, error }

/// The signed-in account and the organizer the People tab shows.
@immutable
class HostPeopleOrganizer {
  const HostPeopleOrganizer({
    required this.scope,
    this.uid,
    this.organizer,
    this.error,
  });

  final HostPeopleScope scope;
  final String? uid;
  final Organizer? organizer;
  final Object? error;
}

/// The Show rail's directory filters. Each one is a segment the audience
/// projection computes, so every count and list is exact.
enum HostPeopleFilter {
  everyone(null),
  regulars(HostAudienceSegment.regular),
  newFaces(HostAudienceSegment.newToOrganizer),
  drifting(HostAudienceSegment.lapsedRegular);

  const HostPeopleFilter(this.segment);

  /// The projection segment behind the filter; null lists everyone.
  final HostAudienceSegment? segment;
}

/// Where the People list is: still reading, showing people, or unable to
/// read the directory.
enum HostPeopleStatus { loading, ready, error }

/// One filter chip and how many people it holds; null while counting.
@immutable
class HostPeopleFilterCount {
  const HostPeopleFilterCount({required this.filter, this.count});

  final HostPeopleFilter filter;
  final int? count;
}

/// A saved group, shown as a link chip on the Show rail.
@immutable
class HostPeopleGroup {
  const HostPeopleGroup({
    required this.audienceId,
    required this.name,
    this.count,
  });

  final String audienceId;
  final String name;

  /// People in the group at its last preview; null when never previewed.
  final int? count;
}

/// Everything the People list shows, as plain values.
@immutable
class HostPeopleState {
  const HostPeopleState({
    required this.status,
    this.filter = HostPeopleFilter.everyone,
    this.filters = const <HostPeopleFilterCount>[],
    this.groups = const <HostPeopleGroup>[],
    this.people = const <HostAudienceContact>[],
    this.matchCount,
    this.atLeast = false,
    this.canLoadMore = false,
    this.loadingMore = false,
    this.search = '',
    this.error,
  });

  const HostPeopleState.loading({
    HostPeopleFilter filter = HostPeopleFilter.everyone,
  }) : this(status: HostPeopleStatus.loading, filter: filter);

  final HostPeopleStatus status;
  final HostPeopleFilter filter;
  final List<HostPeopleFilterCount> filters;
  final List<HostPeopleGroup> groups;

  /// The people the filter and search match, most recent first.
  final List<HostAudienceContact> people;

  /// How many people match; null until the directory answers.
  final int? matchCount;

  /// The match count is a lower bound, not exact.
  final bool atLeast;
  final bool canLoadMore;
  final bool loadingMore;
  final String search;
  final Object? error;

  /// Everyone in the directory, for the pane header and the search hint.
  int? get total => filters
      .where((option) => option.filter == HostPeopleFilter.everyone)
      .firstOrNull
      ?.count;
}
