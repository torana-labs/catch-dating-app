part of '../host_operations_screen.dart';

class HostTeamHostedOrganizersSection extends StatelessWidget {
  const HostTeamHostedOrganizersSection({
    super.key,
    required this.actions,
    required this.state,
    required this.onRetry,
    required this.onOpenOrganizer,
  });

  final HostTeamWorkspaceActionState actions;
  final HostTeamHostedOrganizersState state;
  final VoidCallback? onRetry;
  final ValueChanged<HostTeamOrganizerNavigationState> onOpenOrganizer;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sectionChildren = switch (state) {
      HostTeamHostedOrganizersLoading() => <Widget>[
        for (var index = 0; index < 2; index++)
          CatchFieldLanes.single(
            child: CatchSkeleton.content(
              child: CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: CatchSkeleton.sampleRoleTitle,
                valueText: CatchSkeleton.sampleOrganizerName,
                icon: CatchIcons.people,
                onTap: () {},
              ),
            ),
          ),
      ],
      HostTeamHostedOrganizersError(:final error) => <Widget>[
        CatchLocalizedErrorState(
          error,
          context: AppErrorContext.organizer,
          onRetry: onRetry,
        ),
      ],
      HostTeamHostedOrganizersEmpty() => <Widget>[
        CatchText(
          context.l10n.hostsHostOrganizerTeamScreenTextNoHostOrganizersYet,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
      ],
      HostTeamHostedOrganizersContent(:final organizers) => <Widget>[
        for (final organizer in organizers)
          CatchFieldLanes.single(
            child: CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: actions.organizerNavigationFor(organizer).roleLabel,
              valueText: organizer.name,
              icon: CatchIcons.people,
              onTap: () => onOpenOrganizer(actions.organizerNavigationFor(organizer)),
            ),
          ),
      ],
    };
    return CatchSection.fieldRows(
      title: context.l10n.hostsHostOrganizerTeamScreenTitleOrganizersYouHost,
      children: sectionChildren,
    );
  }
}
