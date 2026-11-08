import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:flutter/foundation.dart';

/// Where grouping is: still reading, ready, or unable to read the rules.
enum HostFormatsRulesStatus { loading, ready, error }

/// One saved rule with the question it reads and how many agreed.
@immutable
class HostFormatsRule {
  const HostFormatsRule({
    required this.rule,
    required this.question,
    required this.formTitle,
    this.coverage,
  });

  final EventSuccessAssignmentFeatureRule rule;
  final String question;
  final String formTitle;
  final EventSuccessAssignmentFeatureCoverage? coverage;
}

/// Everything grouping shows, as plain values.
@immutable
class HostFormatsRulesState {
  const HostFormatsRulesState({
    required this.status,
    this.rules = const <HostFormatsRule>[],
    this.sources = const <EventSuccessAssignmentFeatureSource>[],
    this.rosterCount = 0,
    this.revision = 0,
    this.error,
  });

  const HostFormatsRulesState.loading()
    : this(status: HostFormatsRulesStatus.loading);

  final HostFormatsRulesStatus status;
  final List<HostFormatsRule> rules;

  /// The published booking-form questions a rule can use.
  final List<EventSuccessAssignmentFeatureSource> sources;

  /// Everyone on the event's roster now.
  final int rosterCount;

  /// The plan's rule revision, the fence for saving.
  final int revision;
  final Object? error;

  /// A question can become a rule: one with choices or a number.
  bool get canAdd => sources.any(
    (source) => source.questions.any(
      (q) => const {'singleChoice', 'multiChoice', 'number'}.contains(q.kind),
    ),
  );
}
