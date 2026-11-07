import 'package:catch_dating_app/hosts/onboarding/widgets/page_link_tile.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The rows under Next on Done, in board order.
enum HostSetupNextStep { instagramBio, team, rehearse }

/// Done: the page exists, its link, three next steps and the first event.
class HostSetupDoneBody extends StatelessWidget {
  const HostSetupDoneBody({
    super.key,
    required this.name,
    required this.live,
    required this.onNextStep,
    required this.onCreateEvent,
    this.link,
    this.onCopy,
    this.copied = false,
  });

  /// The page's name, empty until the page is read.
  final String name;

  /// The public page is published.
  final bool live;

  /// The public address, once the page has one.
  final String? link;
  final VoidCallback? onCopy;
  final bool copied;
  final ValueChanged<HostSetupNextStep> onNextStep;
  final VoidCallback onCreateEvent;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final link = this.link;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          children: [
            CatchBadge(
              label: live
                  ? l10n.hostOnboardingDoneLive
                  : l10n.hostOnboardingDoneCreated,
              tone: CatchBadgeTone.success,
              size: CatchBadgeSize.md,
              icon: CatchIcons.success,
            ),
          ],
        ),
        if (name.isNotEmpty)
          CatchText(
            l10n.hostOnboardingDoneTitle(name: name),
            variant: CatchTextVariant.pageTitle,
          ),
        HostSetupPageLinkTile(
          link: link ?? l10n.hostOnboardingDoneLinkPending,
          onCopy: link == null ? null : onCopy,
          copied: copied,
        ),
        CatchSection(
          title: l10n.hostOnboardingDoneNextTitle,
          children: [
            for (final (index, step) in HostSetupNextStep.values.indexed)
              CatchIndexRow(
                key: ValueKey<String>('host-setup-next-${step.name}'),
                leading: CatchMarker.number(index + 1),
                title: switch (step) {
                  HostSetupNextStep.instagramBio =>
                    l10n.hostOnboardingDoneNextBio,
                  HostSetupNextStep.team => l10n.hostOnboardingDoneNextTeam,
                  HostSetupNextStep.rehearse =>
                    l10n.hostOnboardingDoneNextRehearse,
                },
                subtitle: switch (step) {
                  HostSetupNextStep.instagramBio =>
                    l10n.hostOnboardingDoneNextBioNote,
                  HostSetupNextStep.team => l10n.hostOnboardingDoneNextTeamNote,
                  HostSetupNextStep.rehearse =>
                    l10n.hostOnboardingDoneNextRehearseNote,
                },
                chevron: true,
                onTap: () => onNextStep(step),
              ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-setup-create-event'),
          label: l10n.hostOnboardingDoneCreateEvent,
          onPressed: onCreateEvent,
          leading: CatchIcon(CatchIcons.add, size: CatchIconSize.md),
          fullWidth: true,
        ),
      ],
    );
  }
}
