import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// The boards' wedding weekend: Aditi and Kabir's wedding in Udaipur, the
/// airport pickup, the Taj desk, the Sangeet door and its lead.

const staffProgramId = 'aditi-kabir';
const staffStationId = 'udr';
const staffHotelId = 'taj';
const staffSangeetId = 'sangeet';

/// Friday 11 December, 12:20 PM: the airport and hotel boards.
final staffDayNow = DateTime(2026, 12, 11, 12, 20);

/// Saturday 12 December, 8:12 PM: the door and lead boards.
final staffNightNow = DateTime(2026, 12, 12, 20, 12);

final _grantEnds = DateTime(2026, 12, 15, 23, 59);

ProgramDutyAssignment _duty(
  ProgramStaffDuty duty, {
  Set<String> stations = const {},
  Set<String> hotels = const {},
  Set<String> functions = const {},
}) => ProgramDutyAssignment(
  duty: duty,
  pickupPointIds: stations,
  hotelIds: hotels,
  functionIds: functions,
  expiresAt: _grantEnds,
);

const staffVehicles = [
  ProgramVehicleClass(
    id: 'innova',
    label: 'Innova',
    passengerCapacity: 6,
    luggageCapacity: 6,
    capabilities: {},
    sortOrder: 1,
  ),
  ProgramVehicleClass(
    id: 'tempo',
    label: 'Tempo Traveller',
    passengerCapacity: 12,
    luggageCapacity: 12,
    capabilities: {},
    sortOrder: 2,
  ),
];

ProgramFunction staffFunction(
  String id,
  String name,
  String venue,
  DateTime startsAt,
  Duration length, {
  int expected = 266,
  int checkedIn = 0,
}) => ProgramFunction(
  functionId: id,
  name: name,
  venueName: venue,
  startsAt: startsAt,
  endsAt: startsAt.add(length),
  checkInEnabled: true,
  status: ProgramFunctionStatus.scheduled,
  expectedCount: expected,
  checkedInCount: checkedIn,
);

final staffFunctions = [
  staffFunction(
    'mehendi',
    'Mehendi',
    'Garden lawn',
    DateTime(2026, 12, 12, 16),
    const Duration(hours: 3),
    expected: 240,
  ),
  staffFunction(
    staffSangeetId,
    'Sangeet',
    'Durbar hall',
    DateTime(2026, 12, 12, 19, 30),
    const Duration(hours: 3, minutes: 30),
    checkedIn: 184,
  ),
  staffFunction(
    'dinner',
    'Dinner opens',
    'Durbar lawns',
    DateTime(2026, 12, 12, 21, 15),
    const Duration(hours: 2),
  ),
  staffFunction(
    'reception',
    'Reception',
    'Durbar hall',
    DateTime(2026, 12, 14, 18),
    const Duration(hours: 4),
    expected: 312,
  ),
];

/// Pooja Nair: airport greeter and dispatcher at Udaipur airport, the Taj
/// desk, the Sangeet and Reception doors, and lead for the Sangeet.
ProgramWorkAccess staffAccess({List<ProgramFunction>? functions}) =>
    ProgramWorkAccess(
      programId: staffProgramId,
      organizerId: 'meher-shah',
      title: "Aditi and Kabir's wedding",
      kind: ProgramKind.wedding,
      timezone: 'Asia/Kolkata',
      status: ProgramStatus.active,
      actorRole: ProgramActorRole.staff,
      duties: [
        _duty(ProgramStaffDuty.airportGreeter, stations: {staffStationId}),
        _duty(ProgramStaffDuty.transportDispatcher, stations: {staffStationId}),
        _duty(ProgramStaffDuty.hotelDesk, hotels: {staffHotelId}),
        _duty(
          ProgramStaffDuty.functionCheckIn,
          functions: {staffSangeetId, 'reception'},
        ),
        _duty(ProgramStaffDuty.functionLead, functions: {staffSangeetId}),
      ],
      grantExpiresAt: _grantEnds,
      capabilities: const {},
      pickupPoints: const [
        ProgramStation(
          pickupPointId: staffStationId,
          label: 'Udaipur airport',
          kind: 'airport',
          iataCode: 'UDR',
        ),
      ],
      hotels: const [
        ProgramHotel(hotelId: staffHotelId, name: 'Taj Fateh Prakash'),
      ],
      functions: functions ?? staffFunctions,
      vehicleClasses: staffVehicles,
    );

ArrivalsRosterRow staffArrival(
  String legId,
  String party,
  int passengers, {
  TravelLegReadiness readiness = TravelLegReadiness.ready,
  TravelLegFlightStatus flightStatus = TravelLegFlightStatus.landed,
  TimingUnavailableReason? unavailable,
  String? flight,
  String? origin,
  DateTime? curbAt,
  String destination = 'Taj Fateh Prakash',
  String? destinationHotelId = staffHotelId,
  bool mine = false,
  String? claimedBy,
}) => ArrivalsRosterRow(
  legId: legId,
  guestId: 'g-$legId',
  partyId: 'p-$legId',
  guestDisplayName: party,
  partyLabel: party,
  partyGuestIds: ['g-$legId'],
  passengers: passengers,
  luggageUnits: 0,
  flightNumber: flight,
  originIata: origin,
  arrivalTerminal: null,
  flightStatus: flightStatus,
  curbAt: curbAt,
  curbSource: curbAt == null ? null : CurbSource.estimatedLanding,
  unavailableReason: unavailable,
  readiness: readiness,
  claimedByDisplay: mine ? 'Pooja Nair' : claimedBy,
  claimedByMe: mine,
  destinationHotelId: destinationHotelId,
  destinationLabel: destination,
  requiredCapabilities: const {},
  dedicatedVehicle: false,
  revision: 3,
);

ProgramArrivalsRoster staffRoster() => ProgramArrivalsRoster(
  programId: staffProgramId,
  accessExpiresAt: _grantEnds,
  pickupPointId: staffStationId,
  generatedAt: DateTime(2026, 12, 11, 11, 52),
  vehicleClasses: staffVehicles,
  rows: [
    staffArrival(
      'sharma',
      'The Sharma family',
      5,
      readiness: TravelLegReadiness.disrupted,
      flightStatus: TravelLegFlightStatus.diverted,
      unavailable: TimingUnavailableReason.diverted,
      flight: 'AI 471',
      origin: 'DEL',
    ),
    staffArrival(
      'mehra',
      'The Mehra family',
      4,
      curbAt: DateTime(2026, 12, 11, 11, 40),
      mine: true,
    ),
    staffArrival(
      'kapoor',
      'Ritu Kapoor and Neel',
      2,
      curbAt: DateTime(2026, 12, 11, 11, 46),
    ),
    staffArrival(
      'rao',
      'Ananya Rao',
      1,
      curbAt: DateTime(2026, 12, 11, 11, 50),
      destination: 'Leela Palace',
      destinationHotelId: 'leela',
    ),
    staffArrival(
      'delhi',
      'The Bansals',
      3,
      readiness: TravelLegReadiness.expected,
      flight: '6E 2134',
      origin: 'DEL',
      curbAt: DateTime(2026, 12, 11, 12, 5),
      destination: 'Leela Palace',
      destinationHotelId: 'leela',
    ),
    staffArrival(
      'mumbai',
      'Ishita Rao',
      1,
      readiness: TravelLegReadiness.expected,
      flightStatus: TravelLegFlightStatus.enroute,
      flight: 'UK 615',
      origin: 'BOM',
      curbAt: DateTime(2026, 12, 11, 12, 40),
    ),
    staffArrival(
      'blr',
      'The Iyer family',
      3,
      readiness: TravelLegReadiness.expected,
      flightStatus: TravelLegFlightStatus.delayed,
      flight: 'AI 469',
      origin: 'BLR',
      curbAt: DateTime(2026, 12, 11, 13, 15),
    ),
  ],
);

TransportGroupSuggestion _group(
  List<String> legs,
  String vehicle,
  String label,
  String destination,
  String? hotelId,
  int passengers,
  TransportGroupReadiness readiness,
) => TransportGroupSuggestion(
  legIds: legs,
  partyIds: [for (final leg in legs) 'p-$leg'],
  destinationHotelId: hotelId,
  destinationLabel: destination,
  readiness: readiness,
  vehicleClassId: vehicle,
  vehicleClassLabel: label,
  passengers: passengers,
  luggageUnits: passengers,
  earliestCurbAt: DateTime(2026, 12, 11, 11, 40),
  latestCurbAt: DateTime(2026, 12, 11, 12, 5),
  dispatchBy: DateTime(2026, 12, 11, 12, 30),
  waitOverdue: false,
);

ProgramTransportPlan staffPlan() => ProgramTransportPlan(
  programId: staffProgramId,
  accessExpiresAt: _grantEnds,
  pickupPointId: staffStationId,
  generatedAt: DateTime(2026, 12, 11, 11, 52),
  groups: [
    _group(
      ['mehra', 'kapoor'],
      'innova',
      'Innova',
      'Taj Fateh Prakash',
      staffHotelId,
      6,
      TransportGroupReadiness.ready,
    ),
    _group(
      ['rao', 'delhi'],
      'tempo',
      'Tempo Traveller',
      'Leela Palace',
      'leela',
      4,
      TransportGroupReadiness.expected,
    ),
  ],
  unassigned: const [],
);

const staffVendors = [
  ProgramVendorOption(
    vendorId: 'shree',
    name: 'Shree Travels',
    active: true,
    boundToProgram: true,
  ),
  ProgramVendorOption(
    vendorId: 'royal',
    name: 'Royal Cabs',
    active: true,
    boundToProgram: true,
  ),
];

ProgramTripSummary _trip(
  String id,
  String vehicle,
  String plate,
  int eta,
  List<String> names,
) => ProgramTripSummary(
  tripId: id,
  pickupPointId: staffStationId,
  destinationHotelId: staffHotelId,
  destinationLabel: 'Taj Fateh Prakash',
  vehicleClassId: 'innova',
  vehicleClassLabel: vehicle,
  manifestSource: TransportManifestSource.dispatchSnapshot,
  plateDisplay: plate,
  vendorId: 'shree',
  vendorName: 'Shree Travels',
  status: TransportTripStatus.enRoute,
  passengerCount: names.length,
  departedAt: DateTime(2026, 12, 11, 12),
  arrivedAt: null,
  estimatedArriveAt: staffDayNow.add(Duration(minutes: eta)),
  voidReason: null,
  guestNames: names,
  revision: 1,
);

ProgramHotelInbound staffInbound() => ProgramHotelInbound(
  programId: staffProgramId,
  accessExpiresAt: _grantEnds,
  hotelId: staffHotelId,
  hotelName: 'Taj Fateh Prakash',
  generatedAt: staffDayNow,
  trips: [
    _trip('t1', 'Innova', 'RJ 27 TA 4471', 25, [
      'Neha Mehra',
      'Rohan Mehra',
      'Ritu Kapoor',
    ]),
    _trip('t2', 'Dzire', 'RJ 27 CB 0912', 8, ['Vikram Sethi']),
  ],
  expectedLegs: [
    HotelExpectedLeg(
      legId: 'blr',
      guestDisplayName: 'Kavya Iyer',
      partyLabel: 'The Iyer family',
      passengers: 3,
      curbAt: DateTime(2026, 12, 11, 13, 15),
      readiness: TravelLegReadiness.expected,
    ),
    const HotelExpectedLeg(
      legId: 'sharma',
      guestDisplayName: 'Anil Sharma',
      partyLabel: 'The Sharma family',
      passengers: 5,
      curbAt: null,
      readiness: TravelLegReadiness.disrupted,
    ),
  ],
  nextTripCursor: null,
  nextExpectedCursor: null,
);

ProgramStay _stay(
  String id,
  String name,
  String room, {
  ProgramStayStatus status = ProgramStayStatus.confirmed,
  bool atDesk = false,
}) => ProgramStay(
  stayId: id,
  guestId: 'g-$id',
  guestDisplayName: name,
  roomBlockId: 'block',
  roomLabel: room,
  status: status,
  startsAt: null,
  endsAt: null,
  roomReadyAt: atDesk ? staffDayNow : null,
  hotelArrivedAt: atDesk ? staffDayNow : null,
  revision: 2,
);

ProgramHotelRooms staffRooms() => ProgramHotelRooms(
  programId: staffProgramId,
  hotelId: staffHotelId,
  hotelName: 'Taj Fateh Prakash',
  accessExpiresAt: _grantEnds,
  generatedAt: staffDayNow,
  roomBlocks: [
    ProgramRoomBlock(
      roomBlockId: 'block',
      label: 'Wedding block',
      roomType: 'Deluxe',
      totalRooms: 62,
      assignedCount: 53,
      remainingRooms: 9,
      heldForGroupIds: const [],
      startsAt: DateTime(2026, 12, 10),
      endsAt: DateTime(2026, 12, 15),
    ),
  ],
  stays: [
    _stay('neha', 'Neha Mehra', '214'),
    _stay('rohan', 'Rohan Mehra', '216'),
    _stay('ritu', 'Ritu Kapoor', '118'),
    _stay('vikram', 'Vikram Sethi', '302'),
    _stay('kavya', 'Kavya Iyer', '230'),
    _stay('bansal', 'Meera Bansal', '220', atDesk: true),
    _stay('pillai', 'Meera Pillai', '105', atDesk: true),
    for (var index = 0; index < 38; index++)
      _stay(
        'in-$index',
        'Guest $index',
        '${300 + index}',
        status: ProgramStayStatus.checkedIn,
      ),
  ],
  unplacedGuests: const [],
);

ProgramDoorGuest _guest(
  String id,
  String name,
  String household,
  int party, {
  ProgramFunctionAttendanceStatus status =
      ProgramFunctionAttendanceStatus.expected,
  bool invited = true,
  String? note,
}) => ProgramDoorGuest(
  guestId: id,
  displayName: name,
  invited: invited,
  rsvpStatus: ProgramRsvpStatus.attending,
  attendanceStatus: status,
  partySize: party,
  householdLabel: household,
  responseNote: note,
);

ProgramDoorView staffDoorView() => ProgramDoorView(
  programId: staffProgramId,
  functionId: staffSangeetId,
  serverTime: staffNightNow,
  accessExpiresAt: _grantEnds,
  function: ProgramDoorFunction(
    name: 'Sangeet',
    invitationMode: ProgramFunctionInvitationMode.selectedGuests,
    checkInEnabled: true,
    status: ProgramFunctionStatus.scheduled,
    startsAt: DateTime(2026, 12, 12, 19, 30),
    endsAt: DateTime(2026, 12, 12, 23),
    venueName: 'Durbar hall',
    expectedCount: 266,
    checkedInCount: 184,
  ),
  counts: const ProgramDoorCounts(
    listedCount: 113,
    expectedHeads: 266,
    checkedInHeads: 184,
    checkedInParties: 69,
    noShowCount: 0,
    walkInCount: 3,
  ),
  guests: [
    _guest('mehra', 'The Mehra family', "Aditi's side", 4, note: 'Kiara is 8'),
    _guest('shah', 'Ritu and Arvind Shah', "Aditi's side", 2),
    _guest('rao', 'Ananya Rao', 'Friends', 1, note: 'with Ishita Rao'),
    _guest(
      'bhatia',
      'The Bhatias',
      "Kabir's side",
      4,
      note: 'one uses a wheelchair',
    ),
    _guest(
      'kapoor',
      'Ritu Kapoor and Neel',
      "Kabir's side",
      2,
      status: ProgramFunctionAttendanceStatus.checkedIn,
    ),
    _guest(
      'walk',
      'Sameer Gill',
      'Walk-in',
      1,
      invited: false,
      status: ProgramFunctionAttendanceStatus.checkedIn,
    ),
  ],
  journal: const [],
);

ProgramStaffAttention staffAttention() => ProgramStaffAttention(
  programId: staffProgramId,
  truncated: false,
  items: [
    ProgramStaffAttentionItem(
      itemId: 'a1',
      runId: 'r1',
      momentId: 'm1',
      duty: 'functionCheckIn',
      severity: 'urgent',
      title: "The Sharma family's flight went to Jaipur",
      createdAt: DateTime(2026, 12, 12, 19, 58),
    ),
    ProgramStaffAttentionItem(
      itemId: 'a2',
      runId: 'r1',
      momentId: 'm2',
      duty: 'functionLead',
      severity: 'warning',
      title: 'The Iyers reach the Taj after the Sangeet starts',
      createdAt: DateTime(2026, 12, 12, 19, 40),
    ),
    ProgramStaffAttentionItem(
      itemId: 'a3',
      runId: 'r1',
      momentId: 'm3',
      duty: 'transportDispatcher',
      severity: 'info',
      title: 'A car has waited 20 minutes at the airport',
      createdAt: DateTime(2026, 12, 12, 19, 10),
    ),
  ],
);

HostWorkAssignments staffAssignments() => HostWorkAssignments(
  shellEntry: HostWorkShellEntry.workShell,
  assignments: [
    HostWorkAssignment(
      kind: HostWorkScopeKind.program,
      scopeId: staffProgramId,
      organizerId: 'meher-shah',
      title: "Aditi and Kabir's wedding",
      subtitle: '12 to 14 December · Udaipur',
      organizerName: 'Meher Shah Weddings',
      duties: const [
        HostWorkGrantedDuty(
          duty: HostWorkDuty.airportGreeter,
          pickupPointIds: {staffStationId},
          hotelIds: {},
          functionIds: {},
        ),
        HostWorkGrantedDuty(
          duty: HostWorkDuty.functionCheckIn,
          pickupPointIds: {},
          hotelIds: {},
          functionIds: {staffSangeetId},
        ),
      ],
      destinations: const [],
      overflowDestinations: const [],
      shellMode: HostWorkShellMode.task,
      grantExpiresAt: _grantEnds,
    ),
    const HostWorkAssignment(
      kind: HostWorkScopeKind.event,
      scopeId: 'trivia',
      organizerId: 'night-shift',
      title: 'Tuesday Trivia Night',
      subtitle: 'Harbour Room · Tue 8 PM',
      organizerName: 'Night Shift Socials',
      duties: [
        HostWorkGrantedDuty(
          duty: HostWorkDuty.eventLead,
          pickupPointIds: {},
          hotelIds: {},
          functionIds: {},
        ),
      ],
      destinations: [],
      overflowDestinations: [],
      shellMode: HostWorkShellMode.task,
      grantExpiresAt: null,
    ),
  ],
);
