import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The court setup in board order: courts and minutes a game as steppers
/// with the rounds that fit, who plays and who sits out each round, what
/// matters most, the grouping rules from form answers, and the preview
/// once rotations are made.
///
/// Not drawn, because nothing stores them: a rounds stepper (rounds follow
/// from the event length), "Keep pairs together", and the switches for
/// splitting friends who booked together and late arrivals.
class HostFormatsCourtsSetupBody extends StatelessWidget {
  const HostFormatsCourtsSetupBody({
    super.key,
    required this.state,
    required this.draft,
    required this.onDraft,
    required this.onRules,
    required this.onRetry,
  });

  final HostFormatsCourtsSetupState state;

  /// The setup as the host has it now, saved or not.
  final HostFormatsCourtsDraft draft;
  final ValueChanged<HostFormatsCourtsDraft> onDraft;
  final VoidCallback onRules;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsCourtsSetupStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsCourtsSetupStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsCourtsSetupStatus.noPlan:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostFormatsNoPlanTitle,
            message: l10n.hostFormatsNoPlanBody,
          ),
        );
      case HostFormatsCourtsSetupStatus.ready:
        break;
    }
    final editable = state.editable;
    final rounds = state.roundsFor(draft.minutes);
    final playing = state.playingFor(draft.courts);
    final out = state.players - playing;
    return CatchPageBody.screen(
      children: [
        CatchSurface(
          child: CatchSection(
            children: [
              CatchIndexRow(
                title: l10n.hostFormatsCourtsCourts,
                subtitle: l10n.hostFormatsCourtsCourtsNote,
                onTap: null,
                density: CatchIndexRowSize.roomy,
                trailing: CatchStepper(
                  key: const ValueKey<String>('formats-setup-courts'),
                  value: draft.courts,
                  min: 1,
                  max: 12,
                  decreaseSemanticLabel: l10n.hostFormatsFewerCourts,
                  increaseSemanticLabel: l10n.hostFormatsMoreCourts,
                  onChanged: editable
                      ? (value) =>
                            onDraft(draft.copyWith(courts: value.toInt()))
                      : null,
                ),
              ),
              CatchIndexRow(
                title: l10n.hostFormatsCourtsMinutes,
                subtitle: l10n.hostFormatsCourtsMinutesNote,
                onTap: null,
                density: CatchIndexRowSize.roomy,
                trailing: CatchStepper(
                  key: const ValueKey<String>('formats-setup-minutes'),
                  value: draft.minutes,
                  min: 5,
                  max: 30,
                  decreaseSemanticLabel: l10n.hostFormatsShorterGames,
                  increaseSemanticLabel: l10n.hostFormatsLongerGames,
                  onChanged: editable
                      ? (value) =>
                            onDraft(draft.copyWith(minutes: value.toInt()))
                      : null,
                ),
              ),
              CatchIndexRow(
                title: l10n.hostFormatsCourtsRounds,
                subtitle: l10n.hostFormatsCourtsRoundsNote,
                onTap: null,
                density: CatchIndexRowSize.roomy,
                value: '$rounds',
              ),
            ],
          ),
        ),
        if (state.players > 0)
          CatchNotice.inline(
            body: out > 0
                ? l10n.hostFormatsCourtsSplit(
                    players: state.players,
                    courts: draft.courts,
                    playing: playing,
                    out: out,
                  )
                : l10n.hostFormatsCourtsEveryonePlays(
                    players: state.players,
                    courts: draft.courts,
                  ),
            icon: CatchIcons.info,
          ),
        CatchSection(
          title: l10n.hostFormatsAimTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            for (final aim in HostFormatsCourtsAim.values)
              CatchChoiceTile(
                key: ValueKey<String>('formats-setup-aim-${aim.name}'),
                variant: CatchChoiceTileVariant.row,
                title: switch (aim) {
                  HostFormatsCourtsAim.meetMany => l10n.hostFormatsAimMeetMany,
                  HostFormatsCourtsAim.closeGames =>
                    l10n.hostFormatsAimCloseGames,
                },
                subtitle: switch (aim) {
                  HostFormatsCourtsAim.meetMany =>
                    l10n.hostFormatsAimMeetManyNote,
                  HostFormatsCourtsAim.closeGames =>
                    l10n.hostFormatsAimCloseGamesNote,
                },
                contract: CatchContractConstraints
                    .eventSuccessPlanDocumentStructureConfigClusterActivityAttributes,
                selected: draft.aim == aim,
                onTap: editable
                    ? () => onDraft(draft.copyWith(aim: aim))
                    : null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostFormatsUseAnswers,
          action: CatchSectionAction(
            label: l10n.hostFormatsAllRules,
            onPressed: onRules,
          ),
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('formats-setup-rules'),
              title: l10n.hostFormatsUseAnswersRow,
              subtitle: l10n.hostFormatsUseAnswersNote,
              icon: CatchIcons.forms,
              onTap: onRules,
              density: CatchIndexRowSize.roomy,
              chevron: true,
            ),
          ],
        ),
        CatchSurface(
          child: CatchStack(
            children: [
              CatchText(
                l10n.hostFormatsPreview,
                variant: CatchTextVariant.labelKicker,
              ),
              if (state.previewed)
                CatchStack(
                  direction: CatchStackDirection.row,
                  equal: true,
                  children: [
                    CatchMetricTile.stat(
                      label: l10n.hostFormatsPreviewPartners,
                      value: '${state.newPartners}',
                      mode: CatchMetricTileMode.plain,
                    ),
                    CatchMetricTile.stat(
                      label: l10n.hostFormatsPreviewRounds,
                      value: '${state.roundsPlayed}',
                      mode: CatchMetricTileMode.plain,
                    ),
                    CatchMetricTile.stat(
                      label: l10n.hostFormatsStatRepeats,
                      value: '${state.repeatPartners}',
                      mode: CatchMetricTileMode.plain,
                    ),
                  ],
                )
              else
                CatchText(
                  l10n.hostFormatsPreviewNone,
                  variant: CatchTextVariant.bodySmall,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
