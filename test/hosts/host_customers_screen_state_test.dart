import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('customer filters map to explainable organizer segments', () {
    expect(HostCustomerFilter.atRisk.tag, HostCustomerTag.atRisk);
    expect(
      HostCustomerFilter.needsConfirmation.tag,
      HostCustomerTag.needsConfirmation,
    );
    expect(
      hostAudienceSegmentForCustomerFilter(HostCustomerFilter.reliable),
      HostAudienceSegment.reliableAttendee,
    );
    expect(
      hostAudienceSegmentForCustomerFilter(HostCustomerFilter.attended),
      HostAudienceSegment.pastAttendee,
    );
    expect(
      hostAudienceSegmentForCustomerFilter(
        HostCustomerFilter.highImpactAdvocate,
      ),
      HostAudienceSegment.highImpactAdvocate,
    );
    expect(
      hostAudienceSegmentForCustomerFilter(
        HostCustomerFilter.whatsappReachable,
      ),
      HostAudienceSegment.whatsappReachable,
    );
    expect(
      HostCustomerFilter.values
          .where((filter) => filter != HostCustomerFilter.all)
          .every(
            (filter) => hostAudienceSegmentForCustomerFilter(filter) != null,
          ),
      isTrue,
    );
    expect(
      HostAudienceSegment.values.every(
        (segment) =>
            hostAudienceSegmentForCustomerFilter(
              hostCustomerFilterForAudienceSegment(segment),
            ) ==
            segment,
      ),
      isTrue,
    );
  });

  test('customer SMS filters render only when SMS is available', () {
    expect(
      hostCustomerFiltersForSmsReadiness(null),
      isNot(contains(HostCustomerFilter.smsReachable)),
    );
    expect(
      hostCustomerFiltersForSmsReadiness(
        HostCrmChannelReadiness.providerAndDltSetupRequired,
      ),
      isNot(contains(HostCustomerFilter.smsReachable)),
    );
    expect(
      hostCustomerFiltersForSmsReadiness(
        HostCrmChannelReadiness.currentEventOnly,
      ),
      contains(HostCustomerFilter.smsReachable),
    );
  });

  test('campaign audience definitions require a scoped customer selection', () {
    expect(hostSavedAudienceDefinitionForCustomerSelection(), isNull);

    final computed = hostSavedAudienceDefinitionForCustomerSelection(
      filter: HostCustomerFilter.atRisk,
    );
    expect(
      computed?.predicates.single,
      isA<HostSavedAudienceComputedSegment>(),
    );

    final attended = hostSavedAudienceDefinitionForCustomerSelection(
      filter: HostCustomerFilter.attended,
    );
    final attendancePredicate =
        attended?.predicates.single as HostSavedAudienceAttendanceCount?;
    expect(
      attendancePredicate?.operator,
      HostSavedAudienceAttendanceOperator.atLeast,
    );
    expect(attendancePredicate?.eventCount, 1);

    final manual = hostSavedAudienceDefinitionForCustomerSelection(
      manualTag: const HostCustomerManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
    );
    expect(manual?.predicates.single, isA<HostSavedAudienceManualTag>());
  });

  test('combined selection survives saved audience serialization', () {
    final definition = hostSavedAudienceDefinitionForCustomerSelection(
      filters: {
        HostCustomerFilter.repeat,
        HostCustomerFilter.firstTime,
        HostCustomerFilter.reliable,
      },
      manualTags: [HostCustomerManualTag(tagId: 'a' * 32, label: 'VIP')],
    )!;
    final json = definition.toJson();
    expect(HostSavedAudienceDefinition.fromMap(json).toJson(), json);
    expect((json['predicates']! as List).single, {
      'kind': 'directoryFilters',
      'segmentIds': [
        'first_time_attendee',
        'reliable_attendee',
        'repeat_attendee',
      ],
      'manualTagIds': ['a' * 32],
    });
    const a = HostCustomersDirectoryRequest(
      organizerId: 'org',
      filters: {HostCustomerFilter.repeat, HostCustomerFilter.reliable},
    );
    const b = HostCustomersDirectoryRequest(
      organizerId: 'org',
      filters: {HostCustomerFilter.reliable, HostCustomerFilter.repeat},
    );
    expect(a, b);
    expect(a.hashCode, b.hashCode);
  });

  test('campaign bridge exhaustively separates async setup states', () {
    final directory = _campaignDirectory();

    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: const CatchAsyncState.loading(),
      ),
      HostCustomerCampaignBridgePhase.checkingSetup,
    );
    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: CatchAsyncState.error(StateError('unavailable')),
      ),
      HostCustomerCampaignBridgePhase.setupUnavailable,
    );
    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: CatchAsyncState.data(_messagingSetup()),
      ),
      HostCustomerCampaignBridgePhase.ready,
    );
    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: CatchAsyncState.data(
          _messagingSetup(connectionStatus: 'pending'),
        ),
      ),
      HostCustomerCampaignBridgePhase.senderSetupRequired,
    );
    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: CatchAsyncState.data(
          _messagingSetup(providerConfigured: false),
        ),
      ),
      HostCustomerCampaignBridgePhase.providerUnavailable,
    );
  });

  test('campaign bridge stays hidden for all customers and live search', () {
    final directory = _campaignDirectory();
    final setup = CatchAsyncState.data(_messagingSetup());

    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: false,
        hasActiveSearch: false,
        directory: directory,
        messagingSetup: setup,
      ),
      HostCustomerCampaignBridgePhase.notApplicable,
    );
    expect(
      hostCustomerCampaignBridgePhase(
        hasAudienceDefinition: true,
        hasActiveSearch: true,
        directory: directory,
        messagingSetup: setup,
      ),
      HostCustomerCampaignBridgePhase.notApplicable,
    );
  });

  test('customer filters are grouped without losing SMS readiness', () {
    final unavailable = hostCustomerFilterGroupsForSmsReadiness(
      HostCrmChannelReadiness.providerAndDltSetupRequired,
    );

    expect(unavailable.keys, HostCustomerFilterGroup.values);
    expect(unavailable[HostCustomerFilterGroup.attendance], [
      HostCustomerFilter.newToOrganizer,
      HostCustomerFilter.attended,
      HostCustomerFilter.firstTime,
      HostCustomerFilter.repeat,
      HostCustomerFilter.regular,
      HostCustomerFilter.atRisk,
    ]);
    expect(unavailable[HostCustomerFilterGroup.reliability], [
      HostCustomerFilter.reliable,
      HostCustomerFilter.needsConfirmation,
    ]);
    expect(unavailable[HostCustomerFilterGroup.advocacy], [
      HostCustomerFilter.advocate,
      HostCustomerFilter.highImpactAdvocate,
    ]);
    expect(unavailable[HostCustomerFilterGroup.reachable], [
      HostCustomerFilter.whatsappReachable,
    ]);
    expect(
      hostCustomerFilterGroupsForSmsReadiness(
        HostCrmChannelReadiness.currentEventOnly,
      )[HostCustomerFilterGroup.reachable],
      [HostCustomerFilter.whatsappReachable, HostCustomerFilter.smsReachable],
    );
  });

  test(
    'segment count requests retain organizer, search and filter identity',
    () {
      const first = HostCustomerSegmentCountRequest(
        organizerId: 'organizer-1',
        search: 'asha',
        filter: HostCustomerFilter.atRisk,
      );
      const same = HostCustomerSegmentCountRequest(
        organizerId: 'organizer-1',
        search: 'asha',
        filter: HostCustomerFilter.atRisk,
      );
      const different = HostCustomerSegmentCountRequest(
        organizerId: 'organizer-1',
        search: 'asha',
        filter: HostCustomerFilter.reliable,
      );

      expect(first, same);
      expect(first.hashCode, same.hashCode);
      expect(first, isNot(different));
    },
  );

  test('directory request identity includes the server sort order', () {
    const lastSeen = HostCustomersDirectoryRequest(organizerId: 'organizer-1');
    const mostAttended = HostCustomersDirectoryRequest(
      organizerId: 'organizer-1',
      sort: HostCustomerSort.mostAttended,
    );
    const sameMostAttended = HostCustomersDirectoryRequest(
      organizerId: 'organizer-1',
      sort: HostCustomerSort.mostAttended,
    );

    expect(lastSeen, isNot(mostAttended));
    expect(mostAttended, sameMostAttended);
    expect(mostAttended.hashCode, sameMostAttended.hashCode);
  });
}

HostCustomersDirectoryState _campaignDirectory() =>
    const HostCustomersDirectoryState(
      contacts: [],
      nextCursor: null,
      matchCount: 2,
      matchCountCoverage: HostCustomerMatchCountCoverage.exact,
      sourceCoverage: HostCustomerDirectoryCoverage.exact,
      projectionVersion: 1,
    );

HostMessagingSetup _messagingSetup({
  bool providerConfigured = true,
  String connectionStatus = 'active',
}) => HostMessagingSetup(
  organizerId: 'organizer-1',
  providerConfigured: providerConfigured,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'app-id',
    configId: 'config-id',
    graphVersion: 'v24.0',
  ),
  connection: HostWhatsappConnection(
    connectionId: 'connection-1',
    status: connectionStatus,
    displayPhoneNumber: '+91 98765 43210',
    verifiedName: 'Catch Social',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_1K',
    templateSyncStatus: 'ready',
    webhookStatus: 'healthy',
    testStatus: 'verified',
    revision: 1,
  ),
  templates: const [],
);
