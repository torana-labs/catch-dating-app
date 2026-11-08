import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One function on the schedule: its start time, name and venue, and how
/// many of the guests it invites are coming, as a line and a bar.
class ProgrammeFunctionRow extends StatelessWidget {
  const ProgrammeFunctionRow({
    super.key,
    required this.function,
    required this.replies,
    required this.onTap,
  });

  final OrganizerFunctionDetail function;

  /// Null while the guest list is still on its way.
  final HostProgrammeFunctionReplies? replies;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final replies = this.replies;
    final cancelled = function.status == ProgramFunctionStatus.cancelled;
    return CatchIndexRow(
      time: AppTimeFormatters.time(function.startsAt),
      title: function.name,
      status: cancelled ? l10n.hostProgrammeFunctionCancelled : null,
      statusTone: CatchIndexRowTone.danger,
      meta: function.venueName,
      subtitle: replies == null || cancelled
          ? null
          : l10n.hostProgrammeFunctionReplies(
              coming: replies.coming,
              invited: replies.invited,
              waiting: replies.noReply,
            ),
      progress: replies == null || cancelled || replies.invited == 0
          ? null
          : CatchIndexRowProgress(
              value: replies.coming,
              max: replies.invited,
              label: l10n.hostProgrammeFunctionRepliesLabel(
                name: function.name,
                coming: replies.coming,
                invited: replies.invited,
              ),
            ),
      emphasis: cancelled
          ? CatchIndexRowEmphasis.done
          : CatchIndexRowEmphasis.regular,
      onTap: onTap,
    );
  }
}
