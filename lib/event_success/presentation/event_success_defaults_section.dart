import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventSuccessDefaultsUpdate =
    EventSuccessDefaults Function(EventSuccessDefaults current);

/// Create-event panel that lets the host enable the live event guide and tune
/// the saved defaults inline. The configuration UI is shared with the Host
/// Manage Setup tab via [EventSuccessSetupBody].
class EventSuccessDefaultsSection extends StatelessWidget {
  const EventSuccessDefaultsSection({
    super.key,
    required this.defaults,
    required this.activityKind,
    required this.onChanged,
    required this.title,
    required this.subtitle,
    this.eventFormat,
    this.targetAttendeeCount,
    this.showEnableToggle = true,
  });

  final EventSuccessDefaults defaults;
  final ActivityKind activityKind;
  final ValueChanged<EventSuccessDefaultsUpdate> onChanged;
  final EventFormatSnapshot? eventFormat;
  final int? targetAttendeeCount;
  final bool showEnableToggle;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final format =
        eventFormat ?? EventFormatSnapshot.fromActivityKind(activityKind);
    final normalized = defaults.normalizedForFormat(
      format,
      targetAttendeeCount: targetAttendeeCount,
    );
    final draft = normalized.toDraft(targetAttendeeCount: targetAttendeeCount);

    void updateDraft(EventSuccessHostDraftUpdate update) {
      onChanged((current) {
        final currentNormalized = current.normalizedForFormat(
          format,
          targetAttendeeCount: targetAttendeeCount,
        );
        final currentDraft = currentNormalized.toDraft(
          targetAttendeeCount: targetAttendeeCount,
        );
        return EventSuccessDefaults.fromDraft(
          update(currentDraft),
          enabled: currentNormalized.enabled,
          attendeePrompt: currentNormalized.attendeePrompt,
        ).normalizedForFormat(format, targetAttendeeCount: targetAttendeeCount);
      });
    }

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        if (showEnableToggle)
          CatchFieldLanes.divided(
            children: [
              CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: title,
                contract: CatchContractConstraints
                    .createClubCallablePayloadHostDefaultsEventSuccessEnabled,
                body: subtitle,
                bodyMaxLines: 5,
                value: normalized.enabled,
                onChanged: (value) =>
                    onChanged((current) => current.copyWith(enabled: value)),
              ),
            ],
          ),
        if (normalized.enabled)
          EventSuccessSetupBody(
            draft: draft,
            eventFormat: format,
            targetAttendeeCount: draft.targetAttendeeCount,
            attendeePrompt: normalized.attendeePrompt,
            showResetToRecommended: !_matchesRecommendedSetup(
              normalized,
              format,
              targetAttendeeCount,
            ),
            onResetToRecommended: () => onChanged(
              (current) => EventSuccessDefaults.recommendedForFormat(
                format,
                enabled: current.enabled,
                targetAttendeeCount: targetAttendeeCount,
                attendeePrompt: current.attendeePrompt,
              ),
            ),
            onChanged: updateDraft,
            onAttendeePromptChanged: (value) {
              final trimmed = value.trim();
              onChanged(
                (current) => current.copyWith(
                  attendeePrompt: trimmed.isEmpty ? null : trimmed,
                ),
              );
            },
          ),
      ],
    );
  }
}

bool _matchesRecommendedSetup(
  EventSuccessDefaults defaults,
  EventFormatSnapshot format,
  int? targetAttendeeCount,
) {
  final recommended = EventSuccessDefaults.recommendedForFormat(
    format,
    enabled: defaults.enabled,
    targetAttendeeCount: targetAttendeeCount,
    attendeePrompt: defaults.attendeePrompt,
  );
  final draft = defaults.toDraft(targetAttendeeCount: targetAttendeeCount);
  final recommendedDraft = recommended.toDraft(
    targetAttendeeCount: targetAttendeeCount,
  );
  return draft.playbook.id == recommendedDraft.playbook.id &&
      _sameStringSet(
        draft.selectedModuleIds,
        recommendedDraft.selectedModuleIds,
      ) &&
      draft.structureConfig == recommendedDraft.structureConfig &&
      draft.hostGoal == recommendedDraft.hostGoal &&
      draft.compatibilityAffectsRanking ==
          recommendedDraft.compatibilityAffectsRanking &&
      draft.questionnaireConfig == recommendedDraft.questionnaireConfig;
}

bool _sameStringSet(Set<String> a, Set<String> b) {
  return a.length == b.length && a.containsAll(b);
}
