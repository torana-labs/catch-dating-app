import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/programs/presentation/program_arrivals_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_dispatch_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_desk_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_dating_app/programs/presentation/program_stakeholder_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_trips_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_work_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';

part 'use_cases_overrides.dart';

const _programId = 'program_kapoor_shah';
const _pickupPointId = 'del_t3';
const _hotelId = 'hotel_taj';

final _now = DateTime(2026, 2, 14, 14, 30);

final _vehicleClasses = <ProgramVehicleClass>[
  const ProgramVehicleClass(
    id: 'sedan',
    label: 'Sedan',
    passengerCapacity: 3,
    luggageCapacity: 4,
    capabilities: {},
    sortOrder: 0,
  ),
  const ProgramVehicleClass(
    id: 'innova',
    label: 'Innova',
    passengerCapacity: 6,
    luggageCapacity: 8,
    capabilities: {ProgramVehicleCapability.extraLuggage},
    sortOrder: 1,
  ),
];

final _access = ProgramWorkAccess(
  programId: _programId,
  organizerId: 'org_1',
  title: 'Kapoor–Shah Wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: [
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.airportGreeter,
      pickupPointIds: {'del_t3'},
      hotelIds: {},
      functionIds: {},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.transportDispatcher,
      pickupPointIds: {'del_t3'},
      hotelIds: {},
      functionIds: {},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.functionCheckIn,
      pickupPointIds: {},
      hotelIds: {},
      functionIds: {'fn_sangeet'},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
  ],
  grantExpiresAt: _now.add(const Duration(hours: 8)),
  capabilities: const {'arrivalsTransport'},
  pickupPoints: const [
    ProgramStation(
      pickupPointId: 'del_t3',
      label: 'DEL Terminal 3 arrivals',
      kind: 'airportArrival',
      iataCode: 'DEL',
      terminal: 'T3',
    ),
  ],
  hotels: const [ProgramHotel(hotelId: 'hotel_taj', name: 'Taj Palace')],
  functions: [
    ProgramFunction(
      functionId: 'fn_sangeet',
      name: 'Sangeet',
      venueName: 'The Leela Ballroom',
      startsAt: _now.add(const Duration(hours: 3)),
      endsAt: _now.add(const Duration(hours: 6)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 12,
      checkedInCount: 4,
    ),
  ],
  vehicleClasses: _vehicleClasses,
);

ArrivalsRosterRow _row({
  required String legId,
  required String name,
  required int passengers,
  required TravelLegReadiness readiness,
  TravelLegFlightStatus flight = TravelLegFlightStatus.landed,
  CurbSource? curbSource = CurbSource.actualLanding,
  Duration curbOffset = Duration.zero,
  String? claimedByDisplay,
  TimingUnavailableReason? unavailableReason,
}) {
  return ArrivalsRosterRow(
    legId: legId,
    guestId: 'guest_$legId',
    partyId: 'party_$legId',
    guestDisplayName: name,
    partyLabel: '$name party',
    partyGuestIds: const [],
    passengers: passengers,
    luggageUnits: passengers + 1,
    flightNumber: 'AI-847',
    originIata: 'BOM',
    arrivalTerminal: '3',
    flightStatus: flight,
    curbAt: unavailableReason == null ? _now.add(curbOffset) : null,
    curbSource: curbSource,
    unavailableReason: unavailableReason,
    readiness: readiness,
    claimedByDisplay: claimedByDisplay,
    claimedByMe: claimedByDisplay != null,
    destinationHotelId: _hotelId,
    destinationLabel: 'Taj Palace',
    requiredCapabilities: const {},
    dedicatedVehicle: false,
    revision: 1,
  );
}

final _roster = ProgramArrivalsRoster(
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  programId: _programId,
  pickupPointId: _pickupPointId,
  generatedAt: _now,
  rows: [
    _row(
      legId: 'leg_rohan',
      name: 'Rohan Sharma',
      passengers: 3,
      readiness: TravelLegReadiness.ready,
      curbSource: CurbSource.ready,
      claimedByDisplay: 'Arjun',
    ),
    _row(
      legId: 'leg_rao',
      name: 'Nisha Rao',
      passengers: 2,
      readiness: TravelLegReadiness.expected,
      curbOffset: const Duration(minutes: 12),
    ),
    _row(
      legId: 'leg_mathew',
      name: 'Anita Mathew',
      passengers: 4,
      readiness: TravelLegReadiness.disrupted,
      flight: TravelLegFlightStatus.cancelled,
      curbSource: null,
      unavailableReason: TimingUnavailableReason.cancelled,
    ),
  ],
  vehicleClasses: _vehicleClasses,
);

final _plan = ProgramTransportPlan(
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  programId: _programId,
  pickupPointId: _pickupPointId,
  generatedAt: _now,
  groups: [
    TransportGroupSuggestion(
      legIds: const ['leg_rohan', 'leg_rao'],
      partyIds: const ['party_rohan', 'party_rao'],
      destinationHotelId: _hotelId,
      destinationLabel: 'Taj Palace',
      readiness: TransportGroupReadiness.ready,
      vehicleClassId: 'innova',
      vehicleClassLabel: 'Innova',
      passengers: 5,
      luggageUnits: 7,
      earliestCurbAt: _now,
      latestCurbAt: _now.add(const Duration(minutes: 12)),
      dispatchBy: _now.add(const Duration(minutes: 10)),
      waitOverdue: false,
    ),
  ],
  unassigned: const [],
);

final _trip = ProgramTripSummary(
  manifestSource: TransportManifestSource.dispatchSnapshot,
  vehicleClassLabel: 'Innova / SUV',
  tripId: 'trip_1',
  pickupPointId: _pickupPointId,
  destinationHotelId: _hotelId,
  destinationLabel: 'Taj Palace',
  vehicleClassId: 'innova',
  plateDisplay: 'DL-1T-4421',
  vendorId: 'vendor_meru',
  vendorName: 'Meru Cabs',
  status: TransportTripStatus.enRoute,
  passengerCount: 5,
  departedAt: _now.subtract(const Duration(minutes: 12)),
  arrivedAt: null,
  estimatedArriveAt: _now.add(const Duration(minutes: 35)),
  voidReason: null,
  guestNames: const ['Rohan Sharma', 'Nisha Rao', 'Vikram Rao'],
  revision: 1,
);

final _inbound = ProgramHotelInbound(
  nextTripCursor: null,
  nextExpectedCursor: null,
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  programId: _programId,
  hotelId: _hotelId,
  hotelName: 'Taj Palace',
  generatedAt: _now,
  trips: [_trip],
  expectedLegs: [
    HotelExpectedLeg(
      legId: 'leg_rao',
      guestDisplayName: 'Nisha Rao',
      partyLabel: 'Nisha Rao party',
      passengers: 2,
      curbAt: _now.add(const Duration(minutes: 12)),
      readiness: TravelLegReadiness.expected,
    ),
  ],
);

final _trips = ProgramTripList(
  nextCursor: null,
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  programId: _programId,
  trips: [_trip],
);

final _stakeholderCounts = ProgramStakeholderCounts(
  programId: _programId,
  serverTime: _now,
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  guestCount: 142,
  householdCount: 58,
  functions: [
    const ProgramFunctionCounts(
      functionId: 'fn_sangeet',
      status: ProgramFunctionStatus.scheduled,
      invitedCount: 80,
      rsvpPending: 12,
      rsvpAttending: 50,
      rsvpDeclined: 14,
      rsvpMaybe: 4,
      expectedHeads: 60,
      checkedInHeads: 12,
      noShowCount: 3,
    ),
  ],
  hotels: [
    const ProgramHotelOccupancy(
      hotelId: 'hotel_taj',
      routedGuestCount: 40,
      arrivedGuestCount: 31,
      legCount: 14,
    ),
  ],
);
@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramWorkScreen,
  path: '[P1 product surfaces]/Program work',
)
Widget programWorkScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramWorkScreen',
    contractId: 'screen.programs.work',
    children: [
      WidgetbookPageStateCard(
        label: 'staff access',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: ProgramWorkScreen(programId: _programId, now: () => _now),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramArrivalsScreen,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programArrivalsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramArrivalsScreen',
    contractId: 'screen.programs.arrivals',
    children: [
      WidgetbookPageStateCard(
        label: 'station roster',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: const ProgramArrivalsScreen(
              programId: _programId,
              pickupPointId: _pickupPointId,
              stationLabel: 'DEL Terminal 3 arrivals',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramDispatchScreen,
  path: '[P1 product surfaces]/Program dispatch',
)
Widget programDispatchScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramDispatchScreen',
    contractId: 'screen.programs.dispatch',
    children: [
      WidgetbookPageStateCard(
        label: 'suggested groups',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: const ProgramDispatchScreen(
              programId: _programId,
              pickupPointId: _pickupPointId,
              stationLabel: 'DEL Terminal 3 arrivals',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramHotelDeskScreen,
  path: '[P1 product surfaces]/Program hotel desk',
)
Widget programHotelDeskScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramHotelDeskScreen',
    contractId: 'screen.programs.hotel_desk',
    children: [
      WidgetbookPageStateCard(
        label: 'inbound view',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: const ProgramHotelDeskScreen(
              programId: _programId,
              hotelId: _hotelId,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramTripsScreen,
  path: '[P1 product surfaces]/Program trips',
)
Widget programTripsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramTripsScreen',
    contractId: 'screen.programs.trips',
    children: [
      WidgetbookPageStateCard(
        label: 'ledger',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: ProgramTripsScreen(programId: _programId, now: () => _now),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ProgramWorkPageBody,
  path: '[P1 product surfaces]/Program work',
)
Widget programWorkPageBodyStates(BuildContext context) {
  return WidgetbookUtilityDeviceFrame(
    child: ProviderScope(
      overrides: _programOverrides(),
      child: ProgramWorkPageBody(access: _access, now: _now),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramArrivalRow,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programArrivalRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramArrivalRow',
    catalogId: 'screen.programs.arrivals',
    children: [
      ProgramArrivalRow(
        row: _roster.rows[0],
        queuedStatus: null,
        onAction: (_, action, {manualCurbNote}) async {},
      ),
      ProgramArrivalRow(
        row: _roster.rows[2],
        queuedStatus: ProgramOperationOutboxStatus.pending,
        onAction: (_, action, {manualCurbNote}) async {},
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Badge states',
  type: ProgramArrivalReadinessBadge,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programArrivalReadinessBadgeStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramArrivalReadinessBadge',
    catalogId: 'screen.programs.arrivals',
    children: [
      ProgramArrivalReadinessBadge(row: _roster.rows[0]),
      ProgramArrivalReadinessBadge(row: _roster.rows[1]),
      ProgramArrivalReadinessBadge(row: _roster.rows[2]),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Menu states',
  type: ProgramArrivalActionMenu,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programArrivalActionMenuStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramArrivalActionMenu',
    catalogId: 'screen.programs.arrivals',
    children: [
      ProgramArrivalActionMenu(
        row: _roster.rows[0],
        queued: true,
        onAction: (_, action, {manualCurbNote}) async {},
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Banner states',
  type: ProgramArrivalsOutboxBanner,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programArrivalsOutboxBannerStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'ProgramArrivalsOutboxBanner',
    catalogId: 'screen.programs.arrivals',
    children: [
      ProgramArrivalsOutboxBanner(
        outbox: ProgramOperationOutboxSummary([]),
        busy: false,
        onFlush: _noop,
        onClearReview: _noop,
      ),
    ],
  );
}

void _noop() {}

@widgetbook.UseCase(
  name: 'Tile states',
  type: ProgramDispatchGroupTile,
  path: '[P1 product surfaces]/Program dispatch',
)
Widget programDispatchGroupTileStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramDispatchGroupTile',
    catalogId: 'screen.programs.dispatch',
    children: [
      ProgramDispatchGroupTile(group: _plan.groups.first, onDispatch: _noop),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sheet states',
  type: ProgramDispatchSheet,
  path: '[P1 product surfaces]/Program dispatch',
)
Widget programDispatchSheetStates(BuildContext context) {
  return WidgetbookUtilitySheetFrame(
    child: ProviderScope(
      overrides: _programOverrides(),
      child: ProgramDispatchSheet(
        authorityGeneration: 0,
        accessExpiresAt: _now.add(const Duration(hours: 8)),
        accountId: 'uid_greeter',
        programId: _programId,
        pickupPointId: _pickupPointId,
        organizerId: 'org_1',
        group: _plan.groups.first,
        holdCandidates: const [],
        vehicleClasses: _vehicleClasses,
        onDispatched: (_, error) {},
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Tile states',
  type: ProgramHotelInboundTripTile,
  path: '[P1 product surfaces]/Program hotel desk',
)
Widget programHotelInboundTripTileStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramHotelInboundTripTile',
    catalogId: 'screen.programs.hotel_desk',
    children: [
      ProviderScope(
        overrides: _programOverrides(),
        child: ProgramHotelInboundTripTile(
          trip: _trip,
          inbound: _inbound,
          onChanged: () {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramTripLedgerRow,
  path: '[P1 product surfaces]/Program trips',
)
Widget programTripLedgerRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramTripLedgerRow',
    catalogId: 'screen.programs.trips',
    children: [
      ProviderScope(
        overrides: _programOverrides(),
        child: ProgramTripLedgerRow(
          trip: _trip,
          programId: _programId,
          canVoid: true,
          onChanged: () {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sheet states',
  type: ProgramTripVoidSheet,
  path: '[P1 product surfaces]/Program trips',
)
Widget programTripVoidSheetStates(BuildContext context) {
  return const WidgetbookUtilitySheetFrame(child: ProgramTripVoidSheet());
}

ProgramOperationsState _reviewOperationsState() => ProgramOperationsState(
  outbox: ProgramOperationOutboxSummary([
    ProgramOperationOutboxEntry.legObservation(
      programId: _programId,
      legId: _roster.rows.first.legId,
      action: 'markReady',
      clientOperationId: 'review-preview',
      createdAt: _now,
      expectedRevision: 1,
    ).copyWith(status: ProgramOperationOutboxStatus.needsReview),
  ]),
);

@widgetbook.UseCase(
  name: 'Notice states',
  type: ProgramOperationsNotice,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programOperationsNoticeStates(BuildContext context) => ProviderScope(
  overrides: [
    ..._programOverrides(),
    programOperationsStateProvider(
      _programId,
    ).overrideWithValue(AsyncData(_reviewOperationsState())),
  ],
  child: WidgetbookCatalogFrame(
    title: 'ProgramOperationsNotice',
    catalogId: 'screen.programs.arrivals',
    children: [
      const ProgramOperationsNotice(
        programId: _programId,
        pickupPointId: _pickupPointId,
      ),
      ProviderScope(
        overrides: [
          programOperationsStateProvider(_programId).overrideWithValue(
            const AsyncData(
              ProgramOperationsState(
                error: ValidationException(
                  'Damaged demo journal',
                  code: 'local-journal-quarantined',
                ),
              ),
            ),
          ),
          programOperationsOutboxProvider.overrideWithValue(
            ProgramOperationsOutbox(
              createProgramOperationJournal(
                storage: () async => MemoryCommandJournalStorage(),
                currentAccountId: () => 'uid_greeter',
                loadLegacy: (_) async => 'damaged synthetic demo record',
              ),
              _PreviewMutator(),
            ),
          ),
        ],
        child: const ProgramOperationsNotice(
          programId: _programId,
          pickupPointId: _pickupPointId,
        ),
      ),
    ],
  ),
);

@widgetbook.UseCase(
  name: 'Review states',
  type: ProgramOperationReviewSheet,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programOperationReviewSheetStates(BuildContext context) =>
    WidgetbookUtilitySheetFrame(
      child: ProviderScope(
        overrides: [
          ..._programOverrides(),
          programOperationsStateProvider(
            _programId,
          ).overrideWithValue(AsyncData(_reviewOperationsState())),
        ],
        child: const ProgramOperationReviewSheet(
          programId: _programId,
          accountId: 'uid_greeter',
          pickupPointId: _pickupPointId,
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Preserved local work',
  type: ProgramJournalRecoverySheet,
  path: '[P1 product surfaces]/Program arrivals',
)
Widget programJournalRecoverySheetPreview(BuildContext context) =>
    WidgetbookUtilitySheetFrame(
      child: ProviderScope(
        overrides: [
          ..._programOverrides(),
          programOperationsOutboxProvider.overrideWithValue(
            ProgramOperationsOutbox(
              createProgramOperationJournal(
                storage: () async => MemoryCommandJournalStorage(),
                currentAccountId: () => 'uid_greeter',
                loadLegacy: (_) async => 'damaged synthetic demo record',
              ),
              _PreviewMutator(),
            ),
          ),
        ],
        child: const ProgramJournalRecoverySheet(accountId: 'uid_greeter'),
      ),
    );

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramStakeholderScreen,
  path: '[P1 product surfaces]/Program counts',
)
Widget programStakeholderScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramStakeholderScreen',
    contractId: 'screen.programs.counts',
    children: [
      WidgetbookPageStateCard(
        label: 'counts',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _programOverrides(),
            child: const ProgramStakeholderScreen(programId: _programId),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramFunctionCountsRow,
  path: '[P1 product surfaces]/Program counts',
)
Widget programFunctionCountsRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramFunctionCountsRow',
    catalogId: 'screen.programs.counts',
    children: [
      ProgramFunctionCountsRow(
        counts: _stakeholderCounts.functions.first,
        name: 'Sangeet',
      ),
      ProgramFunctionCountsRow(counts: _stakeholderCounts.functions.first),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramHotelOccupancyRow,
  path: '[P1 product surfaces]/Program counts',
)
Widget programHotelOccupancyRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramHotelOccupancyRow',
    catalogId: 'screen.programs.counts',
    children: [
      ProgramHotelOccupancyRow(
        occupancy: _stakeholderCounts.hotels.first,
        name: 'Taj Palace',
      ),
      ProgramHotelOccupancyRow(occupancy: _stakeholderCounts.hotels.first),
    ],
  );
}
