import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';

/// A household's answer for one function as the grid's badge: "4/4" when
/// everyone invited is coming, "3/4" when some are, "Maybe", "?" for no
/// reply and "–" when nobody there was invited.
CatchBadge programmeCellBadge(AppLocalizations l10n, HostProgrammeCell cell) {
  final count = l10n.hostProgrammeCellCount(
    coming: cell.coming,
    invited: cell.invited,
  );
  return switch (cell.kind) {
    HostProgrammeCellKind.everyone => CatchBadge(
      label: count,
      tone: CatchBadgeTone.success,
      emphasis: CatchBadgeEmphasis.solid,
      semanticLabel: l10n.hostProgrammeKeyEveryone,
    ),
    HostProgrammeCellKind.some => CatchBadge(
      label: count,
      tone: CatchBadgeTone.success,
      semanticLabel: l10n.hostProgrammeKeySome,
    ),
    HostProgrammeCellKind.maybe => CatchBadge(
      label: l10n.hostProgrammeCellMaybe,
      tone: CatchBadgeTone.warning,
      emphasis: CatchBadgeEmphasis.solid,
      semanticLabel: l10n.hostProgrammeKeyMaybe,
    ),
    HostProgrammeCellKind.noReply => CatchBadge(
      label: l10n.hostProgrammeCellNoReply,
      emphasis: CatchBadgeEmphasis.outline,
      semanticLabel: l10n.hostProgrammeKeyNoReply,
    ),
    HostProgrammeCellKind.none => CatchBadge(
      label: count,
      semanticLabel: l10n.hostProgrammeKeyNone,
    ),
    HostProgrammeCellKind.notInvited => CatchBadge(
      label: l10n.hostProgrammeCellNotInvited,
      semanticLabel: l10n.hostProgrammeKeyNotInvited,
    ),
  };
}

/// One guest's answer for one function as a badge: Yes, Maybe, No, "?" or
/// "–".
CatchBadge programmeReplyBadge(
  AppLocalizations l10n,
  HostProgrammeReply reply,
) => switch (reply) {
  HostProgrammeReply.coming => CatchBadge(
    label: l10n.hostProgrammeReplyYes,
    tone: CatchBadgeTone.success,
    emphasis: CatchBadgeEmphasis.solid,
  ),
  HostProgrammeReply.maybe => CatchBadge(
    label: l10n.hostProgrammeCellMaybe,
    tone: CatchBadgeTone.warning,
    emphasis: CatchBadgeEmphasis.solid,
  ),
  HostProgrammeReply.declined => CatchBadge(label: l10n.hostProgrammeReplyNo),
  HostProgrammeReply.noReply => CatchBadge(
    label: l10n.hostProgrammeCellNoReply,
    emphasis: CatchBadgeEmphasis.outline,
    semanticLabel: l10n.hostProgrammeKeyNoReply,
  ),
  HostProgrammeReply.notInvited => CatchBadge(
    label: l10n.hostProgrammeCellNotInvited,
    semanticLabel: l10n.hostProgrammeKeyNotInvited,
  ),
};
