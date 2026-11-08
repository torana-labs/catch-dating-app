import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';

import 'planner_fixtures.dart';

// The boards' guest inbox and assistant (RbProgInbox, RbProgAssistant),
// parsed from callable-shaped maps so the fixtures exercise the parsers.

int _at(int hour, int minute) =>
    DateTime(2026, 10, 28, hour, minute).millisecondsSinceEpoch;

Map<String, Object?> _row(
  String id,
  String name,
  String preview,
  String state,
  int at, {
  String? escalation,
  String handledBy = 'assistant',
  String? side,
  bool unknown = false,
}) => {
  'threadId': '${plannerProgramId}_$id',
  'householdId': unknown ? null : id,
  'guestId': null,
  'displayName': name,
  'sideLabel': side,
  'unknownSender': unknown,
  'handledBy': handledBy,
  'state': state,
  'language': id == 'mehra' ? 'hi' : 'en',
  'escalationReason': escalation,
  'lastMessagePreview': preview,
  'lastMessageDirection': state == 'handled' ? 'outbound' : 'inbound',
  'lastMessageAuthor': state == 'handled' ? 'assistant' : 'guest',
  'lastMessageAtMillis': at,
  'lastInboundAtMillis': at,
  'serviceWindowExpiresAtMillis': at + 24 * 60 * 60 * 1000,
  'serviceWindowOpen': true,
  'unreadCount': state == 'handled' ? 0 : 1,
  'revision': 3,
};

final plannerWhatsappInboxData = <String, Object?>{
  'programId': plannerProgramId,
  'filter': 'needsYou',
  'counts': {'needsYou': 4, 'handled': 31, 'all': 35},
  'threads': [
    _row(
      'mehra',
      'The Mehra family',
      'Can our driver stay at the Taj too?',
      'needsYou',
      _at(9, 58),
      escalation: 'notInFacts',
      side: 'Aditi',
    ),
    _row(
      'kapoor',
      'The Kapoors',
      'We’re 6 now, not 5. My sister is coming',
      'needsYou',
      _at(8, 40),
    ),
    _row(
      'iyer',
      'The Iyer family',
      'Sent an attachment',
      'needsYou',
      _at(7, 12),
      escalation: 'sentMedia',
    ),
    _row(
      'u-0123',
      'Unknown number',
      'Hi, is this the wedding number?',
      'needsYou',
      _at(6, 30),
      escalation: 'unknownSender',
      handledBy: 'planner',
      unknown: true,
    ),
  ],
  'nextCursor': null,
  'sender': {
    'connectionId': 'conn-wedding',
    'displayPhoneNumber': '+91 98765 01234',
    'status': 'active',
  },
};

final plannerWhatsappInbox = ProgramWhatsappInbox.fromCallableData(
  plannerWhatsappInboxData,
);

Map<String, Object?> _message(
  String id,
  String direction,
  String author,
  String text,
  int at, {
  String? authorName,
}) => {
  'messageId': id,
  'direction': direction,
  'kind': 'text',
  'text': text,
  'author': author,
  'authorName': authorName,
  'status': direction == 'inbound' ? 'received' : 'read',
  'createdAtMillis': at,
};

final plannerWhatsappThread = ProgramWhatsappThread.fromCallableData({
  'programId': plannerProgramId,
  'thread': (plannerWhatsappInboxData['threads']! as List).first,
  'household': {
    'householdId': 'mehra',
    'label': 'The Mehra family',
    'primaryContactName': 'Neha Mehra',
    'guestCount': 4,
    'rsvpStatus': null,
  },
  'messages': [
    _message('m1', 'inbound', 'guest', 'हल्दी कितने बजे है?', _at(9, 40)),
    _message(
      'm2',
      'outbound',
      'assistant',
      'हल्दी रविवार, 13 दिसंबर को सुबह 10 बजे कोर्टयार्ड में है। पीले कपड़े पहनें।',
      _at(9, 41),
    ),
    _message(
      'm3',
      'inbound',
      'guest',
      'Can our driver stay at the Taj too?',
      _at(9, 58),
    ),
  ],
  'messagesTruncated': false,
});

final plannerCannedReplies = ProgramCannedReply.listFromCallableData({
  'programId': plannerProgramId,
  'cannedReplies': [
    for (final (index, (id, label)) in [
      ('staff-rate', 'Yes, at the staff rate'),
      ('driver-lodge', 'The driver’s lodge next door'),
      ('check-hotel', 'I’ll check with the hotel'),
    ].indexed)
      {
        'cannedReplyId': id,
        'label': label,
        'variants': [
          {'language': 'en', 'text': '$label.'},
        ],
        'sortOrder': index,
        'archived': false,
        'revision': 1,
      },
  ],
});

final plannerAssistantSettings = ProgramAssistantSettings.fromCallableData({
  'programId': plannerProgramId,
  'enabled': true,
  'languages': ['en', 'hi'],
  'replyWithin': 'sameDay',
  'escalationStaffUids': ['meher', 'sana'],
  'neverDoes': [
    'sharesOtherGuests',
    'promisesChanges',
    'handlesPayments',
    'givesMedicalOrLegalAdvice',
    'sharesStaffContacts',
  ],
  'tone': 'warm',
  'dailyTokenBudget': 200000,
  'answerTopics': ['schedule', 'dressCode', 'travel', 'stay'],
  'attachmentReads': ['tickets', 'ids'],
  'revision': 4,
  'usesDefaults': false,
  'sender': {
    'connectionId': 'conn-wedding',
    'displayPhoneNumber': '+91 98765 01234',
    'verifiedName': 'Aditi and Kabir’s wedding',
    'status': 'active',
    'boundToProgramme': true,
  },
  'staff': [
    {'uid': 'meher', 'displayName': 'Meher Shah'},
    {'uid': 'sana', 'displayName': 'Sana Khan'},
  ],
});
