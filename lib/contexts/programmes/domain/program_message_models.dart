import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// What a planned programme message is tied to on the planner board.
enum ProgramMessageAnchorKind { function, flight, date }

/// The planner board's state for one planned message.
enum ProgramMessageState { draft, planned, next, sent, paused, done }

/// Who a planned message goes to, as the Message screen offers it.
enum ProgramMessageAudience { everyone, notReplied, coming, comingOrMaybe }

/// The WhatsApp templates a planned programme message can send. Each value
/// is the server's template key.
enum ProgramMessageTemplate {
  functionStarting('program_function_starting'),
  getReady('program_get_ready'),
  transportReady('program_transport_ready'),
  rsvpReminder('program_rsvp_deadline_reminder');

  const ProgramMessageTemplate(this.key);

  final String key;

  static ProgramMessageTemplate? fromKey(String? key) =>
      values.where((value) => value.key == key).firstOrNull;
}

/// One programme moment as the planner board shows it: the moment's own
/// fields plus the read-time plan summary from `listOrganizerMoments`.
class ProgramPlannedMessage {
  const ProgramPlannedMessage({
    required this.momentId,
    required this.name,
    required this.revision,
    required this.anchorKind,
    required this.anchorId,
    required this.state,
    required this.sentCount,
    required this.nextRunAt,
    required this.scheduledAt,
    required this.offsetMinutes,
    required this.audience,
    required this.audienceFunctionId,
    required this.template,
  });

  final String momentId;
  final String name;
  final int revision;
  final ProgramMessageAnchorKind anchorKind;
  final String? anchorId;
  final ProgramMessageState state;
  final int sentCount;
  final DateTime? nextRunAt;

  /// The fixed send time of a date message.
  final DateTime? scheduledAt;

  /// Minutes from the function or flight; negative fires before it.
  final int? offsetMinutes;
  final ProgramMessageAudience? audience;
  final String? audienceFunctionId;
  final ProgramMessageTemplate? template;

  /// The time to show: the next run, else the fixed date.
  DateTime? get when => nextRunAt ?? scheduledAt;
}

/// A programme's planned messages, soonest first, and the WhatsApp sender
/// new ones send through.
class ProgramPlannedMessages {
  const ProgramPlannedMessages({
    required this.messages,
    required this.senderConnectionId,
  });

  /// Parses a `listOrganizerMoments` response for a programme scope. An
  /// older server without `plans` reads every moment as planned.
  factory ProgramPlannedMessages.fromCallableData(Object? value) {
    final map = requiredMap(value, 'planned messages');
    final plans = <String, Map<Object?, Object?>>{
      for (final plan
          in map['plans'] == null
              ? const <Map<Object?, Object?>>[]
              : mapList(map['plans'], 'plans'))
        requiredString(plan, 'momentId'): plan,
    };
    final messages = [
      for (final moment in mapList(map['moments'], 'moments'))
        _message(moment, plans[requiredString(moment, 'momentId')]),
    ];
    messages.sort((a, b) {
      final left = a.when;
      final right = b.when;
      if (left == null || right == null) {
        return left == null ? (right == null ? 0 : 1) : -1;
      }
      return left.compareTo(right);
    });
    final sender = map['senderConnectionId'];
    return ProgramPlannedMessages(
      messages: messages,
      senderConnectionId: sender is String && sender.isNotEmpty ? sender : null,
    );
  }

  final List<ProgramPlannedMessage> messages;
  final String? senderConnectionId;

  /// How many are still to go out.
  int get plannedCount => messages
      .where(
        (message) =>
            message.state == ProgramMessageState.planned ||
            message.state == ProgramMessageState.next,
      )
      .length;

  ProgramPlannedMessage? get next => messages
      .where((message) => message.state == ProgramMessageState.next)
      .firstOrNull;

  /// The messages tied to [functionId].
  List<ProgramPlannedMessage> forFunction(String functionId) => [
    for (final message in messages)
      if (message.anchorKind == ProgramMessageAnchorKind.function &&
          message.anchorId == functionId)
        message,
  ];
}

ProgramPlannedMessage _message(
  Map<Object?, Object?> moment,
  Map<Object?, Object?>? plan,
) {
  final initiation = requiredMap(moment['initiation'], 'initiation');
  final audience = requiredMap(moment['audience'], 'audience');
  final action = requiredMap(moment['action'], 'action');
  final anchor = plan == null
      ? (moment['anchor'] == null
            ? null
            : requiredMap(moment['anchor'], 'anchor'))
      : requiredMap(plan['anchor'], 'anchor');
  final status = requiredString(moment, 'status');
  final at = initiation['atMillis'];
  final offset = initiation['offsetMinutes'];
  final nextRun = plan?['nextRunAtMillis'];
  return ProgramPlannedMessage(
    momentId: requiredString(moment, 'momentId'),
    name: requiredString(moment, 'name'),
    revision: requiredInt(moment, 'revision'),
    anchorKind: anchor == null
        ? _derivedAnchor(initiation)
        : nullableEnum(anchor['kind'], ProgramMessageAnchorKind.values)!,
    anchorId: anchor == null
        ? initiation['anchorId'] as String?
        : anchor['id'] as String?,
    state: plan == null
        ? switch (status) {
            'draft' => ProgramMessageState.draft,
            'paused' => ProgramMessageState.paused,
            'done' => ProgramMessageState.done,
            _ => ProgramMessageState.planned,
          }
        : nullableEnum(plan['state'], ProgramMessageState.values)!,
    sentCount: plan == null ? 0 : requiredInt(plan, 'sentCount'),
    nextRunAt: nullableDateTime(nextRun),
    scheduledAt: initiation['kind'] == 'scheduled'
        ? nullableDateTime(at)
        : null,
    offsetMinutes: offset is int ? offset : null,
    audience: switch (audience['kind']) {
      'households' when audience['rsvpPendingOnly'] == true =>
        ProgramMessageAudience.notReplied,
      'households' => ProgramMessageAudience.everyone,
      'functionGuests'
          when (audience['rsvp'] as List<Object?>? ?? const []).contains(
            'maybe',
          ) =>
        ProgramMessageAudience.comingOrMaybe,
      'functionGuests' => ProgramMessageAudience.coming,
      _ => null,
    },
    audienceFunctionId: audience['functionId'] as String?,
    template: ProgramMessageTemplate.fromKey(action['templateId'] as String?),
  );
}

ProgramMessageAnchorKind _derivedAnchor(Map<Object?, Object?> initiation) =>
    switch (initiation['anchorKind']) {
      'functionStart' || 'functionEnd' => ProgramMessageAnchorKind.function,
      'travelLegTime' => ProgramMessageAnchorKind.flight,
      _ => ProgramMessageAnchorKind.date,
    };

/// A planned message the planner is writing, before it is saved.
class ProgramMessageDraft {
  const ProgramMessageDraft({
    required this.anchorKind,
    required this.anchorId,
    required this.offsetMinutes,
    required this.scheduledAt,
    required this.audience,
    required this.template,
    required this.name,
  });

  final ProgramMessageAnchorKind anchorKind;

  /// The function or travel leg; null for a date.
  final String? anchorId;
  final int offsetMinutes;

  /// The send time of a date message.
  final DateTime? scheduledAt;
  final ProgramMessageAudience audience;
  final ProgramMessageTemplate template;
  final String name;

  bool get isComplete => switch (anchorKind) {
    ProgramMessageAnchorKind.date => scheduledAt != null,
    _ => anchorId != null,
  };

  /// The `upsertOrganizerMoment` initiation.
  Map<String, Object?> initiationJson() => switch (anchorKind) {
    ProgramMessageAnchorKind.date => {
      'kind': 'scheduled',
      'atMillis': scheduledAt!.millisecondsSinceEpoch,
    },
    ProgramMessageAnchorKind.function => {
      'kind': 'anchored',
      'anchorKind': 'functionStart',
      'anchorId': anchorId,
      'offsetMinutes': offsetMinutes,
    },
    ProgramMessageAnchorKind.flight => {
      'kind': 'anchored',
      'anchorKind': 'travelLegTime',
      'anchorId': anchorId,
      'offsetMinutes': offsetMinutes,
    },
  };

  /// The `upsertOrganizerMoment` audience. Guests coming to something need
  /// a function, so without one they fall back to every household.
  Map<String, Object?> audienceJson() {
    final functionId = anchorKind == ProgramMessageAnchorKind.function
        ? anchorId
        : null;
    return switch (audience) {
      ProgramMessageAudience.coming ||
      ProgramMessageAudience.comingOrMaybe when functionId != null => {
        'kind': 'functionGuests',
        'functionId': functionId,
        'rsvp': [
          'attending',
          if (audience == ProgramMessageAudience.comingOrMaybe) 'maybe',
        ],
        'householdDedupe': true,
        'travelTimeLead': false,
      },
      ProgramMessageAudience.notReplied => {
        'kind': 'households',
        'rsvpPendingOnly': true,
      },
      _ => {'kind': 'households', 'rsvpPendingOnly': false},
    };
  }

  Map<String, Object?> anchorJson() => {
    'kind': anchorKind.name,
    'id': anchorKind == ProgramMessageAnchorKind.date ? null : anchorId,
  };
}
