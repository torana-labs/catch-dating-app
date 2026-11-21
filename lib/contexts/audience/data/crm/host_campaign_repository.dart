import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_campaign_repository.g.dart';

class HostCampaignRepository {
  const HostCampaignRepository(this._functions, {required this._summaries});

  static const sendSummaries = 'hostSendSummaries';

  /// Campaign states an automation can hand a draft to.
  static const draftStatuses = ['draft', 'previewed'];

  final FirebaseFunctions _functions;
  final HostSummaryReader _summaries;

  Future<HostCampaign> upsertCampaign(
    String organizerId,
    HostCampaignDraft draft,
  ) => callHostCrm(
    _functions,
    name: 'upsertOrganizerCampaign',
    payload: UpsertOrganizerCampaignCallableRequest(
      organizerId: organizerId,
      campaignId: draft.campaignId,
      requestId: draft.requestId,
      expectedRevision: draft.expectedRevision,
      name: draft.name,
      messageClass: draft.messageClass,
      savedAudienceId: draft.savedAudienceId,
      connectionId: draft.connectionId,
      templateId: draft.templateId,
      templateVariables: draft.templateVariables,
      eventId: draft.eventId,
      inviteDestinationKind: draft.inviteDestinationKind,
      scheduledAtMillis: draft.scheduledAt?.millisecondsSinceEpoch,
    ).toJson(),
    action: 'save organizer campaign',
    parse: HostCampaign.fromCallableData,
  );

  /// Every Send (campaigns, announcements and follower updates) from
  /// `hostSendSummaries`, newest first, [pageSize] at a time. Every row
  /// shown stays live, so a campaign's delivery counts move as it sends.
  // firestore-index: hostSendSummaries(organizerId:ASCENDING, activityAtMillis:DESCENDING, __name__:DESCENDING)
  LivePager<HostSendSummary> watchSends(
    String organizerId, {
    int pageSize = ReadLimitPolicy.historyPage,
  }) => _summaries
      .watchPages(
        collection: sendSummaries,
        organizerId: organizerId,
        orderField: 'activityAtMillis',
        descending: true,
        pageSize: pageSize,
      )
      .map(_row);

  /// The organizer's draft and previewed campaigns, newest first, for an
  /// automation to hand off to.
  // firestore-index: hostSendSummaries(organizerId:ASCENDING, kind:ASCENDING, row.status:ASCENDING, activityAtMillis:DESCENDING, __name__:DESCENDING)
  LivePager<HostCampaignSendSummary> watchDraftCampaigns(
    String organizerId, {
    int pageSize = ReadLimitPolicy.historyPage,
  }) => _summaries
      .watchPages(
        collection: sendSummaries,
        organizerId: organizerId,
        orderField: 'activityAtMillis',
        descending: true,
        pageSize: pageSize,
        equalities: const {'kind': 'campaign'},
        inFilters: const {'row.status': draftStatuses},
      )
      .map(
        (doc) => switch (_row(doc)) {
          final HostCampaignSendSummary campaign => campaign,
          _ => throw const FormatException('A draft row is not a campaign.'),
        },
      );

  static HostSendSummary _row(Map<String, dynamic> doc) =>
      HostSendSummary.fromMap(crmRequiredMap(doc['row'], 'Send row'));

  Future<HostCampaign> previewCampaign(
    String organizerId,
    HostCampaign campaign,
  ) => _campaignAction('previewOrganizerCampaign', organizerId, campaign);

  Future<HostCampaign> approveCampaign(
    String organizerId,
    HostCampaign campaign,
  ) => _campaignAction('approveOrganizerCampaign', organizerId, campaign);

  Future<HostCampaign> dispatchCampaign(
    String organizerId,
    HostCampaign campaign,
  ) => _campaignAction('dispatchOrganizerCampaign', organizerId, campaign);

  Future<HostCampaign> cancelCampaign(
    String organizerId,
    HostCampaign campaign,
  ) => _campaignAction('cancelOrganizerCampaign', organizerId, campaign);

  Future<HostCampaign> getCampaignReport(
    String organizerId,
    String campaignId,
  ) => callHostCrm(
    _functions,
    name: 'getOrganizerCampaignReport',
    payload: OrganizerCampaignActionCallableRequest(
      organizerId: organizerId,
      campaignId: campaignId,
    ).toJson(),
    action: 'load organizer campaign report',
    parse: HostCampaign.fromCallableData,
  );

  Future<HostCampaign> _campaignAction(
    String name,
    String organizerId,
    HostCampaign campaign,
  ) => callHostCrm(
    _functions,
    name: name,
    payload: OrganizerCampaignActionCallableRequest(
      organizerId: organizerId,
      campaignId: campaign.campaignId,
      expectedRevision: campaign.revision,
    ).toJson(),
    action: '$name organizer campaign',
    parse: HostCampaign.fromCallableData,
  );
}

// keepalive: account-free: Reuse the callable client for the campaign
// subdomain.
@Riverpod(keepAlive: true)
HostCampaignRepository hostCampaignRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostCampaignRepository(
    ref.watch(firebaseFunctionsProvider),
    summaries: HostSummaryReader(
      ref.watch(firebaseFirestoreProvider),
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
  );
}

/// The organizer's Sends history, a page at a time, every row shown live.
@riverpod
class HostSendPages extends _$HostSendPages {
  late LivePager<HostSendSummary> _pager;

  @override
  Stream<LivePages<HostSendSummary>> build(String organizerId) {
    _pager = ref.watch(hostCampaignRepositoryProvider).watchSends(organizerId);
    return _pager.pages;
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}
