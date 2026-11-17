import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_summary.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_summary.dart';

part 'host_saved_audience_repository.g.dart';

// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, isStatic:ASCENDING, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, lastPreviewAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, isStatic:ASCENDING, lastPreviewAtMillis:DESCENDING, __name__:DESCENDING)
class HostSavedAudienceRepository {
  const HostSavedAudienceRepository(this._functions, {required this.summaries});

  /// The group directory read model (`hostGroupSummaries`, `hostGroupDetails`).
  final HostSummaryReader summaries;
  static const groupMarker = 'groupSummaryVersion';

  final FirebaseFunctions _functions;

  Future<List<HostStaticAudienceMember>> resolveAudienceMembers(
    String organizerId,
    List<String> contactIds,
  ) => callHostCrm(
    _functions,
    name: 'resolveOrganizerAudienceMembers',
    payload: ResolveOrganizerAudienceMembersCallableRequest(
      organizerId: organizerId,
      contactIds: contactIds,
    ).toJson(),
    action: 'load selected audience people',
    parse: (data) => crmMapList(
      crmRequiredMap(data, 'selected audience people')['members'],
      'selected audience people',
    ).map(HostStaticAudienceMember.fromMap).toList(growable: false),
  );

  Future<HostSavedAudienceFilterOptions> savedAudienceFilterOptions(
    String organizerId,
  ) => callHostCrm(
    _functions,
    name: 'listOrganizerSavedAudiences',
    payload: ListOrganizerSavedAudiencesCallableRequest(
      organizerId: organizerId,
      limit: 1,
      includeFilterOptions: true,
    ).toJson(),
    action: 'load audience filter choices',
    parse: HostSavedAudienceFilterOptions.fromCallableData,
  );

  /// The first [limit] active groups by name (or most recently previewed)
  /// while they are listened to: a group saved, archived or previewed
  /// elsewhere shows at once.
  Stream<HostGroupSummaryWindow> watchGroupSummaries(
    String organizerId, {
    required int limit,
    bool byName = true,
    bool? isStatic,
  }) => summaries
      .watchWindow(
        collection: 'hostGroupSummaries',
        organizerId: organizerId,
        orderField: byName ? 'searchName' : 'lastPreviewAtMillis',
        descending: !byName,
        limit: limit,
        marker: groupMarker,
        equalities: {'status': 'active', 'isStatic': ?isStatic},
      )
      .map(
        (window) => HostGroupSummaryWindow(
          audiences: [
            for (final doc in window.documents)
              HostSavedAudienceSummary.fromMap(doc['row'] as Map),
          ],
          hasMore: window.hasMore,
        ),
      );

  /// One active group's definition while it is listened to: a save
  /// elsewhere delivers the new revision. A group archived or removed
  /// fails as no longer available, never a stale definition.
  Stream<HostSavedAudience> watchSavedAudience({
    required String organizerId,
    required String audienceId,
  }) => summaries
      .watchDocument(
        collection: 'hostGroupDetails',
        organizerId: organizerId,
        id: audienceId,
        marker: groupMarker,
      )
      .map((data) => _activeAudience(data, organizerId, audienceId));

  /// Load one active definition after the user selects its summary.
  /// Never fall back to the supplied revision when it is missing or unavailable.
  Future<HostSavedAudience> reloadSavedAudience({
    required String organizerId,
    required String audienceId,
    required bool Function() isCurrent,
  }) async {
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    await summaries.activatedDirectory(organizerId, groupMarker);
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    final data = await summaries.document(
      collection: 'hostGroupDetails',
      organizerId: organizerId,
      id: audienceId,
    );
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    return _activeAudience(data, organizerId, audienceId);
  }

  static HostSavedAudience _activeAudience(
    Map<String, dynamic>? data,
    String organizerId,
    String audienceId,
  ) {
    if (data == null) throw StateError('Saved group is no longer available.');
    final audience = HostSavedAudience.fromMap(data['row'] as Map);
    if (audience.organizerId != organizerId ||
        audience.audienceId != audienceId ||
        audience.status != 'active') {
      throw StateError('Saved group is no longer available.');
    }
    return audience;
  }

  Future<HostSavedAudience> upsertSavedAudience({
    required String organizerId,
    required String requestId,
    required String name,
    required HostSavedAudienceDefinition definition,
    String? audienceId,
    int? expectedRevision,
  }) => callHostCrm(
    _functions,
    name: 'upsertOrganizerSavedAudience',
    payload: {
      'organizerId': organizerId,
      'audienceId': ?audienceId,
      'requestId': requestId,
      'expectedRevision': ?expectedRevision,
      'scope': 'organizerCrm',
      'name': name,
      'definition': definition.toJson(),
    },
    action: 'save organizer audience',
    parse: (value) =>
        HostSavedAudience.fromMap(crmRequiredMap(value, 'saved audience')),
  );

  Future<HostSavedAudiencePreview> previewSavedAudience({
    required String organizerId,
    required HostSavedAudience audience,
    int sampleLimit = 10,
    String? cursor,
  }) => callHostCrm(
    _functions,
    name: 'previewOrganizerSavedAudience',
    payload: PreviewOrganizerSavedAudienceCallableRequest(
      organizerId: organizerId,
      audienceId: audience.audienceId,
      expectedRevision: audience.revision,
      sampleLimit: sampleLimit,
      cursor: cursor,
    ).toJson(),
    action: 'preview organizer audience',
    parse: HostSavedAudiencePreview.fromCallableData,
  );

  Future<HostSavedAudience> archiveSavedAudience({
    required String organizerId,
    required HostSavedAudience audience,
  }) => callHostCrm(
    _functions,
    name: 'archiveOrganizerSavedAudience',
    payload: ArchiveOrganizerSavedAudienceCallableRequest(
      organizerId: organizerId,
      audienceId: audience.audienceId,
      expectedRevision: audience.revision,
    ).toJson(),
    action: 'archive organizer audience',
    parse: (value) =>
        HostSavedAudience.fromMap(crmRequiredMap(value, 'saved audience')),
  );
}

// keepalive: Reuse the callable client for the saved audience subdomain.
@Riverpod(keepAlive: true)
HostSavedAudienceRepository hostSavedAudienceRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostSavedAudienceRepository(
    ref.watch(firebaseFunctionsProvider),
    summaries: HostSummaryReader(
      ref.watch(firebaseFirestoreProvider),
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
  );
}

@riverpod
Future<List<HostStaticAudienceMember>> hostStaticAudienceMembers(
  Ref ref,
  String organizerId,
  String selectionKey,
) => ref
    .watch(hostSavedAudienceRepositoryProvider)
    .resolveAudienceMembers(
      organizerId,
      crmStringList(jsonDecode(selectionKey)),
    );

@riverpod
Future<HostSavedAudienceFilterOptions> hostSavedAudienceFilterOptions(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostSavedAudienceRepositoryProvider)
    .savedAudienceFilterOptions(organizerId);

/// A selected group's definition, as a listener on `hostGroupDetails`.
@riverpod
Stream<HostSavedAudience> hostSavedAudienceDetail(
  Ref ref,
  String organizerId,
  String audienceId,
) => ref
    .watch(hostSavedAudienceRepositoryProvider)
    .watchSavedAudience(organizerId: organizerId, audienceId: audienceId);

/// The most groups the exhaustive directory lists before it fails safely.
const hostAllGroupsLimit = 2500;

/// Every active group's metadata from `hostGroupSummaries`, by name, as a
/// listener: the Audience workspace's exhaustive local name search and the
/// campaign editor's group picker. Full selected-member lists load only when
/// a group opens.
@riverpod
Stream<HostSavedAudienceSummaryPage> hostAllSavedAudienceSummaries(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostSavedAudienceRepositoryProvider)
    .watchGroupSummaries(organizerId, limit: hostAllGroupsLimit)
    .map((window) {
      if (window.hasMore) {
        throw StateError('Group directory could not be exhausted safely.');
      }
      return HostSavedAudienceSummaryPage(
        audiences: window.audiences,
        nextCursor: null,
      );
    });

/// How many groups one directory query listens to; it grows by a page each
/// time the list asks for more.
@riverpod
class HostGroupDirectoryWindow extends _$HostGroupDirectoryWindow {
  @override
  int build(String organizerId, {bool byName = true, bool? isStatic}) =>
      ReadLimitPolicy.directoryPage;

  void grow() => state += ReadLimitPolicy.directoryPage;
}

/// The first rows of one group directory query, as a listener.
@riverpod
Stream<HostGroupSummaryWindow> hostGroupDirectoryListener(
  Ref ref,
  String organizerId, {
  required int limit,
  bool byName = true,
  bool? isStatic,
}) => ref
    .watch(hostSavedAudienceRepositoryProvider)
    .watchGroupSummaries(
      organizerId,
      limit: limit,
      byName: byName,
      isStatic: isStatic,
    );

/// The paginated group directory, live: the first page, then a larger
/// listener each time the list asks for more. A larger listener that fails
/// keeps the rows already shown and reports the failure under them.
@riverpod
class HostGroupDirectoryController extends _$HostGroupDirectoryController {
  @override
  Future<HostGroupDirectoryState> build(
    String organizerId, {
    bool byName = true,
    bool? isStatic,
  }) async {
    final limit = ref.watch(
      hostGroupDirectoryWindowProvider(
        organizerId,
        byName: byName,
        isStatic: isStatic,
      ),
    );
    final previous = state.value;
    final HostGroupSummaryWindow window;
    try {
      window = await ref.watch(
        hostGroupDirectoryListenerProvider(
          organizerId,
          limit: limit,
          byName: byName,
          isStatic: isStatic,
        ).future,
      );
    } on Object catch (error) {
      if (limit == ReadLimitPolicy.directoryPage || previous == null) rethrow;
      return HostGroupDirectoryState(
        audiences: previous.audiences,
        hasMore: previous.hasMore,
        loadMoreError: error,
      );
    }
    return HostGroupDirectoryState(
      audiences: List.unmodifiable(window.audiences),
      hasMore: window.hasMore,
    );
  }

  /// Listens to one more page; the list keeps its rows meanwhile.
  void loadMore() {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    state = AsyncData(
      HostGroupDirectoryState(
        audiences: current.audiences,
        hasMore: current.hasMore,
        loadingMore: true,
      ),
    );
    ref
        .read(
          hostGroupDirectoryWindowProvider(
            organizerId,
            byName: byName,
            isStatic: isStatic,
          ).notifier,
        )
        .grow();
  }
}
