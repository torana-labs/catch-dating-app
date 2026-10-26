import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/fcm_service.dart';
import 'package:catch_dating_app/core/presentation/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/hosts.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/matches/data/match_repository.dart';
import 'package:catch_dating_app/notifications/notifications.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostAppShell extends ConsumerStatefulWidget {
  const HostAppShell({
    super.key,
    required this.navigationShell,
    this.requestedOrganizerId,
  });

  final StatefulNavigationShell navigationShell;
  final String? requestedOrganizerId;

  @override
  ConsumerState<HostAppShell> createState() => _HostAppShellState();
}

class _HostAppShellState extends ConsumerState<HostAppShell> {
  String? _consumedRequestedOrganizerId;
  String? _scheduledSelection;

  @override
  void didUpdateWidget(covariant HostAppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    final requestedOrganizerId = widget.requestedOrganizerId?.trim();
    if (requestedOrganizerId != null &&
        requestedOrganizerId.isNotEmpty &&
        requestedOrganizerId != _consumedRequestedOrganizerId) {
      _consumedRequestedOrganizerId = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final uidAsync = ref.watch(uidProvider);
    final uid = uidAsync.asData?.value ?? '';
    final isAuthenticated = uid.isNotEmpty;
    final unreadCount = isAuthenticated
        ? ref.watch(totalUnreadCountProvider(uid))
        : 0;
    final errorLogger = ref.read(errorLoggerProvider);
    final analytics = ref.read(appAnalyticsProvider);
    final clubsAsync = isAuthenticated
        ? ref.watch(hostOperableClubsProvider(uid))
        : null;
    final clubs = clubsAsync?.asData?.value ?? const <Club>[];
    final selectedOrganizerId = isAuthenticated
        ? ref.watch(hostOrganizerSelectionProvider(uid))
        : null;
    final requestedOrganizerId = widget.requestedOrganizerId?.trim();
    final hasUnconsumedRequest =
        requestedOrganizerId != null &&
        requestedOrganizerId.isNotEmpty &&
        requestedOrganizerId != _consumedRequestedOrganizerId;
    final selectedOrganizer = resolveSelectedHostOrganizer(
      clubs,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: hasUnconsumedRequest ? requestedOrganizerId : null,
    );
    if (hasUnconsumedRequest && clubsAsync?.hasValue == true) {
      _consumedRequestedOrganizerId = requestedOrganizerId;
    }
    if (isAuthenticated && selectedOrganizer != null) {
      _scheduleSelectionSync(
        uid: uid,
        organizerId: selectedOrganizer.id,
        currentOrganizerId: selectedOrganizerId,
      );
    }

    if (isAuthenticated) {
      // Reuse the shared FCM-init provider so host and consumer shells cannot
      // drift apart.
      final router = GoRouter.of(context);
      final fcmInitialization = appShellFcmInitializationProvider(uid, router);
      ref.watch(fcmInitialization);
      ref.listen(fcmInitialization, (previous, next) {
        if (!next.hasError) return;
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: next.error!,
            stack: next.stackTrace,
            library: 'catch_fcm',
            context: ErrorDescription(
              'while initializing host Firebase Messaging',
            ),
          ),
        );
      });
    }

    errorLogger.setUserId(uid.isEmpty ? null : uid);
    analytics.setUserId(uid.isEmpty ? null : uid);
    ref.listen(uidProvider, (previous, next) {
      final nextUid = next.asData?.value;
      final normalized = nextUid == null || nextUid.isEmpty ? null : nextUid;
      errorLogger.setUserId(normalized);
      analytics.setUserId(normalized);
      if (nextUid != previous?.asData?.value) {
        ref.read(foregroundNotificationControllerProvider.notifier).reset();
      }
      if (nextUid == null && previous?.asData?.value != null) {
        unawaited(ref.read(fcmServiceProvider).reset());
      }
    });

    void selectDestination(int index) => widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );

    final navigationItems = _hostNavigationItems(
      selectedOrganizer: selectedOrganizer,
      onOrganizerLongPress: clubs.length > 1 && selectedOrganizer != null
          ? () => unawaited(
              _openOrganizerSwitcher(
                uid: uid,
                clubs: clubs,
                selectedOrganizer: selectedOrganizer,
              ),
            )
          : null,
      organizerSemanticHint: clubs.length > 1
          ? context.l10n.hostsHostTodayTooltipSwitchClub
          : null,
    );

    final bottomNavigation = isAuthenticated
        ? AppShellNavigationBar(
            currentIndex: widget.navigationShell.currentIndex,
            unreadCount: unreadCount,
            items: navigationItems,
            onDestinationSelected: selectDestination,
          )
        : null;
    final railNavigation = isAuthenticated
        ? AppShellNavigationBar(
            currentIndex: widget.navigationShell.currentIndex,
            unreadCount: unreadCount,
            items: navigationItems,
            layout: AppShellNavigationLayout.rail,
            onDestinationSelected: selectDestination,
          )
        : null;
    final sidebarNavigation = isAuthenticated
        ? AppShellNavigationBar(
            currentIndex: widget.navigationShell.currentIndex,
            unreadCount: unreadCount,
            items: navigationItems,
            layout: AppShellNavigationLayout.sidebar,
            onDestinationSelected: selectDestination,
          )
        : null;

    return CatchWorkspaceHeaderLayout(
      child: AdaptiveTabScaffold(
        activeIndex: widget.navigationShell.currentIndex,
        navigationBar: bottomNavigation,
        mediumSideNavigation: railNavigation,
        expandedSideNavigation: sidebarNavigation,
        body: CatchWorkspacePaneScope(
          isSinglePane: true,
          child: widget.navigationShell,
        ),
      ),
    );
  }

  void _scheduleSelectionSync({
    required String uid,
    required String organizerId,
    required String? currentOrganizerId,
  }) {
    if (currentOrganizerId == organizerId ||
        _scheduledSelection == organizerId) {
      return;
    }
    _scheduledSelection = organizerId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(hostOrganizerSelectionProvider(uid).notifier)
          .select(organizerId);
      if (_scheduledSelection == organizerId) _scheduledSelection = null;
    });
  }

  Future<void> _openOrganizerSwitcher({
    required String uid,
    required List<Club> clubs,
    required Club selectedOrganizer,
  }) async {
    catchTransitionHaptic();
    final organizerId = await showHostOrganizerSwitcherSheet(
      context: context,
      clubs: clubs,
      selectedOrganizerId: selectedOrganizer.id,
    );
    if (!mounted ||
        organizerId == null ||
        organizerId == selectedOrganizer.id) {
      return;
    }
    ref.read(hostOrganizerSelectionProvider(uid).notifier).select(organizerId);
  }
}

List<AppShellNavigationItem> _hostNavigationItems({
  required Club? selectedOrganizer,
  required VoidCallback? onOrganizerLongPress,
  required String? organizerSemanticHint,
}) => [
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.hostToday,
    materialIcon: CatchIcons.home,
    materialSelectedIcon: CatchIcons.home,
    cupertinoIcon: CatchIcons.home,
    cupertinoSelectedIcon: CatchIcons.home,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.hostEvents,
    materialIcon: CatchIcons.ticket,
    materialSelectedIcon: CatchIcons.ticket,
    cupertinoIcon: CatchIcons.ticket,
    cupertinoSelectedIcon: CatchIcons.ticket,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.hostAudience,
    materialIcon: CatchIcons.people,
    materialSelectedIcon: CatchIcons.people,
    cupertinoIcon: CatchIcons.people,
    cupertinoSelectedIcon: CatchIcons.people,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.hostInbox,
    materialIcon: CatchIcons.chat,
    materialSelectedIcon: CatchIcons.chat,
    cupertinoIcon: CatchIcons.chat,
    cupertinoSelectedIcon: CatchIcons.chat,
    showsUnreadBadge: true,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.hostOrganizer,
    materialIcon: CatchIcons.organizer,
    materialSelectedIcon: CatchIcons.organizer,
    cupertinoIcon: CatchIcons.organizer,
    cupertinoSelectedIcon: CatchIcons.organizer,
    iconBuilder: selectedOrganizer == null
        ? null
        : (context) => HostOrganizerAvatar(
            key: const ValueKey<String>('host-organizer-navigation-avatar'),
            club: selectedOrganizer,
            size: CatchLayout.appShellNavigationIdentityExtent,
          ),
    selectedIconBuilder: selectedOrganizer == null
        ? null
        : (context) => HostOrganizerAvatar(
            key: const ValueKey<String>(
              'host-organizer-navigation-avatar-selected',
            ),
            club: selectedOrganizer,
            size: CatchLayout.appShellNavigationIdentityExtent,
            selected: true,
          ),
    onLongPress: onOrganizerLongPress,
    semanticValue: selectedOrganizer?.name,
    semanticHint: organizerSemanticHint,
  ),
];
