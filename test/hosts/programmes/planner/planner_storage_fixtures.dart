import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';

import 'planner_fixtures.dart';

final _submitted = DateTime(2026, 10, 27, 18, 20).millisecondsSinceEpoch;
final _viewed = DateTime(2026, 10, 28, 9, 5).millisecondsSinceEpoch;

Map<String, Object?> _idRow(
  String guestId,
  String name,
  String status, {
  String? kind,
  String? last4,
  String room = '214',
  String hotelId = 'taj',
  String hotelName = 'Taj Fateh Prakash',
  bool viewed = false,
}) => {
  'guestId': guestId,
  'householdId': 'mehra',
  'displayName': name,
  'hotelId': hotelId,
  'hotelName': hotelName,
  'roomLabel': room,
  'status': status,
  'idKind': kind,
  'numberLast4': last4,
  'submittedAtMillis': status == 'missing' ? null : _submitted,
  'decidedAtMillis': status == 'accepted' ? _submitted : null,
  'askAgainNote': status == 'askedAgain' ? 'The photo is blurred' : null,
  'hotelViews': [
    if (viewed)
      {'hotelId': 'taj', 'hotelName': 'Taj Fateh Prakash', 'atMillis': _viewed},
  ],
  'frontUrl': null,
  'backUrl': null,
  'visaUrl': null,
  'revision': status == 'missing' ? 0 : 2,
};

/// `listProgramIdTracker` as the IdTracker board draws it.
final plannerIdTrackerData = <String, Object?>{
  'programId': plannerProgramId,
  'hotelId': null,
  'counts': {
    'staying': 286,
    'idsIn': 241,
    'toCheck': 7,
    'missing': 38,
    'passports': 4,
  },
  'hotels': [
    {'hotelId': 'taj', 'name': 'Taj Fateh Prakash', 'staying': 162},
    {'hotelId': 'leela', 'name': 'Leela Palace', 'staying': 124},
  ],
  'rows': [
    _idRow('kamla', 'Kamla Mehra', 'submitted', kind: 'aadhaar', last4: '4821'),
    _idRow(
      'rajiv',
      'Rajiv Mehra',
      'accepted',
      kind: 'aadhaar',
      last4: '1107',
      viewed: true,
    ),
    _idRow('anya', 'Anya Mehra', 'missing', room: '216'),
    _idRow(
      'james',
      'James Whitfield',
      'submitted',
      kind: 'passport',
      last4: 'K882',
      room: '118',
      hotelId: 'leela',
      hotelName: 'Leela Palace',
    ),
    _idRow(
      'sunita',
      'Sunita Kapoor',
      'askedAgain',
      kind: 'licence',
      last4: '3390',
      room: '302',
    ),
  ],
  'urlsExpireAtMillis': null,
};

final plannerIdTracker = ProgramIdTracker.fromCallableData(
  plannerIdTrackerData,
);
