import 'package:catch_dating_app/contexts/messaging/domain/foreground_notification.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'foreground_notification_controller.g.dart';

// keepalive: one session-scoped arrival stream must survive route changes.
@Riverpod(keepAlive: true)
class ForegroundNotificationController
    extends _$ForegroundNotificationController {
  String? _uid;
  bool _foreground = true;
  final _seen = <String>{};

  @override
  ForegroundNotification? build() => null;

  void startSession(String uid) {
    if (_uid == uid) return;
    reset();
    _uid = uid;
  }

  void reset() {
    _uid = null;
    _seen.clear();
    state = null;
    ref.read(catchNoticeControllerProvider.notifier).clear();
  }

  void setForeground(bool foreground) {
    _foreground = foreground;
    if (!foreground) {
      state = null;
      ref.read(catchNoticeControllerProvider.notifier).clear();
    }
  }

  bool canOpen(ForegroundNotification event) =>
      _foreground && _uid == event.uid;

  void receive(String uid, RemoteMessage message) {
    if (!_foreground || _uid != uid) return;
    final event = ForegroundNotification.parse(
      data: message.data,
      uid: uid,
      role: AppConfig.appRole,
      deliveryId: message.messageId,
      title: message.notification?.title,
      body: message.notification?.body,
    );
    if (event == null || !_seen.add(event.id)) return;
    // Bounded session deduplication; never persist notification content.
    if (_seen.length > 256) _seen.remove(_seen.first);
    state = event;
  }
}
