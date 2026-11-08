import 'package:catch_dating_app/contexts/programmes/domain/program_departures_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';

import 'staff_fixtures.dart';

Map<String, Object?> _alert(
  String id,
  String source,
  String severity,
  String title,
  DateTime at, {
  String state = 'open',
  bool mine = false,
  String? assignee,
  int revision = 0,
}) => {
  'alertId': id,
  'source': source,
  'severity': severity,
  'title': title,
  'subjectId': null,
  'createdAtMillis': at.millisecondsSinceEpoch,
  'state': state,
  'assignedToMe': mine,
  'assigneeName': assignee,
  'revision': revision,
};

Map<String, Object?> _function(
  String id,
  String name,
  DateTime start,
  DateTime end,
  String phase, {
  int? expected,
  int? checkedIn,
}) => {
  'functionId': id,
  'name': name,
  'venueName': 'Durbar hall, Taj Fateh Prakash',
  'startsAtMillis': start.millisecondsSinceEpoch,
  'endsAtMillis': end.millisecondsSinceEpoch,
  'expectedCount': expected,
  'checkedInCount': checkedIn,
  'phase': phase,
};

/// The boards' Saturday night: the Sangeet on, two open alerts (one taken
/// by me), one done.
ProgramLiveBoard staffLiveBoard() {
  final sangeet = _function(
    staffSangeetId,
    'Sangeet',
    DateTime(2026, 12, 12, 20),
    DateTime(2026, 12, 12, 23, 30),
    'now',
    expected: 266,
    checkedIn: 184,
  );
  return ProgramLiveBoard.fromCallableData({
    'programId': staffProgramId,
    'generatedAtMillis': staffNightNow.millisecondsSinceEpoch,
    'now': sangeet,
    'tonight': [
      _function(
        'haldi',
        'Haldi',
        DateTime(2026, 12, 12, 10),
        DateTime(2026, 12, 12, 13),
        'done',
      ),
      sangeet,
      _function(
        'dinner',
        'Dinner opens',
        DateTime(2026, 12, 12, 21, 15),
        DateTime(2026, 12, 12, 23),
        'next',
      ),
    ],
    'travel': {'expected': 23, 'atCurb': 6, 'disrupted': 1},
    'alerts': [
      _alert(
        'flight_leg-1',
        'flight',
        'urgent',
        'AI 471 was diverted',
        DateTime(2026, 12, 12, 19, 58),
      ),
      _alert(
        'r1_functionLead',
        'staffAttention',
        'warning',
        'The Iyers reach the Taj after the Sangeet starts',
        DateTime(2026, 12, 12, 19, 40),
        mine: true,
        assignee: 'Pooja Nair',
        revision: 1,
      ),
      _alert(
        'r2_transportDispatcher',
        'staffAttention',
        'info',
        'A car has waited 20 minutes at the airport',
        DateTime(2026, 12, 12, 19, 10),
        state: 'done',
        assignee: 'Ravi',
        revision: 2,
      ),
    ],
    'truncated': false,
  });
}

/// The Taj's Tuesday departures: one late, one checked out, one gone.
ProgramDeparturesRoster staffDepartures() {
  Map<String, Object?> row(
    String id,
    String name,
    String state,
    DateTime leaveBy, {
    String? room,
    String? party,
  }) => {
    'legId': id,
    'guestId': 'g-$id',
    'guestDisplayName': name,
    'partyLabel': party,
    'passengers': 2,
    'luggageUnits': 3,
    'flightNumber': 'AI 472',
    'flightAtMillis': leaveBy
        .add(const Duration(hours: 3))
        .millisecondsSinceEpoch,
    'leaveByMillis': leaveBy.millisecondsSinceEpoch,
    'roomLabel': room,
    'state': state,
    'revision': 1,
  };
  return ProgramDeparturesRoster.fromCallableData({
    'programId': staffProgramId,
    'hotelId': staffHotelId,
    'hotelName': 'Taj Fateh Prakash',
    'generatedAtMillis': DateTime(2026, 12, 15, 9, 40).millisecondsSinceEpoch,
    'rows': [
      row(
        'a',
        'Neha Mehra',
        'inRoom',
        DateTime(2026, 12, 15, 9, 30),
        room: '216',
        party: 'The Mehra family',
      ),
      row(
        'b',
        'Ravi Iyer',
        'checkedOut',
        DateTime(2026, 12, 15, 10, 15),
        room: '301',
      ),
      row('c', 'Sana Khan', 'left', DateTime(2026, 12, 15, 8)),
    ],
    'checkedOut': 41,
    'leavingSoon': 14,
    'lateCheckouts': 3,
  });
}
