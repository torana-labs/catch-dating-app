import 'package:catch_dating_app/contexts/programmes/domain/program_bill_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_photo_models.dart';

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

Map<String, Object?> _billLine(
  int index,
  String reference,
  int billed,
  int? recorded,
  String check,
) => {
  'lineId': 'line-$index',
  'reference': reference,
  'tripId': check == 'noTrip' ? null : 'trip-$index',
  'billedMinor': billed * 100,
  'recordedMinor': recorded == null ? null : recorded * 100,
  'check': check,
};

/// `reconcileProgramVendorBill` as the Reconcile board draws it.
final plannerVendorBillData = <String, Object?>{
  'programId': plannerProgramId,
  'vendorId': 'shree',
  'vendorName': 'Shree Travels',
  'currency': 'INR',
  'bill': {
    'invoiceNumber': '2026-118',
    'receivedAtMillis': DateTime(2026, 12, 17).millisecondsSinceEpoch,
    'status': 'open',
    'note': null,
    'lines': [
      _billLine(
        1,
        'T-041 · 11 Dec · Airport to the Taj',
        2000,
        2000,
        'matches',
      ),
      _billLine(
        2,
        'T-042 · 11 Dec · Airport to the Taj',
        2000,
        2000,
        'matches',
      ),
      _billLine(
        3,
        'T-057 · 11 Dec · Airport to the Leela',
        2400,
        2000,
        'amountDiffers',
      ),
      _billLine(4, 'T-063 · 12 Dec · Station to the Taj', 2400, null, 'noTrip'),
      _billLine(
        5,
        'T-041 · 11 Dec · Airport to the Taj',
        2400,
        null,
        'duplicate',
      ),
      _billLine(6, 'T-070 · 13 Dec · Taj to the palace', 1800, 1800, 'matches'),
    ],
    'totals': {
      'billedMinor': 1300000,
      'recordedMinor': 780000,
      'questionMinor': 520000,
      'billedTrips': 6,
      'recordedTrips': 5,
      'unbilledTrips': 1,
    },
    'approvedMinor': null,
    'approvedAtMillis': null,
    'revision': 1,
  },
  'recordedTrips': 5,
  'recordedMinor': 960000,
  'unbilled': [
    {
      'tripId': 'trip-9',
      'departedAtMillis': DateTime(2026, 12, 14, 11).millisecondsSinceEpoch,
      'plateDisplay': 'RJ 27 TA 4471',
      'destinationLabel': 'Taj to the airport',
      'recordedMinor': 180000,
    },
  ],
};

final plannerVendorBill = ProgramVendorBillView.fromCallableData(
  plannerVendorBillData,
);

Map<String, Object?> _album(String id, String name, DateTime day, int count) =>
    {
      'functionId': id,
      'name': name,
      'startsAtMillis': day.millisecondsSinceEpoch,
      'photoCount': count,
      'coverUrl': null,
    };

/// `listProgramPhotos` as the Photos board draws it.
final plannerPhotosData = <String, Object?>{
  'programId': plannerProgramId,
  'functionId': null,
  'coverUrl': null,
  'albums': [
    _album('mehendi', 'Mehendi', DateTime(2026, 10, 25, 16), 214),
    _album('haldi', 'Haldi', DateTime(2026, 10, 26, 10), 96),
    _album('sangeet', 'Sangeet', DateTime(2026, 10, 27, 20), 388),
    _album('wedding', 'Wedding', DateTime(2026, 10, 29, 18), 0),
  ],
  'photos': [
    for (var index = 0; index < 6; index++)
      {
        'photoId': 'photo_${'$index'.padLeft(40, 'a')}',
        'functionId': 'sangeet',
        'caption': null,
        'status': 'visible',
        'url': null,
        'createdAtMillis': DateTime(2026, 10, 27, 22).millisecondsSinceEpoch,
        'revision': 1,
      },
  ],
  'urlsExpireAtMillis': DateTime(2026, 10, 28, 10, 10).millisecondsSinceEpoch,
};

final plannerPhotos = ProgramPhotos.fromCallableData(plannerPhotosData);
