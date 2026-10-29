import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_runtime_claim_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_insight_filter.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_booking_provider_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_luma_connection_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Connection lifecycle states',
  type: HostBookingProviderSection,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostBookingProviderSectionStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostBookingProviderSection',
      catalogId: 'host.booking_provider',
      children: [
        for (final (label, value) in <(String, AsyncValue<HostProviderSetup>?)>[
          ('Not opened', null),
          ('Loading', const AsyncLoading()),
          (
            'Unavailable',
            AsyncError(Exception('Unavailable'), StackTrace.empty),
          ),
          ('Ready to connect', AsyncData(_setup(connected: false))),
          ('Connected', AsyncData(_setup(connected: true))),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostBookingProviderSection(
                value: value,
                provider: ExternalBookingProvider.luma,
                mutationPending: false,
                allowChanges: true,
                onRetry: _noop,
                onConnect: _noop,
                onSync: _noop,
                onDisconnect: _noop,
                onImport: _noop,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Credential entry and event choice',
  type: HostLumaConnectionSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostLumaConnectionSheetStates(BuildContext context) =>
    const WidgetbookScrollCatalogFrame(
      title: 'HostLumaConnectionSheet',
      catalogId: 'host.luma_connection',
      children: [
        WidgetbookPageStateCard(
          label: 'Local credential form',
          child: WidgetbookViewportFrame.sheet(
            size: Size(390, 760),
            child: HostLumaConnectionSheet(
              organizerId: 'preview-organizer',
              eventId: 'preview-event',
              controller: _PreviewRosterController(),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Available and empty event lists',
  type: HostLumaEventChoiceSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostLumaEventChoiceSheetStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostLumaEventChoiceSheet',
      catalogId: 'host.luma_event_choice',
      children: [
        for (final populated in [true, false])
          WidgetbookPageStateCard(
            label: populated ? 'Available events' : 'Empty calendar',
            child: WidgetbookViewportFrame.sheet(
              size: const Size(390, 760),
              child: MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(size: const Size(390, 760)),
                child: HostLumaEventChoiceSheet(
                  choices: populated
                      ? _choices
                      : const HostProviderEventChoices(
                          calendarName: 'Preview calendar',
                          events: [],
                          truncated: false,
                        ),
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Pending and review states',
  type: HostAttendanceOutboxNotice,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostAttendanceOutboxNoticeStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostAttendanceOutboxNotice',
      catalogId: 'host.attendance_outbox_notice',
      children: [
        for (final status in HostAttendanceOutboxStatus.values)
          WidgetbookPageStateCard(
            label: status == HostAttendanceOutboxStatus.pending
                ? 'Waiting to sync'
                : 'Needs review',
            child: WidgetbookContentFrame(
              child: HostAttendanceOutboxNotice(
                summary: HostAttendanceOutboxSummary([
                  HostAttendanceOutboxEntry(
                    eventId: 'preview-event',
                    attendeeId: 'preview-attendee',
                    desiredCheckedIn: true,
                    expectedRevision: 1,
                    clientOperationId: 'preview-operation',
                    createdAt: DateTime(2026, 7, 14, 20),
                    status: status,
                  ),
                ]),
                onRetry: _noop,
                onDiscardConflicts: _noop,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Forwarding channels',
  type: HostRosterHandoffSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRosterHandoffSheetState(BuildContext context) =>
    WidgetbookViewportFrame.sheet(
      size: const Size(390, 760),
      child: HostRosterHandoffSheet(
        instructions: EventRosterHandoffInstructions(
          eventId: 'preview-event',
          expiresAt: DateTime(2026, 7, 15, 20),
          emailStatus: EventRosterHandoffChannelStatus.available,
          emailAlias: 'guests@example.catch.app',
          whatsappStatus: EventRosterHandoffChannelStatus.available,
          whatsappNumber: '+91 90000 00000',
          whatsappMessage: 'Send the guest list for Tuesday trivia.',
        ),
        onCopy: _noopCopy,
      ),
    );

@widgetbook.UseCase(
  name: 'Manual guest entry',
  type: HostManualAttendeeSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostManualAttendeeSheetState(BuildContext context) =>
    const WidgetbookViewportFrame.sheet(
      size: Size(390, 760),
      child: HostManualAttendeeSheet(),
    );

@widgetbook.UseCase(
  name: 'Intake source states',
  type: HostGuestIntakeSettingsField,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostGuestIntakeSettingsFieldStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostGuestIntakeSettingsField',
      catalogId: 'host.guest_intake_settings',
      children: [
        for (final (label, provider, setup, importing)
            in <
              (
                String,
                ExternalBookingProvider?,
                AsyncValue<HostProviderSetup>?,
                bool,
              )
            >[
              ('Catch guests only', null, null, false),
              (
                'Luma ready to connect',
                ExternalBookingProvider.luma,
                AsyncData(_setup(connected: false)),
                false,
              ),
              (
                'Luma connected',
                ExternalBookingProvider.luma,
                AsyncData(_setup(connected: true)),
                false,
              ),
              ('Importing a file', null, null, true),
            ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostGuestIntakeSettingsField(
                importing: importing,
                creatingHandoff: false,
                providerMutationPending: false,
                showsProviderSource: provider != null,
                providerSetup: setup,
                bookingProvider: provider,
                mutationError: null,
                onOpenChanged: (_) {},
                onImport: _noop,
                onResume: null,
                onAddGuest: _noop,
                onForward: _noop,
                onRetryProvider: _noop,
                onConnect: _noop,
                onSync: _noop,
                onDisconnect: _noop,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Stateful intake owner',
  type: HostGuestIntakeField,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostGuestIntakeFieldState(BuildContext context) => _RosterScope(
  child: WidgetbookContentFrame(
    child: HostGuestIntakeField(
      eventId: _previewEventId,
      organizerId: _previewOrganizerId,
      bookingProvider: ExternalBookingProvider.luma,
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Live roster with claims and insights',
  type: HostOperationalRosterSection,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostOperationalRosterSectionState(BuildContext context) =>
    const _RosterScope(
      child: WidgetbookContentFrame(
        child: SingleChildScrollView(
          child: HostOperationalRosterSection(
            eventId: _previewEventId,
            organizerId: _previewOrganizerId,
            allowManualGuest: true,
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Audience filter states',
  type: HostRosterInsightRail,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRosterInsightRailStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostRosterInsightRail',
      catalogId: 'host.roster_insight_rail',
      children: [
        for (final (label, value)
            in <(String, AsyncValue<HostEventRosterInsights>)>[
              ('Loaded', AsyncData(_insights)),
              ('Loading', const AsyncLoading()),
            ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostRosterInsightRail(
                insightsAsync: value,
                attendeeCount: _attendees.length,
                selected: HostRosterInsightFilter.all,
                onSelected: (_) {},
                onRetry: _noop,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Pending claim review',
  type: HostRuntimeClaimList,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRuntimeClaimListState(BuildContext context) =>
    WidgetbookContentFrame(
      child: HostRuntimeClaimList(
        claims: [_claim],
        attendees: _attendees,
        pendingUid: null,
        onApprove: (_, _) {},
        onReject: (_) {},
      ),
    );

const _previewEventId = 'preview-event';
const _previewOrganizerId = 'preview-organizer';

EventAttendee _attendee(
  String id,
  String name,
  EventAttendeeSource source,
  EventAttendeeStatus status,
) => EventAttendee(
  id: id,
  eventId: _previewEventId,
  clubId: _previewOrganizerId,
  organizerId: _previewOrganizerId,
  displayName: name,
  searchName: name.toLowerCase(),
  source: source,
  status: status,
  createdAt: DateTime(2026, 7, 10),
  updatedAt: DateTime(2026, 7, 10),
);

final _attendees = [
  _attendee(
    'preview-attendee-1',
    'Riya Mehta',
    EventAttendeeSource.catchBooking,
    EventAttendeeStatus.checkedIn,
  ),
  _attendee(
    'preview-attendee-2',
    'Kabir Jain',
    EventAttendeeSource.providerSync,
    EventAttendeeStatus.registered,
  ),
  _attendee(
    'preview-attendee-3',
    'Ananya Rao',
    EventAttendeeSource.hostImport,
    EventAttendeeStatus.registered,
  ),
];

HostEventRosterInsight _insight(
  String attendeeId,
  Set<HostRosterInsightSignal> signals,
  int attended,
) => HostEventRosterInsight(
  attendeeId: attendeeId,
  contactId: 'contact-$attendeeId',
  availability: HostRosterInsightAvailability.ready,
  signals: signals,
  priorAttendedEventCount: attended,
  priorExpectedEventCount: attended,
  priorNoShowCount: 0,
  lastAttendedAt: attended == 0 ? null : DateTime(2026, 7, 1),
  attendanceRate: attended == 0 ? null : 1,
  catchSpend: const [],
);

final _insights = HostEventRosterInsights(
  eventId: _previewEventId,
  organizerId: _previewOrganizerId,
  cutoffAt: DateTime(2026, 7, 14, 20),
  sourceCoverage: HostRosterInsightCoverage.exact,
  spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
  rows: [
    _insight('preview-attendee-1', const {
      HostRosterInsightSignal.regular,
      HostRosterInsightSignal.reliable,
    }, 6),
    _insight('preview-attendee-2', const {
      HostRosterInsightSignal.returning,
    }, 2),
    _insight('preview-attendee-3', const {
      HostRosterInsightSignal.firstTime,
    }, 0),
  ],
  computedAt: DateTime(2026, 7, 14, 18),
);

final _claim = EventRuntimeClaimRequest(
  id: 'preview-claim',
  eventId: _previewEventId,
  clubId: _previewOrganizerId,
  organizerId: _previewOrganizerId,
  uid: 'preview-claimant',
  displayName: 'Ananya Rao',
  phoneLastFour: '3210',
  candidateAttendeeIds: const ['preview-attendee-3'],
  status: EventRuntimeClaimStatus.pending,
  createdAt: DateTime(2026, 7, 14, 19, 45),
  updatedAt: DateTime(2026, 7, 14, 19, 45),
);

/// Supplies the roster's live reads so the stateful owners render offline.
class _RosterScope extends StatelessWidget {
  const _RosterScope({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      uidProvider.overrideWithValue(const AsyncData<String?>('preview-host')),
      appConnectivityProvider.overrideWith((ref) => Stream.value(const [])),
      hostOperationalRosterControllerProvider.overrideWithValue(
        const _PreviewRosterController(),
      ),
      watchEventAttendeesProvider(
        _previewEventId,
      ).overrideWith((ref) => Stream.value(_attendees)),
      hostEventRosterInsightsProvider(
        _previewEventId,
      ).overrideWith((ref) async => _insights),
      watchPendingEventRuntimeClaimsProvider(
        _previewEventId,
      ).overrideWith((ref) => Stream.value([_claim])),
    ],
    child: child,
  );
}

const _capabilities = HostProviderCapabilities(
  fileImport: true,
  eventList: true,
  rosterIdentity: true,
  registrationStatus: true,
  providerCheckIn: false,
  orderAmount: false,
  refundStatus: false,
  referralCode: false,
  webhooks: false,
  writeBookings: false,
);

HostProviderSetup _setup({required bool connected}) => HostProviderSetup(
  organizerId: 'preview-organizer',
  eventId: 'preview-event',
  providers: const [
    HostProviderCatalogEntry(
      provider: ExternalBookingProvider.luma,
      displayName: 'Luma',
      adapterClass: 'luma',
      availability: HostProviderAvailability.available,
      importSupport: HostProviderImportSupport.verified,
      connectionMethod: 'apiKey',
      capabilities: _capabilities,
      requirement: 'Connect your calendar to sync its guest list.',
    ),
  ],
  connections: [
    if (connected)
      const HostProviderConnection(
        connectionId: 'preview-connection',
        status: 'active',
        externalAccountId: 'preview-calendar',
        externalAccountName: 'Preview calendar',
        capabilities: _capabilities,
        revision: 1,
        lastHealthSyncAt: null,
        lastSuccessfulSyncAt: null,
      ),
  ],
  mapping: connected
      ? const HostProviderEventMapping(
          mappingId: 'preview-mapping',
          connectionId: 'preview-connection',
          externalEventId: 'preview-external-event',
          status: 'active',
          revision: 1,
          lastSyncAt: null,
          lastSuccessfulSyncAt: null,
          lastSyncStatus: 'pending',
          lastSyncRunId: null,
        )
      : null,
);

final _choices = HostProviderEventChoices(
  calendarName: 'Preview calendar',
  events: [
    HostProviderEventChoice(
      externalEventId: 'preview-external-event',
      name: 'Tuesday trivia',
      startAt: DateTime(2026, 7, 14, 20),
    ),
    HostProviderEventChoice(
      externalEventId: 'preview-next-event',
      name: 'Weekend social',
      startAt: DateTime(2026, 7, 18, 18),
    ),
  ],
  truncated: false,
);

class _PreviewRosterController implements HostOperationalRosterController {
  const _PreviewRosterController();

  @override
  Future<HostProviderEventChoices> listLumaEvents({
    required String organizerId,
    required String eventId,
    required String apiKey,
  }) async => _choices;

  @override
  Future<HostAttendanceOutboxSummary> loadAttendanceOutbox(
    String eventId,
  ) async => const HostAttendanceOutboxSummary([]);

  @override
  Future<HostAttendanceOutboxSummary> flushAttendanceOutbox(
    String eventId,
  ) async => const HostAttendanceOutboxSummary([]);

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnsupportedError(
    'Unexpected preview action: ${invocation.memberName}',
  );
}

void _noop() {}

Future<void> _noopCopy(String value) async {}
