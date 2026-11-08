import 'package:catch_dating_app/contexts/live/parts/formats_table_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Mixing the teams in board order: the step in the games colour, who is
/// seated, the new tables with Shuffle again, and the first-hello switch.
/// The reveal lives in the screen's dock.
///
/// Not drawn, because nothing stores it: "Keep the team names" (scores stay
/// with the table either way).
class HostFormatsMixBody extends StatelessWidget {
  const HostFormatsMixBody({
    super.key,
    required this.state,
    required this.onShuffle,
    required this.onOpeners,
    required this.onRetry,
    this.shuffling = false,
    this.savingOpeners = false,
  });

  final HostFormatsMixState state;
  final VoidCallback onShuffle;
  final ValueChanged<bool> onOpeners;
  final VoidCallback onRetry;
  final bool shuffling;
  final bool savingOpeners;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsMixStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsMixStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsMixStatus.noPlan:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostFormatsNoPlanTitle,
            message: l10n.hostFormatsNoPlanBody,
          ),
        );
      case HostFormatsMixStatus.running:
        break;
    }
    final startsAt = state.stepStartsAt;
    final tables = state.tables.length;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.games,
          child: CatchStack(
            children: [
              CatchText(
                startsAt == null || state.steps == 0
                    ? l10n.hostFormatsMixKickerPlain
                    : l10n.hostFormatsMixKicker(
                        index: state.stepIndex + 1,
                        total: state.steps,
                        time: AppTimeFormatters.time(startsAt),
                      ),
                variant: CatchTextVariant.labelKicker,
              ),
              CatchText(
                l10n.hostFormatsMixTitle,
                variant: CatchTextVariant.displayLg,
              ),
              CatchText(l10n.hostFormatsMixBody),
            ],
          ),
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatSeated,
              value: '${state.seated}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatTables,
              value: '$tables',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatPerTable,
              value: tables == 0
                  ? '0'
                  : (state.seated / tables).toStringAsFixed(1),
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostFormatsNewTables,
          action: CatchSectionAction(
            label: l10n.hostFormatsShuffleAgain,
            onPressed: shuffling || state.countingDown ? null : onShuffle,
          ),
          empty: l10n.hostFormatsNewTablesNone,
          children: [
            for (final table in state.tables)
              FormatsTableRow(
                key: ValueKey<String>('formats-table-${table.label}'),
                label: table.label,
                people: table.people,
              ),
          ],
        ),
        CatchSection(
          children: [
            CatchIndexRow(
              title: l10n.hostFormatsOpeners,
              subtitle: l10n.hostFormatsOpenersNote,
              onTap: null,
              density: CatchIndexRowSize.roomy,
              trailing: CatchToggleInput(
                key: const ValueKey<String>('formats-mix-openers'),
                value: state.openers,
                semanticLabel: l10n.hostFormatsOpeners,
                contract: CatchContractConstraints
                    .eventSuccessPlanDocumentContextualOpenersEnabled,
                onChanged: savingOpeners ? null : onOpeners,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
