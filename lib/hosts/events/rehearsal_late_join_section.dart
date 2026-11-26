import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_form.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Late joiners in practice tools: every made-up guest with where their
/// automatic updates stand and the latest directions they were sent.
/// Opening a guest opens the late joiner sheet, where the host publishes
/// directions or sets up, pauses or resumes their automatic updates.
///
/// It reads only [rehearsal] and writes nothing.
class HostRehearsalLateJoinSection extends StatelessWidget {
  const HostRehearsalLateJoinSection({
    super.key,
    required this.rehearsal,
    required this.onOpen,
  });

  final EventRehearsalBootstrap rehearsal;

  /// Opens the late joiner sheet for one made-up guest by actor id.
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actors = [...rehearsal.actors]
      ..sort((a, b) {
        // Guests with directions or automation first, then by name.
        final rank = _rank(a).compareTo(_rank(b));
        return rank != 0 ? rank : a.displayName.compareTo(b.displayName);
      });
    return CatchStack(
      key: const ValueKey<String>('host-rehearsal-late-join-section'),
      gap: CatchStackGap.g8,
      children: [
        CatchText(
          l10n.hostRehearsalLateJoinTitle,
          variant: CatchTextVariant.sectionTitle,
        ),
        CatchText(
          l10n.hostRehearsalLateJoinBody,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchSection(
          empty: l10n.eventAssistanceGroupNoGuests,
          children: [
            for (final actor in actors)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-rehearsal-late-join-${actor.actorId}',
                ),
                title: actor.displayName,
                subtitle: _subtitle(l10n, actor),
                leading: CatchAvatar.system(
                  size: CatchAvatarSize.sm,
                  name: actor.displayName,
                ),
                onTap: () => onOpen(actor.actorId),
              ),
          ],
        ),
      ],
    );
  }

  static int _rank(EventRehearsalActor actor) =>
      actor.assistanceAutomation != null || actor.assistanceMessage != null
      ? 0
      : 1;

  static String _subtitle(AppLocalizations l10n, EventRehearsalActor actor) {
    final status = hostRehearsalLateJoinStatusLabel(
      l10n,
      hostRehearsalLateJoinStatus(actor),
    );
    final automation = actor.assistanceAutomation;
    return [
      status,
      if (automation != null)
        l10n.hostRehearsalLateJoinOutcomesLeft(
          count: automation.remainingOutcomes,
        ),
      if (actor.assistanceMessage?.responseLabel case final reply?)
        l10n.hostRehearsalLateJoinReplied(choice: reply),
    ].join(' · ');
  }
}
