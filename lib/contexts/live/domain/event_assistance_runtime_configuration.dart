import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum AssistanceMessageRoute {
  catchEventSms,
  organizerEventWhatsapp,
  catchEventRcs,
}

/// Ordered selection is explicit; it does not establish consent or readiness.
final class AssistanceRuntimeRoute {
  AssistanceRuntimeRoute({required this.route, required this.senderId}) {
    assistanceId(senderId);
  }
  final AssistanceMessageRoute route;
  final String senderId;
  factory AssistanceRuntimeRoute.fromJson(Object? value) {
    final map = assistanceObject(value, {'routeId', 'senderId'});
    return AssistanceRuntimeRoute(
      route: assistanceEnum(AssistanceMessageRoute.values, map['routeId']),
      senderId: assistanceId(map['senderId']),
    );
  }
  Map<String, Object?> toJson() => {
    'routeId': route.name,
    'senderId': senderId,
  };
}

final class AssistanceDeliveryPolicy {
  AssistanceDeliveryPolicy({
    required this.maxAttempts,
    required this.maxAttemptsPerRoute,
    required this.minimumRetrySeconds,
  }) {
    _bounded(maxAttempts, 1, 6);
    _bounded(maxAttemptsPerRoute, 1, 3);
    _bounded(minimumRetrySeconds, 1, 3600);
  }
  final int maxAttempts;
  final int maxAttemptsPerRoute;
  final int minimumRetrySeconds;
  factory AssistanceDeliveryPolicy.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'maxAttempts',
      'maxAttemptsPerRoute',
      'minimumRetrySeconds',
    });
    return AssistanceDeliveryPolicy(
      maxAttempts: _bounded(map['maxAttempts'], 1, 6),
      maxAttemptsPerRoute: _bounded(map['maxAttemptsPerRoute'], 1, 3),
      minimumRetrySeconds: _bounded(map['minimumRetrySeconds'], 1, 3600),
    );
  }
  Map<String, Object?> toJson() => {
    'maxAttempts': maxAttempts,
    'maxAttemptsPerRoute': maxAttemptsPerRoute,
    'minimumRetrySeconds': minimumRetrySeconds,
  };
}

final class AssistanceLaterJoiningChoice {
  AssistanceLaterJoiningChoice({
    required this.label,
    required AssistanceJoiningTarget target,
  }) : target = AssistanceJoiningTarget.fromJson(target.toJson()) {
    assistanceText(label, 80);
  }
  final String label;
  final AssistanceJoiningTarget target;
  factory AssistanceLaterJoiningChoice.fromJson(Object? value) {
    final map = assistanceObject(value, {'label', 'target'});
    return AssistanceLaterJoiningChoice(
      label: assistanceText(map['label'], 80),
      target: AssistanceJoiningTarget.fromJson(map['target']),
    );
  }
  Map<String, Object?> toJson() => {'label': label, 'target': target.toJson()};
}

/// Frozen execution configuration. A nullable deadline leaves deadline-based
/// escalation unset; it never assumes an unanswered guest is absent.
final class AssistanceRuntimeConfiguration {
  AssistanceRuntimeConfiguration({
    required List<AssistanceRuntimeRoute> routes,
    required this.responseDeadline,
    required this.deliveryPolicy,
    required this.expiresAt,
    required this.maxEvaluations,
    List<AssistanceLaterJoiningChoice>? laterChoices,
  }) : routes = List.unmodifiable(routes),
       laterChoices = laterChoices == null
           ? null
           : List.unmodifiable(laterChoices) {
    assistanceInteger(expiresAt);
    _bounded(maxEvaluations, 1, 10000);
    if (routes.isEmpty ||
        routes.length > 3 ||
        routes.map((route) => route.route).toSet().length != routes.length) {
      throw const FormatException(
        'Select each messaging channel at most once.',
      );
    }
    if (responseDeadline != null &&
        assistanceInteger(responseDeadline) > expiresAt) {
      throw const FormatException(
        'Response deadline exceeds the execution window.',
      );
    }
    if (laterChoices != null &&
        (laterChoices.length > 17 ||
            laterChoices.map((choice) => choice.target).toSet().length !=
                laterChoices.length)) {
      throw const FormatException(
        'Joining choices must have unique destinations.',
      );
    }
  }
  final List<AssistanceRuntimeRoute> routes;
  final int? responseDeadline;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final int expiresAt;
  final int maxEvaluations;
  // Preserve absent versus explicitly empty options for immutable wire identity.
  final List<AssistanceLaterJoiningChoice>? laterChoices;

  factory AssistanceRuntimeConfiguration.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'options',
      'expiresAt',
      'maxEvaluations',
    });
    final rawOptions = assistanceObject(map['options']);
    final options = assistanceObject(rawOptions, {
      'routes',
      'responseDeadline',
      'deliveryPolicy',
      if (rawOptions.containsKey('laterChoices')) 'laterChoices',
    });
    final routes = options['routes'];
    final choices = options['laterChoices'];
    if (routes is! List ||
        routes.length > 3 ||
        options.containsKey('laterChoices') &&
            (choices is! List || choices.length > 17)) {
      throw const FormatException('Invalid execution choices.');
    }
    return AssistanceRuntimeConfiguration(
      routes: routes
          .map(AssistanceRuntimeRoute.fromJson)
          .toList(growable: false),
      responseDeadline: assistanceNullableInteger(options['responseDeadline']),
      deliveryPolicy: AssistanceDeliveryPolicy.fromJson(
        options['deliveryPolicy'],
      ),
      expiresAt: assistanceInteger(map['expiresAt']),
      maxEvaluations: _bounded(map['maxEvaluations'], 1, 10000),
      laterChoices: choices == null
          ? null
          : (choices as List)
                .map(AssistanceLaterJoiningChoice.fromJson)
                .toList(growable: false),
    );
  }
  Map<String, Object?> toJson() => {
    'options': {
      'routes': routes.map((route) => route.toJson()).toList(growable: false),
      'responseDeadline': responseDeadline,
      'deliveryPolicy': deliveryPolicy.toJson(),
      if (laterChoices != null)
        'laterChoices': laterChoices!
            .map((choice) => choice.toJson())
            .toList(growable: false),
    },
    'expiresAt': expiresAt,
    'maxEvaluations': maxEvaluations,
  };
}

int _bounded(Object? value, int minimum, int maximum) {
  final number = assistanceInteger(value);
  if (number < minimum || number > maximum) {
    throw const FormatException('Execution limit outside its allowed range.');
  }
  return number;
}
