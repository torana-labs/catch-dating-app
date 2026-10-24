import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/event_success/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/event_success/domain/event_success_preference.dart';
import 'package:catch_dating_app/event_success/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_text.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_viewport.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_outcome_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_action_row.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_clock_mixin.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_header.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_progress_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_waiting_notice.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_standings_section.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostRevealSurface extends StatefulWidget {
  const EventSuccessHostRevealSurface({
    super.key,
    required this.event,
    required this.plan,
    required this.podAssignments,
    required this.rotationAssignments,
    required this.preferences,
    this.standings,
    this.outcomeUnits = const [],
    this.participantProfiles = const [],
    this.now,
    this.actionState = const EventSuccessRevealActionState(),
    this.onStartCountdown,
    this.onRevealRound,
    this.onResetReveal,
    this.outcomeActionState = const EventSuccessOutcomeActionState(),
    this.onRecordOutcomes,
  });

  final Event event;
  final EventSuccessPlan plan;
  final List<EventSuccessAssignment> podAssignments;
  final List<EventSuccessAssignment> rotationAssignments;
  final List<EventSuccessPreference> preferences;
  final EventSuccessStandings? standings;
  final List<EventSuccessOutcomeUnit> outcomeUnits;

  /// Names for the rotation run-of-show list (reveal-gated). Pairings stay
  /// masked as "Hidden until reveal" until the host releases each round.
  final List<PublicProfile> participantProfiles;
  final DateTime? now;
  final EventSuccessRevealActionState actionState;
  final Future<void> Function(int roundIndex, int countdownSeconds)?
  onStartCountdown;
  final Future<void> Function(int roundIndex)? onRevealRound;
  final Future<void> Function()? onResetReveal;
  final EventSuccessOutcomeActionState outcomeActionState;
  final Future<void> Function({
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  })?
  onRecordOutcomes;

  @override
  State<EventSuccessHostRevealSurface> createState() =>
      _EventSuccessHostRevealSurfaceState();
}

class _EventSuccessHostRevealSurfaceState
    extends State<EventSuccessHostRevealSurface>
    with EventSuccessRevealClockMixin<EventSuccessHostRevealSurface> {
  @override
  bool get revealClockEnabled =>
      widget.now == null &&
      widget.plan.isRevealCountdownRunning(DateTime.now());
  @override
  Widget build(BuildContext context) {
    final tickNow = revealClockNow;
    final referenceNow = widget.now ?? tickNow;
    final t = CatchTokens.of(context);
    final revealSet = _hostRevealSet();
    final assignments = revealSet.assignments;
    final roundCount = revealSet.roundCount;
    final nextRound = widget.plan.nextRevealRoundIndex(
      roundCount: roundCount,
      now: referenceNow,
    );
    final activeRound = eventSuccessRevealSafeRoundIndex(
      widget.plan.activeRevealRoundIndex,
      roundCount,
    );
    final targetRound = widget.plan.isRevealCountdownRunning(referenceNow)
        ? activeRound
        : nextRound ?? activeRound;
    final countdownSeconds = widget.plan.structureConfig.revealCountdownSeconds;
    final allRevealed = widget.plan.allRevealRoundsShown(
      roundCount: roundCount,
      now: referenceNow,
    );
    final isCountingDown = widget.plan.isRevealCountdownRunning(referenceNow);
    final remainingSeconds = eventSuccessRevealRemainingSeconds(
      widget.plan,
      referenceNow,
    );
    final headline = eventSuccessRevealHostHeadline(
      kind: revealSet.kind,
      isCountingDown: isCountingDown,
      allRevealed: allRevealed,
      targetRound: targetRound,
      roundCount: roundCount,
      remainingSeconds: remainingSeconds,
    );
    return CatchSurface(
      clipBehavior: Clip.antiAlias,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          t.ink,
          Color.lerp(t.ink, t.accent, 0.55)!,
          Color.lerp(t.primary, t.gold, 0.18)!,
        ],
      ),
      boxShadow: CatchElevation.raised,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchBadge.onDarkStatus(
                label: context
                    .l10n
                    .eventSuccessEventSuccessLiveRevealHostLabelSynchronizedPartnerReveal,
                icon: CatchIcons.boltRounded,
              ),
              gapW8,
              CatchBadge.onDarkStatus(
                label: revealSet.kind.label(context.l10n),
                icon: revealSet.kind.icon,
              ),
              CatchBadge.onDark(
                label: roundCount == 0
                    ? context
                          .l10n
                          .eventSuccessEventSuccessLiveRevealHostLabelNoAssignments
                    : context.l10n
                          .eventSuccessEventSuccessLiveRevealHostLabelValue1RoundcountShown(
                            value1:
                                widget.plan.revealedThroughRoundIndex(
                                  referenceNow,
                                ) +
                                1,
                            roundCount: roundCount,
                          ),
              ),
            ],
          ),
          gapH16,
          EventSuccessHostRevealViewport(
            number: EventSuccessCountdownText(
              value: isCountingDown
                  ? context.l10n
                        .eventSuccessEventSuccessLiveRevealHostVisiblecopyRemainingseconds(
                          remainingSeconds: remainingSeconds,
                        )
                  : allRevealed
                  ? context
                        .l10n
                        .eventSuccessEventSuccessLiveRevealHostVisiblecopyOk
                  : context.l10n
                        .eventSuccessEventSuccessLiveRevealHostVisiblecopyValue1(
                          value1: targetRound + 1,
                        ),
              caption: isCountingDown
                  ? context
                        .l10n
                        .eventSuccessEventSuccessLiveRevealHostCaptionSeconds
                  : allRevealed
                  ? context
                        .l10n
                        .eventSuccessEventSuccessLiveRevealHostCaptionRevealed
                  : context
                        .l10n
                        .eventSuccessEventSuccessLiveRevealHostCaptionNextRound,
            ),
            copy: EventSuccessRevealHeader(
              headline: headline,
              body: eventSuccessRevealHostBody(
                kind: revealSet.kind,
                assignments: assignments,
                roundIndex: targetRound,
                roundCount: roundCount,
                allRevealed: allRevealed,
              ),
            ),
          ),
          gapH14,
          EventSuccessRevealProgressIndicator(
            progress: widget.plan.revealProgress(referenceNow),
          ),
          if (revealSet.kind == EventSuccessRevealAssignmentKind.standings) ...[
            gapH14,
            EventSuccessOutcomeSection(
              unitOutcome:
                  widget.standings?.unitOutcome ??
                  EventSuccessActivityProfile.forFormat(
                    widget.event.eventFormat,
                  ).unitOutcome,
              units: widget.outcomeUnits,
              nextRoundIndex: widget.standings == null
                  ? 0
                  : widget.standings!.latestRoundIndex + 1,
              expectedRevision: widget.standings?.revision ?? 0,
              actionState: widget.outcomeActionState,
              onRecord: widget.onRecordOutcomes,
            ),
          ],
          if (roundCount > 0) ...[
            gapH14,
            if (revealSet.kind == EventSuccessRevealAssignmentKind.standings)
              if (widget.standings?.throughRound(
                    widget.plan.revealedThroughRoundIndex(referenceNow),
                  )
                  case final visibleRound?)
                EventSuccessStandingsSection(
                  entries: visibleRound.entries,
                  unitOutcome: widget.standings!.unitOutcome,
                )
              else
                EventSuccessRevealWaitingNotice(kind: revealSet.kind)
            else if (revealSet.kind ==
                EventSuccessRevealAssignmentKind.rotations)
              EventSuccessRevealRoundRowList(
                config: eventSuccessRevealRotationConfigLine(
                  widget.plan.structureConfig,
                ),
                roundCount: roundCount,
                revealedThrough: widget.plan.revealedThroughRoundIndex(
                  referenceNow,
                ),
                assignments: assignments,
                profilesByUid: {
                  for (final profile in widget.participantProfiles)
                    profile.uid: profile,
                },
              )
            else
              EventSuccessRevealRoundStepper(
                roundCount: roundCount,
                activeRoundIndex: targetRound,
                revealedThrough: widget.plan.revealedThroughRoundIndex(
                  referenceNow,
                ),
              ),
          ],
          if (widget.actionState.error != null) ...[
            gapH10,
            CatchText(
              appErrorMessage(
                widget.actionState.error!,
                l10n: context.l10n,
                context: AppErrorContext.event,
              ),
              variant: CatchTextVariant.supporting,
              color: t.surface,
            ),
          ],
          gapH16,
          EventSuccessRevealActionRow(
            roundCount: roundCount,
            nextRound: nextRound,
            activeRound: activeRound,
            countdownSeconds: countdownSeconds,
            isCountingDown: isCountingDown,
            allRevealed: allRevealed,
            isLoading: widget.actionState.isLoading,
            onStartCountdown: widget.onStartCountdown,
            onRevealRound: widget.onRevealRound,
            onResetReveal: widget.onResetReveal,
          ),
        ],
      ),
    );
  }

  _HostRevealSet _hostRevealSet() {
    final unitOutcome = EventSuccessActivityProfile.forFormat(
      widget.event.eventFormat,
    ).unitOutcome;
    if (unitOutcome == EventSuccessUnitOutcome.score ||
        unitOutcome == EventSuccessUnitOutcome.rank) {
      return _HostRevealSet(
        kind: EventSuccessRevealAssignmentKind.standings,
        assignments: const [],
        roundCount: widget.standings?.rounds.length ?? 0,
      );
    }
    final canUseRotations =
        widget.plan.hasModule(EventSuccessModuleCatalog.guidedRotations.id) &&
        (widget.rotationAssignments.isNotEmpty ||
            !widget.plan.hasModule(EventSuccessModuleCatalog.microPods.id));
    final kind = canUseRotations
        ? EventSuccessRevealAssignmentKind.rotations
        : EventSuccessRevealAssignmentKind.microPods;
    final optedOutUids = widget.preferences
        .where(
          (preference) => kind == EventSuccessRevealAssignmentKind.rotations
              ? preference.guidedRotationsOptedOut
              : preference.microPodsOptedOut,
        )
        .map((preference) => preference.uid)
        .toSet();
    final rawAssignments = kind == EventSuccessRevealAssignmentKind.rotations
        ? widget.rotationAssignments
        : widget.podAssignments;
    final activeAssignments = rawAssignments
        .where((assignment) => !optedOutUids.contains(assignment.uid))
        .toList(growable: false);
    final roundCount = kind == EventSuccessRevealAssignmentKind.rotations
        ? eventSuccessRevealMaxRotationRoundCount(activeAssignments)
        : activeAssignments.isEmpty
        ? 0
        : 1;
    return _HostRevealSet(
      kind: kind,
      assignments: activeAssignments,
      roundCount: roundCount,
    );
  }
}

final class _HostRevealSet {
  const _HostRevealSet({
    required this.kind,
    required this.assignments,
    required this.roundCount,
  });

  final EventSuccessRevealAssignmentKind kind;
  final List<EventSuccessAssignment> assignments;
  final int roundCount;
}
