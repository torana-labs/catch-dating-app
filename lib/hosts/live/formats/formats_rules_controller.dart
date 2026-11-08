import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_rules_controller.g.dart';

/// The grouping rules as the server previews them: the published booking
/// questions, the saved rules and how many guests agreed to each answer
/// being used. There is no listener for this; the read is the existing
/// `previewEventAssignmentFeatures`, asked once for the saved rules and
/// again with them so their coverage comes back.
@riverpod
Future<EventSuccessAssignmentFeaturePreview> hostFormatsRulesPreview(
  Ref ref,
  String eventId,
) async {
  final controller = ref.read(eventSuccessControllerProvider.notifier);
  final first = await controller.previewAssignmentFeatures(
    eventId: eventId,
    rules: const [],
  );
  if (first.savedRules.isEmpty) return first;
  return controller.previewAssignmentFeatures(
    eventId: eventId,
    rules: first.savedRules,
  );
}

/// Grouping, from the preview.
@riverpod
HostFormatsRulesState hostFormatsRulesController(Ref ref, Event event) {
  final value = ref.watch(hostFormatsRulesPreviewProvider(event.id));
  return switch (value) {
    AsyncValue(:final value?) => hostFormatsRulesState(value),
    AsyncValue(:final error?) => HostFormatsRulesState(
      status: HostFormatsRulesStatus.error,
      error: error,
    ),
    _ => const HostFormatsRulesState.loading(),
  };
}

/// Grouping from one preview.
HostFormatsRulesState hostFormatsRulesState(
  EventSuccessAssignmentFeaturePreview preview,
) {
  final coverage = {for (final row in preview.coverage) row.featureId: row};
  String? questionFor(EventSuccessAssignmentFeatureRule rule) {
    for (final source in preview.sources) {
      if (source.formId != rule.formId) continue;
      for (final question in source.questions) {
        if (question.questionId == rule.questionId) return question.label;
      }
    }
    return null;
  }

  String formFor(EventSuccessAssignmentFeatureRule rule) =>
      preview.sources
          .where((source) => source.formId == rule.formId)
          .firstOrNull
          ?.formTitle ??
      '';
  return HostFormatsRulesState(
    status: HostFormatsRulesStatus.ready,
    rules: List.unmodifiable([
      for (final rule in preview.savedRules)
        HostFormatsRule(
          rule: rule,
          question: questionFor(rule) ?? rule.questionId,
          formTitle: formFor(rule),
          coverage: coverage[rule.featureId],
        ),
    ]),
    sources: preview.sources,
    rosterCount: preview.rosterCount,
    revision: preview.revision,
  );
}
