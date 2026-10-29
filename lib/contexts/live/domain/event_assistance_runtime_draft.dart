import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';

enum AssistanceRuntimeDraftIssue {
  eventClosed,
  noChannels,
  senderUnavailable,
  expiry,
  deadline,
}

/// A local proposal. Opening the form never grants permission or picks a sender.
final class AssistanceRuntimeDraft {
  AssistanceRuntimeDraft({
    required List<AssistanceRuntimeRoute> routes,
    required this.expiresAt,
    required this.responseDeadline,
    required this.deliveryPolicy,
    required this.maxEvaluations,
    required List<AssistanceLaterJoiningChoice>? laterChoices,
  }) : routes = List.unmodifiable(routes),
       laterChoices = laterChoices == null
           ? null
           : List.unmodifiable(laterChoices);
  factory AssistanceRuntimeDraft.fromView(AssistanceRuntimeView view) {
    final saved = view.runtime?.configuration;
    return AssistanceRuntimeDraft(
      routes: saved?.routes ?? [],
      expiresAt: saved?.expiresAt ?? view.eventEnd,
      responseDeadline: saved?.responseDeadline,
      deliveryPolicy:
          saved?.deliveryPolicy ??
          AssistanceDeliveryPolicy(
            maxAttempts: 3,
            maxAttemptsPerRoute: 1,
            minimumRetrySeconds: 30,
          ),
      maxEvaluations: saved?.maxEvaluations ?? 1000,
      laterChoices: saved?.laterChoices,
    );
  }
  final List<AssistanceRuntimeRoute> routes;
  final int expiresAt;
  final int? responseDeadline;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final int maxEvaluations;
  final List<AssistanceLaterJoiningChoice>? laterChoices;

  AssistanceRuntimeDraft withRoute(
    int index,
    AssistanceRuntimeSenderChoice? choice,
  ) {
    if (index < 0 || index > routes.length || index >= 3) {
      throw RangeError.index(index, routes);
    }
    final next = [...routes];
    if (choice == null) {
      if (index < next.length) next.removeAt(index);
    } else {
      if (!choice.canSelect ||
          next.indexed.any(
            (r) => r.$1 != index && r.$2.route == choice.route,
          )) {
        throw const FormatException('Choose an available, unused channel.');
      }
      final route = AssistanceRuntimeRoute(
        route: choice.route,
        senderId: choice.senderId,
      );
      if (index == next.length) {
        next.add(route);
      } else {
        next[index] = route;
      }
    }
    return _copy(routes: next);
  }

  AssistanceRuntimeDraft withExpiry(int at) => _copy(expiresAt: at);
  AssistanceRuntimeDraft withDeadline(int? at) => AssistanceRuntimeDraft(
    routes: routes,
    expiresAt: expiresAt,
    responseDeadline: at,
    deliveryPolicy: deliveryPolicy,
    maxEvaluations: maxEvaluations,
    laterChoices: laterChoices,
  );
  AssistanceRuntimeDraft withDelivery(AssistanceDeliveryPolicy policy) =>
      _copy(deliveryPolicy: policy);
  AssistanceRuntimeDraft _copy({
    List<AssistanceRuntimeRoute>? routes,
    int? expiresAt,
    AssistanceDeliveryPolicy? deliveryPolicy,
  }) => AssistanceRuntimeDraft(
    routes: routes ?? this.routes,
    expiresAt: expiresAt ?? this.expiresAt,
    responseDeadline: responseDeadline,
    deliveryPolicy: deliveryPolicy ?? this.deliveryPolicy,
    maxEvaluations: maxEvaluations,
    laterChoices: laterChoices,
  );

  AssistanceRuntimeDraftIssue? issueFor(
    AssistanceRuntimeView view,
    List<AssistanceRuntimeSenderChoice> choices,
  ) {
    if (!view.canConfigure) return AssistanceRuntimeDraftIssue.eventClosed;
    if (routes.isEmpty) return AssistanceRuntimeDraftIssue.noChannels;
    if (routes.any(
      (r) =>
          choices
              .where(
                (c) =>
                    c.scope == view.scope &&
                    c.route == r.route &&
                    c.senderId == r.senderId &&
                    c.canSelect,
              )
              .length !=
          1,
    )) {
      return AssistanceRuntimeDraftIssue.senderUnavailable;
    }
    if (expiresAt <= view.serverTime || expiresAt > view.eventEnd) {
      return AssistanceRuntimeDraftIssue.expiry;
    }
    if (responseDeadline != null &&
        (responseDeadline! <= view.serverTime ||
            responseDeadline! > expiresAt)) {
      return AssistanceRuntimeDraftIssue.deadline;
    }
    return null;
  }

  AssistanceRuntimeConfiguration configurationFor(
    AssistanceRuntimeView view,
    List<AssistanceRuntimeSenderChoice> choices,
  ) {
    if (issueFor(view, choices) != null) {
      throw StateError('Review the automation choices.');
    }
    return AssistanceRuntimeConfiguration(
      routes: routes,
      responseDeadline: responseDeadline,
      deliveryPolicy: deliveryPolicy,
      expiresAt: expiresAt,
      maxEvaluations: maxEvaluations,
      laterChoices: laterChoices,
    );
  }
}
