import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_group_rotation_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_pod_assignment_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_clock_mixin.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_waiting_notice.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_rotation_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_standings_section.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessAttendeeRevealSurface extends StatefulWidget {
  const EventSuccessAttendeeRevealSurface({
    super.key,
    required this.event,
    required this.plan,
    required this.kind,
    required this.assignment,
    this.standings,
    required this.peerProfiles,
    required this.peersLoading,
    required this.optedOut,
    this.isSavingOptOut = false,
    this.onIncludeChanged,
    this.now,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessRevealAssignmentKind kind;
  final EventSuccessAssignment? assignment;
  final EventSuccessStandings? standings;
  final List<PublicProfile> peerProfiles;
  final bool peersLoading;
  final bool optedOut;
  final bool isSavingOptOut;
  final ValueChanged<bool>? onIncludeChanged;
  final DateTime? now;

  @override
  State<EventSuccessAttendeeRevealSurface> createState() =>
      _EventSuccessAttendeeRevealSurfaceState();
}

class _EventSuccessAttendeeRevealSurfaceState
    extends State<EventSuccessAttendeeRevealSurface>
    with EventSuccessRevealClockMixin<EventSuccessAttendeeRevealSurface> {
  @override
  bool get revealClockEnabled =>
      widget.now == null &&
      widget.plan.isRevealCountdownRunning(DateTime.now());
  @override
  Widget build(BuildContext context) {
    final tickNow = revealClockNow;
    final referenceNow = widget.now ?? tickNow;
    final t = CatchTokens.of(context);
    final assigned = widget.assignment;
    final isStandings =
        widget.kind == EventSuccessRevealAssignmentKind.standings;
    final groupSlots =
        assigned?.groupRotationSlots ?? const <EventSuccessGroupRotationSlot>[];
    final roundCount = isStandings
        ? widget.standings?.rounds.length ?? 0
        : assigned == null
        ? 0
        : widget.kind == EventSuccessRevealAssignmentKind.rotations
        ? assigned.rotationSlots.length
        : groupSlots.isNotEmpty
        ? groupSlots.length
        : 1;
    final revealedThrough = widget.plan.revealedThroughRoundIndex(referenceNow);
    final standingRound = widget.standings?.throughRound(revealedThrough);
    final activeRound = eventSuccessRevealSafeRoundIndex(
      widget.plan.activeRevealRoundIndex,
      roundCount,
    );
    final hasPayload = isStandings
        ? widget.standings != null
        : assigned != null;
    final isCountingDown =
        hasPayload && widget.plan.isRevealCountdownRunning(referenceNow);
    final visibleSlots = assigned == null
        ? const <EventSuccessRotationSlot>[]
        : assigned.rotationSlots
              .where(
                (slot) =>
                    widget.plan.isRoundRevealed(slot.roundIndex, referenceNow),
              )
              .toList(growable: false);
    final visibleGroupSlots = groupSlots
        .where(
          (slot) => widget.plan.isRoundRevealed(slot.roundIndex, referenceNow),
        )
        .toList(growable: false);
    final podVisible =
        assigned != null &&
        widget.kind == EventSuccessRevealAssignmentKind.microPods &&
        groupSlots.isEmpty &&
        widget.plan.isRoundRevealed(0, referenceNow);
    final showAssignment = isStandings
        ? standingRound != null
        : widget.kind == EventSuccessRevealAssignmentKind.rotations
        ? visibleSlots.isNotEmpty
        : groupSlots.isNotEmpty
        ? visibleGroupSlots.isNotEmpty
        : podVisible;
    final title = _attendeeTitle(
      assigned: assigned,
      standings: widget.standings,
      showAssignment: showAssignment,
      isCountingDown: isCountingDown,
      remainingSeconds: eventSuccessRevealRemainingSeconds(
        widget.plan,
        referenceNow,
      ),
    );
    final profilesByUid = {
      for (final profile in widget.peerProfiles) profile.uid: profile,
    };
    final revealColor = showAssignment ? t.success : t.primary;
    return CatchSurface(
      backgroundColor: t.surface.withValues(
        alpha: CatchOpacity.revealAttendeePanelFill,
      ),
      radius: CatchRadius.sm,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: revealColor.withValues(alpha: CatchOpacity.revealAttendeeBorder),
      ),
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatchBadge.live(label: widget.kind.label(context.l10n)),
              if (hasPayload)
                CatchBadge(
                  label: isCountingDown
                      ? context
                            .l10n
                            .eventSuccessEventSuccessLiveRevealAttendeeLabelUnlocking
                      : showAssignment
                      ? context
                            .l10n
                            .eventSuccessEventSuccessLiveRevealAttendeeLabelRevealed
                      : context
                            .l10n
                            .eventSuccessEventSuccessLiveRevealAttendeeLabelWaiting,
                  tone: showAssignment
                      ? CatchBadgeTone.success
                      : isCountingDown
                      ? CatchBadgeTone.warning
                      : CatchBadgeTone.neutral,
                ),
            ],
          ),
          gapH12,
          CatchText(title, variant: CatchTextVariant.titleL),
          gapH6,
          CatchText(
            _attendeeSubtitle(
              assigned: assigned,
              standings: widget.standings,
              showAssignment: showAssignment,
              isCountingDown: isCountingDown,
            ),
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          if (hasPayload && !widget.optedOut) ...[
            gapH16,
            if (isCountingDown)
              EventSuccessCountdownSurface(
                plan: widget.plan,
                now: referenceNow,
                kind: widget.kind,
                clue: isStandings
                    ? 'Clue: the table unlocks for everyone together.'
                    : _attendeeClue(assigned!, activeRound),
              )
            else if (!showAssignment)
              EventSuccessRevealWaitingNotice(kind: widget.kind)
            else if (isStandings)
              EventSuccessStandingsSection(
                entries: standingRound!.entries,
                unitOutcome: widget.standings!.unitOutcome,
              )
            else if (widget.kind == EventSuccessRevealAssignmentKind.rotations)
              EventSuccessRotationRowList(
                slots: visibleSlots,
                profilesByUid: profilesByUid,
                peersLoading: widget.peersLoading,
              )
            else if (groupSlots.isNotEmpty)
              EventSuccessGroupRotationRowList(
                slots: visibleGroupSlots,
                profilesByUid: profilesByUid,
                peersLoading: widget.peersLoading,
              )
            else
              EventSuccessPodAssignmentSection(
                assignment: assigned!,
                peerProfiles: widget.peerProfiles,
                peersLoading: widget.peersLoading,
              ),
            if (roundCount > 1) ...[
              gapH12,
              EventSuccessRevealRoundStepper(
                roundCount: roundCount,
                activeRoundIndex: activeRound,
                revealedThrough: revealedThrough,
                foreground: t.ink,
              ),
            ],
          ],
          if (!isStandings) ...[
            gapH14,
            ColoredBox(
              color: t.ink.withValues(
                alpha: CatchOpacity.revealAttendeeActionDock,
              ),
              child: Padding(
                padding: CatchInsets.iconChipContent,
                child: CatchButton(
                  label: widget.optedOut
                      ? eventSuccessRevealJoinLabel(widget.kind)
                      : eventSuccessRevealSkipLabel(widget.kind),
                  variant: widget.optedOut
                      ? CatchButtonVariant.primary
                      : CatchButtonVariant.secondary,
                  status: (widget.isSavingOptOut)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed:
                      widget.isSavingOptOut || widget.onIncludeChanged == null
                      ? null
                      : () => widget.onIncludeChanged!(widget.optedOut),
                  fullWidth: true,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _attendeeTitle({
    required EventSuccessAssignment? assigned,
    required EventSuccessStandings? standings,
    required bool showAssignment,
    required bool isCountingDown,
    required int remainingSeconds,
  }) {
    if (widget.kind == EventSuccessRevealAssignmentKind.standings) {
      if (standings == null) return 'Standings reveal pending';
      if (isCountingDown) return 'Standings reveal in ${remainingSeconds}s';
      if (showAssignment) return 'Live standings';
      return 'Waiting for the host reveal';
    }
    if (widget.optedOut) {
      return '${widget.kind.assignmentNounPlural.capitalized} paused for you';
    }
    if (assigned == null) {
      return '${widget.kind.assignmentNoun.capitalized} reveal pending';
    }
    if (isCountingDown) return 'Next reveal in ${remainingSeconds}s';
    if (showAssignment) {
      if (widget.kind == EventSuccessRevealAssignmentKind.rotations) {
        return assigned.displayTitle;
      }
      return assigned.displayTitle;
    }
    return 'Waiting for the host reveal';
  }

  String _attendeeSubtitle({
    required EventSuccessAssignment? assigned,
    required EventSuccessStandings? standings,
    required bool showAssignment,
    required bool isCountingDown,
  }) {
    if (widget.kind == EventSuccessRevealAssignmentKind.standings) {
      if (assigned == null && standings == null) {
        return 'The host will publish standings when this round is scored.';
      }
      if (isCountingDown) {
        return 'Everyone sees the same table at the same time.';
      }
      if (showAssignment) {
        return 'The table includes every recorded round through this reveal.';
      }
      return 'Scores stay masked until the shared reveal moment.';
    }
    if (widget.optedOut) {
      return widget.kind == EventSuccessRevealAssignmentKind.rotations
          ? 'You will not be included when the host generates timed rotations.'
          : 'You will not be included when the host generates pods.';
    }
    if (assigned == null) {
      return 'The host will publish ${widget.kind.assignmentNounPlural} once the roster is ready.';
    }
    if (isCountingDown) {
      return 'Everyone gets this ${widget.kind.assignmentNoun} at the same time.';
    }
    if (showAssignment) {
      return assigned.displaySubtitle ??
          'Use this as a nudge, then let the conversation breathe.';
    }
    return 'Your details stay hidden until the shared reveal moment starts.';
  }

  String _attendeeClue(EventSuccessAssignment assignment, int activeRound) {
    if (widget.kind == EventSuccessRevealAssignmentKind.microPods) {
      final slot = eventSuccessRevealGroupSlotForRound(assignment, activeRound);
      if (slot != null) {
        return 'Clue: ${slot.unitLabel} is ready, but the names unlock together.';
      }
      return 'Clue: ${assignment.label} is ready, but the names unlock together.';
    }
    final slot = eventSuccessRevealSlotForRound(assignment, activeRound);
    if (slot == null) {
      return 'Clue: the next pairing is ready.';
    }
    return 'Clue: ${eventSuccessRevealCompatibilityLabel(slot.compatibility).toLowerCase()}.';
  }
}
