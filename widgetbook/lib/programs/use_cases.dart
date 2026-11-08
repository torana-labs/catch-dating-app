import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/persistence/memory_command_journal_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

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
