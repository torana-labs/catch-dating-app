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

/// The directory rows shown so far for one request.
@immutable
class HostPeopleDirectoryPage {
  const HostPeopleDirectoryPage({
    required this.contacts,
    required this.hasMore,
    required this.matchCount,
    required this.atLeast,
    this.loadingMore = false,
  });

  final List<HostAudienceContact> contacts;
  final bool hasMore;
  final int matchCount;
  final bool atLeast;
  final bool loadingMore;

  HostPeopleDirectoryPage copyWith({bool? loadingMore}) =>
      HostPeopleDirectoryPage(
        contacts: contacts,
        hasMore: hasMore,
        matchCount: matchCount,
        atLeast: atLeast,
        loadingMore: loadingMore ?? this.loadingMore,
      );
}

/// How many People rows one screen shows before asking for more.
const hostPeoplePageSize = 30;

/// How many rows the People list listens to for one request; it grows by a
/// page each time the list asks for more.
@riverpod
class HostPeopleWindow extends _$HostPeopleWindow {
  @override
  int build(HostPeopleRequest request) => hostPeoplePageSize;

  void grow() => state += hostPeoplePageSize;
}

/// The first rows of the request's contact query, as a listener.
@riverpod
Stream<HostContactWindow> hostPeopleContacts(
  Ref ref,
  HostPeopleRequest request,
  int limit,
) => ref
    .watch(hostContactsRepositoryProvider)
    .watchContacts(request.organizerId, query: request.query, limit: limit);

/// The People list's contacts, most recent first (by name for a search),
/// live: a contact the server adds, changes or removes shows at once, and
/// the list opens offline from the device cache.
@riverpod
class HostPeopleDirectory extends _$HostPeopleDirectory {
  @override
  Future<HostPeopleDirectoryPage> build(HostPeopleRequest request) async {
    final limit = ref.watch(hostPeopleWindowProvider(request));
    final window = await ref.watch(
      hostPeopleContactsProvider(request, limit).future,
    );
    final contactDirectory = await ref.watch(
      hostContactDirectoryProvider(request.organizerId).future,
    );
    final count =
        contactDirectory.count(request.query) ??
        (window.hasMore ? null : window.contacts.length);
    return HostPeopleDirectoryPage(
      contacts: window.contacts,
      hasMore: window.hasMore,
      matchCount: count ?? window.contacts.length,
      atLeast: count == null,
    );
  }

  /// Listens to one more page; the list keeps its rows meanwhile.
  Future<void> loadMore() async {
    final current = catchAsyncStateFromAsyncValue(state).value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true));
    ref.read(hostPeopleWindowProvider(request).notifier).grow();
  }
}

/// How many people one projection segment holds, from the live directory.
@riverpod
Future<int> hostPeopleSegmentCount(
  Ref ref,
  String organizerId,
  HostAudienceSegment segment,
) async {
  final contactDirectory = await ref.watch(
    hostContactDirectoryProvider(organizerId).future,
  );
  return contactDirectory.count(HostAudienceQuery(segment: segment)) ?? 0;
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
    canLoadMore: page.hasMore,
    loadingMore: page.loadingMore,
    search: request.search,
  );
}

/// Reads the People list again after a failure.
void retryHostPeopleReads(WidgetRef ref, HostPeopleRequest request) {
  ref
    ..invalidate(hostContactDirectoryProvider(request.organizerId))
    ..invalidate(hostPeopleContactsProvider)
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
