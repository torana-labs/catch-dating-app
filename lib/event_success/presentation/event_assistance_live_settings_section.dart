import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_setting_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_settings.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_sheet.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A compact event default with group overrides disclosed only on request.
class EventAssistanceLiveSettingsSection extends ConsumerWidget {
  const EventAssistanceLiveSettingsSection({super.key, required this.event});
  final Event event;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final runtimeScope = EventAssistanceRuntimeScope(
      organizerId: event.clubId,
      eventId: event.id,
    );
    final runtimeState = ref.watch(
      eventAssistanceRuntimeEditorProvider(runtimeScope),
    );
    final runtimePending =
        runtimeState is AssistanceRuntimeForm &&
        {
          AssistanceRuntimeEditorPhase.submitting,
          AssistanceRuntimeEditorPhase.retryRequired,
        }.contains(runtimeState.phase);
    final route = event.eventFormat.routePlan;
    final groups = route?.groupStrategy == RouteGroupStrategy.paceGroups
        ? route!.paceGroups
        : const <RoutePaceGroup>[];
    final pending = ref
        .watch(eventAssistancePendingSettingsProvider)
        .where((s) => s.eventId == event.id && s.organizerId == event.clubId);
    String groupLabel(String id) => id == 'event:whole'
        ? l10n.eventAssistanceLateJoinEveryone
        : groups.where((g) => g.id == id).firstOrNull?.label ??
              l10n.eventAssistanceLateJoinPreviousGroup;
    void open(String groupId) {
      final scope = EventAssistanceGroupScope(
        organizerId: event.clubId,
        eventId: event.id,
        groupId: groupId,
      );
      final query = eventAssistanceLateJoinSettingProvider(scope);
      if (ref.exists(query)) ref.read(query.notifier).reload();
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => EventAssistanceLateJoinSheet(
          scope: scope,
          groupLabel: groupLabel(groupId),
        ),
      );
    }

    return CatchSection.fieldRows(
      title: l10n.eventAssistanceLateJoinSettings,
      children: [
        CatchField.nav(
          copy: catchFieldCopy(l10n),
          key: const ValueKey('runtime.open'),
          title: runtimePending
              ? l10n.eventAssistanceRuntimePending
              : l10n.eventAssistanceRuntimeTitle,
          body: l10n.eventAssistanceRuntimeEntryBody,
          onTap: () {
            final query = eventAssistanceRuntimeProvider(runtimeScope);
            if (ref.exists(query)) ref.read(query.notifier).reload();
            showCatchBottomSheet<void>(
              context: context,
              builder: (_) => EventAssistanceRuntimeSheet(scope: runtimeScope),
            );
          },
        ),
        for (final scope in pending)
          CatchField.nav(
            copy: catchFieldCopy(l10n),
            key: ValueKey('lateJoin.pending.${scope.groupId}'),
            title: l10n.eventAssistanceLateJoinPending,
            body: groupLabel(scope.groupId),
            onTap: () => open(scope.groupId),
          ),
        CatchField.nav(
          copy: catchFieldCopy(l10n),
          key: const ValueKey('lateJoin.open'),
          title: l10n.eventAssistanceLateJoinTitle,
          body: l10n.eventAssistanceLateJoinEntryBody,
          onTap: () => open('event:whole'),
        ),
        if (groups.isNotEmpty)
          CatchField.control(
            copy: catchFieldCopy(l10n),
            title: l10n.eventAssistanceLateJoinGroupOverrides,
            contractExemption:
                'Navigation to a current group; the opened settings review authorizes changes.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchText(
                  l10n.eventAssistanceLateJoinChooseScope,
                  variant: CatchTextVariant.supporting,
                ),
                for (final group in groups)
                  CatchField.nav(
                    copy: catchFieldCopy(l10n),
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
