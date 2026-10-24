part of '../host_operations_screen.dart';

class HostTeamHostedClubsSection extends StatelessWidget {
  const HostTeamHostedClubsSection({
    super.key,
    required this.actions,
    required this.state,
    required this.onRetry,
    required this.onOpenClub,
  });

  final HostTeamWorkspaceActionState actions;
  final HostTeamHostedClubsState state;
  final VoidCallback? onRetry;
  final ValueChanged<HostTeamClubNavigationState> onOpenClub;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sectionChildren = switch (state) {
      HostTeamHostedClubsLoading() => <Widget>[
        for (var index = 0; index < 2; index++)
          CatchFieldLanes.single(
            child: CatchSkeleton.content(
              child: CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: CatchSkeleton.sampleRoleTitle,
                valueText: CatchSkeleton.sampleClubName,
                icon: CatchIcons.groupOutlined,
                onTap: () {},
              ),
            ),
          ),
      ],
      HostTeamHostedClubsError(:final error) => <Widget>[
        CatchLocalizedErrorState(
          error,
          context: AppErrorContext.club,
          onRetry: onRetry,
        ),
      ],
      HostTeamHostedClubsEmpty() => <Widget>[
        CatchText(
          context.l10n.hostsHostClubTeamScreenTextNoHostClubsYet,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
      ],
      HostTeamHostedClubsContent(:final clubs) => <Widget>[
        for (final club in clubs)
          CatchFieldLanes.single(
            child: CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: actions.clubNavigationFor(club).roleLabel,
              valueText: club.name,
              icon: CatchIcons.groupOutlined,
              onTap: () => onOpenClub(actions.clubNavigationFor(club)),
            ),
          ),
      ],
    };
    return CatchSection.fieldRows(
      title: context.l10n.hostsHostClubTeamScreenTitleClubsYouHost,
      children: sectionChildren,
    );
  }
}
