import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';

/// Explicit synthetic routes and outcomes never contain a live sender identity.
final class RehearsalRuntimeConfiguration {
  RehearsalRuntimeConfiguration({
    required List<AssistanceMessageRoute> routes,
    required this.responseDeadline,
    required this.deliveryPolicy,
    required List<RehearsalDeliveryOutcome> outcomes,
    List<AssistanceLaterJoiningChoice>? laterChoices,
  }) : routes = List.unmodifiable(routes),
       outcomes = rehearsalDeliveryScript(
         outcomes.map((o) => o.toJson()).toList(),
       ),
       laterChoices = laterChoices == null
           ? null
           : List.unmodifiable(laterChoices) {
    if (routes.isEmpty ||
        routes.length > 3 ||
        routes.toSet().length != routes.length ||
        laterChoices != null &&
            (laterChoices.length > 17 ||
                laterChoices.map((c) => c.target).toSet().length !=
                    laterChoices.length)) {
      throw const FormatException('Invalid practice delivery configuration.');
    }
    if (responseDeadline != null) assistanceInteger(responseDeadline);
  }
  final List<AssistanceMessageRoute> routes;
  final int? responseDeadline;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final List<RehearsalDeliveryOutcome> outcomes;
  final List<AssistanceLaterJoiningChoice>? laterChoices;

  factory RehearsalRuntimeConfiguration.fromJson(Object? value) {
    final raw = assistanceObject(value);
    final map = assistanceObject(raw, {
      'routes',
      'responseDeadline',
      'deliveryPolicy',
      'outcomes',
      if (raw.containsKey('laterChoices')) 'laterChoices',
    });
    final routes = map['routes'];
    final later = map['laterChoices'];
    if (routes is! List || raw.containsKey('laterChoices') && later is! List) {
      throw const FormatException('Invalid practice channel choices.');
    }
    return RehearsalRuntimeConfiguration(
      routes: routes
          .map((r) => assistanceEnum(AssistanceMessageRoute.values, r))
          .toList(),
      responseDeadline: assistanceNullableInteger(map['responseDeadline']),
      deliveryPolicy: AssistanceDeliveryPolicy.fromJson(map['deliveryPolicy']),
      outcomes: rehearsalDeliveryScript(map['outcomes']),
      laterChoices: later == null
          ? null
          : (later as List).map(AssistanceLaterJoiningChoice.fromJson).toList(),
    );
  }
  Map<String, Object?> toJson() => {
    'routes': routes.map((r) => r.name).toList(),
    'responseDeadline': responseDeadline,
    'deliveryPolicy': deliveryPolicy.toJson(),
    'outcomes': outcomes.map((o) => o.toJson()).toList(),
    if (laterChoices != null)
      'laterChoices': laterChoices!.map((c) => c.toJson()).toList(),
  };
}

final class RehearsalRuntimeSetting {
  const RehearsalRuntimeSetting._(this.status, this.configuration);
  final RehearsalAutomationStatus status;
  final RehearsalRuntimeConfiguration configuration;
  factory RehearsalRuntimeSetting.fromJson(Object? value) {
    final map = assistanceObject(value, {'status', 'configuration'});
    return RehearsalRuntimeSetting._(
      assistanceEnum(RehearsalAutomationStatus.values, map['status']),
      RehearsalRuntimeConfiguration.fromJson(map['configuration']),
    );
  }
  Map<String, Object?> toJson() => {
    'status': status.name,
    'configuration': configuration.toJson(),
  };
}
