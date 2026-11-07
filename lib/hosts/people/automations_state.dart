import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:flutter/foundation.dart';

/// Where Automatic messages is: still reading, showing the rules, or unable
/// to read them.
enum HostAutomationsStatus { loading, ready, error }

/// The organizer's automatic messages: whether WhatsApp is connected, the
/// rules grouped as the board groups them, and how many ran this month.
@immutable
class HostAutomationsState {
  const HostAutomationsState({
    required this.status,
    this.whatsappOn,
    this.aroundEvents = const <HostFormAutomationRule>[],
    this.keepingPeople = const <HostFormAutomationRule>[],
    this.sentThisMonth = 0,
    this.sentMore = false,
    this.error,
  });

  const HostAutomationsState.loading()
    : this(status: HostAutomationsStatus.loading);

  final HostAutomationsStatus status;

  /// A WhatsApp sender is connected and active; null while reading.
  final bool? whatsappOn;

  /// Rules that run on a night: someone came, or an application was let in.
  final List<HostFormAutomationRule> aroundEvents;

  /// Rules that run on form answers.
  final List<HostFormAutomationRule> keepingPeople;

  /// Runs that finished this month, in the latest page of runs.
  final int sentThisMonth;

  /// More runs exist than the page read, so [sentThisMonth] is a floor.
  final bool sentMore;

  final Object? error;

  int get onCount =>
      [...aroundEvents, ...keepingPeople].where((rule) => rule.enabled).length;

  bool get isEmpty => aroundEvents.isEmpty && keepingPeople.isEmpty;
}

/// Whether a rule runs around a night rather than on a form answer.
bool hostAutomationRunsAroundEvents(HostFormAutomationTrigger trigger) =>
    switch (trigger) {
      HostFormAutomationTrigger.eventAttended ||
      HostFormAutomationTrigger.applicationAccepted => true,
      HostFormAutomationTrigger.responseSubmitted ||
      HostFormAutomationTrigger.responseWithdrawn ||
      HostFormAutomationTrigger.answerMatches => false,
    };
