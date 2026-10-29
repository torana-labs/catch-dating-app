import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/hosts/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_customers_controller.g.dart';

@riverpod
class HostCustomersDirectoryController
    extends _$HostCustomersDirectoryController {
  int _generation = 0;

  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) async {
    ++_generation;
    ref.onDispose(() => ++_generation);
    final page = await ref
        .watch(hostContactsRepositoryProvider)
        .listContacts(request.organizerId, query: _queryFor(request));
    return _directoryStateFromPage(page);
  }

  Future<void> loadMore() async {
    final generation = _generation;
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    state = AsyncData(
      current.copyWith(loadingMore: true, clearLoadMoreError: true),
    );
    try {
      final page = await ref
          .read(hostContactsRepositoryProvider)
          .listContacts(
            request.organizerId,
            query: _queryFor(request, cursor: current.nextCursor),
          );
      if (!ref.mounted || generation != _generation) return;
      final byId = <String, HostCustomerDirectoryContact>{
        for (final contact in current.contacts) contact.contactId: contact,
        for (final contact in page.contacts)
          contact.contactId: _directoryContact(contact),
      };
      state = AsyncData(
        HostCustomersDirectoryState(
          contacts: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor,
          matchCount:
              current.matchCountCoverage ==
                  HostCustomerMatchCountCoverage.atLeast
              ? byId.length > current.matchCount
                    ? byId.length
                    : current.matchCount
              : current.matchCount,
          matchCountCoverage: current.matchCountCoverage,
          manualTagVocabulary: page.manualTagVocabulary
              .map(_directoryManualTag)
              .toList(growable: false),
          sourceCoverage: _directoryCoverage(page.sourceCoverage),
          projectionVersion: page.projectionVersion,
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

@riverpod
Future<HostCustomerSegmentCount> hostCustomerSegmentCount(
  Ref ref,
  HostCustomerSegmentCountRequest request,
) async {
  final count = await ref
      .watch(hostContactsRepositoryProvider)
      .countContacts(
        request.organizerId,
        query: HostAudienceQuery(
          search: request.search,
          segment: hostAudienceSegmentForCustomerFilter(request.filter),
        ),
      );
  return HostCustomerSegmentCount(
    count: count.count,
    coverage: _matchCountCoverage(count.coverage),
  );
}

HostAudienceQuery _queryFor(
  HostCustomersDirectoryRequest request, {
  String? cursor,
}) => HostAudienceQuery(
  search: request.search,
  segment: hostAudienceSegmentForCustomerFilter(request.filter),
  manualTagId: request.manualTagId,
  segments: {
    for (final filter in request.filters)
      ?hostAudienceSegmentForCustomerFilter(filter),
  },
  manualTagIds: request.manualTagIds,
  sort: switch (request.sort) {
    HostCustomerSort.lastSeen => HostAudienceSort.lastSeen,
    HostCustomerSort.mostAttended => HostAudienceSort.mostAttended,
    HostCustomerSort.name => HostAudienceSort.name,
  },
  cursor: cursor,
);

HostAudienceSegment? hostAudienceSegmentForCustomerFilter(
  HostCustomerFilter filter,
) => switch (filter) {
  HostCustomerFilter.all => null,
  HostCustomerFilter.newToOrganizer => HostAudienceSegment.newToOrganizer,
  HostCustomerFilter.attended => HostAudienceSegment.pastAttendee,
  HostCustomerFilter.firstTime => HostAudienceSegment.firstTimeAttendee,
  HostCustomerFilter.repeat => HostAudienceSegment.repeatAttendee,
  HostCustomerFilter.regular => HostAudienceSegment.regular,
  HostCustomerFilter.atRisk => HostAudienceSegment.lapsedRegular,
  HostCustomerFilter.reliable => HostAudienceSegment.reliableAttendee,
  HostCustomerFilter.needsConfirmation => HostAudienceSegment.needsConfirmation,
  HostCustomerFilter.advocate => HostAudienceSegment.advocate,
  HostCustomerFilter.highImpactAdvocate =>
    HostAudienceSegment.highImpactAdvocate,
  HostCustomerFilter.whatsappReachable => HostAudienceSegment.whatsappReachable,
  HostCustomerFilter.smsReachable => HostAudienceSegment.smsReachable,
  HostCustomerFilter.activeMember => HostAudienceSegment.activeMember,
  HostCustomerFilter.lapsedMember => HostAudienceSegment.lapsedMember,
  HostCustomerFilter.memberNoRecentAttendance =>
    HostAudienceSegment.memberNoRecentAttendance,
  HostCustomerFilter.frequentNonMember => HostAudienceSegment.frequentNonMember,
};

HostSavedAudienceDefinition? hostSavedAudienceDefinitionForCustomerSelection({
  HostCustomerFilter filter = HostCustomerFilter.all,
  HostCustomerManualTag? manualTag,
  Set<HostCustomerFilter> filters = const {},
  List<HostCustomerManualTag> manualTags = const [],
}) {
  if (filters.isNotEmpty || manualTags.isNotEmpty) {
    return HostSavedAudienceDefinition(
      join: HostSavedAudienceJoin.all,
      predicates: [
        HostSavedAudienceDirectoryFilters(
          segments: {
            for (final value in filters)
              ?hostAudienceSegmentForCustomerFilter(value),
          },
          manualTagIds: {for (final tag in manualTags) tag.tagId},
        ),
      ],
    );
  }
  if (manualTag != null) {
    return HostSavedAudienceDefinition(
      join: HostSavedAudienceJoin.all,
      predicates: [HostSavedAudienceManualTag(manualTag.tagId)],
    );
  }
  if (filter == HostCustomerFilter.attended) {
    return const HostSavedAudienceDefinition(
      join: HostSavedAudienceJoin.all,
      predicates: [
        HostSavedAudienceAttendanceCount(
          operator: HostSavedAudienceAttendanceOperator.atLeast,
          eventCount: 1,
        ),
      ],
    );
  }
  final segment = hostAudienceSegmentForCustomerFilter(filter);
  if (segment == null) return null;
  return HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [HostSavedAudienceComputedSegment(segment)],
  );
}

enum HostCustomerCampaignBridgePhase {
  notApplicable,
  checkingSetup,
  setupUnavailable,
  noReachableRecipients,
  audienceCoveragePartial,
  providerUnavailable,
  senderSetupRequired,
  ready,
}

HostCustomerCampaignBridgePhase hostCustomerCampaignBridgePhase({
  required bool hasAudienceDefinition,
  required bool hasActiveSearch,
  required HostCustomersDirectoryState directory,
  required CatchAsyncState<HostMessagingSetup> messagingSetup,
}) {
  if (!hasAudienceDefinition || hasActiveSearch) {
    return HostCustomerCampaignBridgePhase.notApplicable;
  }
  if (directory.matchCount <= 0 ||
      directory.matchCountCoverage != HostCustomerMatchCountCoverage.exact) {
    return HostCustomerCampaignBridgePhase.noReachableRecipients;
  }
  if (directory.sourceCoverage != HostCustomerDirectoryCoverage.exact) {
    return HostCustomerCampaignBridgePhase.audienceCoveragePartial;
  }
  if (!messagingSetup.hasData) {
    return messagingSetup.hasError
        ? HostCustomerCampaignBridgePhase.setupUnavailable
        : HostCustomerCampaignBridgePhase.checkingSetup;
  }
  final blocker = hostCampaignBridgeBlocker(
    hasPersistableAudience: true,
    messagingSetup: messagingSetup.value,
    audienceCoverageComplete: true,
  );
  return switch (blocker) {
    null => HostCustomerCampaignBridgePhase.ready,
    HostCampaignBlockers.providerSetupRequired =>
      HostCustomerCampaignBridgePhase.providerUnavailable,
    HostCampaignBlockers.senderInactive =>
      HostCustomerCampaignBridgePhase.senderSetupRequired,
    HostCampaignBlockers.noReachableRecipients =>
      HostCustomerCampaignBridgePhase.noReachableRecipients,
    HostCampaignBlockers.audienceCoveragePartial =>
      HostCustomerCampaignBridgePhase.audienceCoveragePartial,
    _ => HostCustomerCampaignBridgePhase.setupUnavailable,
  };
}

HostCustomerFilter hostCustomerFilterForAudienceSegment(
  HostAudienceSegment segment,
) => switch (segment) {
  HostAudienceSegment.newToOrganizer => HostCustomerFilter.newToOrganizer,
  HostAudienceSegment.pastAttendee => HostCustomerFilter.attended,
  HostAudienceSegment.firstTimeAttendee => HostCustomerFilter.firstTime,
  HostAudienceSegment.repeatAttendee => HostCustomerFilter.repeat,
  HostAudienceSegment.regular => HostCustomerFilter.regular,
  HostAudienceSegment.lapsedRegular => HostCustomerFilter.atRisk,
  HostAudienceSegment.reliableAttendee => HostCustomerFilter.reliable,
  HostAudienceSegment.needsConfirmation => HostCustomerFilter.needsConfirmation,
  HostAudienceSegment.advocate => HostCustomerFilter.advocate,
  HostAudienceSegment.highImpactAdvocate =>
    HostCustomerFilter.highImpactAdvocate,
  HostAudienceSegment.whatsappReachable => HostCustomerFilter.whatsappReachable,
  HostAudienceSegment.smsReachable => HostCustomerFilter.smsReachable,
  HostAudienceSegment.activeMember => HostCustomerFilter.activeMember,
  HostAudienceSegment.lapsedMember => HostCustomerFilter.lapsedMember,
  HostAudienceSegment.memberNoRecentAttendance =>
    HostCustomerFilter.memberNoRecentAttendance,
  HostAudienceSegment.frequentNonMember => HostCustomerFilter.frequentNonMember,
};

bool hostCrmSmsReachableAvailable(HostCrmChannelReadiness? readiness) =>
    readiness == HostCrmChannelReadiness.currentEventOnly;

List<HostCustomerFilter> hostCustomerFiltersForSmsReadiness(
  HostCrmChannelReadiness? smsReadiness,
) => [
  for (final filter in HostCustomerFilter.values)
    if (filter != HostCustomerFilter.smsReachable ||
        hostCrmSmsReachableAvailable(smsReadiness))
      filter,
];

Map<HostCustomerFilterGroup, List<HostCustomerFilter>>
hostCustomerFilterGroupsForSmsReadiness(HostCrmChannelReadiness? smsReadiness) {
  final filters = hostCustomerFiltersForSmsReadiness(smsReadiness).toSet();
  return {
    HostCustomerFilterGroup.attendance: [
      HostCustomerFilter.newToOrganizer,
      HostCustomerFilter.attended,
      HostCustomerFilter.firstTime,
      HostCustomerFilter.repeat,
      HostCustomerFilter.regular,
      HostCustomerFilter.atRisk,
    ].where(filters.contains).toList(growable: false),
    HostCustomerFilterGroup.reliability: [
      HostCustomerFilter.reliable,
      HostCustomerFilter.needsConfirmation,
    ].where(filters.contains).toList(growable: false),
    HostCustomerFilterGroup.advocacy: [
      HostCustomerFilter.advocate,
      HostCustomerFilter.highImpactAdvocate,
    ].where(filters.contains).toList(growable: false),
    HostCustomerFilterGroup.reachable: [
      HostCustomerFilter.whatsappReachable,
      HostCustomerFilter.smsReachable,
    ].where(filters.contains).toList(growable: false),
    HostCustomerFilterGroup.membership: [
      HostCustomerFilter.activeMember,
      HostCustomerFilter.lapsedMember,
      HostCustomerFilter.memberNoRecentAttendance,
      HostCustomerFilter.frequentNonMember,
    ].where(filters.contains).toList(growable: false),
  };
}

HostCustomersDirectoryState _directoryStateFromPage(HostAudiencePage page) =>
    HostCustomersDirectoryState.fromPageData(
      contacts: page.contacts.map(_directoryContact),
      nextCursor: page.nextCursor,
      matchCount: page.matchCount,
      matchCountCoverage: _matchCountCoverage(page.matchCountCoverage),
      manualTagVocabulary: page.manualTagVocabulary.map(_directoryManualTag),
      sourceCoverage: _directoryCoverage(page.sourceCoverage),
      projectionVersion: page.projectionVersion,
    );

HostCustomerMatchCountCoverage _matchCountCoverage(
  HostAudienceMatchCountCoverage coverage,
) => switch (coverage) {
  HostAudienceMatchCountCoverage.exact => HostCustomerMatchCountCoverage.exact,
  HostAudienceMatchCountCoverage.atLeast =>
    HostCustomerMatchCountCoverage.atLeast,
};

HostCustomerDirectoryContact _directoryContact(HostAudienceContact contact) =>
    HostCustomerDirectoryContact(
      contactId: contact.contactId,
      displayName: contact.displayName,
      attendedEventCount: contact.attendedEventCount,
      lastAttendedAt: contact.lastAttendedAt,
      tags: {for (final segment in contact.segments) ?_customerTag(segment)},
      manualTags: contact.manualTags
          .map(_directoryManualTag)
          .toList(growable: false),
      hasAmbiguousIdentity:
          contact.identityState == HostAudienceIdentityState.ambiguous ||
          contact.ambiguousCandidateCount > 0,
      whatsappOptedIn:
          contact.whatsappStatus == HostAudiencePermissionStatus.optedIn,
      whatsappAdminSuppressed: contact.whatsappAdminSuppressed,
    );

HostCustomerManualTag _directoryManualTag(HostManualTag tag) =>
    HostCustomerManualTag(tagId: tag.tagId, label: tag.label);

HostCustomerTag? _customerTag(HostAudienceSegment segment) => switch (segment) {
  HostAudienceSegment.newToOrganizer => HostCustomerTag.newToOrganizer,
  HostAudienceSegment.pastAttendee => null,
  HostAudienceSegment.firstTimeAttendee => HostCustomerTag.firstTime,
  HostAudienceSegment.repeatAttendee => HostCustomerTag.repeat,
  HostAudienceSegment.regular => HostCustomerTag.regular,
  HostAudienceSegment.lapsedRegular => HostCustomerTag.atRisk,
  HostAudienceSegment.reliableAttendee => HostCustomerTag.reliable,
  HostAudienceSegment.needsConfirmation => HostCustomerTag.needsConfirmation,
  HostAudienceSegment.advocate => HostCustomerTag.advocate,
  HostAudienceSegment.highImpactAdvocate => HostCustomerTag.highImpactAdvocate,
  HostAudienceSegment.whatsappReachable => HostCustomerTag.whatsappReachable,
  HostAudienceSegment.smsReachable => HostCustomerTag.smsReachable,
  HostAudienceSegment.activeMember => HostCustomerTag.activeMember,
  HostAudienceSegment.lapsedMember => HostCustomerTag.lapsedMember,
  HostAudienceSegment.memberNoRecentAttendance =>
    HostCustomerTag.memberNoRecentAttendance,
  HostAudienceSegment.frequentNonMember => HostCustomerTag.frequentNonMember,
};

HostCustomerDirectoryCoverage _directoryCoverage(
  HostAudienceSourceCoverage coverage,
) => switch (coverage) {
  HostAudienceSourceCoverage.exact => HostCustomerDirectoryCoverage.exact,
  HostAudienceSourceCoverage.partial => HostCustomerDirectoryCoverage.partial,
  HostAudienceSourceCoverage.insufficientData =>
    HostCustomerDirectoryCoverage.insufficientData,
};

@riverpod
HostCustomersController hostCustomersController(Ref ref) =>
    HostCustomersController(ref.watch(hostContactsRepositoryProvider));

typedef HostCustomerRemovalKey = ({
  String actorUid,
  String organizerId,
  String contactId,
});

class HostCustomersController {
  HostCustomersController(this._repository);

  static final removeMutation = Mutation<void>();

  final HostContactsRepository _repository;
  final _removals =
      <HostCustomerRemovalKey, ({int revision, Future<void> future})>{};

  Future<void> removeCustomer({
    required HostCustomerRemovalKey key,
    required int expectedRevision,
  }) {
    final pending = _removals[key];
    if (pending != null) {
      if (pending.revision != expectedRevision) {
        return Future<void>.error(
          StateError('A different removal is still pending.'),
        );
      }
      return pending.future;
    }
    late final Future<void> request;
    request =
        Future<void>.sync(
          () => _repository.mutateContact(
            organizerId: key.organizerId,
            contactId: key.contactId,
            expectedRevision: expectedRevision,
            hidden: true,
          ),
        ).whenComplete(() {
          if (identical(_removals[key]?.future, request)) _removals.remove(key);
        });
    _removals[key] = (revision: expectedRevision, future: request);
    return request;
  }

  Future<HostCreatedCustomer> createCustomer({
    required String organizerId,
    required String displayName,
    String? phoneE164,
    String? email,
    String? initialNote,
  }) => _repository.createContact(
    organizerId: organizerId,
    displayName: displayName,
    phoneE164: phoneE164,
    email: email,
    initialNote: initialNote,
  );

  Future<String> startConversation({
    required String organizerId,
    required String contactId,
  }) => _repository.startContactConversation(
    organizerId: organizerId,
    contactId: contactId,
  );

  Future<HostAudienceExport> exportCustomers({
    required String organizerId,
    HostAudienceSegment? segment,
    HostAudienceQuery query = const HostAudienceQuery(),
  }) => _repository.exportContacts(organizerId, segment: segment, query: query);

  Future<void> mutateCustomer({
    required String organizerId,
    required String contactId,
    required int expectedRevision,
    String? displayNameOverride,
    bool clearDisplayNameOverride = false,
    String? phoneE164,
    bool updatePhoneE164 = false,
    String? email,
    bool updateEmail = false,
    bool? whatsappAdminSuppressed,
    bool? hidden,
    List<String>? manualTags,
  }) => _repository.mutateContact(
    organizerId: organizerId,
    contactId: contactId,
    expectedRevision: expectedRevision,
    displayNameOverride: displayNameOverride,
    clearDisplayNameOverride: clearDisplayNameOverride,
    phoneE164: phoneE164,
    updatePhoneE164: updatePhoneE164,
    email: email,
    updateEmail: updateEmail,
    whatsappAdminSuppressed: whatsappAdminSuppressed,
    hidden: hidden,
    manualTags: manualTags,
  );

  Future<HostCustomerNote> createNote({
    required String organizerId,
    required String contactId,
    required String body,
  }) => _repository.createContactNote(
    organizerId: organizerId,
    contactId: contactId,
    body: body,
  );

  Future<HostCustomerOutreach> recordOutreach({
    required String organizerId,
    required String contactId,
    required HostCustomerOutreachChannel channel,
    required HostCustomerOutreachOutcome outcome,
    String? note,
    DateTime? occurredAt,
  }) => _repository.recordContactOutreach(
    organizerId: organizerId,
    contactId: contactId,
    channel: channel,
    outcome: outcome,
    note: note,
    occurredAt: occurredAt,
  );

  Future<HostCustomerNote> editNote({
    required String organizerId,
    required String contactId,
    required HostCustomerNote note,
    required String body,
  }) => _repository.mutateContactNote(
    organizerId: organizerId,
    contactId: contactId,
    noteId: note.noteId,
    expectedRevision: note.revision,
    body: body,
  );

  Future<HostContactMergeCandidatePage> listMergeCandidates({
    required String organizerId,
    String? cursor,
  }) => _repository.listMergeCandidates(organizerId, cursor: cursor);

  Future<void> markDifferentPeople({
    required String organizerId,
    required HostContactMergeCandidate candidate,
  }) => _repository.reviewMergeCandidate(
    organizerId: organizerId,
    candidate: candidate,
    differentPeople: true,
  );

  Future<void> reopenMergeCandidate({
    required String organizerId,
    required HostContactMergeCandidate candidate,
  }) => _repository.reviewMergeCandidate(
    organizerId: organizerId,
    candidate: candidate,
    differentPeople: false,
  );

  Future<void> mergeCustomers({
    required String organizerId,
    required HostContactMergeCandidate candidate,
    required String survivorContactId,
    required bool confirmConflicts,
  }) => _repository.mergeContacts(
    organizerId: organizerId,
    candidate: candidate,
    survivorContactId: survivorContactId,
    confirmConflicts: confirmConflicts,
    idempotencyKey: _mergeIdempotencyKey('merge', candidate.candidateId),
  );

  Future<void> unmergeCustomers({
    required String organizerId,
    required String mergeReceiptId,
  }) => _repository.unmergeContacts(
    organizerId: organizerId,
    mergeReceiptId: mergeReceiptId,
    idempotencyKey: _mergeIdempotencyKey('unmerge', mergeReceiptId),
  );
}

String _mergeIdempotencyKey(String operation, String subjectId) =>
    '$operation-$subjectId-${DateTime.now().microsecondsSinceEpoch}';
