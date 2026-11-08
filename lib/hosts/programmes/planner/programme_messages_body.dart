import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Planned messages (RbHostProgramMessages): every programme moment on a
/// timeline, sent first, with what each is tied to and how many it sent.
class HostProgrammeMessagesBody extends StatelessWidget {
  const HostProgrammeMessagesBody({
    super.key,
    required this.status,
    required this.messages,
    required this.functions,
    required this.onOpen,
    required this.onPlan,
    required this.onRetry,
  });

  final HostProgrammeStatus status;
  final ProgramPlannedMessages? messages;
  final List<OrganizerFunctionDetail> functions;
  final ValueChanged<ProgramPlannedMessage> onOpen;
  final VoidCallback? onPlan;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final loaded = messages;
    if (status != HostProgrammeStatus.ready || loaded == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostProgrammeMessagesIntro,
          tone: CatchTextTone.secondary,
        ),
        CatchSection(
          timeline: true,
          dividers: CatchSectionPlacement.none,
          empty: l10n.hostProgrammeMessagesEmpty,
          children: [
            for (final message in loaded.messages)
              HostProgrammeMessageRow(
                key: ValueKey<String>(
                  'host-programme-message-${message.momentId}',
                ),
                message: message,
                functions: functions,
                onTap: () => onOpen(message),
              ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-message-plan'),
          label: l10n.hostProgrammeMessagesPlan,
          variant: CatchButtonVariant.secondary,
          leading: CatchIcon(CatchIcons.add),
          fullWidth: true,
          onPressed: onPlan,
        ),
      ],
    );
  }
}

/// One planned message: its state badge, name, when it goes and to whom.
class HostProgrammeMessageRow extends StatelessWidget {
  const HostProgrammeMessageRow({
    super.key,
    required this.message,
    required this.functions,
    required this.onTap,
  });

  final ProgramPlannedMessage message;
  final List<OrganizerFunctionDetail> functions;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final when = message.when;
    return CatchIndexRow(
      title: message.name,
      onTap: onTap,
      marker: switch (message.state) {
        ProgramMessageState.next => CatchIndexRowTone.info,
        ProgramMessageState.sent ||
        ProgramMessageState.done => CatchIndexRowTone.neutral,
        ProgramMessageState.paused => CatchIndexRowTone.warning,
        _ => null,
      },
      badge: CatchIndexRowBadge(
        label: hostProgrammeMessageStateLabel(l10n, message.state),
        tone: message.state == ProgramMessageState.next
            ? CatchBadgeTone.info
            : CatchBadgeTone.neutral,
        format: message.state == ProgramMessageState.next
            ? CatchFormat.nightsOut
            : null,
        dot: message.state == ProgramMessageState.next,
      ),
      subtitle: when == null
          ? hostProgrammeMessageTie(l10n, message, functions)
          : AppTimeFormatters.weekdayDayMonth(when),
      meta: message.sentCount > 0
          ? l10n.hostProgrammeMessagesSent(count: message.sentCount)
          : hostProgrammeMessageAudienceLabel(l10n, message.audience),
      chevron: onTap != null,
    );
  }
}

String hostProgrammeMessageStateLabel(
  AppLocalizations l10n,
  ProgramMessageState state,
) => switch (state) {
  ProgramMessageState.draft => l10n.hostProgrammeMessageStateDraft,
  ProgramMessageState.planned => l10n.hostProgrammeMessageStatePlanned,
  ProgramMessageState.next => l10n.hostProgrammeMessageStateNext,
  ProgramMessageState.sent ||
  ProgramMessageState.done => l10n.hostProgrammeMessageStateSent,
  ProgramMessageState.paused => l10n.hostProgrammeMessageStatePaused,
};

String hostProgrammeMessageAudienceLabel(
  AppLocalizations l10n,
  ProgramMessageAudience? audience,
) => switch (audience) {
  ProgramMessageAudience.notReplied => l10n.hostProgrammeMessageWhoNotReplied,
  ProgramMessageAudience.coming => l10n.hostProgrammeMessageWhoComing,
  ProgramMessageAudience.comingOrMaybe => l10n.hostProgrammeMessageWhoMaybe,
  _ => l10n.hostProgrammeMessageWhoEveryone,
};

/// "Tied to the Sangeet", "Tied to a flight" or "On a date".
String hostProgrammeMessageTie(
  AppLocalizations l10n,
  ProgramPlannedMessage message,
  List<OrganizerFunctionDetail> functions,
) => switch (message.anchorKind) {
  ProgramMessageAnchorKind.function => l10n.hostProgrammeMessageTiedTo(
    name:
        functions
            .where((function) => function.functionId == message.anchorId)
            .firstOrNull
            ?.name ??
        l10n.hostProgrammeMessageTieFunction,
  ),
  ProgramMessageAnchorKind.flight => l10n.hostProgrammeMessageTiedFlight,
  ProgramMessageAnchorKind.date => l10n.hostProgrammeMessageTieDate,
};
