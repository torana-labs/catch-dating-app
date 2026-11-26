import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One function's row in the answers sheet: its name and what the guest
/// answered for it.
@immutable
class HostProgrammeAnswer {
  const HostProgrammeAnswer({
    required this.functionId,
    required this.name,
    required this.reply,
  });

  final String functionId;
  final String name;
  final HostProgrammeReply reply;
}

/// One guest's answer for every function, each changeable: Yes, Maybe, No
/// or No reply. A change goes to [onAnswer] at once, which records it with
/// `recordProgramFunctionRsvp`; a function the guest was not invited to
/// takes an answer too, the way the old guest list allowed.
class HostProgrammeAnswersSheet extends StatefulWidget {
  const HostProgrammeAnswersSheet({
    super.key,
    required this.guestName,
    required this.answers,
    required this.onAnswer,
    this.household,
  });

  final String guestName;
  final String? household;
  final List<HostProgrammeAnswer> answers;

  /// Records [reply] for the function; completes with false when the write
  /// failed, so the sheet keeps the old answer.
  final Future<bool> Function(String functionId, HostProgrammeReply reply)
  onAnswer;

  @override
  State<HostProgrammeAnswersSheet> createState() =>
      _HostProgrammeAnswersSheetState();
}

class _HostProgrammeAnswersSheetState extends State<HostProgrammeAnswersSheet> {
  late final Map<String, HostProgrammeReply> _replies = {
    for (final answer in widget.answers) answer.functionId: answer.reply,
  };
  String? _saving;

  Future<void> _choose(String functionId, HostProgrammeReply reply) async {
    if (_saving != null || _replies[functionId] == reply) return;
    setState(() => _saving = functionId);
    final saved = await widget.onAnswer(functionId, reply);
    if (!mounted) return;
    setState(() {
      _saving = null;
      if (saved) _replies[functionId] = reply;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      key: const ValueKey<String>('host-programme-answers-sheet'),
      title: widget.guestName,
      subtitle: widget.household,
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          for (final answer in widget.answers)
            CatchStack(
              key: ValueKey<String>(
                'host-programme-answer-${answer.functionId}',
              ),
              gap: CatchStackGap.g6,
              children: [
                CatchText(answer.name, variant: CatchTextVariant.labelAction),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g6,
                  wrap: true,
                  children: [
                    for (final reply in hostProgrammeAnswerChoices)
                      CatchChip.choice(
                        key: ValueKey<String>(
                          'host-programme-answer-${answer.functionId}-${reply.name}',
                        ),
                        label: switch (reply) {
                          HostProgrammeReply.coming =>
                            l10n.hostProgrammeReplyYes,
                          HostProgrammeReply.maybe =>
                            l10n.hostProgrammeCellMaybe,
                          HostProgrammeReply.declined =>
                            l10n.hostProgrammeReplyNo,
                          _ => l10n.hostProgrammeKeyNoReply,
                        },
                        selected: _replies[answer.functionId] == reply,
                        mode: CatchChipMode.single,
                        size: CatchChipSize.sm,
                        onPressed: _saving != null
                            ? null
                            : () => _choose(answer.functionId, reply),
                      ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// The answers a planner can record, in the order the sheet offers them.
const hostProgrammeAnswerChoices = [
  HostProgrammeReply.coming,
  HostProgrammeReply.maybe,
  HostProgrammeReply.declined,
  HostProgrammeReply.noReply,
];

/// The `recordProgramFunctionRsvp` status for [reply].
String hostProgrammeRsvpStatus(HostProgrammeReply reply) => switch (reply) {
  HostProgrammeReply.coming => 'attending',
  HostProgrammeReply.maybe => 'maybe',
  HostProgrammeReply.declined => 'declined',
  HostProgrammeReply.noReply || HostProgrammeReply.notInvited => 'pending',
};
