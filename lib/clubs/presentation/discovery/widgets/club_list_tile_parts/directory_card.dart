part of '../club_list_tile.dart';

class ClubIndexRow extends StatelessWidget {
  const ClubIndexRow({
    super.key,
    required this.club,
    required this.isJoined,
    this.onTap,
  });

  final Club club;
  final bool isJoined;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activitySwatch = ActivityPalette.of(
      context,
    ).forKind(club.hostDefaults.primaryActivityKind);

    return Semantics(
      key: ValueKey<String>('club-directory-${club.id}'),
      button: onTap != null,
      label: context.l10n.clubsDirectoryCardLabelOpenNameClub(name: club.name),
      child: CatchSurface(
        onTap: onTap,
        borderRole: CatchBorderRole.separator,
        emphasis: CatchSurfaceEmphasis.subtle,
        radius: CatchRadius.md,
        padding: CatchInsets.tileContentCompact,
        child: Row(
          children: [
            Padding(
              padding: CatchInsets.mediaFrameContent,
              child: CatchSurface(
                duration: Duration.zero,
                tone: CatchSurfaceTone.transparent,
                radius: CatchLayout.posterMediaRadius,
                clipBehavior: Clip.antiAlias,
                child: SizedBox.square(
                  dimension: CatchSpacing.s16,
                  child: ClubImage(club: club, coverOnly: true),
                ),
              ),
            ),
            gapW12,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    club.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.fieldRowTitle(context, color: t.ink),
                  ),
                  gapH8,
                  Wrap(
                    spacing: CatchSpacing.micro6,
                    runSpacing: CatchSpacing.micro6,
                    children: [
                      CatchBadge.functional(
                        label: _clubIndexActivityLabel(club),
                        accentColor: activitySwatch.accent,
                      ),
                      OrganizerAuthorityBadge(
                        state: club.organizerAuthority.trustState,
                      ),
                    ],
                  ),
                  gapH6,
                  Text(
                    _clubIndexMetaLabel(club),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.monoLabelS(context, color: t.ink3),
                  ),
                ],
              ),
            ),
            gapW12,
            ClubJoinAction(clubId: club.id, isJoined: isJoined),
          ],
        ),
      ),
    );
  }
}

String _clubIndexActivityLabel(Club club) {
  return club.hostDefaults.primaryActivityKind.label;
}

String _clubIndexMetaLabel(Club club) {
  final area = club.area.trim();
  final location = area.isEmpty
      ? cityLabel(club.location)
      : '$area / ${cityLabel(club.location)}';
  return '$location · ${clubMemberCountLabel(club)}'.toUpperCase();
}

class ClubJoinAction extends ConsumerWidget {
  const ClubJoinAction({
    super.key,
    required this.clubId,
    required this.isJoined,
  });

  final String clubId;
  final bool isJoined;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final actionState = exploreOrganizerMembershipActionState(
      contentVisible: true,
      authResolved: uidState.hasData,
      uid: uidState.value,
      isFollowing: isJoined,
    );
    if (actionState == ExploreOrganizerMembershipActionState.hidden) {
      return const SizedBox.shrink();
    }
    if (actionState == ExploreOrganizerMembershipActionState.following) {
      return const ClubJoinButton(
        isJoined: true,
        isPending: false,
        onJoinPressed: null,
      );
    }

    // Key by clubId so each tile observes only its own join state; an unkeyed
    // shared mutation would spin/disable every visible Join button at once.
    final joinMutation = ClubMembershipController.joinMutation(clubId);
    final joinMutationState = ref.watch(joinMutation);
    void joinClub() {
      unawaited(
        joinMutation
            .run(ref, (transaction) async {
              await transaction
                  .get(clubMembershipControllerProvider.notifier)
                  .join(clubId);
            })
            .catchError((Object error, StackTrace stackTrace) {
              ref
                  .read(errorLoggerProvider)
                  .logError(
                    error,
                    stackTrace,
                    reason: 'ClubJoinAction._joinClub failed',
                  );
            }),
      );
    }

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [joinMutation],
      errorContext: AppErrorContext.club,
    );
    return ClubJoinButton(
      isJoined: false,
      isPending: joinMutationState.isPending,
      onJoinPressed: () {
        if (actionState == ExploreOrganizerMembershipActionState.signInGate) {
          context.go(
            Uri(
              path: Routes.authScreen.path,
              queryParameters: {'from': '/organizers/$clubId'},
            ).toString(),
          );
          return;
        }
        joinClub();
      },
    );
  }
}

class ClubJoinButton extends StatelessWidget {
  const ClubJoinButton({
    super.key,
    required this.isJoined,
    required this.isPending,
    required this.onJoinPressed,
  });

  final bool isJoined;
  final bool isPending;
  final VoidCallback? onJoinPressed;

  @override
  Widget build(BuildContext context) {
    if (isJoined) {
      return CatchBadge(
        label: context.l10n.clubsDirectoryCardLabelJoined,
        tone: CatchBadgeTone.success,
        icon: CatchIcons.joinedCheck,
      );
    }

    final t = CatchTokens.of(context);
    return CatchButton(
      label: context.l10n.clubsDirectoryCardLabelJoin,
      leading: Icon(CatchIcons.groupAddOutlined),
      onPressed: isPending ? null : onJoinPressed,
      size: CatchButtonSize.sm,
      backgroundColor: t.ink,
      foregroundColor: t.primaryInk,
    );
  }
}
