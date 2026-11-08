import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Which threads the guest inbox shows.
enum ProgramWhatsappFilter { needsYou, handled, all }

/// Who answers a guest thread.
enum ProgramWhatsappHandledBy { assistant, planner }

/// Whether a thread needs the planner.
enum ProgramWhatsappThreadState { needsYou, handled }

/// Why a thread was passed to the planner.
enum ProgramWhatsappEscalation {
  notInFacts,
  askedForPerson,
  sentMedia,
  distressed,
  unknownSender,
  assistantOff,
  budgetReached,
  other,
}

enum ProgramWhatsappDirection { inbound, outbound }

enum ProgramWhatsappMessageKind { text, template, mediaRef, system }

enum ProgramWhatsappAuthor { guest, assistant, planner, system }

enum ProgramWhatsappMessageStatus {
  received,
  pending,
  sent,
  delivered,
  read,
  failed,
  unknown,
}

/// Languages the assistant may answer in.
enum ProgramAssistantLanguage { en, hi, ta, te, bn, mr, gu, kn, ml, pa, ur }

/// What guests are told about when the planner replies.
enum ProgramAssistantReplyWithin { hour, fourHours, sameDay }

enum ProgramAssistantTone { warm, formal, brief }

/// What the assistant may answer from a household's itinerary.
enum ProgramAssistantTopic { schedule, venues, dressCode, travel, stay, rsvp }

/// Attachments the assistant may read.
enum ProgramAssistantAttachment { tickets, ids }

/// The fixed list of things the assistant never does.
enum ProgramAssistantNeverDoes {
  sharesOtherGuests,
  promisesChanges,
  handlesPayments,
  givesMedicalOrLegalAdvice,
  sharesStaffContacts,
}

List<T> _enumList<T extends Enum>(Object? value, List<T> values) => [
  for (final item in stringList(value))
    if (nullableEnum(item, values) case final T found) found,
];

/// One guest thread in the inbox list.
class ProgramWhatsappThreadSummary {
  const ProgramWhatsappThreadSummary({
    required this.threadId,
    required this.householdId,
    required this.displayName,
    required this.sideLabel,
    required this.unknownSender,
    required this.handledBy,
    required this.state,
    required this.language,
    required this.escalation,
    required this.lastMessagePreview,
    required this.lastMessageAuthor,
    required this.lastMessageAt,
    required this.lastInboundAt,
    required this.serviceWindowExpiresAt,
    required this.serviceWindowOpen,
    required this.unreadCount,
    required this.revision,
  });

  factory ProgramWhatsappThreadSummary.fromMap(
    Map<Object?, Object?> map,
  ) => ProgramWhatsappThreadSummary(
    threadId: requiredString(map, 'threadId'),
    householdId: map['householdId'] as String?,
    displayName: requiredString(map, 'displayName'),
    sideLabel: map['sideLabel'] as String?,
    unknownSender: map['unknownSender'] == true,
    handledBy: nullableEnum(map['handledBy'], ProgramWhatsappHandledBy.values)!,
    state: nullableEnum(map['state'], ProgramWhatsappThreadState.values)!,
    language: nullableEnum(map['language'], ProgramAssistantLanguage.values),
    escalation: nullableEnum(
      map['escalationReason'],
      ProgramWhatsappEscalation.values,
    ),
    lastMessagePreview: requiredString(map, 'lastMessagePreview'),
    lastMessageAuthor: nullableEnum(
      map['lastMessageAuthor'],
      ProgramWhatsappAuthor.values,
    )!,
    lastMessageAt: requiredDateTime(map, 'lastMessageAtMillis'),
    lastInboundAt: requiredDateTime(map, 'lastInboundAtMillis'),
    serviceWindowExpiresAt: requiredDateTime(
      map,
      'serviceWindowExpiresAtMillis',
    ),
    serviceWindowOpen: map['serviceWindowOpen'] == true,
    unreadCount: requiredInt(map, 'unreadCount'),
    revision: requiredInt(map, 'revision'),
  );

  final String threadId;
  final String? householdId;
  final String displayName;

  /// The partner whose side the household is on, such as "Aditi".
  final String? sideLabel;
  final bool unknownSender;
  final ProgramWhatsappHandledBy handledBy;
  final ProgramWhatsappThreadState state;
  final ProgramAssistantLanguage? language;
  final ProgramWhatsappEscalation? escalation;
  final String lastMessagePreview;
  final ProgramWhatsappAuthor lastMessageAuthor;
  final DateTime lastMessageAt;
  final DateTime lastInboundAt;
  final DateTime serviceWindowExpiresAt;
  final bool serviceWindowOpen;
  final int unreadCount;
  final int revision;
}

/// The wedding's WhatsApp number.
class ProgramWhatsappSender {
  const ProgramWhatsappSender({
    required this.connectionId,
    required this.displayPhoneNumber,
    required this.status,
    this.verifiedName,
    this.boundToProgramme = true,
  });

  factory ProgramWhatsappSender.fromMap(Map<Object?, Object?> map) =>
      ProgramWhatsappSender(
        connectionId: requiredString(map, 'connectionId'),
        displayPhoneNumber: map['displayPhoneNumber'] as String?,
        status: requiredString(map, 'status'),
        verifiedName: map['verifiedName'] as String?,
        boundToProgramme: map['boundToProgramme'] != false,
      );

  final String connectionId;
  final String? displayPhoneNumber;

  /// pending, active, degraded or disconnected.
  final String status;
  final String? verifiedName;
  final bool boundToProgramme;

  bool get connected => status == 'active';
}

/// `listProgramWhatsappThreads`: one page and the segment counts.
class ProgramWhatsappInbox {
  const ProgramWhatsappInbox({
    required this.programId,
    required this.filter,
    required this.needsYou,
    required this.handled,
    required this.all,
    required this.threads,
    required this.nextCursor,
    required this.sender,
  });

  factory ProgramWhatsappInbox.fromCallableData(Object? value) {
    final map = requiredMap(value, 'guest messages');
    final counts = requiredMap(map['counts'], 'counts');
    final sender = map['sender'];
    return ProgramWhatsappInbox(
      programId: requiredString(map, 'programId'),
      filter: nullableEnum(map['filter'], ProgramWhatsappFilter.values)!,
      needsYou: requiredInt(counts, 'needsYou'),
      handled: requiredInt(counts, 'handled'),
      all: requiredInt(counts, 'all'),
      threads: mapList(
        map['threads'],
        'threads',
      ).map(ProgramWhatsappThreadSummary.fromMap).toList(growable: false),
      nextCursor: map['nextCursor'] as String?,
      sender: sender == null
          ? null
          : ProgramWhatsappSender.fromMap(requiredMap(sender, 'sender')),
    );
  }

  final String programId;
  final ProgramWhatsappFilter filter;
  final int needsYou;
  final int handled;
  final int all;
  final List<ProgramWhatsappThreadSummary> threads;
  final String? nextCursor;
  final ProgramWhatsappSender? sender;
}

/// One message in a thread.
class ProgramWhatsappMessage {
  const ProgramWhatsappMessage({
    required this.messageId,
    required this.direction,
    required this.kind,
    required this.text,
    required this.author,
    required this.authorName,
    required this.status,
    required this.createdAt,
  });

  factory ProgramWhatsappMessage.fromMap(
    Map<Object?, Object?> map,
  ) => ProgramWhatsappMessage(
    messageId: requiredString(map, 'messageId'),
    direction: nullableEnum(map['direction'], ProgramWhatsappDirection.values)!,
    kind: nullableEnum(map['kind'], ProgramWhatsappMessageKind.values)!,
    text: map['text'] as String?,
    author: nullableEnum(map['author'], ProgramWhatsappAuthor.values)!,
    authorName: map['authorName'] as String?,
    status: nullableEnum(map['status'], ProgramWhatsappMessageStatus.values)!,
    createdAt: requiredDateTime(map, 'createdAtMillis'),
  );

  final String messageId;
  final ProgramWhatsappDirection direction;
  final ProgramWhatsappMessageKind kind;

  /// Null for an attachment, which is recorded by reference only.
  final String? text;
  final ProgramWhatsappAuthor author;
  final String? authorName;
  final ProgramWhatsappMessageStatus status;
  final DateTime createdAt;
}

/// The household a thread belongs to.
class ProgramWhatsappHousehold {
  const ProgramWhatsappHousehold({
    required this.householdId,
    required this.label,
    required this.primaryContactName,
    required this.guestCount,
  });

  factory ProgramWhatsappHousehold.fromMap(Map<Object?, Object?> map) =>
      ProgramWhatsappHousehold(
        householdId: requiredString(map, 'householdId'),
        label: requiredString(map, 'label'),
        primaryContactName: map['primaryContactName'] as String?,
        guestCount: requiredInt(map, 'guestCount'),
      );

  final String householdId;
  final String label;
  final String? primaryContactName;
  final int guestCount;
}

/// `getProgramWhatsappThread`: the summary, household and messages.
class ProgramWhatsappThread {
  const ProgramWhatsappThread({
    required this.programId,
    required this.summary,
    required this.household,
    required this.messages,
    required this.truncated,
  });

  factory ProgramWhatsappThread.fromCallableData(Object? value) {
    final map = requiredMap(value, 'guest thread');
    final household = map['household'];
    return ProgramWhatsappThread(
      programId: requiredString(map, 'programId'),
      summary: ProgramWhatsappThreadSummary.fromMap(
        requiredMap(map['thread'], 'thread'),
      ),
      household: household == null
          ? null
          : ProgramWhatsappHousehold.fromMap(
              requiredMap(household, 'household'),
            ),
      messages: mapList(
        map['messages'],
        'messages',
      ).map(ProgramWhatsappMessage.fromMap).toList(growable: false),
      truncated: map['messagesTruncated'] == true,
    );
  }

  final String programId;
  final ProgramWhatsappThreadSummary summary;
  final ProgramWhatsappHousehold? household;
  final List<ProgramWhatsappMessage> messages;
  final bool truncated;
}

/// One language's text of a saved reply.
class ProgramCannedReplyVariant {
  const ProgramCannedReplyVariant({required this.language, required this.text});

  factory ProgramCannedReplyVariant.fromMap(Map<Object?, Object?> map) =>
      ProgramCannedReplyVariant(
        language: nullableEnum(
          map['language'],
          ProgramAssistantLanguage.values,
        )!,
        text: requiredString(map, 'text'),
      );

  final ProgramAssistantLanguage language;
  final String text;

  Map<String, Object?> toJson() => {'language': language.name, 'text': text};
}

/// A saved reply the planner sends from the inbox.
class ProgramCannedReply {
  const ProgramCannedReply({
    required this.cannedReplyId,
    required this.label,
    required this.variants,
    required this.sortOrder,
    required this.archived,
    required this.revision,
  });

  factory ProgramCannedReply.fromMap(Map<Object?, Object?> map) =>
      ProgramCannedReply(
        cannedReplyId: requiredString(map, 'cannedReplyId'),
        label: requiredString(map, 'label'),
        variants: mapList(
          map['variants'],
          'variants',
        ).map(ProgramCannedReplyVariant.fromMap).toList(growable: false),
        sortOrder: requiredInt(map, 'sortOrder'),
        archived: map['archived'] == true,
        revision: requiredInt(map, 'revision'),
      );

  final String cannedReplyId;
  final String label;
  final List<ProgramCannedReplyVariant> variants;
  final int sortOrder;
  final bool archived;
  final int revision;

  /// The text for [language], else the first one saved.
  String textFor(ProgramAssistantLanguage? language) =>
      variants
          .where((variant) => variant.language == language)
          .firstOrNull
          ?.text ??
      variants.first.text;

  static List<ProgramCannedReply> listFromCallableData(Object? value) =>
      mapList(
        requiredMap(value, 'saved replies')['cannedReplies'],
        'cannedReplies',
      ).map(ProgramCannedReply.fromMap).toList(growable: false);
}

/// A programme staff member who can take escalations.
class ProgramAssistantStaff {
  const ProgramAssistantStaff({required this.uid, required this.displayName});

  final String uid;
  final String? displayName;
}

/// `getProgramAssistantSettings`.
class ProgramAssistantSettings {
  const ProgramAssistantSettings({
    required this.programId,
    required this.enabled,
    required this.languages,
    required this.replyWithin,
    required this.escalationStaffUids,
    required this.neverDoes,
    required this.tone,
    required this.dailyTokenBudget,
    required this.answerTopics,
    required this.attachmentReads,
    required this.revision,
    required this.usesDefaults,
    required this.sender,
    required this.staff,
  });

  factory ProgramAssistantSettings.fromCallableData(Object? value) {
    final map = requiredMap(value, 'assistant settings');
    final sender = map['sender'];
    return ProgramAssistantSettings(
      programId: requiredString(map, 'programId'),
      enabled: map['enabled'] == true,
      languages: _enumList(map['languages'], ProgramAssistantLanguage.values),
      replyWithin: nullableEnum(
        map['replyWithin'],
        ProgramAssistantReplyWithin.values,
      )!,
      escalationStaffUids: stringList(map['escalationStaffUids']),
      neverDoes: _enumList(map['neverDoes'], ProgramAssistantNeverDoes.values),
      tone: nullableEnum(map['tone'], ProgramAssistantTone.values)!,
      dailyTokenBudget: requiredInt(map, 'dailyTokenBudget'),
      answerTopics: _enumList(
        map['answerTopics'],
        ProgramAssistantTopic.values,
      ),
      attachmentReads: _enumList(
        map['attachmentReads'],
        ProgramAssistantAttachment.values,
      ),
      revision: requiredInt(map, 'revision'),
      usesDefaults: map['usesDefaults'] == true,
      sender: sender == null
          ? null
          : ProgramWhatsappSender.fromMap(requiredMap(sender, 'sender')),
      staff: [
        for (final row in mapList(map['staff'], 'staff'))
          ProgramAssistantStaff(
            uid: requiredString(row, 'uid'),
            displayName: row['displayName'] as String?,
          ),
      ],
    );
  }

  final String programId;
  final bool enabled;
  final List<ProgramAssistantLanguage> languages;
  final ProgramAssistantReplyWithin replyWithin;
  final List<String> escalationStaffUids;
  final List<ProgramAssistantNeverDoes> neverDoes;
  final ProgramAssistantTone tone;
  final int dailyTokenBudget;
  final List<ProgramAssistantTopic> answerTopics;
  final List<ProgramAssistantAttachment> attachmentReads;
  final int revision;
  final bool usesDefaults;
  final ProgramWhatsappSender? sender;
  final List<ProgramAssistantStaff> staff;
}

/// A change to the assistant settings; null fields keep their value.
class ProgramAssistantSettingsChange {
  const ProgramAssistantSettingsChange({
    this.enabled,
    this.languages,
    this.replyWithin,
    this.escalationStaffUids,
    this.answerTopics,
    this.attachmentReads,
  });

  final bool? enabled;
  final List<ProgramAssistantLanguage>? languages;
  final ProgramAssistantReplyWithin? replyWithin;
  final List<String>? escalationStaffUids;
  final List<ProgramAssistantTopic>? answerTopics;
  final List<ProgramAssistantAttachment>? attachmentReads;

  Map<String, Object?> toJson() => {
    'enabled': ?enabled,
    if (languages case final value?)
      'languages': [for (final item in value) item.name],
    'replyWithin': ?replyWithin?.name,
    'escalationStaffUids': ?escalationStaffUids,
    if (answerTopics case final value?)
      'answerTopics': [for (final item in value) item.name],
    if (attachmentReads case final value?)
      'attachmentReads': [for (final item in value) item.name],
  };
}
