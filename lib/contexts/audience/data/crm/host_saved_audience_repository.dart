import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_summary.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/host_summary_reader.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_summary.dart';

part 'host_saved_audience_repository.g.dart';

// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, isStatic:ASCENDING, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, lastPreviewAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostGroupSummaries (organizerId:ASCENDING, status:ASCENDING, isStatic:ASCENDING, lastPreviewAtMillis:DESCENDING, __name__:DESCENDING)
class HostSavedAudienceRepository {
  const HostSavedAudienceRepository(this._functions, {this.summaries});

  final HostSummaryReader? summaries;

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

  Future<HostSavedAudiencePage> listSavedAudiences(
    String organizerId, {
    String status = 'active',
    String? cursor,
    int limit = ReadLimitPolicy.directoryPage,
  }) => callHostCrm(
    _functions,
    name: 'listOrganizerSavedAudiences',
    payload: ListOrganizerSavedAudiencesCallableRequest(
      organizerId: organizerId,
      status: status,
      limit: limit > 50 ? 50 : limit,
      cursor: cursor,
    ).toJson(),
    action: 'load organizer saved audiences',
    parse: HostSavedAudiencePage.fromCallableData,
  );

  Future<HostSavedAudienceSummaryPage> listGroupSummaries(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
    bool byName = true,
    bool? isStatic,
    bool Function()? isCurrent,
  }) async {
    void checkCurrent() {
      if (isCurrent != null && !isCurrent()) {
        throw StateError('Group directory was superseded.');
      }
    }

    checkCurrent();
    final directory = await summaries?.directory(organizerId);
    checkCurrent();
    if (directory?['groupSummaryVersion'] == 1) {
      final page = await summaries!.page(
        collection: 'hostGroupSummaries',
        organizerId: organizerId,
        orderField: byName ? 'searchName' : 'lastPreviewAtMillis',
        descending: !byName,
        queryKey: jsonEncode(['active', byName, isStatic]),
        limit: limit,
        equalities: {'status': 'active', 'isStatic': ?isStatic},
        cursor: cursor,
      );
      checkCurrent();
      return HostSavedAudienceSummaryPage(
        audiences: page.documents
            .map((doc) => HostSavedAudienceSummary.fromMap(doc['row'] as Map))
            .toList(),
        nextCursor: page.nextCursor,
      );
    }
    if (cursor?.startsWith(HostSummaryCursor.prefix) ?? false) {
      throw StateError('The group directory changed; refresh this list.');
    }
    // Preserve exhaustive contains search and global local sort before cutover.
    final rows = <HostSavedAudienceSummary>[];
    final cursors = <String>{};
    String? legacyCursor;
    do {
      checkCurrent();
      final page = await listSavedAudiences(
        organizerId,
        cursor: legacyCursor,
        limit: ReadLimitPolicy.historyPage,
      );
      checkCurrent();
      rows.addAll(page.audiences.map(HostSavedAudienceSummary.fromAudience));
      legacyCursor = page.nextCursor;
      if (legacyCursor != null &&
          (rows.length >= 2500 || !cursors.add(legacyCursor))) {
        throw StateError('Group directory could not be exhausted safely.');
      }
    } while (legacyCursor != null);
    final visible =
        rows
            .where((row) => isStatic == null || row.isStatic == isStatic)
            .toList()
          ..sort(
            (a, b) => byName
                ? a.name.toLowerCase().compareTo(b.name.toLowerCase())
                : (b.lastPreviewAt ?? DateTime(0)).compareTo(
                    a.lastPreviewAt ?? DateTime(0),
                  ),
          );
    return HostSavedAudienceSummaryPage(audiences: visible, nextCursor: null);
  }

  /// Load one active definition after the user selects its summary.
  /// Never fall back to the supplied revision when it is missing or unavailable.
  Future<HostSavedAudience> reloadSavedAudience({
    required String organizerId,
    required String audienceId,
    required bool Function() isCurrent,
  }) async {
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    final directory = await summaries?.directory(organizerId);
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    if (directory?['groupSummaryVersion'] == 1) {
      final data = await summaries!.document(
        collection: 'hostGroupDetails',
        organizerId: organizerId,
        id: audienceId,
      );
      if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
      if (data == null) throw StateError('Saved group is no longer available.');
      final audience = HostSavedAudience.fromMap(data['row'] as Map);
      if (audience.organizerId != organizerId ||
          audience.audienceId != audienceId ||
          audience.status != 'active') {
        throw StateError('Saved group is no longer available.');
      }
      return audience;
    }
    String? cursor;
    final seenCursors = <String>{};
    var count = 0;
    do {
      if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
      final page = await listSavedAudiences(
        organizerId,
        cursor: cursor,
        limit: 50,
      );
      if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
      for (final item in page.audiences) {
        if (item.audienceId == audienceId &&
            item.organizerId == organizerId &&
            item.status == 'active') {
          return item;
        }
      }
      count += page.audiences.length;
      cursor = page.nextCursor;
      if (cursor != null && (count >= 2500 || !seenCursors.add(cursor))) {
        throw StateError('Saved group directory could not be exhausted.');
      }
    } while (cursor != null);
    throw StateError('Saved group is no longer available.');
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
Future<HostSavedAudiencePage> hostSavedAudiences(Ref ref, String organizerId) =>
    ref
        .watch(hostSavedAudienceRepositoryProvider)
        .listSavedAudiences(organizerId);

/// Exhaustive saved-audience directory used by the Customers-owned workspace.
///
/// The callable remains cursor-paginated; this bounded provider follows those
/// cursors so client-side name search never silently searches only page one.
@riverpod
Future<HostSavedAudiencePage> hostAllSavedAudiences(
  Ref ref,
  String organizerId,
) async {
  const maximumDefinitions = 2500;
  final repository = ref.watch(hostSavedAudienceRepositoryProvider);
  final audiences = <HostSavedAudience>[];
  String? cursor;
  do {
    final page = await repository.listSavedAudiences(
      organizerId,
      cursor: cursor,
      limit: 50,
    );
    // Firebase callables do not expose transport cancellation. Stop the
    // cursor chain when its owner leaves, rather than starting unused reads.
    if (!ref.mounted) {
      throw StateError('The saved audience directory was disposed.');
    }
    audiences.addAll(page.audiences);
    cursor = page.nextCursor;
    if (audiences.length >= maximumDefinitions && cursor != null) {
      throw StateError(
        'Saved audience directory exceeds $maximumDefinitions definitions.',
      );
    }
  } while (cursor != null);
  return HostSavedAudiencePage(audiences: audiences, nextCursor: null);
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

/// Fresh selected Group details stay alive only while the requested read runs.
/// Session changes still dispose the provider and fence the repository result.
@riverpod
Future<HostSavedAudience> hostSavedAudienceDetail(
  Ref ref,
  String organizerId,
  String audienceId,
) async {
  final repository = ref.watch(hostSavedAudienceRepositoryProvider);
  final pendingRead = ref.keepAlive();
  try {
    return await repository.reloadSavedAudience(
      organizerId: organizerId,
      audienceId: audienceId,
      isCurrent: () => ref.mounted,
    );
  } finally {
    pendingRead.close();
  }
}

/// Preserves the workspace's exhaustive local name search using small metadata
/// documents; full selected-member lists are loaded only when a group opens.
@riverpod
Future<HostSavedAudienceSummaryPage> hostAllSavedAudienceSummaries(
  Ref ref,
  String organizerId,
) async {
  final operationRef = ref;
  final repository = ref.watch(hostSavedAudienceRepositoryProvider);
  final audiences = <HostSavedAudienceSummary>[];
  final cursors = <String>{};
  String? cursor;
  do {
    final page = await repository.listGroupSummaries(
      organizerId,
      cursor: cursor,
      isCurrent: () => operationRef.mounted,
    );
    if (!ref.mounted) throw StateError('Group directory was disposed.');
    audiences.addAll(page.audiences);
    cursor = page.nextCursor;
    if (cursor != null && (audiences.length >= 2500 || !cursors.add(cursor))) {
      throw StateError('Group directory could not be exhausted safely.');
    }
  } while (cursor != null);
  return HostSavedAudienceSummaryPage(audiences: audiences, nextCursor: null);
}

/// First-page publication and continuation belong to one authenticated scope.
@riverpod
class HostGroupDirectoryController extends _$HostGroupDirectoryController {
  int _generation = 0;

  @override
  Future<HostGroupDirectoryState> build(
    String organizerId, {
    bool byName = true,
    bool? isStatic,
  }) async {
    final generation = ++_generation;
    final operationRef = ref;
    ref.onDispose(() => ++_generation);
    final page = await ref
        .watch(hostSavedAudienceRepositoryProvider)
        .listGroupSummaries(
          organizerId,
          byName: byName,
          isStatic: isStatic,
          limit: ReadLimitPolicy.directoryPage,
          isCurrent: () => operationRef.mounted && generation == _generation,
        );
    if (!operationRef.mounted || generation != _generation) {
      throw StateError('Group directory was superseded.');
    }
    return HostGroupDirectoryState(page: page);
  }

  Future<void> loadMore() async {
    // A refresh can retain old data, but its cursor no longer owns this read.
    if (!ref.mounted || state.isLoading || state.hasError) return;
    final current = state.asData?.value;
    if (current == null ||
        current.loadingMore ||
        current.page.nextCursor == null) {
      return;
    }
    final generation = _generation;
    final operationRef = ref;
    state = AsyncData(
      HostGroupDirectoryState(page: current.page, loadingMore: true),
    );
    try {
      final page = await ref
          .read(hostSavedAudienceRepositoryProvider)
          .listGroupSummaries(
            organizerId,
            byName: byName,
            isStatic: isStatic,
            cursor: current.page.nextCursor,
            limit: ReadLimitPolicy.directoryPage,
            isCurrent: () => operationRef.mounted && generation == _generation,
          );
      if (!operationRef.mounted || generation != _generation) return;
      final rows = {
        for (final row in current.page.audiences) row.audienceId: row,
        for (final row in page.audiences) row.audienceId: row,
      };
      state = AsyncData(
        HostGroupDirectoryState(
          page: HostSavedAudienceSummaryPage(
            audiences: List.unmodifiable(rows.values),
            nextCursor: page.nextCursor,
          ),
        ),
      );
    } on Object catch (error) {
      if (!operationRef.mounted || generation != _generation) return;
      state = AsyncData(
        HostGroupDirectoryState(page: current.page, loadMoreError: error),
      );
    }
  }
}
