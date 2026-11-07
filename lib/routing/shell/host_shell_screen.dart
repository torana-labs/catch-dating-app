import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/hosts.dart';
import 'package:catch_dating_app/notifications/notifications.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/routing/shell/host_shell_navigation.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/push/fcm_service.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The Host app's frame: the four destinations around the branch navigator.
///
/// It keeps the selected organizer in step with the route's requested
/// organizer, opens the organizer switcher, starts Firebase Messaging and
/// tags errors and analytics with the signed-in person. Every screen inside
/// brings its own frame; legacy screens keep their legacy top bars.
class HostShellScreen extends ConsumerStatefulWidget {
  const HostShellScreen({
    super.key,
    required this.navigationShell,
    this.requestedOrganizerId,
  });

  final StatefulNavigationShell navigationShell;
  final String? requestedOrganizerId;

  @override
  ConsumerState<HostShellScreen> createState() => _HostShellScreenState();
}

class _HostShellScreenState extends ConsumerState<HostShellScreen> {
  String? _consumedRequestedOrganizerId;
  String? _scheduledSelection;

  @override
  void didUpdateWidget(covariant HostShellScreen oldWidget) {
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
    final organizersAsync = isAuthenticated
        ? ref.watch(hostOperableOrganizersProvider(uid))
        : null;
    final organizers = organizersAsync?.asData?.value ?? const <Organizer>[];
    final selectedOrganizerId = isAuthenticated
        ? ref.watch(hostOrganizerSelectionProvider(uid))
        : null;
    final requestedOrganizerId = widget.requestedOrganizerId?.trim();
    final hasUnconsumedRequest =
        requestedOrganizerId != null &&
        requestedOrganizerId.isNotEmpty &&
        requestedOrganizerId != _consumedRequestedOrganizerId;
    final selectedOrganizer = resolveSelectedHostOrganizer(
      organizers,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: hasUnconsumedRequest ? requestedOrganizerId : null,
    );
    if (hasUnconsumedRequest && organizersAsync?.hasValue == true) {
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

    final size = CatchWindowSize.fromWidth(MediaQuery.sizeOf(context).width);
    // Only the sidebar shows who is signed in.
    final profile = isAuthenticated && size == CatchWindowSize.expanded
        ? ref.watch(watchUserProfileProvider).asData?.value
        : null;
    final canSwitch = organizers.length > 1 && selectedOrganizer != null;
    final navigation = hostShellNavigation(
      l10n: context.l10n,
      active: HostShellDestination.values[widget.navigationShell.currentIndex],
      onChanged: (destination) => widget.navigationShell.goBranch(
        destination.index,
        initialLocation:
            destination.index == widget.navigationShell.currentIndex,
      ),
      size: size,
      unreadCount: unreadCount,
      organizer: selectedOrganizer == null
          ? null
          : HostShellIdentity(
              name: selectedOrganizer.name,
              photoUrl: selectedOrganizer.logoPhotoUrl,
            ),
      person: profile == null
          ? null
          : HostShellIdentity(
              name: profile.accountDisplayName,
              photoUrl: profile.primaryPhotoThumbnailUrl,
            ),
      onNewEvent: selectedOrganizer == null
          ? null
          : () => unawaited(_openCreateEvent(selectedOrganizer)),
      onSwitchOrganizer: canSwitch
          ? () => unawaited(
              _openOrganizerSwitcher(
                uid: uid,
                organizers: organizers,
                selectedOrganizer: selectedOrganizer,
              ),
            )
          : null,
    );

    return CatchWorkspaceHeaderLayout(
      child: CatchAppShell(
        navigation: navigation,
        // A branch navigator's modal barrier drops the semantics painted
        // before it; confined to the screen it cannot hide a rail or sidebar.
        child: Semantics(
          container: true,
          child: CatchWorkspacePaneScope(
            isSinglePane: true,
            child: widget.navigationShell,
          ),
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

  Future<void> _openCreateEvent(Organizer organizer) async {
    await GoRouter.of(context).pushNamed(
      Routes.hostCreateEventScreen.name,
      pathParameters: {'organizerId': organizer.id},
      extra: HostCreateEventRouteArguments(initialOrganizer: organizer),
    );
  }

  Future<void> _openOrganizerSwitcher({
    required String uid,
    required List<Organizer> organizers,
    required Organizer selectedOrganizer,
  }) async {
    catchTransitionHaptic();
    final organizerId = await showHostOrganizerSwitcherSheet(
      context: context,
      organizers: organizers,
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
