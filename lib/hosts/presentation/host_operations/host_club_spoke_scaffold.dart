part of '../host_operations_screen.dart';

class HostClubSpokeAsyncBoundary extends ConsumerWidget {
  const HostClubSpokeAsyncBoundary._({
    required this.clubId,
    required this.title,
    required this.builder,
  });

  final String clubId;
  final String title;
  final Widget Function(
    BuildContext context,
    Club club,
    String currentUid,
    bool isOwner,
  )
  builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    if (uidState.hasError) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: title,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            uidState.error!,
            context: AppErrorContext.auth,
            onRetry: () => ref.invalidate(uidProvider),
          ),
        ),
      );
    }
    if (uidState.isLoading) {
      return HostLoadingScreen(title: title);
    }
    final uid = uidState.value;
    if (uid == null) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: title,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchErrorState(
            title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
            message:
                context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
            retryLabel:
                context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
            onRetry: () => context.go(Routes.authScreen.path),
          ),
        ),
      );
    }

    final clubsAsync = ref.watch(_hostClubsForUserProvider(uid));
    return CatchAsyncBoundary<List<Club>>(
      value: clubsAsync,
      onRetry: () => ref.invalidate(_hostClubsForUserProvider(uid)),
      loadingBuilder: (_) => HostLoadingScreen(title: title),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: title,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.club,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, clubs) {
        final club = clubs.where((item) => item.id == clubId).firstOrNull;
        if (club == null) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title: title,
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.back,
              ),
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
            ),
            body: CatchRouteBody.standardViewport(
              child: CatchLocalizedErrorState(
                StateError('Organizer unavailable'),
                context: AppErrorContext.club,
                onRetry: () => ref.invalidate(_hostClubsForUserProvider(uid)),
              ),
            ),
          );
        }
        return HostClubSpokeScaffold._(
          club: club,
          title: title,
          child: builder(context, club, uid, club.isOwnedBy(uid)),
        );
      },
    );
  }
}

class HostClubSpokeScaffold extends StatelessWidget {
  const HostClubSpokeScaffold._({
    required this.club,
    required this.title,
    required this.child,
  });

  final Club club;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: title,
        subtitle: club.name,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardSections(
        sections: [CatchSectionListItem(child: child)],
      ),
    );
  }
}

class HostClubDefaultsEditor extends ConsumerStatefulWidget {
  const HostClubDefaultsEditor._({required this.club, required this.builder});

  final Club club;
  final Widget Function(
    BuildContext context,
    ClubHostDefaults defaults,
    ValueChanged<ClubHostDefaultsUpdate> apply,
    String? errorMessage,
    bool isSaving,
  )
  builder;

  @override
  ConsumerState<HostClubDefaultsEditor> createState() =>
      _HostClubDefaultsEditorState();
}

class _HostClubDefaultsEditorState
    extends ConsumerState<HostClubDefaultsEditor> {
  HostClubDefaultsSaver? _saver;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _saver ??= _createSaver();
  }

  HostClubDefaultsSaver _createSaver() {
    return HostClubDefaultsSaver(
      initial: widget.club.hostDefaults,
      writer: (defaults) => HostClubEditController.updateClubMutation.run(
        ref,
        (tx) => tx
            .get(hostClubEditControllerProvider)
            .updateClub(
              clubId: widget.club.id,
              patch: UpdateClubPatch(hostDefaults: defaults),
            ),
      ),
      errorMessageFor: (error) => appErrorMessage(
        error,
        l10n: context.l10n,
        context: AppErrorContext.club,
      ),
    )..addListener(_handleSaverChanged);
  }

  @override
  void didUpdateWidget(covariant HostClubDefaultsEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.club.id != widget.club.id) {
      _saver
        ?..removeListener(_handleSaverChanged)
        ..dispose();
      _saver = _createSaver();
    } else {
      _saver?.reconcile(widget.club.hostDefaults);
    }
  }

  @override
  void dispose() {
    _saver
      ?..removeListener(_handleSaverChanged)
      ..dispose();
    super.dispose();
  }

  void _handleSaverChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final saver = _saver!;
    return widget.builder(
      context,
      saver.optimistic,
      saver.apply,
      saver.errorMessage,
      saver.isSaving,
    );
  }
}

class HostClubReadOnlyDefaultsSection extends StatelessWidget {
  const HostClubReadOnlyDefaultsSection._({required this.club});

  final Club club;

  @override
  Widget build(BuildContext context) {
    final policy = club.hostDefaults.eventPolicy;
    return CatchSection.fieldRows(
      first: true,
      title: context.l10n.hostsHostClubEditTabLabelEventDefaults,
      children: [
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsPrivateEventCity,
          body: club.location,
          icon: CatchIcons.location,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsPrivateEventTimezone,
          body:
              club.hostDefaults.timezone ??
              context.l10n.hostsEventDefaultsChooseEachEvent,
          icon: CatchIcons.web,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleDefaultActivity,
          valueText: club.hostDefaults.primaryActivityKind.label,
          icon: CatchIcons.event,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleAdmission,
          body: _admissionDefaultDescription(
            policy.admissionPreset,
            context.l10n,
          ),
          valueText: _admissionDefaultLabel(
            policy.admissionPreset,
            context.l10n,
          ),
          icon: CatchIcons.seat,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleAgeRange,
          valueText: context.l10n.hostsHostClubProfileVisiblecopyMinageMaxage(
            minAge: policy.minAge,
            maxAge: policy.maxAge,
          ),
          icon: CatchIcons.birthday,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleCancellationPolicy,
          body: policy.cancellationPolicy.attendeeSummary,
          valueText: policy.cancellationPolicy.title,
          icon: CatchIcons.eventUnavailable,
        ),
      ],
    );
  }
}
