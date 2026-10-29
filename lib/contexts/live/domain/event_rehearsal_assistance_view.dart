import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';

enum RehearsalMessageLifecycle { active, cancelled, superseded, responded }

enum RehearsalAttemptStatus {
  notDispatched,
  reserved,
  unknown,
  accepted,
  delivered,
  read,
  failed,
  revoked,
}

final class RehearsalAssistanceState {
  const RehearsalAssistanceState._(this.intention, this.latestMessageId);
  final AssistanceJoiningIntention intention;
  final String? latestMessageId;
  factory RehearsalAssistanceState.fromJson(Object? value) {
    final map = assistanceObject(value, {'intention', 'latestMessageId'});
    return RehearsalAssistanceState._(
      AssistanceJoiningIntention.fromJson(map['intention']),
      map['latestMessageId'] == null
          ? null
          : rehearsalMessageId(map['latestMessageId']),
    );
  }
}

final class RehearsalReplyChoice {
  const RehearsalReplyChoice._(this.choiceId, this.label);
  final String choiceId;
  final String label;
  factory RehearsalReplyChoice.fromJson(Object? value) {
    final map = assistanceObject(value, {'choiceId', 'label'});
    return RehearsalReplyChoice._(
      assistanceId(map['choiceId']),
      assistanceText(map['label'], 80),
    );
  }
}

final class RehearsalJoiningInstruction {
  const RehearsalJoiningInstruction._({
    required this.messageId,
    required this.intentId,
    required this.revision,
    required this.text,
    required this.choices,
    required this.lifecycle,
    required this.expiresAt,
    required this.canRespond,
    required this.responseChoiceId,
  });
  final String messageId;
  final String intentId;
  final int revision;
  final String text;
  final List<RehearsalReplyChoice> choices;
  final RehearsalMessageLifecycle lifecycle;
  final int expiresAt;
  final bool canRespond;
  final String? responseChoiceId;
  String? get responseLabel => responseChoiceId == null
      ? null
      : choices
            .firstWhere((choice) => choice.choiceId == responseChoiceId)
            .label;

  factory RehearsalJoiningInstruction.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'messageId',
      'intentId',
      'intentRevision',
      'text',
      'choices',
      'lifecycle',
      'expiresAt',
      'canRespond',
      'responseChoiceId',
    });
    final items = map['choices'];
    if (items is! List || items.length > 20) {
      throw const FormatException('Invalid practice response choices.');
    }
    final choices = List<RehearsalReplyChoice>.unmodifiable(
      items.map(RehearsalReplyChoice.fromJson),
    );
    final ids = choices.map((choice) => choice.choiceId).toSet();
    final lifecycle = assistanceEnum(
      RehearsalMessageLifecycle.values,
      map['lifecycle'],
    );
    final canRespond = assistanceBoolean(map['canRespond']);
    final response = map['responseChoiceId'] == null
        ? null
        : assistanceId(map['responseChoiceId']);
    final revision = assistanceInteger(map['intentRevision']);
    if (ids.length != choices.length ||
        revision < 1 ||
        response != null && !ids.contains(response) ||
        (lifecycle == RehearsalMessageLifecycle.responded &&
            response == null) ||
        (lifecycle == RehearsalMessageLifecycle.active && response != null) ||
        canRespond &&
            (lifecycle != RehearsalMessageLifecycle.active ||
                response != null)) {
      throw const FormatException('Inconsistent practice response.');
    }
    return RehearsalJoiningInstruction._(
      messageId: rehearsalMessageId(map['messageId']),
      intentId: assistanceId(map['intentId']),
      revision: revision,
      text: assistanceText(map['text']),
      choices: choices,
      lifecycle: lifecycle,
      expiresAt: assistanceInteger(map['expiresAt']),
      canRespond: canRespond,
      responseChoiceId: response,
    );
  }
}

final class RehearsalDeliveryAttempt {
  const RehearsalDeliveryAttempt._(this.attemptId, this.route, this.status);
  final String attemptId;
  final AssistanceMessageRoute route;
  final RehearsalAttemptStatus status;
  factory RehearsalDeliveryAttempt.fromJson(Object? value) {
    final map = assistanceObject(value, {'attemptId', 'routeId', 'status'});
    return RehearsalDeliveryAttempt._(
      assistanceId(map['attemptId']),
      assistanceEnum(AssistanceMessageRoute.values, map['routeId']),
      assistanceEnum(RehearsalAttemptStatus.values, map['status']),
    );
  }
}

final class RehearsalDeliveryView {
  const RehearsalDeliveryView._(this.conflictingEvidence, this.attempts);
  final bool conflictingEvidence;
  final List<RehearsalDeliveryAttempt> attempts;
  factory RehearsalDeliveryView.fromJson(Object? value) {
    final map = assistanceObject(value, {'conflictingEvidence', 'attempts'});
    final raw = map['attempts'];
    if (raw is! List || raw.length > 6) {
      throw const FormatException('Invalid practice delivery history.');
    }
    final attempts = List<RehearsalDeliveryAttempt>.unmodifiable(
      raw.map(RehearsalDeliveryAttempt.fromJson),
    );
    if (attempts.map((attempt) => attempt.attemptId).toSet().length !=
        attempts.length) {
      throw const FormatException('Duplicate practice delivery attempt.');
    }
    return RehearsalDeliveryView._(
      assistanceBoolean(map['conflictingEvidence']),
      attempts,
    );
  }
}

String rehearsalMessageId(Object? value) {
  final id = assistanceId(value);
  if (!RegExp(r'^outbox:[a-f0-9]{64}$').hasMatch(id)) {
    throw const FormatException('Invalid practice message identity.');
  }
  return id;
}
