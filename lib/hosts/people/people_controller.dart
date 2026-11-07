import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'people_controller.g.dart';

/// Who is signed in and which organizer the People tab shows: the selected
/// organizer, else [preferredOrganizerId] from the route, else the first.
@riverpod
HostPeopleOrganizer hostPeopleOrganizer(Ref ref, String? preferredOrganizerId) {
  final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
  final uid = uidValue.value;
  if (uid == null) {
    if (uidValue.hasError) {
      return HostPeopleOrganizer(
        scope: HostPeopleScope.error,
        error: uidValue.error,
      );
    }
    return HostPeopleOrganizer(
      scope: uidValue.isLoading
          ? HostPeopleScope.loading
          : HostPeopleScope.signedOut,
    );
  }
  final organizersValue = catchAsyncStateFromAsyncValue(
    ref.watch(hostOperableOrganizersProvider(uid)),
  );
  final organizers = organizersValue.value;
  if (organizers == null) {
    return HostPeopleOrganizer(
      scope: organizersValue.hasError
          ? HostPeopleScope.error
          : HostPeopleScope.loading,
      uid: uid,
      error: organizersValue.error,
    );
  }
  final selectedId = ref.watch(hostOrganizerSelectionProvider(uid));
  final organizer = organizers.isEmpty
      ? null
      : resolveSelectedHostOrganizer(
          organizers,
          selectedOrganizerId: selectedId,
          preferredOrganizerId: selectedId == null
              ? preferredOrganizerId
              : null,
        );
  return HostPeopleOrganizer(
    scope: organizer == null
        ? HostPeopleScope.noOrganizer
        : HostPeopleScope.ready,
    uid: uid,
    organizer: organizer,
  );
}

/// Reads the account and its organizers again after a failure.
void retryHostPeopleOrganizer(WidgetRef ref, String? uid) {
  if (uid == null) {
    ref.invalidate(uidProvider);
    return;
  }
  hostOperableOrganizerReads(uid).forEach(ref.invalidate);
}

/// Which directory slice the People list asks for.
@immutable
class HostPeopleRequest {
  const HostPeopleRequest({
    required this.organizerId,
    this.filter = HostPeopleFilter.everyone,
    this.search = '',
  });

  final String organizerId;
  final HostPeopleFilter filter;
  final String search;

  HostAudienceQuery get query => HostAudienceQuery(
    search: search.trim().isEmpty ? null : search.trim(),
    segment: filter.segment,
  );

  @override
  bool operator ==(Object other) =>
      other is HostPeopleRequest &&
      other.organizerId == organizerId &&
      other.filter == filter &&
      other.search == search;

  @override
  int get hashCode => Object.hash(organizerId, filter, search);
}

/// The directory pages read so far for one request.
@immutable
class HostPeopleDirectoryPage {
  const HostPeopleDirectoryPage({
    required this.contacts,
    required this.nextCursor,
    required this.matchCount,
    required this.atLeast,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostAudienceContact> contacts;
  final String? nextCursor;
  final int matchCount;
  final bool atLeast;
  final bool loadingMore;
  final Object? loadMoreError;

  HostPeopleDirectoryPage copyWith({
    bool? loadingMore,
    Object? loadMoreError,
  }) => HostPeopleDirectoryPage(
    contacts: contacts,
    nextCursor: nextCursor,
    matchCount: matchCount,
    atLeast: atLeast,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: loadMoreError,
  );
}

/// The existing contact directory read, one page at a time, most recent
/// first.
@riverpod
class HostPeopleDirectory extends _$HostPeopleDirectory {
  int _generation = 0;

  @override
  Future<HostPeopleDirectoryPage> build(HostPeopleRequest request) async {
    final generation = ++_generation;
    ref.onDispose(() => _generation++);
    final page = await ref
        .watch(hostContactsRepositoryProvider)
        .listContacts(request.organizerId, query: request.query);
    if (generation != _generation) {
      throw StateError('People directory read was superseded.');
    }
    return HostPeopleDirectoryPage(
      contacts: page.contacts,
      nextCursor: page.nextCursor,
      matchCount: page.matchCount,
      atLeast:
          page.matchCountCoverage == HostAudienceMatchCountCoverage.atLeast,
    );
  }

  /// Reads the next page and appends it, keeping the list on failure.
  Future<void> loadMore() async {
    final generation = _generation;
    final current = catchAsyncStateFromAsyncValue(state).value;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final page = await ref
          .read(hostContactsRepositoryProvider)
          .listContacts(
            request.organizerId,
            query: request.query.copyWith(cursor: cursor),
          );
      if (!ref.mounted || generation != _generation) return;
      final byId = <String, HostAudienceContact>{
        for (final contact in current.contacts) contact.contactId: contact,
        for (final contact in page.contacts) contact.contactId: contact,
      };
      state = AsyncData(
        HostPeopleDirectoryPage(
          contacts: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor == cursor ? null : page.nextCursor,
          matchCount: current.atLeast && byId.length > current.matchCount
              ? byId.length
              : current.matchCount,
          atLeast: current.atLeast,
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreError: error),
      );
    }
  }
}

/// How many people one projection segment holds.
@riverpod
Future<int> hostPeopleSegmentCount(
  Ref ref,
  String organizerId,
  HostAudienceSegment segment,
) async {
  final count = await ref
      .watch(hostContactsRepositoryProvider)
      .countContacts(organizerId, query: HostAudienceQuery(segment: segment));
  return count.count;
}

/// The People list, composed from the CRM summary (everyone), the segment
/// counts, the saved group directory and the contact directory.
@riverpod
HostPeopleState hostPeopleController(Ref ref, HostPeopleRequest request) {
  final organizerId = request.organizerId;
  final summary = catchAsyncStateFromAsyncValue(
    ref.watch(hostCrmSummaryProvider(organizerId)),
  ).value;
  final filters = [
    for (final filter in HostPeopleFilter.values)
      HostPeopleFilterCount(
        filter: filter,
        count: switch (filter.segment) {
          null => summary?.contactCount,
          final segment => catchAsyncStateFromAsyncValue(
            ref.watch(hostPeopleSegmentCountProvider(organizerId, segment)),
          ).value,
        },
      ),
  ];
  final groups = [
    for (final group
        in catchAsyncStateFromAsyncValue(
              ref.watch(hostAllSavedAudienceSummariesProvider(organizerId)),
            ).value?.audiences ??
            const <HostSavedAudienceSummary>[])
      if (group.status == 'active')
        HostPeopleGroup(
          audienceId: group.audienceId,
          name: group.name,
          count: group.lastPreviewMatchCount,
        ),
  ];
  final directory = catchAsyncStateFromAsyncValue(
    ref.watch(hostPeopleDirectoryProvider(request)),
  );
  final page = directory.value;
  if (page == null) {
    return directory.hasError
        ? HostPeopleState(
            status: HostPeopleStatus.error,
            filter: request.filter,
            filters: filters,
            groups: groups,
            search: request.search,
            error: directory.error,
          )
        : HostPeopleState(
            status: HostPeopleStatus.loading,
            filter: request.filter,
            filters: filters,
            groups: groups,
            search: request.search,
          );
  }
  return HostPeopleState(
    status: HostPeopleStatus.ready,
    filter: request.filter,
    filters: filters,
    groups: groups,
    people: page.contacts,
    matchCount: page.matchCount,
    atLeast: page.atLeast,
    canLoadMore: page.nextCursor != null,
    loadingMore: page.loadingMore,
    search: request.search,
  );
}

/// Reads the People list again after a failure.
void retryHostPeopleReads(WidgetRef ref, HostPeopleRequest request) {
  ref
    ..invalidate(hostCrmSummaryProvider(request.organizerId))
    ..invalidate(hostPeopleDirectoryProvider(request))
    ..invalidate(hostAllSavedAudienceSummariesProvider(request.organizerId));
  for (final filter in HostPeopleFilter.values) {
    final segment = filter.segment;
    if (segment != null) {
      ref.invalidate(
        hostPeopleSegmentCountProvider(request.organizerId, segment),
      );
    }
  }
}
