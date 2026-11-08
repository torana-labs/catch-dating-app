import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

import 'planner_fixtures.dart';

Map<String, Object?> _moment(
  String id,
  String name,
  Map<String, Object?> initiation, {
  String status = 'armed',
  Map<String, Object?> audience = const {
    'kind': 'households',
    'rsvpPendingOnly': false,
  },
  String templateId = 'program_function_starting',
}) => {
  'momentId': id,
  'scope': {
    'kind': 'program',
    'eventId': null,
    'programId': plannerProgramId,
    'organizerId': null,
  },
  'name': name,
  'initiation': initiation,
  'sense': 'audience',
  'audience': audience,
  'action': {
    'kind': 'sendTemplate',
    'connectionId': 'wa-meher',
    'templateId': templateId,
    'variables': <String, String>{},
  },
  'status': status,
  'approval': null,
  'origin': 'organizer',
  'revision': 1,
};

Map<String, Object?> _plan(
  String id,
  String kind,
  String? anchorId,
  String state, {
  int sent = 0,
  DateTime? next,
}) => {
  'momentId': id,
  'anchor': {'kind': kind, 'id': anchorId},
  'sentCount': sent,
  'nextRunAtMillis': next?.millisecondsSinceEpoch,
  'state': state,
};

/// The boards' planned messages: one sent, the itinerary next, a Sangeet
/// reminder planned and a reply chase still a draft.
final plannerMessages = ProgramPlannedMessages.fromCallableData({
  'moments': [
    _moment('save-date', 'Save the date', {
      'kind': 'scheduled',
      'atMillis': DateTime(2026, 9, 1, 10).millisecondsSinceEpoch,
    }, status: 'done'),
    _moment('itinerary', 'The itinerary', {
      'kind': 'scheduled',
      'atMillis': DateTime(2026, 12, 5, 10).millisecondsSinceEpoch,
    }),
    _moment(
      'sangeet-reminder',
      'Sangeet tonight',
      {
        'kind': 'anchored',
        'anchorKind': 'functionStart',
        'anchorId': 'sangeet',
        'offsetMinutes': -120,
      },
      audience: const {
        'kind': 'functionGuests',
        'functionId': 'sangeet',
        'rsvp': ['attending'],
        'householdDedupe': true,
        'travelTimeLead': false,
      },
    ),
    _moment(
      'reply-chase',
      'Please reply',
      {
        'kind': 'scheduled',
        'atMillis': DateTime(2026, 11, 20, 10).millisecondsSinceEpoch,
      },
      status: 'draft',
      audience: const {'kind': 'households', 'rsvpPendingOnly': true},
      templateId: 'program_rsvp_deadline_reminder',
    ),
  ],
  'plans': [
    _plan('save-date', 'date', null, 'sent', sent: 118),
    _plan('itinerary', 'date', null, 'next', next: DateTime(2026, 12, 5, 10)),
    _plan(
      'sangeet-reminder',
      'function',
      'sangeet',
      'planned',
      next: DateTime(2026, 12, 12, 18),
    ),
    _plan('reply-chase', 'date', null, 'draft'),
  ],
  'senderConnectionId': 'wa-meher',
});

/// The boards' wedding with marigold branding and Meher's credit.
final plannerBrandedProgram = OrganizerProgramDetail.fromCallableData({
  'program': {
    'programId': plannerProgramId,
    'organizerId': plannerOrganizerId,
    'kind': 'wedding',
    'title': 'Aditi and Kabir’s wedding',
    'timezone': 'Asia/Kolkata',
    'status': 'active',
    'startsAtMillis': DateTime(2026, 12, 12).millisecondsSinceEpoch,
    'endsAtMillis': DateTime(2026, 12, 14, 23, 59).millisecondsSinceEpoch,
    'capabilities': <String>[],
    'transportSettings': null,
    'revision': 4,
    'branding': {
      'color': 'marigold',
      'coverImagePath': null,
      'creditLine': 'Meher Shah Weddings',
    },
  },
  'functions': <Object?>[],
  'pickupPoints': <Object?>[],
  'hotels': <Object?>[],
  'counts': <String, Object?>{},
}).program;

Map<String, Object?> _row(
  String id,
  String title,
  DateTime starts, {
  int? guests,
  int? flying,
  double? replied,
}) => {
  'programId': id,
  'kind': 'wedding',
  'title': title,
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'startsAtMillis': starts.millisecondsSinceEpoch,
  'endsAtMillis': starts.add(const Duration(days: 2)).millisecondsSinceEpoch,
  'capabilities': <String>[],
  'functionCount': 5,
  'canArchive': true,
  'canUnarchive': false,
  'revision': 1,
  'guestCount': ?guests,
  'flyingInCount': ?flying,
  'repliedShare': ?replied,
};

/// Meher's programmes with their overview numbers.
final plannerOverview = OrganizerProgramInventoryPage.fromCallableData({
  'programs': [
    _row(
      plannerProgramId,
      'Aditi and Kabir’s wedding',
      DateTime(2026, 12, 12),
      guests: 312,
      flying: 196,
      replied: 0.72,
    ),
    _row(
      'sana-imran',
      'Sana and Imran’s wedding',
      DateTime(2027, 1, 20),
      guests: 240,
      flying: 80,
      replied: 0.4,
    ),
    _row('bain', 'Bain & Co offsite', DateTime(2027, 2, 6)),
  ],
});
