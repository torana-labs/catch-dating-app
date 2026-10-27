import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessPodAssignmentSection extends StatelessWidget {
  const EventSuccessPodAssignmentSection({
    super.key,
    required this.assignment,
    required this.peerProfiles,
    required this.peersLoading,
  });

  final EventSuccessAssignment assignment;
  final List<PublicProfile> peerProfiles;
  final bool peersLoading;

  @override
  Widget build(BuildContext context) {
    return EventSuccessAssignmentSurface(
      title: context
          .l10n
          .eventSuccessEventSuccessLiveRevealWidgetsTitleUnlockedTogether,
      child: Wrap(
        spacing: CatchSpacing.s2,
        runSpacing: CatchSpacing.s2,
        children: [
          CatchBadge(
            label: context.l10n
                .eventSuccessEventSuccessLiveRevealWidgetsLabelValue1People(
                  value1: assignment.peerUids.length + 1,
                ),
            icon: CatchIcons.people,
          ),
          if (peersLoading)
            CatchBadge(
              label: context
                  .l10n
                  .eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingPodmates,
              icon: CatchIcons.pending,
            )
          else
            for (final profile in peerProfiles)
              CatchBadge(label: profile.name, icon: CatchIcons.person),
        ],
      ),
    );
  }
}
