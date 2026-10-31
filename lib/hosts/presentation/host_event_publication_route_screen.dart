part of 'host_event_manage_screen.dart';

/// The publication editor uses its existing step-flow content after the same
/// uid/organizer/event authorization boundary as management.
class HostEventPublicationRouteScreen extends ConsumerWidget {
  const HostEventPublicationRouteScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
  });
  final String organizerId;
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CatchAsyncBoundary<_HostEventManageRouteData>(
      value: _hostEventManageRouteData(
        uid: catchAsyncStateFromAsyncValue(ref.watch(uidProvider)),
        organizer: catchAsyncStateFromAsyncValue(
          ref.watch(fetchOrganizerProvider(organizerId)),
        ),
        event: catchAsyncStateFromAsyncValue(
          ref.watch(watchEventProvider(eventId)),
        ),
        initialEvent: null,
      ),
      onRetry: () {
        ref.invalidate(uidProvider);
        ref.invalidate(fetchOrganizerProvider(organizerId));
        ref.invalidate(watchEventProvider(eventId));
      },
      loadingBuilder: (_) => const HostEventPublicationStateScaffold(
        child: CatchStateViewport.loading(accountForBottomOverlay: false),
      ),
      errorBuilder: (_, error, _, retry) => HostEventPublicationStateScaffold(
        child: CatchLocalizedErrorState(
          error,
          context: AppErrorContext.event,
          onRetry: retry,
        ),
      ),
      builder: (context, data) {
        final organizer = data.organizer;
        if (organizer == null || data.event == null) {
          return HostEventPublicationStateScaffold(
            child: CatchErrorState(
              title: context
                  .l10n
                  .hostsHostEventManageRouteScreenTitleEventNotFound,
              message: context
                  .l10n
                  .hostsHostEventManageRouteScreenMessageThisHostedEventIs,
              actions: const [CatchErrorBackButton()],
            ),
          );
        }
        if (data.uid == null || !organizer.isHostedBy(data.uid!)) {
          return HostEventPublicationStateScaffold(
            child: CatchErrorState(
              title: context
                  .l10n
                  .hostsHostEventManageRouteScreenTitleActionUnavailable,
              message: context
                  .l10n
                  .hostsHostEventManageRouteScreenMessageYouCanManageOnly,
              icon: CatchIcons.block,
              actions: const [CatchErrorBackButton()],
            ),
          );
        }
        return PrivateEventCreateScreen(
          organizer: organizer,
          initialSavedEventId: eventId,
          initialPublicationReview: true,
          promptForDraftsOnStart: false,
        );
      },
    );
  }
}

class HostEventPublicationStateScaffold extends StatelessWidget {
  const HostEventPublicationStateScaffold({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
    ),
    body: CatchRouteBody.standardViewport(child: child),
  );
}
