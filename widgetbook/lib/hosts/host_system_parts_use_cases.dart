import 'package:catch_dating_app/contexts/audience/parts/host_event_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/parts/host_event_close_out_row.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_court_row.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/host_events_programme_tile.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_dispatch_car_card.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_hotel_trip_card.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_tab_bar.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_operations_notice_list.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';
import '../support/contract_preview.dart';
import '../support/widgetbook_harness.dart';

// The host system's renamed programme, formats and staff widgets and the
// event rows that moved to the contexts owning their data. Each case shows
// the widget on the system with the boards' wedding and trivia night.

const _programmesPath = '[P1 product surfaces]/Host/Programmes';
const _staffPath = '[P1 product surfaces]/Host/Programmes/Staff';
const _eventsPath = '[P1 product surfaces]/Host/Events/Rows';
const _formatsPath = '[P1 product surfaces]/Host/Live/Formats';

final _now = DateTime(2026, 12, 11, 12, 20);

final _program = OrganizerProgramSettings(
  programId: 'aditi-kabir',
  organizerId: 'meher-shah',
  kind: ProgramKind.wedding,
  title: 'Aditi and Kabir’s wedding',
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  startsAt: DateTime(2026, 12, 12),
  endsAt: DateTime(2026, 12, 14, 23),
  capabilities: const [],
  revision: 4,
);

final _programmeState = HostProgrammeState(
  status: HostProgrammeStatus.ready,
  detail: OrganizerProgramDetail(
    program: _program,
    functions: [
      OrganizerFunctionDetail(
        functionId: 'sangeet',
        name: 'Sangeet',
        startsAt: DateTime(2026, 12, 12, 20),
        endsAt: DateTime(2026, 12, 12, 23),
        venueName: 'Durbar hall, Taj Fateh Prakash',
        status: ProgramFunctionStatus.scheduled,
        invitationMode: 'allGuests',
        checkInEnabled: true,
        revision: 2,
      ),
    ],
    pickupPoints: const [],
    hotels: const [],
    counts: const {
      'guests': 312,
      'households': 118,
      'inboundLegs': 196,
      'activeStaff': 24,
    },
  ),
);

@widgetbook.UseCase(
  name: 'Players on a court',
  type: FormatsPlayersRow,
  path: _formatsPath,
)
Widget formatsPlayersRowUseCase(BuildContext context) => const CatchStack(
  children: [
    FormatsPlayersRow(players: ['Aanya Rao', 'Kabir Shah']),
    FormatsPlayersRow(
      players: ['Meher', 'Ishaan', 'Zoya', 'Neel', 'Ritu', 'Dev'],
    ),
  ],
);

@widgetbook.UseCase(
  name: 'A car ready to send',
  type: StaffDispatchCarCard,
  path: _staffPath,
)
Widget staffDispatchCarCardUseCase(BuildContext context) => CatchStack(
  children: [
    StaffDispatchCarCard(
      group: TransportGroupSuggestion(
        legIds: const ['mehra', 'kapoor'],
        partyIds: const ['p-mehra', 'p-kapoor'],
        destinationHotelId: 'taj',
        destinationLabel: 'Taj Fateh Prakash',
        readiness: TransportGroupReadiness.ready,
        vehicleClassId: 'innova',
        vehicleClassLabel: 'Innova',
        passengers: 6,
        luggageUnits: 6,
        earliestCurbAt: DateTime(2026, 12, 11, 11, 40),
        latestCurbAt: DateTime(2026, 12, 11, 12, 5),
        dispatchBy: DateTime(2026, 12, 11, 12, 30),
        waitOverdue: false,
      ),
      parties: const [
        StaffDispatchParty(
          title: 'The Mehra family, 3 people',
          passengers: 3,
          ready: true,
        ),
        StaffDispatchParty(
          title: 'The Kapoor family, 3 people',
          passengers: 3,
          ready: false,
        ),
      ],
      seats: 6,
      onDispatch: widgetbookNoop,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'A car on the way to the hotel',
  type: StaffHotelTripCard,
  path: _staffPath,
)
Widget staffHotelTripCardUseCase(BuildContext context) => CatchStack(
  children: [
    StaffHotelTripCard(
      trip: ProgramTripSummary(
        tripId: 't1',
        pickupPointId: 'udr',
        destinationHotelId: 'taj',
        destinationLabel: 'Taj Fateh Prakash',
        vehicleClassId: 'innova',
        vehicleClassLabel: 'Innova',
        manifestSource: TransportManifestSource.dispatchSnapshot,
        plateDisplay: 'RJ 27 TA 4471',
        vendorId: 'shree',
        vendorName: 'Shree Travels',
        status: TransportTripStatus.enRoute,
        passengerCount: 3,
        departedAt: DateTime(2026, 12, 11, 12),
        arrivedAt: null,
        estimatedArriveAt: _now.add(const Duration(minutes: 25)),
        voidReason: null,
        guestNames: const ['Neha Mehra', 'Rohan Mehra', 'Ritu Kapoor'],
        revision: 1,
      ),
      now: _now,
      rooms: const {'Neha Mehra': '214'},
      onArrived: widgetbookNoop,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Reply key',
  type: ProgrammeReplyKeyRow,
  path: _programmesPath,
)
Widget programmeReplyKeyRowUseCase(BuildContext context) =>
    const CatchStack(children: [ProgrammeReplyKeyRow()]);

@widgetbook.UseCase(
  name: 'Function names over the grid',
  type: ProgrammeGridHeader,
  path: _programmesPath,
)
Widget programmeGridHeaderUseCase(BuildContext context) => const CatchStack(
  children: [
    ProgrammeGridHeader(
      names: ['Mehendi', 'Sangeet', 'Haldi', 'Wedding', 'Reception'],
    ),
  ],
);

@widgetbook.UseCase(
  name: 'The wedding at a glance',
  type: HostProgrammeSpotlightHeader,
  path: _programmesPath,
)
Widget hostProgrammeSpotlightHeaderUseCase(BuildContext context) => CatchStack(
  children: [HostProgrammeSpotlightHeader(state: _programmeState)],
);

@widgetbook.UseCase(
  name: 'All guests and no reply',
  type: HostProgrammeGuestFilterTabBar,
  path: _programmesPath,
)
Widget hostProgrammeGuestFilterTabBarUseCase(BuildContext context) =>
    CatchStack(
      children: [
        HostProgrammeGuestFilterTabBar(
          state: _programmeState,
          filter: HostProgrammeGuestFilter.all,
          onFilter: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Loading and error',
  type: HostProgrammeStateBody,
  path: _programmesPath,
)
Widget hostProgrammeStateBodyUseCase(BuildContext context) => CatchStack(
  children: [
    for (final status in [
      HostProgrammeStatus.loading,
      HostProgrammeStatus.error,
    ])
      WidgetbookViewportFrame.constrainedDevice(
        size: const Size(
          WidgetbookPreviewLayout.phoneChromeWidth,
          WidgetbookPreviewLayout.compactPreviewExtent,
        ),
        child: HostProgrammeStateBody(status: status, onRetry: widgetbookNoop),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Schedule, guests, travel and team',
  type: HostProgrammeTabBar,
  path: _programmesPath,
)
Widget hostProgrammeTabBarUseCase(BuildContext context) => CatchStack(
  children: [
    HostProgrammeTabBar(selected: HostProgrammeView.schedule, onView: (_) {}),
    HostProgrammeTabBar(
      selected: HostProgrammeView.travel,
      onView: (_) {},
      fill: false,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Saved copy and a failed sync',
  type: StaffOperationsNoticeList,
  path: _staffPath,
)
Widget staffOperationsNoticeListUseCase(BuildContext context) => CatchStack(
  children: [
    StaffOperationsNoticeList(
      outbox: const ProgramOperationOutboxSummary([]),
      savedAt: _now,
      busy: false,
      onSync: widgetbookNoop,
      onReview: widgetbookNoop,
    ),
    StaffOperationsNoticeList(
      outbox: const ProgramOperationOutboxSummary([]),
      errorMessage: 'The last change did not reach the server.',
      busy: false,
      onSync: widgetbookNoop,
      onReview: widgetbookNoop,
    ),
  ],
);

EventAttendee _attendee(String id, String name) => EventAttendee(
  id: id,
  eventId: 'tonight',
  organizerId: 'lantern-lane',
  displayName: name,
  searchName: name.toLowerCase(),
  source: EventAttendeeSource.catchBooking,
  status: EventAttendeeStatus.registered,
  createdAt: DateTime(2026, 10, 27, 19, 30),
  updatedAt: DateTime(2026, 10, 27, 19, 30),
);

@widgetbook.UseCase(
  name: 'Unmarked and marked',
  type: HostEventCloseOutRow,
  path: _eventsPath,
)
Widget hostEventCloseOutRowUseCase(BuildContext context) => CatchStack(
  children: [
    HostEventCloseOutRow(
      attendee: _attendee('a-ishaan', 'Ishaan Bose'),
      came: null,
      onCame: widgetbookNoop,
      onNoShow: widgetbookNoop,
    ),
    HostEventCloseOutRow(
      attendee: _attendee('a-neel', 'Neel Desai'),
      came: false,
      onCame: widgetbookNoop,
      onNoShow: widgetbookNoop,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'With a note and an action',
  type: HostEventGuestRow,
  path: _eventsPath,
)
Widget hostEventGuestRowUseCase(BuildContext context) => CatchStack(
  children: [
    const HostEventGuestRow(name: 'Aanya Sharma', note: 'paid ₹998'),
    HostEventGuestRow(
      name: 'Zoya Merchant',
      note: 'asked to join',
      action: const CatchIndexRowAction(
        label: 'Let in',
        variant: CatchIndexRowActionVariant.primary,
        onPressed: widgetbookNoop,
      ),
      onTap: widgetbookNoop,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'A programme with its functions',
  type: HostEventsProgrammeTile,
  path: _eventsPath,
)
Widget hostEventsProgrammeTileUseCase(BuildContext context) => CatchStack(
  children: [
    HostEventsProgrammeTile(
      programme: OrganizerProgramListRow(
        programId: 'aditi-kabir',
        title: 'Aditi and Kabir’s wedding',
        kind: 'wedding',
        status: 'active',
        timezone: 'Asia/Kolkata',
        revision: 4,
        startsAt: DateTime(2026, 12, 12),
        endsAt: DateTime(2026, 12, 14, 23),
        functionCount: 5,
      ),
      onTap: widgetbookNoop,
    ),
  ],
);
