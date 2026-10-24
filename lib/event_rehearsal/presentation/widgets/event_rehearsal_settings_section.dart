import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_settings.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Uses the actual runtime's settings slot and only discloses current groups.
class EventRehearsalSettingsSection extends ConsumerWidget {
  const EventRehearsalSettingsSection({
    super.key,
    required this.sessionId,
    required this.review,
  });
  final String sessionId;
  final RehearsalSettingsReview review;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final state = ref.watch(
      eventRehearsalSettingsControllerProvider(sessionId),
    );
    final pending =
        state is RehearsalSettingsForm &&
        {
          RehearsalSettingsPhase.submitting,
          RehearsalSettingsPhase.retryRequired,
        }.contains(state.phase);
    void open(String? groupId) {
      final query = eventRehearsalAssistanceProvider(sessionId);
      if (!pending) {
        ref
            .read(eventRehearsalSettingsControllerProvider(sessionId).notifier)
            .close();
        if (ref.exists(query)) ref.read(query.notifier).reload();
      }
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) =>
            EventRehearsalSettingsSheet(sessionId: sessionId, groupId: groupId),
      );
    }

    return CatchSection.fieldRows(
      title: l.eventAssistanceLateJoinSettings,
      children: [
        if (pending)
          CatchField.nav(
            copy: catchFieldCopy(l),
            key: const ValueKey('practice.pendingSettings'),
            title: l.eventAssistanceRuntimePending,
            onTap: () => open(null),
          ),
        CatchField.nav(
          copy: catchFieldCopy(l),
          key: const ValueKey('practice.openRuntime'),
          title: l.eventAssistanceRuntimeTitle,
          body: l.hostEventRehearsalUpdatesEntry,
          onTap: () => open(null),
        ),
        CatchField.nav(
          copy: catchFieldCopy(l),
          key: const ValueKey('practice.openRule'),
          title: l.eventAssistanceLateJoinTitle,
          body: l.eventAssistanceLateJoinEntryBody,
          onTap: () => open('event:whole'),
        ),
        if (review.groups.length > 1)
          CatchField.control(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceLateJoinGroupOverrides,
            contractExemption:
                'Navigation to a group from the current practice projection; a separate account-bound review authorizes any save.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchText(
                  l.eventAssistanceLateJoinChooseScope,
                  variant: CatchTextVariant.supporting,
                ),
                for (final group in review.groups.values.where(
                  (g) => g.id != 'event:whole',
                ))
                  CatchField.nav(
                    copy: catchFieldCopy(l),
                    title: group.label,
                    onTap: () => open(group.id),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
