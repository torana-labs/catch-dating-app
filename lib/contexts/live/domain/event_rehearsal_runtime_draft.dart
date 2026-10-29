import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';

/// Incomplete local choices; only an explicit reviewed save enrolls practice guests.
final class RehearsalRuntimeDraft {
  RehearsalRuntimeDraft({
    required List<AssistanceMessageRoute> routes,
    required this.responseDeadline,
    required this.deliveryPolicy,
    required List<RehearsalDeliveryOutcome> outcomes,
    this.laterChoices,
  }) : routes = List.unmodifiable(routes),
       outcomes = List.unmodifiable(outcomes);
  factory RehearsalRuntimeDraft.fromConfiguration(
    RehearsalRuntimeConfiguration? value,
  ) => RehearsalRuntimeDraft(
    routes:
        value?.routes ??
        const [
          AssistanceMessageRoute.organizerEventWhatsapp,
          AssistanceMessageRoute.catchEventSms,
        ],
    responseDeadline: value?.responseDeadline,
    deliveryPolicy:
        value?.deliveryPolicy ??
        AssistanceDeliveryPolicy(
          maxAttempts: 3,
          maxAttemptsPerRoute: 1,
          minimumRetrySeconds: 60,
        ),
    outcomes:
        value?.outcomes ??
        const [
          RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
        ],
    laterChoices: value?.laterChoices,
  );
  final List<AssistanceMessageRoute> routes;
  final int? responseDeadline;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final List<RehearsalDeliveryOutcome> outcomes;
  final List<AssistanceLaterJoiningChoice>? laterChoices;

  RehearsalRuntimeDraft copy({
    List<AssistanceMessageRoute>? routes,
    AssistanceDeliveryPolicy? deliveryPolicy,
    List<RehearsalDeliveryOutcome>? outcomes,
  }) => RehearsalRuntimeDraft(
    routes: routes ?? this.routes,
    responseDeadline: responseDeadline,
    deliveryPolicy: deliveryPolicy ?? this.deliveryPolicy,
    outcomes: outcomes ?? this.outcomes,
    laterChoices: laterChoices,
  );
  RehearsalRuntimeDraft withDeadline(int? at) => RehearsalRuntimeDraft(
    routes: routes,
    responseDeadline: at,
    deliveryPolicy: deliveryPolicy,
    outcomes: outcomes,
    laterChoices: laterChoices,
  );
  RehearsalRuntimeDraft withRoute(int index, AssistanceMessageRoute? route) {
    final values = [...routes];
    if (index < 0 ||
        index > values.length ||
        index > 2 ||
        values.indexed.any((v) => v.$1 != index && v.$2 == route)) {
      return this;
    }
    if (route == null) {
      if (index < values.length) values.removeAt(index);
    } else if (index == values.length) {
      values.add(route);
    } else {
      values[index] = route;
    }
    return copy(routes: values);
  }

  RehearsalRuntimeConfiguration configuration() =>
      RehearsalRuntimeConfiguration(
        routes: routes,
        responseDeadline: responseDeadline,
        deliveryPolicy: deliveryPolicy,
        outcomes: outcomes,
        laterChoices: laterChoices,
      );

  /// Uses the same complete validation as the eventual immutable command.
  bool canConfigure(EventRehearsalBootstrap snapshot) {
    try {
      RehearsalSettingsChange(
        snapshot: snapshot,
        decision: RehearsalConfigureUpdates(configuration()),
        clientActionId: 'draft_validation',
      );
      return true;
    } on FormatException {
      return false;
    }
  }

  static int consumedPrefix(EventRehearsalBootstrap snapshot) =>
      snapshot.actors.fold(0, (count, actor) {
        final recipe = actor.assistanceAutomation;
        return recipe != null &&
                recipe.inheritsEventSettings &&
                recipe.nextOutcomeIndex > count
            ? recipe.nextOutcomeIndex
            : count;
      });
}

/// Stable choice keys preserve every supported outcome, including uncertainty.
String rehearsalOutcomeKey(RehearsalDeliveryOutcome outcome) =>
    jsonEncode(outcome.toJson());
const rehearsalOutcomeChoices = <RehearsalDeliveryOutcome>[
  RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
  RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.read),
  RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.accepted),
  RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.revoked),
  RehearsalDeliveryFailed(RehearsalDeliveryFailure.technical),
  RehearsalDeliveryFailed(RehearsalDeliveryFailure.policy),
  RehearsalDeliveryFailed(RehearsalDeliveryFailure.suppressed),
  RehearsalDeliveryFailed(RehearsalDeliveryFailure.invalidRecipient),
  RehearsalDeliveryUnknown(RehearsalDeliveryUncertainty.timeout),
  RehearsalDeliveryUnknown(RehearsalDeliveryUncertainty.connectionLost),
  RehearsalDeliveryUnknown(RehearsalDeliveryUncertainty.workerInterrupted),
];
