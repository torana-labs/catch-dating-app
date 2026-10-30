part of '../host_operations_screen.dart';

class HostOrganizersScreen extends ConsumerWidget {
  const HostOrganizersScreen({
    super.key,
    this.initialOrganizerId,
    this.initialTab = HostOrganizerTab.edit,
    this.initialExpandedEditField,
  });

  final String? initialOrganizerId;
  final HostOrganizerTab initialTab;
  final String? initialExpandedEditField;

  HostOrganizerTab get effectiveInitialTab =>
      initialExpandedEditField == null ? initialTab : HostOrganizerTab.edit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final selectedTab = effectiveInitialTab;
    return CatchAsyncBoundary<String?>(
      value: uidAsync,
      onRetry: () => ref.invalidate(uidProvider),
      loadingBuilder: (_) => HostOrganizerStateScaffold(
        selectedTab: selectedTab,
        scrollKey: const PageStorageKey<String>(
          'host-organizer-auth-route-state',
        ),
        slivers: const [CatchStateViewport.sliverLoading()],
      ),
      errorBuilder: (_, error, _, onRetry) => HostOrganizerStateScaffold(
        selectedTab: selectedTab,
        scrollKey: const PageStorageKey<String>(
          'host-organizer-auth-route-state',
        ),
        slivers: [
          CatchLocalizedSliverErrorState(
            error,
            context: AppErrorContext.auth,
            onRetry: onRetry,
          ),
        ],
      ),
      builder: (context, uid) {
        if (uid == null) {
          return HostOrganizerStateScaffold(
            selectedTab: selectedTab,
            scrollKey: const PageStorageKey<String>(
              'host-organizer-auth-route-state',
            ),
            slivers: [
              CatchSliverErrorState(
                title:
                    context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
                message: context
                    .l10n
                    .hostsHostAuthRequiredScreenMessageSignInToManage,
                retryLabel:
                    context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
                onRetry: () => context.go(Routes.authScreen.path),
              ),
            ],
          );
        }

        final organizersAsync = ref.watch(_hostOrganizersForUserProvider(uid));
        return CatchAsyncBoundary<List<Organizer>>(
          value: organizersAsync,
          onRetry: () => ref.invalidate(_hostOrganizersForUserProvider(uid)),
          loadingBuilder: (_) => HostOrganizerStateScaffold(
            selectedTab: selectedTab,
            scrollKey: const PageStorageKey<String>(
              'host-organizer-data-route-state',
            ),
            slivers: const [CatchStateViewport.sliverLoading()],
          ),
          errorBuilder: (_, error, _, onRetry) => HostOrganizerStateScaffold(
            selectedTab: selectedTab,
            scrollKey: const PageStorageKey<String>(
              'host-organizer-data-route-state',
            ),
            slivers: [
              CatchLocalizedSliverErrorState(
                error,
                context: AppErrorContext.organizer,
                onRetry: onRetry,
              ),
            ],
          ),
          builder: (context, organizers) => HostOrganizersScaffold(
            organizers: organizers,
            currentUid: uid,
            initialOrganizerId: initialOrganizerId,
            initialTab: selectedTab,
            initialExpandedEditField: initialExpandedEditField,
          ),
        );
      },
    );
  }
}
