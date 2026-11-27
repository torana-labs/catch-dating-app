import 'package:catch_dating_app/contexts/organizers/data/organizer_journey_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

final _scheme = RegExp(r'^https?://');

/// One page's journey: a notice while the caller's claim is checked, then the
/// steps so far and what comes next.
class HostOrganizerJourneySection extends StatelessWidget {
  const HostOrganizerJourneySection({super.key, required this.journey});

  final OrganizerJourney journey;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final day = DateFormat.MMMd(l10n.localeName);
    final name = journey.organizerName;
    final steps = journey.steps;
    final waitingIndex = journey.waitingClaim
        ? steps.lastIndexWhere(
            (step) => step.kind == OrganizerJourneyStepKind.claimRequested,
          )
        : -1;
    final next = journey.next;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (journey.waitingClaim) ...[
          CatchBanner(
            title: l10n.hostJourneyWaitingTitle,
            message: l10n.hostJourneyWaitingBody,
          ),
          const SizedBox(height: CatchSpacing.s4),
        ],
        CatchSection.plain(
          title: l10n.hostJourneyTitle,
          padding: EdgeInsets.zero,
          child: CatchTimelineList(
            copy: CatchTimelineListCopy(
              done: l10n.hostRequestsStepDone,
              current: l10n.hostRequestsStepNow,
              next: l10n.hostRequestsStepNext,
            ),
            steps: [
              for (final (index, step) in steps.indexed)
                CatchSectionStep(
                  title: switch (step.kind) {
                    OrganizerJourneyStepKind.nominated =>
                      l10n.hostJourneyNominated(name: name),
                    OrganizerJourneyStepKind.listed => l10n.hostJourneyListed,
                    OrganizerJourneyStepKind.claimRequested =>
                      l10n.hostJourneyClaimRequested,
                    OrganizerJourneyStepKind.claimRejected =>
                      l10n.hostJourneyClaimRejected,
                    OrganizerJourneyStepKind.claimed => l10n.hostJourneyClaimed,
                    OrganizerJourneyStepKind.firstEvent =>
                      l10n.hostJourneyFirstEvent,
                    OrganizerJourneyStepKind.firstPaidBooking =>
                      l10n.hostJourneyFirstPaidBooking,
                  },
                  subtitle: switch (step.kind) {
                    OrganizerJourneyStepKind.nominated =>
                      step.detail == null
                          ? null
                          : l10n.hostJourneyBuiltFrom(
                              source: step.detail!.replaceFirst(_scheme, ''),
                            ),
                    OrganizerJourneyStepKind.firstEvent => step.detail,
                    _ => null,
                  },
                  meta: step.at == null ? null : day.format(step.at!),
                  status: index == waitingIndex
                      ? CatchSectionStepStatus.current
                      : CatchSectionStepStatus.done,
                  tone: index == waitingIndex
                      ? CatchSectionStepTone.warning
                      : CatchSectionStepTone.neutral,
                ),
              if (next != null)
                CatchSectionStep(
                  title: switch (next) {
                    OrganizerJourneyNext.runYourPage => l10n.hostJourneyRunPage,
                    OrganizerJourneyNext.firstEvent =>
                      l10n.hostJourneyRunFirstEvent,
                  },
                  subtitle: switch (next) {
                    OrganizerJourneyNext.runYourPage =>
                      l10n.hostJourneyRunPageBody,
                    OrganizerJourneyNext.firstEvent => null,
                  },
                  meta: l10n.hostRequestsStepNext,
                  status: CatchSectionStepStatus.next,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Organizer → Your page so far, read when the sheet opens so the Host shell
/// makes no extra call at launch.
class HostOrganizerJourneySheet extends ConsumerWidget {
  const HostOrganizerJourneySheet({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = organizerJourneysProvider(organizerId);
    return CatchSheet.standard(
      title: context.l10n.hostJourneyTitle,
      child: CatchAsyncBoundary<List<OrganizerJourney>>(
        value: ref.watch(provider),
        onRetry: () => ref.invalidate(provider),
        errorContext: AppErrorContext.organizer,
        initialLoadTimeout: null,
        builder: (context, journeys) => journeys.isEmpty
            ? const SizedBox.shrink()
            : HostOrganizerJourneySection(journey: journeys.first),
      ),
    );
  }
}

/// Today for someone with no organizer yet: any page they're waiting to claim.
/// A failed read shows nothing, because the screen's own way forward still works.
class HostWaitingClaimsSection extends ConsumerWidget {
  const HostWaitingClaimsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final journeys =
        catchAsyncStateFromAsyncValue(
          ref.watch(organizerJourneysProvider(null)),
        ).value ??
        const <OrganizerJourney>[];
    if (journeys.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: CatchInsets.pageBody,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final journey in journeys)
            HostOrganizerJourneySection(
              key: ValueKey('host-waiting-claim-${journey.organizerId}'),
              journey: journey,
            ),
        ],
      ),
    );
  }
}
