import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_state.dart';

/// The boards' wedding: Aditi and Kabir in Udaipur, 12 to 14 December,
/// seen on 28 October.
const plannerProgramId = 'aditi-kabir';
const plannerOrganizerId = 'meher-shah';
final plannerNow = DateTime(2026, 10, 28, 10);

final plannerProgram = OrganizerProgramSettings(
  programId: plannerProgramId,
  organizerId: plannerOrganizerId,
  kind: ProgramKind.wedding,
  title: 'Aditi and Kabir’s wedding',
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  startsAt: DateTime(2026, 12, 12),
  endsAt: DateTime(2026, 12, 14, 23),
  capabilities: const [],
  revision: 4,
);

OrganizerFunctionDetail _function(
  String id,
  String name,
  DateTime start,
  int hours,
  String venue, {
  bool selected = false,
}) => OrganizerFunctionDetail(
  functionId: id,
  name: name,
  startsAt: start,
  endsAt: start.add(Duration(hours: hours)),
  venueName: venue,
  status: ProgramFunctionStatus.scheduled,
  invitationMode: selected ? 'selectedGuests' : 'allGuests',
  checkInEnabled: true,
  revision: 2,
  dressCode: name == 'Sangeet'
      ? 'Indo-western, something you can dance in'
      : null,
  instructions: name == 'Sangeet' ? 'Enter by the lake gate' : null,
);

final plannerFunctions = [
  _function(
    'mehendi',
    'Mehendi',
    DateTime(2026, 12, 12, 16),
    3,
    'Lawns, Taj Fateh Prakash',
  ),
  _function(
    'sangeet',
    'Sangeet',
    DateTime(2026, 12, 12, 20),
    3,
    'Durbar hall, Taj Fateh Prakash',
  ),
  _function(
    'haldi',
    'Haldi',
    DateTime(2026, 12, 13, 10),
    2,
    'Pool deck, Leela Palace',
    selected: true,
  ),
  _function(
    'wedding',
    'Wedding',
    DateTime(2026, 12, 13, 18),
    4,
    'Zenana Mahal',
  ),
  _function(
    'reception',
    'Reception',
    DateTime(2026, 12, 14, 19),
    4,
    'Leela Palace ballroom',
  ),
];

const plannerHotels = [
  ProgramHotel(
    hotelId: 'taj',
    name: 'Taj Fateh Prakash',
    address: 'City Palace Complex, Udaipur',
    revision: 1,
  ),
  ProgramHotel(
    hotelId: 'leela',
    name: 'Leela Palace',
    address: 'Lake Pichola, Udaipur',
    revision: 1,
  ),
];

const plannerPickups = [
  ProgramStation(
    pickupPointId: 'udr',
    label: 'Udaipur airport',
    kind: 'airport',
    iataCode: 'UDR',
    meetingZone: 'Arrivals gate 2',
    revision: 1,
  ),
];

final plannerDetail = OrganizerProgramDetail(
  program: plannerProgram,
  functions: plannerFunctions,
  pickupPoints: plannerPickups,
  hotels: plannerHotels,
  counts: const {
    'guests': 312,
    'households': 118,
    'inboundLegs': 196,
    'activeStaff': 24,
  },
);

const _groups = [
  ProgramGuestGroupRow(
    groupId: 'aditi',
    label: 'Aditi’s side',
    dimension: 'side',
    memberCount: 6,
    revision: 1,
    sortOrder: 0,
  ),
  ProgramGuestGroupRow(
    groupId: 'kabir',
    label: 'Kabir’s side',
    dimension: 'side',
    memberCount: 6,
    revision: 1,
    sortOrder: 1,
  ),
  ProgramGuestGroupRow(
    groupId: 'college',
    label: 'College friends',
    dimension: 'group',
    memberCount: 3,
    revision: 1,
  ),
];

/// (household, members as (id, name, phone, groups), replies per
/// function in schedule order: a = attending, m = maybe, d = declined,
/// p = no reply, - = not invited).
const _households = [
  (
    'mehra',
    'The Mehra family',
    [
      ('neha', 'Neha Mehra', '+919876500001', ['aditi', 'college']),
      ('kamla', 'Kamla Mehra', null, ['aditi']),
      ('raj', 'Raj Mehra', null, ['aditi']),
      ('isha', 'Isha Mehra', null, ['aditi']),
    ],
    ['aaaa', 'aaaa', '----', 'aaaa', 'aaad'],
  ),
  (
    'kapoor',
    'The Kapoor family',
    [
      ('vikram', 'Vikram Kapoor', '+919876500002', ['kabir']),
      ('anita', 'Anita Kapoor', null, ['kabir']),
      ('dev', 'Dev Kapoor', null, ['kabir']),
    ],
    ['aap', 'aaa', 'aaa', 'aaa', 'aaa'],
  ),
  (
    'shah',
    'The Shah family',
    [
      ('priya', 'Priya Shah', '+919876500003', ['aditi']),
      ('rohan', 'Rohan Shah', null, ['aditi']),
    ],
    ['mm', 'mm', '--', 'aa', 'aa'],
  ),
  (
    'iyer',
    'Meera Iyer',
    [
      ('meera', 'Meera Iyer', '+919876500004', ['college']),
    ],
    ['p', 'p', '-', 'p', 'p'],
  ),
  (
    'singh',
    'The Singh family',
    [
      ('arjun', 'Arjun Singh', '+919876500005', ['kabir']),
      ('tara', 'Tara Singh', null, ['kabir']),
    ],
    ['aa', 'aa', 'aa', 'aa', 'dd'],
  ),
  (
    'khan',
    'The Khan family',
    [
      ('imran', 'Imran Khan', '+919876500006', ['kabir']),
      ('sana', 'Sana Khan', null, ['kabir']),
    ],
    ['pp', 'pp', '--', 'pp', 'pp'],
  ),
];

final plannerGuests = ProgramGuestListPage(
  programId: plannerProgramId,
  groups: _groups,
  households: [
    for (final (id, label, members, _) in _households)
      ProgramHouseholdRow(
        householdId: id,
        label: label,
        memberGuestIds: [for (final m in members) m.$1],
        revision: 1,
      ),
  ],
  guests: [
    for (final (householdId, _, members, _) in _households)
      for (final (id, name, phone, groups) in members)
        ProgramGuestRow(
          guestId: id,
          displayName: name,
          householdId: householdId,
          phoneE164: phone,
          groupIds: groups,
          invitationStatus: 'invited',
          rsvpStatus: 'pending',
          revision: 1,
        ),
  ],
  functionGuests: [
    for (final (_, _, members, replies) in _households)
      for (final (fIndex, function) in plannerFunctions.indexed)
        for (final (mIndex, member) in members.indexed)
          ProgramFunctionGuestRow(
            guestId: member.$1,
            functionId: function.functionId,
            invited: replies[fIndex][mIndex] != '-',
            rsvpStatus: switch (replies[fIndex][mIndex]) {
              'a' => 'attending',
              'm' => 'maybe',
              'd' => 'declined',
              _ => 'pending',
            },
            attendanceStatus: 'unknown',
          ),
  ],
);

final plannerState = HostProgrammeState(
  status: HostProgrammeStatus.ready,
  detail: plannerDetail,
  guests: plannerGuests,
);

ArrivalsRosterRow _leg(
  String id,
  String party,
  int people,
  String? flight,
  DateTime? curb, {
  TimingUnavailableReason? reason,
  TravelLegReadiness readiness = TravelLegReadiness.expected,
}) => ArrivalsRosterRow(
  legId: id,
  guestId: id,
  partyId: id,
  guestDisplayName: party,
  partyLabel: party,
  partyGuestIds: [id],
  passengers: people,
  luggageUnits: people,
  flightNumber: flight,
  originIata: 'DEL',
  arrivalTerminal: '1',
  flightStatus: TravelLegFlightStatus.scheduled,
  curbAt: curb,
  curbSource: curb == null ? null : CurbSource.scheduledLanding,
  unavailableReason: reason,
  readiness: readiness,
  claimedByDisplay: null,
  claimedByMe: false,
  destinationHotelId: 'taj',
  destinationLabel: 'Taj Fateh Prakash',
  requiredCapabilities: const {},
  dedicatedVehicle: false,
  revision: 1,
);

final plannerTravel = HostProgrammeTravelState(
  programme: plannerState,
  roster: ProgramArrivalsRoster(
    programId: plannerProgramId,
    accessExpiresAt: null,
    pickupPointId: null,
    generatedAt: plannerNow,
    vehicleClasses: const [],
    rows: [
      _leg(
        'l1',
        'The Mehra family',
        4,
        '6E 2134',
        DateTime(2026, 12, 11, 9, 5),
      ),
      _leg(
        'l2',
        'The Kapoor family',
        3,
        'AI 471',
        DateTime(2026, 12, 11, 11, 40),
      ),
      _leg(
        'l3',
        'The Sharma family',
        5,
        'AI 473',
        null,
        reason: TimingUnavailableReason.diverted,
        readiness: TravelLegReadiness.disrupted,
      ),
      _leg(
        'l4',
        'The Singh family',
        2,
        'UK 611',
        DateTime(2026, 12, 11, 13, 10),
      ),
      _leg(
        'l5',
        'Meera Iyer',
        1,
        null,
        null,
        reason: TimingUnavailableReason.missingTiming,
      ),
      _leg(
        'l6',
        'The Shah family',
        2,
        '6E 5011',
        DateTime(2026, 12, 10, 18, 20),
      ),
      _leg(
        'l7',
        'The Khan family',
        2,
        'SG 2381',
        DateTime(2026, 12, 12, 8, 45),
      ),
    ],
  ),
  plan: ProgramTransportPlan(
    programId: plannerProgramId,
    accessExpiresAt: null,
    pickupPointId: null,
    generatedAt: plannerNow,
    unassigned: const [],
    groups: [
      TransportGroupSuggestion(
        legIds: const ['l1', 'l2'],
        partyIds: const ['l1', 'l2'],
        destinationHotelId: 'taj',
        destinationLabel: 'Taj Fateh Prakash',
        readiness: TransportGroupReadiness.expected,
        vehicleClassId: 'innova',
        vehicleClassLabel: 'Innova · 6 seats',
        passengers: 6,
        luggageUnits: 6,
        earliestCurbAt: DateTime(2026, 12, 11, 9, 5),
        latestCurbAt: DateTime(2026, 12, 11, 11, 40),
        dispatchBy: null,
        waitOverdue: false,
      ),
    ],
  ),
  trips: plannerTrips,
);

ProgramTripSummary _trip(
  String id,
  String vendor,
  String plate,
  int people,
  TransportTripStatus status,
  DateTime left,
) => ProgramTripSummary(
  tripId: id,
  pickupPointId: 'udr',
  destinationHotelId: 'taj',
  destinationLabel: 'Taj Fateh Prakash',
  vehicleClassId: 'innova',
  vehicleClassLabel: 'Innova',
  manifestSource: TransportManifestSource.dispatchSnapshot,
  plateDisplay: plate,
  vendorId: vendor,
  vendorName: vendor,
  status: status,
  passengerCount: people,
  departedAt: left,
  arrivedAt: status == TransportTripStatus.arrived
      ? left.add(const Duration(minutes: 30))
      : null,
  estimatedArriveAt: left.add(const Duration(minutes: 30)),
  voidReason: status == TransportTripStatus.voided ? 'Booked twice' : null,
  guestNames: const ['Neha Mehra', 'Kamla Mehra'],
  revision: 1,
);

final plannerTrips = ProgramTripList(
  programId: plannerProgramId,
  accessExpiresAt: null,
  nextCursor: null,
  trips: [
    _trip(
      'T-041',
      'Shree Travels',
      'RJ 27 TA 4471',
      6,
      TransportTripStatus.arrived,
      DateTime(2026, 12, 11, 9, 30),
    ),
    _trip(
      'T-042',
      'Shree Travels',
      'RJ 27 TB 1180',
      5,
      TransportTripStatus.arrived,
      DateTime(2026, 12, 11, 10, 10),
    ),
    _trip(
      'T-043',
      'Royal Cabs',
      'RJ 27 CA 9021',
      4,
      TransportTripStatus.voided,
      DateTime(2026, 12, 11, 10, 40),
    ),
    _trip(
      'T-044',
      'Taj transfers',
      'RJ 27 PA 0007',
      6,
      TransportTripStatus.enRoute,
      DateTime(2026, 12, 11, 11, 55),
    ),
    _trip(
      'T-045',
      'Shree Travels',
      'RJ 27 TA 4471',
      3,
      TransportTripStatus.enRoute,
      DateTime(2026, 10, 28, 9),
    ),
  ],
);

final plannerTripsReport = HostProgrammeReport<ProgramTripList>(
  programme: plannerState,
  value: plannerTrips,
);

ProgramStay _stay(String id, String name, String block, String room) =>
    ProgramStay(
      stayId: 's-$id',
      guestId: id,
      guestDisplayName: name,
      roomBlockId: block,
      roomLabel: room,
      status: ProgramStayStatus.confirmed,
      startsAt: DateTime(2026, 12, 11),
      endsAt: DateTime(2026, 12, 15),
      roomReadyAt: null,
      hotelArrivedAt: null,
      revision: 1,
    );

final plannerRooms = HostProgrammeRoomsState(
  programme: plannerState,
  hotelId: 'taj',
  rooms: ProgramHotelRooms(
    programId: plannerProgramId,
    hotelId: 'taj',
    hotelName: 'Taj Fateh Prakash',
    accessExpiresAt: null,
    generatedAt: plannerNow,
    roomBlocks: [
      ProgramRoomBlock(
        roomBlockId: 'ground',
        label: 'Ground floor · step-free',
        roomType: 'Deluxe',
        totalRooms: 6,
        assignedCount: 4,
        remainingRooms: 2,
        heldForGroupIds: const [],
        startsAt: DateTime(2026, 12, 11),
        endsAt: DateTime(2026, 12, 15),
      ),
      ProgramRoomBlock(
        roomBlockId: 'second',
        label: 'Second floor',
        roomType: 'Lake view',
        totalRooms: 4,
        assignedCount: 3,
        remainingRooms: 1,
        heldForGroupIds: const [],
        startsAt: DateTime(2026, 12, 11),
        endsAt: DateTime(2026, 12, 15),
      ),
    ],
    stays: [
      _stay('kamla', 'Kamla Mehra', 'ground', '104'),
      _stay('raj', 'Raj Mehra', 'ground', '105'),
      _stay('neha', 'Neha Mehra', 'ground', '106'),
      _stay('isha', 'Isha Mehra', 'ground', '107'),
      _stay('vikram', 'Vikram Kapoor', 'second', '214'),
      _stay('anita', 'Anita Kapoor', 'second', '215'),
      _stay('dev', 'Dev Kapoor', 'second', '216'),
    ],
    unplacedGuests: const [
      ProgramUnplacedGuest(
        guestId: 'priya',
        displayName: 'Priya Shah',
        suggestedRoomBlockId: 'ground',
      ),
      ProgramUnplacedGuest(
        guestId: 'rohan',
        displayName: 'Rohan Shah',
        suggestedRoomBlockId: 'ground',
      ),
      ProgramUnplacedGuest(
        guestId: 'meera',
        displayName: 'Meera Iyer',
        suggestedRoomBlockId: null,
      ),
    ],
  ),
);
