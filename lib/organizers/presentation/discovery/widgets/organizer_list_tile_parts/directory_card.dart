part of '../organizer_list_tile.dart';

class OrganizerIndexRow extends StatelessWidget {
  const OrganizerIndexRow({
    super.key,
    required this.organizer,
    required this.isJoined,
    this.onTap,
  });

  final Organizer organizer;
  final bool isJoined;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activitySwatch = ActivityPalette.of(
      context,
    ).forKind(organizer.hostDefaults.primaryActivityKind);

    return Semantics(
      key: ValueKey<String>('club-directory-${organizer.id}'),
      button: onTap != null,
      label: context.l10n.organizersDirectoryCardLabelOpenNameOrganizer(
        name: organizer.name,
      ),
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
                  child: OrganizerImage(organizer: organizer, coverOnly: true),
                ),
              ),
            ),
            gapW12,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CatchText(
                    organizer.name,
                    variant: CatchTextVariant.bodyLead,
                    color: t.ink,
                    maxLines: 1,
                  ),
                  gapH8,
                  Wrap(
                    spacing: CatchSpacing.micro6,
                    runSpacing: CatchSpacing.micro6,
                    children: [
                      CatchBadge.functional(
                        label: _organizerIndexActivityLabel(organizer),
                        accentColor: activitySwatch.accent,
                      ),
                      OrganizerAuthorityBadge(
                        state: organizer.organizerAuthority.trustState,
                      ),
                    ],
                  ),
                  gapH6,
                  CatchMetadataText(
                    _organizerIndexMetaLabel(organizer),
                    color: t.ink3,
                  ),
                ],
              ),
            ),
            gapW12,
            OrganizerJoinAction(clubId: organizer.id, isJoined: isJoined),
          ],
        ),
      ),
    );
  }
}

String _organizerIndexActivityLabel(Organizer organizer) {
  return organizer.hostDefaults.primaryActivityKind.label;
}

String _organizerIndexMetaLabel(Organizer organizer) {
  final area = organizer.area.trim();
  final location = area.isEmpty
      ? cityLabel(organizer.location)
      : '$area / ${cityLabel(organizer.location)}';
  return '$location · ${organizerMemberCountLabel(organizer)}'.toUpperCase();
}

class OrganizerJoinAction extends ConsumerWidget {
  const OrganizerJoinAction({
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
      return const OrganizerJoinButton(
        isJoined: true,
        isPending: false,
        onJoinPressed: null,
      );
    }

    // Key by clubId so each tile observes only its own join state; an unkeyed
    // shared mutation would spin/disable every visible Join button at once.
    final joinMutation = OrganizerMembershipController.joinMutation(clubId);
    final joinMutationState = ref.watch(joinMutation);
    void joinOrganizer() {
      unawaited(
        joinMutation
            .run(ref, (transaction) async {
              await transaction
                  .get(organizerMembershipControllerProvider.notifier)
                  .join(clubId);
            })
            .catchError((Object error, StackTrace stackTrace) {
              ref
                  .read(errorLoggerProvider)
                  .logError(
                    error,
                    stackTrace,
                    reason: 'OrganizerJoinAction._joinOrganizer failed',
                  );
            }),
      );
    }

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [joinMutation],
      errorContext: AppErrorContext.organizer,
    );
    return OrganizerJoinButton(
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
        joinOrganizer();
      },
    );
  }
}

class OrganizerJoinButton extends StatelessWidget {
  const OrganizerJoinButton({
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
        label: context.l10n.organizersDirectoryCardLabelJoined,
        tone: CatchBadgeTone.success,
        icon: CatchIcons.check,
      );
    }

    final t = CatchTokens.of(context);
    return CatchButton(
      label: context.l10n.organizersDirectoryCardLabelJoin,
      leading: Icon(CatchIcons.addPerson),
      onPressed: isPending ? null : onJoinPressed,
      size: CatchButtonSize.md,
      backgroundColor: t.ink,
      foregroundColor: t.primaryInk,
    );
  }
}
