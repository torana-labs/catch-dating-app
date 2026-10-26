import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/notifications/domain/foreground_notification.dart';
import 'package:catch_dating_app/notifications/presentation/foreground_notification_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// App-level presentation adapter. Delivery never reads BuildContext; the
/// shared notice never parses FCM, authenticates a user or chooses a route.
class ForegroundNotificationListener extends ConsumerStatefulWidget {
  const ForegroundNotificationListener({
    super.key,
    required this.router,
    required this.child,
  });
  final GoRouter router;
  final Widget child;

  @override
  ConsumerState<ForegroundNotificationListener> createState() =>
      _ForegroundNotificationListenerState();
}

class _ForegroundNotificationListenerState
    extends ConsumerState<ForegroundNotificationListener>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.router.routerDelegate.addListener(_routeChanged);
  }

  @override
  void didUpdateWidget(ForegroundNotificationListener oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.router != widget.router) {
      oldWidget.router.routerDelegate.removeListener(_routeChanged);
      widget.router.routerDelegate.addListener(_routeChanged);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.router.routerDelegate.removeListener(_routeChanged);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref
        .read(foregroundNotificationControllerProvider.notifier)
        .setForeground(state == AppLifecycleState.resumed);
  }

  String get _path =>
      widget.router.routerDelegate.currentConfiguration.uri.path;

  void _routeChanged() {
    // RouterDelegate also notifies during restoration/build. Route observation
    // may dismiss presentation state only after that frame has completed.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(catchNoticeControllerProvider.notifier)
          .dismissByDedupeKey('arrival.$_path');
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(foregroundNotificationControllerProvider, (previous, event) {
      final lifecycle = WidgetsBinding.instance.lifecycleState;
      if (event == null ||
          _path == event.route ||
          (lifecycle != null && lifecycle != AppLifecycleState.resumed)) {
        return;
      }
      final isMatch = event.kind == ForegroundNotificationKind.match;
      final l10n = context.l10n;
      ref
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData.arrival(
              id: event.id,
              dedupeKey: event.dedupeKey,
              title:
                  event.title ??
                  (isMatch
                      ? l10n.notificationArrivalMatchTitle
                      : l10n.notificationArrivalMessageTitle),
              message: event.body,
              icon: isMatch ? CatchIcons.like : CatchIcons.chat,
              tone: isMatch ? CatchNoticeTone.event : CatchNoticeTone.status,
              person: event.actorName == null
                  ? null
                  : CatchPersonAvatarItem(
                      name: event.actorName!,
                      imageUrl: event.actorAvatarUrl,
                    ),
              onOpen: () {
                if (!mounted ||
                    !ref
                        .read(foregroundNotificationControllerProvider.notifier)
                        .canOpen(event) ||
                    _path == event.route) {
                  return;
                }
                widget.router.go(event.route);
              },
            ),
          );
    });
    return widget.child;
  }
}
