import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/swipes/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventRecapScreen extends ConsumerStatefulWidget {
  const EventRecapScreen({
    super.key,
    required this.eventId,
    this.initialSelectedVibeIds = const <String>{},
  });

  final String eventId;
  final Set<String> initialSelectedVibeIds;

  @override
  ConsumerState<EventRecapScreen> createState() => _EventRecapScreenState();
}

class _EventRecapScreenState extends ConsumerState<EventRecapScreen> {
  late final Set<String> _selectedVibes = {...widget.initialSelectedVibeIds};

  @override
  Widget build(BuildContext context) {
    final recapAsync = ref.watch(eventRecapViewModelProvider(widget.eventId));
    final recapState = _catchAsyncState(recapAsync);
    final viewModel = recapState.value;
    final rosterProfiles = _watchRosterProfiles(viewModel);
    final screenState = buildEventRecapScreenState(
      l10n: context.l10n,
      eventId: widget.eventId,
      viewModel: recapState,
      rosterProfiles: rosterProfiles,
      selectedVibeIds: _selectedVibes,
    );

    return CatchRouteScaffold(
      backgroundColor: CatchTokens.of(context).bg,
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.swipesEventRecapScreenTitleEventRecap,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        leading: CatchIconAction.toolbar(
          icon: CatchIcons.closeRounded,
          tooltip: context.l10n.swipesEventRecapScreenTooltipCloseRecap,
          onPressed: () => context.pop(),
        ),
      ),
      body: CatchRouteBody.standard(
        child: switch (screenState) {
          EventRecapLoading() => const EventRecapLoadingBody(),
          EventRecapError(:final error, :final retryIntent) =>
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: () => _retry(retryIntent),
            ),
          EventRecapMissingEvent() => CatchErrorState(
            title: context.l10n.swipesEventRecapScreenTitleEventNotFound,
            message: context.l10n.swipesEventRecapScreenMessageThisEventIsNo,
            actions: const [CatchErrorBackButton()],
          ),
          EventRecapReady ready => EventRecapReadyBody(
            state: ready,
            onToggleVibe: _toggleVibe,
            onRetryRosterProfiles: _retryRosterProfiles,
            onOpenCatchesDeck: _openCatchesDeck,
          ),
        },
      ),
    );
  }

  CatchAsyncState<Map<String, PublicProfile>> _watchRosterProfiles(
    EventRecapViewModel? viewModel,
  ) {
    final attendeeIds = viewModel?.attendeeIds ?? const <String>[];
    if (attendeeIds.isEmpty) {
      return const CatchAsyncState.data(<String, PublicProfile>{});
    }

    // Resolve every roster profile in one batched fetch instead of a realtime
    // stream per grid tile.
    return _catchAsyncState(
      ref.watch(publicProfilesByIdsProvider(PublicProfilesQuery(attendeeIds))),
    );
  }

  void _retry(EventRecapRetryIntent intent) {
    ref.invalidate(watchEventProvider(intent.eventId));
    ref.invalidate(swipeCandidatesProvider(intent.eventId));
    ref.invalidate(uidProvider);
    ref.invalidate(eventRecapViewModelProvider(intent.eventId));
  }

  void _toggleVibe(String attendeeId) {
    setState(() {
      _selectedVibes.contains(attendeeId)
          ? _selectedVibes.remove(attendeeId)
          : _selectedVibes.add(attendeeId);
    });
  }

  void _retryRosterProfiles(Iterable<String> attendeeIds) {
    ref.invalidate(
      publicProfilesByIdsProvider(PublicProfilesQuery(attendeeIds)),
    );
  }

  void _openCatchesDeck(EventRecapOpenDeckIntent intent) {
    context.goNamed(
      Routes.swipeEventScreen.name,
      pathParameters: {'eventId': intent.eventId},
      extra: intent.selectedVibeIds,
    );
  }
}

class EventRecapReadyBody extends StatelessWidget {
  const EventRecapReadyBody({
    super.key,
    required this.state,
    required this.onToggleVibe,
    required this.onRetryRosterProfiles,
    required this.onOpenCatchesDeck,
  });

  final EventRecapReady state;
  final ValueChanged<String> onToggleVibe;
  final ValueChanged<Iterable<String>> onRetryRosterProfiles;
  final ValueChanged<EventRecapOpenDeckIntent> onOpenCatchesDeck;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSectionList.responsive(
      emptyStateOmitted: true,
      items: [
        CatchSectionListItem(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RecapHeader(state: state.hero),
              gapH24,
              CatchText(
                context.l10n.swipesEventRecapScreenTextWhoBroughtTheVibe,
                variant: CatchTextVariant.titleL,
              ),
              gapH4,
              CatchText(
                context.l10n.swipesEventRecapScreenTextTapPeopleYouRemember,
                variant: CatchTextVariant.bodyM,
                color: t.ink2,
              ),
              gapH14,
              if (!state.hasAttendees)
                CatchEmptyState(
                  icon: CatchIcons.groupOffRounded,
                  title:
                      context.l10n.swipesEventRecapScreenTitleNoAttendeesToTag,
                  message: context
                      .l10n
                      .swipesEventRecapScreenMessageNoOtherCheckedIn,
                )
              else
                switch (state.profileLookupStatus) {
                  EventRecapProfileLookupStatus.loading =>
                    const VibeGridSkeleton(),
                  EventRecapProfileLookupStatus.error =>
                    CatchLocalizedErrorState(
                      state.profileLookupError!,
                      context: AppErrorContext.profile,
                      onRetry: () => onRetryRosterProfiles(state.attendeeIds),
                      mode: CatchErrorStateMode.inline,
                    ),
                  EventRecapProfileLookupStatus.ready => VibeGrid(
                    rows: state.attendeeRows,
                    onToggleVibe: onToggleVibe,
                  ),
                },
              gapH24,
              CatchButton(
                key: SwipeKeys.openCatchesDeckButton,
                label: context.l10n.swipesEventRecapScreenLabelOpenCatchesDeck,
                onPressed: state.openDeckActionEnabled
                    ? () => onOpenCatchesDeck(state.openDeckIntent)
                    : null,
                fullWidth: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class VibeGrid extends StatelessWidget {
  const VibeGrid({super.key, required this.rows, required this.onToggleVibe});

  final List<EventRecapAttendeeRow> rows;
  final ValueChanged<String> onToggleVibe;

  @override
  Widget build(BuildContext context) {
    return CatchViewport(
      compactBuilder: (context) => _VibeGridLayout(
        rows: rows,
        onToggleVibe: onToggleVibe,
        crossAxisCount: 2,
      ),
      mediumBuilder: (context) => _VibeGridLayout(
        rows: rows,
        onToggleVibe: onToggleVibe,
        crossAxisCount: 3,
      ),
      expandedBuilder: (context) => _VibeGridLayout(
        rows: rows,
        onToggleVibe: onToggleVibe,
        crossAxisCount: 4,
      ),
    );
  }
}

class _VibeGridLayout extends StatelessWidget {
  const _VibeGridLayout({
    required this.rows,
    required this.onToggleVibe,
    required this.crossAxisCount,
  });

  final List<EventRecapAttendeeRow> rows;
  final ValueChanged<String> onToggleVibe;
  final int crossAxisCount;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: rows.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: CatchLayout.eventRecapGridGap,
        mainAxisSpacing: CatchLayout.eventRecapGridGap,
        childAspectRatio: CatchAspectRatio.eventRecapVibeTile,
      ),
      itemBuilder: (context, index) {
        final row = rows[index];
        return VibeTile(
          key: SwipeKeys.vibeTile(row.attendeeId),
          row: row,
          onTap: () => onToggleVibe(row.attendeeId),
        );
      },
    );
  }
}

class EventRecapLoadingBody extends StatelessWidget {
  const EventRecapLoadingBody({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSectionList.responsive(
      emptyStateOmitted: true,
      items: [
        CatchSectionListItem(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const RecapHeaderSkeleton(),
              gapH24,
              CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
              gapH8,
              FractionallySizedBox(
                widthFactor: 0.88,
                alignment: Alignment.centerLeft,
                child: CatchSkeleton.text(),
              ),
              gapH14,
              const VibeGridSkeleton(),
              gapH24,
              CatchSkeleton.box(
                width: double.infinity,
                height: CatchLayout.buttonLgHeight,
                radius: CatchRadius.pill,
                borderColor: t.line,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class RecapHeaderSkeleton extends StatelessWidget {
  const RecapHeaderSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      padding: CatchInsets.contentRelaxed,
      backgroundColor: t.ink,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
          gapH10,
          CatchSkeleton.text(width: CatchLayout.skeletonTextTertiaryWidth),
          gapH4,
          CatchSkeleton.text(width: CatchLayout.skeletonTextDescriptionWidth),
          gapH18,
          const Row(
            children: [
              Expanded(child: RecapStatTileSkeleton()),
              Expanded(child: RecapStatTileSkeleton()),
              Expanded(child: RecapStatTileSkeleton()),
            ],
          ),
        ],
      ),
    );
  }
}

class RecapStatTileSkeleton extends StatelessWidget {
  const RecapStatTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: CatchLayout.eventRecapStatInset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
          gapH6,
          CatchSkeleton.text(width: CatchSpacing.s12),
        ],
      ),
    );
  }
}

class VibeGridSkeleton extends StatelessWidget {
  const VibeGridSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchViewport(
      compactBuilder: (context) =>
          const _VibeGridSkeletonLayout(crossAxisCount: 2),
      mediumBuilder: (context) =>
          const _VibeGridSkeletonLayout(crossAxisCount: 3),
      expandedBuilder: (context) =>
          const _VibeGridSkeletonLayout(crossAxisCount: 4),
    );
  }
}

class _VibeGridSkeletonLayout extends StatelessWidget {
  const _VibeGridSkeletonLayout({required this.crossAxisCount});

  final int crossAxisCount;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: crossAxisCount,
      crossAxisSpacing: CatchLayout.eventRecapGridGap,
      mainAxisSpacing: CatchLayout.eventRecapGridGap,
      childAspectRatio: CatchAspectRatio.eventRecapVibeTile,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        for (var i = 0; i < 6; i++)
          CatchSkeleton.box(
            height: double.infinity,
            radius: CatchRadius.md,
            borderColor: CatchTokens.of(context).line,
          ),
      ],
    );
  }
}

class RecapHeader extends StatelessWidget {
  const RecapHeader({super.key, required this.state});

  final EventRecapHeaderState state;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      padding: CatchInsets.contentRelaxed,
      backgroundColor: t.ink,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            state.kicker,
            style: CatchTextStyles.statusLabel(
              context,
              color: t.surface.withValues(
                alpha: CatchOpacity.eventRecapHeroKicker,
              ),
            ).copyWith(fontWeight: FontWeight.w800),
          ),
          gapH10,
          CatchText(
            state.distanceLabel,
            variant: CatchTextVariant.headline,
            color: t.surface,
          ),
          gapH4,
          CatchText(
            state.activityCheckedInLabel,
            variant: CatchTextVariant.supporting,
            color: t.surface.withValues(alpha: CatchOpacity.eventRecapHeroMeta),
          ),
          gapH18,
          Row(
            children: [
              RecapStatTile(
                label: context.l10n.swipesEventRecapScreenLabelWhen,
                value: state.whenLabel,
              ),
              RecapStatTile(
                label: context.l10n.swipesEventRecapScreenLabelTime,
                value: state.timeLabel,
              ),
              RecapStatTile(
                label: context.l10n.swipesEventRecapScreenLabelCatches,
                value: state.windowLabel,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class RecapStatTile extends StatelessWidget {
  const RecapStatTile({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: CatchLayout.eventRecapStatInset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchText(
              label.toUpperCase(),
              variant: CatchTextVariant.supporting,
              color: t.surface.withValues(
                alpha: CatchOpacity.eventRecapHeroStatLabel,
              ),
            ),
            gapH3,
            CatchText(
              value,
              variant: CatchTextVariant.statusLabel,
              color: t.surface,
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
}

class VibeTile extends StatelessWidget {
  const VibeTile({super.key, required this.row, required this.onTap});

  final EventRecapAttendeeRow row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Tooltip(
      message: row.tooltip,
      child: Semantics(
        button: true,
        selected: row.selected,
        label: row.semanticLabel,
        child: CatchSurface(
          onTap: onTap,
          backgroundColor: t.surface,
          radius: CatchRadius.md,
          borderSpec: row.selected
              ? CatchBorderSpec(
                  role: CatchBorderRole.selected,
                  color: t.primary,
                  width: CatchStroke.selection,
                )
              : CatchBorder.resolve(t, CatchBorderRole.separator),
          duration: CatchMotion.micro,
          clipBehavior: Clip.antiAlias,
          padding: EdgeInsets.zero,
          child: Stack(
            fit: StackFit.expand,
            children: [
              RecapProfilePhoto(profile: row.profile),
              CatchSurface(
                tone: CatchSurfaceTone.transparent,
                radius: 0,
                padding: EdgeInsets.zero,
                duration: Duration.zero,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    CatchTokens.editorialBlack.withValues(
                      alpha: CatchOpacity.none,
                    ),
                    CatchTokens.editorialBlack.withValues(
                      alpha: CatchOpacity.eventRecapTileScrim,
                    ),
                  ],
                ),
                child: const SizedBox.expand(),
              ),
              Positioned(
                left: CatchSpacing.s2,
                right: CatchSpacing.s2,
                bottom: CatchSpacing.s2,
                child: CatchText(
                  row.displayName,
                  variant: CatchTextVariant.statusLabel,
                  color: CatchTokens.editorialWhite,
                  maxLines: 1,
                ),
              ),
              if (row.selected)
                Positioned(
                  right: CatchSpacing.s2,
                  top: CatchSpacing.s2,
                  child: CircleAvatar(
                    radius: CatchLayout.selectionBadgeRadius,
                    backgroundColor: t.primary,
                    child: Icon(
                      CatchIcons.checkRounded,
                      size: CatchIcon.xs,
                      color: t.primaryInk,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}

class RecapProfilePhoto extends StatelessWidget {
  const RecapProfilePhoto({super.key, required this.profile});

  final PublicProfile? profile;

  @override
  Widget build(BuildContext context) {
    final photoUrl = profile?.primaryPhotoThumbnailUrl;
    if (photoUrl == null) {
      return Container(
        color: CatchTokens.of(context).primarySoft,
        alignment: Alignment.center,
        child: Icon(CatchIcons.personRounded, size: CatchIcon.fallbackAvatar),
      );
    }
    return CatchNetworkImage(photoUrl);
  }
}
