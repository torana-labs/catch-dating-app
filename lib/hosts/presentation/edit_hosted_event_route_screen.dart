part of 'edit_hosted_event_screen.dart';

class EditHostedEventRouteScreen extends ConsumerWidget {
  const EditHostedEventRouteScreen({
    super.key,
    required this.clubId,
    required this.eventId,
    this.initialEvent,
  });

  final String clubId;
  final String eventId;
  final Event? initialEvent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final clubAsync = ref.watch(fetchClubProvider(clubId));
    final eventAsync = ref.watch(watchEventProvider(eventId));

    final state = HostEventEditState.resolve(
      uid: _catchAsyncState(uidAsync),
      club: _catchAsyncState(clubAsync),
      event: _catchAsyncState(eventAsync),
      initialEvent: initialEvent,
    );

    return switch (state.status) {
      HostEventEditRouteStatus.loading => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsEditHostedEventRouteScreenTitleEditEvent,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      HostEventEditRouteStatus.error => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsEditHostedEventRouteScreenTitleEditEvent,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            state.error!,
            context: AppErrorContext.event,
            onRetry: () {
              ref.invalidate(fetchClubProvider(clubId));
              ref.invalidate(watchEventProvider(eventId));
            },
          ),
        ),
      ),
      HostEventEditRouteStatus.notFound => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsEditHostedEventRouteScreenTitleEditEvent,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchErrorState(
            title:
                context.l10n.hostsEditHostedEventRouteScreenTitleEventNotFound,
            message: context
                .l10n
                .hostsEditHostedEventRouteScreenMessageThisHostedEventIs,
            actions: const [CatchErrorBackButton()],
          ),
        ),
      ),
      HostEventEditRouteStatus.unauthorized => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsEditHostedEventRouteScreenTitleEditEvent,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchErrorState(
            title: context
                .l10n
                .hostsEditHostedEventRouteScreenTitleActionUnavailable,
            message: context
                .l10n
                .hostsEditHostedEventRouteScreenMessageYouCanEditOnly,
            icon: CatchIcons.block,
            actions: const [CatchErrorBackButton()],
          ),
        ),
      ),
      HostEventEditRouteStatus.ready => EditHostedEventScreen(
        club: state.club!,
        event: state.event!,
      ),
    };
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
