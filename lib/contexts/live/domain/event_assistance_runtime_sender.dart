import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';

enum AssistanceRuntimeSenderAvailability {
  eligible,
  setupRequired,
  approvalExpired,
  joiningTemplateMissing,
}

/// Server-reviewed sender identity. Eligibility is not delivery readiness.
final class AssistanceRuntimeSenderChoice {
  const AssistanceRuntimeSenderChoice._({
    required this.scope,
    required this.route,
    required this.senderId,
    required this.displayName,
    required this.displayAddress,
    required this.reviewHash,
    required this.availability,
  });
  final EventAssistanceRuntimeScope scope;
  final AssistanceMessageRoute route;
  final String senderId, displayName, reviewHash;
  final String? displayAddress;
  final AssistanceRuntimeSenderAvailability availability;
  bool get canSelect =>
      availability == AssistanceRuntimeSenderAvailability.eligible;

  factory AssistanceRuntimeSenderChoice.fromJson(
    Object? value,
    EventAssistanceRuntimeScope scope,
  ) {
    final map = assistanceObject(value, {
      'routeId',
      'senderId',
      'displayName',
      'displayAddress',
      'reviewHash',
      'availability',
    });
    return AssistanceRuntimeSenderChoice._(
      scope: scope,
      route: assistanceEnum(AssistanceMessageRoute.values, map['routeId']),
      senderId: assistanceId(map['senderId']),
      displayName: assistanceText(map['displayName'], 160),
      displayAddress: map['displayAddress'] == null
          ? null
          : assistanceText(map['displayAddress'], 32),
      reviewHash: assistanceHash(map['reviewHash']),
      availability: assistanceEnum(
        AssistanceRuntimeSenderAvailability.values,
        map['availability'],
      ),
    );
  }

  Map<String, Object?> reviewJson() => {
    'routeId': route.name,
    'senderId': senderId,
    'reviewHash': reviewHash,
  };
}

/// A page per channel plus any saved selections outside those pages.
final class AssistanceRuntimeSenderSetup {
  AssistanceRuntimeSenderSetup._(
    List<AssistanceRuntimeSenderChoice> choices,
    Map<AssistanceMessageRoute, String> nextCursors,
  ) : choices = List.unmodifiable(choices),
      nextCursors = Map.unmodifiable(nextCursors);
  final List<AssistanceRuntimeSenderChoice> choices;
  final Map<AssistanceMessageRoute, String> nextCursors;

  factory AssistanceRuntimeSenderSetup.fromJson(
    Object? value,
    EventAssistanceRuntimeScope scope,
  ) {
    final map = assistanceObject(value, {'choices', 'nextCursors'});
    final raw = map['choices'];
    if (raw is! List || raw.length > 63) {
      throw const FormatException('Invalid event sender choices.');
    }
    final choices = raw
        .map((v) => AssistanceRuntimeSenderChoice.fromJson(v, scope))
        .toList();
    if (choices.map((c) => (c.route, c.senderId)).toSet().length !=
        choices.length) {
      throw const FormatException('Duplicate event sender choice.');
    }
    final cursors = <AssistanceMessageRoute, String>{};
    for (final entry in assistanceObject(map['nextCursors']).entries) {
      cursors[assistanceEnum(AssistanceMessageRoute.values, entry.key)] =
          assistanceId(entry.value);
    }
    return AssistanceRuntimeSenderSetup._(choices, cursors);
  }

  void requireAdvancing(Map<AssistanceMessageRoute, String> previous) {
    for (final entry in nextCursors.entries) {
      final after = previous[entry.key];
      if (after != null && entry.value.compareTo(after) <= 0) {
        throw const FormatException('Event sender page did not advance.');
      }
    }
  }
}
