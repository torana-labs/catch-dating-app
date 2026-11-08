import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_reply_badge.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One household in the reply grid: its name, side and groups, how many
/// guests it holds, and one badge per function underneath.
class ProgrammeHouseholdRow extends StatelessWidget {
  const ProgrammeHouseholdRow({
    super.key,
    required this.household,
    required this.onTap,
  });

  final HostProgrammeHousehold household;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: household.label,
      subtitle: household.groups.isEmpty ? null : household.groups.join(' · '),
      status: l10n.hostProgrammeGuestCount(count: household.members.length),
      footer: household.cells.isEmpty
          ? null
          : CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              gap: CatchStackGap.g4,
              children: [
                for (final cell in household.cells)
                  programmeCellBadge(l10n, cell),
              ],
            ),
      onTap: onTap,
    );
  }
}

/// The function names over the grid's badges, cut to fit their column.
class ProgrammeGridKicker extends StatelessWidget {
  const ProgrammeGridKicker({super.key, required this.names});

  final List<String> names;

  @override
  Widget build(BuildContext context) => CatchStack(
    direction: CatchStackDirection.row,
    equal: true,
    gap: CatchStackGap.g4,
    children: [
      for (final name in names)
        CatchText(
          name,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
          maxLines: 1,
        ),
    ],
  );
}

/// The reply key: what each badge in the grid means.
class ProgrammeReplyKey extends StatelessWidget {
  const ProgrammeReplyKey({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const sample = HostProgrammeCell(
      kind: HostProgrammeCellKind.everyone,
      coming: 4,
      invited: 4,
    );
    final entries = [
      (sample, l10n.hostProgrammeKeyEveryone),
      (
        const HostProgrammeCell(
          kind: HostProgrammeCellKind.some,
          coming: 3,
          invited: 4,
        ),
        l10n.hostProgrammeKeySome,
      ),
      (
        const HostProgrammeCell(
          kind: HostProgrammeCellKind.maybe,
          coming: 0,
          invited: 4,
        ),
        l10n.hostProgrammeKeyMaybe,
      ),
      (
        const HostProgrammeCell(
          kind: HostProgrammeCellKind.noReply,
          coming: 0,
          invited: 4,
        ),
        l10n.hostProgrammeKeyNoReply,
      ),
      (
        const HostProgrammeCell(
          kind: HostProgrammeCellKind.notInvited,
          coming: 0,
          invited: 0,
        ),
        l10n.hostProgrammeKeyNotInvited,
      ),
    ];
    return CatchStack(
      direction: CatchStackDirection.row,
      wrap: true,
      children: [
        for (final (cell, label) in entries)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g4,
            align: CatchStackAlign.center,
            children: [
              programmeCellBadge(l10n, cell),
              CatchText(
                label,
                variant: CatchTextVariant.bodyMeta,
                tone: CatchTextTone.secondary,
              ),
            ],
          ),
      ],
    );
  }
}
