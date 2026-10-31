part of '../host_operations_screen.dart';

class HostOrganizerSpokeAsyncBoundary extends ConsumerWidget {
  const HostOrganizerSpokeAsyncBoundary._({
    required this.organizerId,
    required this.title,
    required this.builder,
  });

  final String organizerId;
  final String title;
  final Widget Function(
    BuildContext context,
    Organizer organizer,
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

    final organizersAsync = ref.watch(_hostOrganizersForUserProvider(uid));
    return CatchAsyncBoundary<List<Organizer>>(
      value: organizersAsync,
      onRetry: () => ref.invalidate(_hostOrganizersForUserProvider(uid)),
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
            context: AppErrorContext.organizer,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, organizers) {
        final organizer = organizers
            .where((item) => item.id == organizerId)
            .firstOrNull;
        if (organizer == null) {
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
                context: AppErrorContext.organizer,
                onRetry: () =>
                    ref.invalidate(_hostOrganizersForUserProvider(uid)),
              ),
            ),
          );
        }
        return HostOrganizerSpokeScaffold._(
          organizer: organizer,
          title: title,
          child: builder(context, organizer, uid, organizer.isOwnedBy(uid)),
        );
      },
    );
  }
}

class HostOrganizerSpokeScaffold extends StatelessWidget {
  const HostOrganizerSpokeScaffold._({
    required this.organizer,
    required this.title,
    required this.child,
  });

  final Organizer organizer;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: title,
        subtitle: organizer.name,
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

class HostOrganizerDefaultsEditor extends ConsumerStatefulWidget {
  const HostOrganizerDefaultsEditor._({
    required this.organizer,
    required this.builder,
  });

  final Organizer organizer;
  final Widget Function(
    BuildContext context,
    OrganizerHostDefaults defaults,
    ValueChanged<OrganizerHostDefaultsUpdate> apply,
    String? errorMessage,
    bool isSaving,
  )
  builder;

  @override
  ConsumerState<HostOrganizerDefaultsEditor> createState() =>
      _HostOrganizerDefaultsEditorState();
}

class _HostOrganizerDefaultsEditorState
    extends ConsumerState<HostOrganizerDefaultsEditor> {
  HostOrganizerDefaultsSaver? _saver;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _saver ??= _createSaver();
  }

  HostOrganizerDefaultsSaver _createSaver() {
    return HostOrganizerDefaultsSaver(
      initial: widget.organizer.hostDefaults,
      writer: (defaults) =>
          HostOrganizerEditController.updateOrganizerMutation.run(
            ref,
            (tx) => tx
                .get(hostOrganizerEditControllerProvider)
                .updateOrganizer(
                  organizerId: widget.organizer.id,
                  patch: UpdateOrganizerPatch(hostDefaults: defaults),
                ),
          ),
      errorMessageFor: (error) => appErrorMessage(
        error,
        l10n: context.l10n,
        context: AppErrorContext.organizer,
      ),
    )..addListener(_handleSaverChanged);
  }

  @override
  void didUpdateWidget(covariant HostOrganizerDefaultsEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizer.id != widget.organizer.id) {
      _saver
        ?..removeListener(_handleSaverChanged)
        ..dispose();
      _saver = _createSaver();
    } else {
      _saver?.reconcile(widget.organizer.hostDefaults);
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

class HostOrganizerReadOnlyDefaultsSection extends StatelessWidget {
  const HostOrganizerReadOnlyDefaultsSection._({required this.organizer});

  final Organizer organizer;

  @override
  Widget build(BuildContext context) {
    final policy = organizer.hostDefaults.eventPolicy;
    return CatchSection.fieldRows(
      first: true,
      title: context.l10n.hostsHostOrganizerEditTabLabelEventDefaults,
      children: [
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsPrivateEventCity,
          body: organizer.location,
          icon: CatchIcons.location,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsPrivateEventTimezone,
          body:
              organizer.hostDefaults.timezone ??
              context.l10n.hostsEventDefaultsChooseEachEvent,
          icon: CatchIcons.web,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerProfileTitleDefaultActivity,
          valueText: organizer.hostDefaults.primaryActivityKind.label,
          icon: CatchIcons.event,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerProfileTitleAdmission,
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
          title: context.l10n.hostsHostOrganizerProfileTitleAgeRange,
          valueText: context.l10n
              .hostsHostOrganizerProfileVisiblecopyMinageMaxage(
                minAge: policy.minAge,
                maxAge: policy.maxAge,
              ),
          icon: CatchIcons.birthday,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerProfileTitleCancellationPolicy,
          body: policy.cancellationPolicy.attendeeSummary,
          valueText: policy.cancellationPolicy.title,
          icon: CatchIcons.eventUnavailable,
        ),
      ],
    );
  }
}
