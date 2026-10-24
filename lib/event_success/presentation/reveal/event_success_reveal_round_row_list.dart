import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum _RevealRoundState { done, now, hidden }

/// Design-system `RotationCard` round list, dark-adapted for the reveal stage:
/// a config mono line over one row per round — `R{n}`, the pairings (or
/// "Hidden until reveal" while masked), and a Done / Now / Hidden state badge.
/// Pairings only render for rounds the host has already released.
class EventSuccessRevealRoundRowList extends StatelessWidget {
  const EventSuccessRevealRoundRowList({
    super.key,
    required this.config,
    required this.roundCount,
    required this.revealedThrough,
    required this.assignments,
    required this.profilesByUid,
  });

  final String config;
  final int roundCount;
  final int revealedThrough;
  final List<EventSuccessAssignment> assignments;
  final Map<String, PublicProfile> profilesByUid;

  @override
  Widget build(BuildContext context) {
    final fg = CatchTokens.of(context).surface;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (config.isNotEmpty) ...[
          Text(
            config.toUpperCase(),
            style: CatchTextStyles.monoLabel(
              context,
              color: fg.withValues(alpha: CatchOpacity.revealMutedForeground),
            ),
          ),
          gapH8,
        ],
        for (var index = 0; index < roundCount; index++)
          EventSuccessRevealRoundRow._(
            index: index,
            state: index < revealedThrough
                ? _RevealRoundState.done
                : index == revealedThrough
                ? _RevealRoundState.now
                : _RevealRoundState.hidden,
            pairs: index <= revealedThrough
                ? eventSuccessRevealRevealRoundPairsLabel(
                    assignments,
                    index,
                    profilesByUid,
                  )
                : null,
            foreground: fg,
            showDivider: index > 0,
          ),
      ],
    );
  }
}

class EventSuccessRevealRoundRow extends StatelessWidget {
  const EventSuccessRevealRoundRow._({
    required this.index,
    required this._state,
    required this.pairs,
    required this.foreground,
    required this.showDivider,
  });

  final int index;
  final _RevealRoundState _state;
  final String? pairs;
  final Color foreground;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final state = _state;
    final hidden = state == _RevealRoundState.hidden;
    final label =
        pairs ??
        (hidden
            ? context
                  .l10n
                  .eventSuccessEventSuccessLiveRevealWidgetsLabelHiddenUntilReveal
            : context.l10n
                  .eventSuccessEventSuccessLiveRevealWidgetsLabelRoundValue1(
                    value1: index + 1,
                  ));
    final (badgeLabel, tone) = switch (state) {
      _RevealRoundState.done => (
        context.l10n.eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyDone,
        CatchBadgeTone.success,
      ),
      _RevealRoundState.now => (
        context.l10n.eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyNow,
        CatchBadgeTone.brand,
      ),
      _RevealRoundState.hidden => (
        context.l10n.eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyHidden,
        CatchBadgeTone.neutral,
      ),
    };
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showDivider)
          CatchDivider(
            color: foreground.withValues(alpha: CatchOpacity.warningFill),
          ),
        Padding(
          padding: CatchInsets.contentVerticalCompact,
          child: Row(
            children: [
              Text(
                context.l10n
                    .eventSuccessEventSuccessLiveRevealWidgetsTextRValue1(
                      value1: index + 1,
                    ),
                style: CatchTextStyles.monoLabel(
                  context,
                  color: foreground.withValues(
                    alpha: CatchOpacity.revealMutedForeground,
                  ),
                ),
              ),
              gapW10,
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style:
                      CatchTextStyles.supporting(
                        context,
                        color: hidden
                            ? foreground.withValues(
                                alpha: CatchOpacity.revealMutedForeground,
                              )
                            : foreground,
                      ).copyWith(
                        fontStyle: hidden ? FontStyle.italic : FontStyle.normal,
                      ),
                ),
              ),
              gapW8,
              CatchBadge(
                label: badgeLabel,
                tone: tone,
                size: CatchBadgeSize.action,
                backgroundColor: foreground.withValues(
                  alpha: state == _RevealRoundState.now
                      ? CatchOpacity.revealSurfaceBorder
                      : CatchOpacity.revealBeatFillInactive,
                ),
                foregroundColor: foreground,
                borderColor: foreground.withValues(
                  alpha: CatchOpacity.warningFill,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
