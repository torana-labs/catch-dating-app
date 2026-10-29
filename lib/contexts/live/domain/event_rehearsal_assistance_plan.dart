import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';

/// Explicit synthetic execution. Shared rules confer no live sender authority.
final class RehearsalAssistancePlan {
  RehearsalAssistancePlan({
    required this.rules,
    required AssistanceJoiningGuidance guidance,
    required this.departureConfirmed,
    required this.responseDeadline,
    required List<AssistanceMessageRoute> routes,
    required this.deliveryPolicy,
    this.setting,
    List<AssistanceLaterJoiningChoice>? laterChoices,
  }) : guidance = AssistanceJoiningGuidance.fromJson(_guidanceJson(guidance)),
       routes = List.unmodifiable(routes),
       laterChoices = laterChoices == null
           ? null
           : List.unmodifiable(laterChoices) {
    if (rules.destination is LateJoinConfirmedProgress) {
      throw const FormatException(
        'Choose a concrete practice joining destination.',
      );
    }
    if (routes.isEmpty ||
        routes.length > 3 ||
        routes.toSet().length != routes.length) {
      throw const FormatException('Choose distinct practice message routes.');
    }
    if (responseDeadline != null) assistanceInteger(responseDeadline);
    if (rules.unanswered == LateJoinUnansweredRule.hostReviewAtDeadline &&
        responseDeadline == null) {
      throw const FormatException('Choose a practice response deadline.');
    }
    if (laterChoices != null &&
        (laterChoices.length > 17 ||
            laterChoices.map((choice) => choice.target).toSet().length !=
                laterChoices.length)) {
      throw const FormatException(
        'Practice joining choices must have unique destinations.',
      );
    }
  }
  factory RehearsalAssistancePlan.fromJson(Object? value) {
    final object = assistanceObject(value);
    final map = assistanceObject(object, {
      'policy',
      'guidance',
      'departureConfirmed',
      'responseDeadline',
      'routes',
      'deliveryPolicy',
      if (object.containsKey('setting')) 'setting',
      if (object.containsKey('laterChoices')) 'laterChoices',
    });
    final routes = map['routes'];
    final later = map['laterChoices'];
    if (routes is! List ||
        object.containsKey('laterChoices') && later is! List) {
      throw const FormatException('Invalid practice plan choices.');
    }
    return RehearsalAssistancePlan(
      rules: AssistanceLateJoinRules.fromJson(map['policy']),
      guidance: AssistanceJoiningGuidance.fromJson(map['guidance']),
      departureConfirmed: assistanceBoolean(map['departureConfirmed']),
      responseDeadline: assistanceNullableInteger(map['responseDeadline']),
      routes: routes
          .map((route) => assistanceEnum(AssistanceMessageRoute.values, route))
          .toList(growable: false),
      deliveryPolicy: AssistanceDeliveryPolicy.fromJson(map['deliveryPolicy']),
      setting: object.containsKey('setting')
          ? AssistanceTemplateSetting.fromJson(map['setting'])
          : null,
      laterChoices: later == null
          ? null
          : (later as List)
                .map(AssistanceLaterJoiningChoice.fromJson)
                .toList(growable: false),
    );
  }

  final AssistanceLateJoinRules rules;
  final AssistanceJoiningGuidance guidance;
  final bool departureConfirmed;
  final int? responseDeadline;
  final List<AssistanceMessageRoute> routes;
  final AssistanceDeliveryPolicy deliveryPolicy;
  // Absence keeps earlier recipes executable without changing their wire hash.
  final AssistanceTemplateSetting? setting;
  AssistanceTemplateSetting get effectiveSetting =>
      setting ??
      const AssistanceTemplateEnabled(
        AssistanceTemplateAuthority.executeWithinPolicy,
      );
  final List<AssistanceLaterJoiningChoice>? laterChoices;

  Map<String, Object?> toJson() => {
    'policy': rules.toJson(),
    'guidance': _guidanceJson(guidance),
    'departureConfirmed': departureConfirmed,
    'responseDeadline': responseDeadline,
    'routes': routes.map((route) => route.name).toList(growable: false),
    'deliveryPolicy': deliveryPolicy.toJson(),
    if (setting != null) 'setting': setting!.toJson(),
    if (laterChoices != null)
      'laterChoices': laterChoices!
          .map((choice) => choice.toJson())
          .toList(growable: false),
  };
}

Map<String, Object?> _guidanceJson(AssistanceJoiningGuidance guidance) => {
  'revision': guidance.revision,
  'destination': guidance.destination.toJson(),
  'materialKey': guidance.materialKey,
  'text': guidance.text,
  'validUntil': guidance.validUntil,
};
