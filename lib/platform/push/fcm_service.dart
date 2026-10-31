import 'dart:async';
import 'dart:math';
import 'dart:ui' show PlatformDispatcher;

import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'fcm_service.g.dart';

// Must be top-level — called when app is terminated/backgrounded.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // No UI available here. The OS shows the notification automatically.
  // Data-only processing (if needed) goes here.
}

void registerFirebaseMessagingBackgroundHandler() {
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
}

String? chatRouteFromMessageData(Map<String, Object?> data) {
  final matchId = data['matchId'];
  if (matchId is! String ||
      matchId.trim().isEmpty ||
      matchId.contains('/') ||
      matchId == '.' ||
      matchId == '..') {
    return null;
  }
  final id = Uri.encodeComponent(matchId);
  if (AppConfig.appRole.isHost) return '/host/inbox/$id';
  return '/chats/$id';
}

/// Event-room pushes carry an event id, never a match id or network URL.
String? eventChatRouteFromMessageData(Map<String, Object?> data) {
  if (data['type'] != 'eventChatMessage') return null;
  final eventId = data['eventId'];
  if (eventId is! String ||
      eventId.isEmpty ||
      eventId.length > 180 ||
      eventId.trim() != eventId ||
      eventId == '.' ||
      eventId == '..' ||
      eventId.contains('/') ||
      eventId.contains('\\')) {
    return null;
  }
  return Routes.eventChatScreen.path.replaceFirst(
    ':eventId',
    Uri.encodeComponent(eventId),
  );
}

String? hostEventManageRouteFromMessageData(Map<String, Object?> data) {
  if (!AppConfig.appRole.isHost) return null;
  final type = data['type'];
  if (type != 'hostEventManage' &&
      type != 'hostEventReady' &&
      type != 'eventHostManage') {
    return null;
  }
  final organizerId = data['organizerId'];
  final eventId = data['eventId'];
  if (organizerId is! String || organizerId.isEmpty) return null;
  if (eventId is! String || eventId.isEmpty) return null;
  return '/host/organizers/$organizerId/events/$eventId/manage';
}

String? eventCompanionRouteFromMessageData(Map<String, Object?> data) {
  if (AppConfig.appRole.isHost) return null;
  if (data['type'] != 'eventCompanionReady') return null;
  final organizerId = data['organizerId'];
  final eventId = data['eventId'];
  if (organizerId is! String || organizerId.isEmpty) return null;
  if (eventId is! String || eventId.isEmpty) return null;
  return '/organizers/$organizerId/events/$eventId/companion';
}

String? eventDetailRouteFromMessageData(Map<String, Object?> data) {
  if (AppConfig.appRole.isHost) return null;
  const eventActivityTypes = {
    'eventReminder',
    'eventSignup',
    'waitlistPromotion',
    'waitlistOffer',
    'waitlistOfferExpiring',
    'waitlistOfferExpired',
    'eventCancelled',
    'eventUpdated',
  };
  if (!eventActivityTypes.contains(data['type'])) return null;
  final organizerId = data['organizerId'];
  final eventId = data['eventId'];
  if (organizerId is! String || organizerId.isEmpty) return null;
  if (eventId is! String || eventId.isEmpty) return null;
  return '/organizers/$organizerId/events/$eventId';
}

String? organizerRouteFromMessageData(Map<String, Object?> data) {
  if (AppConfig.appRole.isHost || data['type'] != 'organizerUpdate') {
    return null;
  }
  final organizerId = data['organizerId'];
  if (organizerId is! String || organizerId.isEmpty) return null;
  return '/organizers/$organizerId';
}

String? routeFromMessageData(Map<String, Object?> data) {
  if (data['type'] == 'eventChatMessage') {
    return eventChatRouteFromMessageData(data);
  }
  return hostEventManageRouteFromMessageData(data) ??
      chatRouteFromMessageData(data) ??
      eventCompanionRouteFromMessageData(data) ??
      eventDetailRouteFromMessageData(data) ??
      organizerRouteFromMessageData(data);
}

void navigateToMessageRoute(GoRouter router, Map<String, Object?> data) {
  final route = routeFromMessageData(data);
  if (route != null) router.go(route);
}

class FcmService {
  FcmService(
    this._db,
    this._errorLogger, {
    FirebaseMessaging? messaging,
    Stream<RemoteMessage>? foregroundMessages,
    Stream<RemoteMessage>? openedMessages,
  }) : _messagingOverride = messaging,
       _foregroundMessagesOverride = foregroundMessages,
       _openedMessagesOverride = openedMessages;

  static const _installationIdPreferenceKey = 'catch.pushInstallationId';
  static const _tokenOwnerPreferenceKey = 'catch.pushTokenOwner';
  static const _revokeTokenPreferenceKey = 'catch.pushTokenNeedsRevocation';

  final FirebaseFirestore _db;
  final ErrorLogger _errorLogger;
  final FirebaseMessaging? _messagingOverride;
  final Stream<RemoteMessage>? _foregroundMessagesOverride;
  final Stream<RemoteMessage>? _openedMessagesOverride;
  FirebaseMessaging get _messaging =>
      _messagingOverride ?? FirebaseMessaging.instance;
  Future<void>? _initialization;
  Future<String>? _installationId;
  String? _initializedUid;
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _messageOpenedSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  int _generation = 0;
  String? _registeredToken;

  bool get isSupportedPlatform =>
      AppConfig.supportsPushMessagingOnCurrentPlatform;

  /// Call once when the authenticated shell mounts.
  Future<void> initialize({
    required String uid,
    required GoRouter router,
    void Function(RemoteMessage message)? onForegroundMessage,
  }) async {
    if (!isSupportedPlatform) return;
    final currentInitialization = _initialization;
    if (_initializedUid == uid && currentInitialization != null) {
      return currentInitialization;
    }

    final generation = ++_generation;
    _initializedUid = uid;
    final initialization = withBackendErrorContext(
      () => _initialize(
        uid: uid,
        router: router,
        generation: generation,
        onForegroundMessage: onForegroundMessage,
      ),
      context: const BackendErrorContext(
        service: BackendService.messaging,
        action: 'initialize push notifications',
        resource: 'push_notifications',
      ),
    );
    _initialization = initialization;

    try {
      await initialization;
    } catch (_) {
      if (identical(_initialization, initialization)) {
        _initialization = null;
        _initializedUid = null;
      }
      rethrow;
    }
  }

  Future<void> reset() async {
    ++_generation;
    _initialization = null;
    _initializedUid = null;
    await _cancelSubscriptions();
  }

  /// Best-effort remote cleanup must never trap sign-out while offline. A
  /// persisted revocation flag prevents reusing this address at the next login.
  Future<void> unregisterCurrentInstallation() async {
    if (!isSupportedPlatform) return;
    final uid = _initializedUid;
    final token = _registeredToken;
    await reset();
    Future<void> attempt(
      Future<void> Function() operation,
      String resource,
    ) async {
      try {
        await operation().timeout(const Duration(seconds: 3));
      } catch (error, stackTrace) {
        _logError(
          error,
          stackTrace,
          resource: resource,
          action: 'unregister push token',
        );
      }
    }

    await attempt(() async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_revokeTokenPreferenceKey, true);
    }, 'push_installations');
    await Future.wait([
      attempt(() async {
        await _messaging.deleteToken();
        // Leave the flag set: a delayed SDK completion must not clear a newer
        // session's flag. The next initialization completes rotation itself.
      }, 'push_notifications'),
      if (uid != null)
        attempt(() async {
          final id = await _pushInstallationId();
          final user = _db.collection('users').doc(uid);
          await user.collection('pushInstallations').doc(id).delete();
          if (!AppConfig.appRole.isHost && token != null) {
            await withBackendErrorContext(
              () => _db.runTransaction((tx) async {
                final snapshot = await tx.get(user);
                if (snapshot.data()?['fcmToken'] == token) {
                  tx.update(user, {'fcmToken': FieldValue.delete()});
                }
              }),
              context: const BackendErrorContext(
                service: BackendService.firestore,
                action: 'clear legacy push registration',
                resource: 'push_installations',
              ),
            );
          }
        }, 'push_installations'),
    ]);
    _registeredToken = null;
  }

  Future<void> _cancelSubscriptions() async {
    final cancellations = [
      _tokenRefreshSubscription?.cancel(),
      _messageOpenedSubscription?.cancel(),
      _foregroundSubscription?.cancel(),
    ];
    _tokenRefreshSubscription = null;
    _messageOpenedSubscription = null;
    _foregroundSubscription = null;
    await Future.wait(cancellations.whereType<Future<void>>());
  }

  Future<void> _initialize({
    required String uid,
    required GoRouter router,
    required int generation,
    void Function(RemoteMessage message)? onForegroundMessage,
  }) async {
    await _cancelSubscriptions();
    bool isCurrent() => generation == _generation && _initializedUid == uid;
    if (!isCurrent()) return;

    final preferences = await SharedPreferences.getInstance();
    if (!isCurrent()) return;
    final previousOwner = preferences.getString(_tokenOwnerPreferenceKey);
    final needsLegacyRotation =
        previousOwner == null &&
        preferences.containsKey(_installationIdPreferenceKey);
    if (preferences.getBool(_revokeTokenPreferenceKey) == true ||
        needsLegacyRotation ||
        (previousOwner != null && previousOwner != uid)) {
      await _messaging.deleteToken();
      if (!isCurrent()) return;
      await preferences.remove(_revokeTokenPreferenceKey);
    }
    await preferences.setString(_tokenOwnerPreferenceKey, uid);
    if (!isCurrent()) return;

    _foregroundSubscription =
        (_foregroundMessagesOverride ?? FirebaseMessaging.onMessage).listen((
          message,
        ) {
          if (isCurrent() && _isForSession(message, uid)) {
            onForegroundMessage?.call(message);
          }
        });
    _messageOpenedSubscription =
        (_openedMessagesOverride ?? FirebaseMessaging.onMessageOpenedApp)
            .listen((message) {
              if (isCurrent() && _isForSession(message, uid)) {
                _handleTap(router, message);
              }
            });

    // Request permission (no-op on Android < 13, required on iOS).
    await _messaging.requestPermission();
    if (!isCurrent()) return;
    // Catch owns foreground visuals. Do not show a second native iOS banner.
    await _messaging.setForegroundNotificationPresentationOptions();
    if (!isCurrent()) return;

    _tokenRefreshSubscription = _messaging.onTokenRefresh.listen((token) {
      if (isCurrent()) unawaited(_saveToken(uid, token, generation));
    });
    final token = await _currentToken();
    if (!isCurrent()) return;
    if (token != null) await _saveToken(uid, token, generation);
    if (!isCurrent()) return;

    // Terminated tap: app was closed, user tapped notification.
    final initial = await _messaging.getInitialMessage();
    if (isCurrent() && initial != null && _isForSession(initial, uid)) {
      _handleTap(router, initial);
    }
  }

  bool _isForSession(RemoteMessage message, String uid) =>
      (message.data['recipientUid'] == null ||
          message.data['recipientUid'] == uid) &&
      (message.data['appRole'] == null ||
          message.data['appRole'] == AppConfig.appRoleName);

  void _handleTap(GoRouter router, RemoteMessage message) {
    navigateToMessageRoute(router, message.data);
  }

  Future<String?> _currentToken() async {
    if (kIsWeb) {
      return _messaging.getToken(vapidKey: AppConfig.firebaseWebVapidKey);
    }

    if (defaultTargetPlatform == TargetPlatform.iOS) {
      final apnsToken = await _waitForApnsToken();
      if (apnsToken == null) return null;
      await _messaging.setAutoInitEnabled(true);
    }

    return _messaging.getToken();
  }

  Future<String?> _waitForApnsToken({
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      final token = await _messaging.getAPNSToken();
      if (token != null) return token;
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
    return _messaging.getAPNSToken();
  }

  Future<void> _saveToken(String uid, String token, int generation) async {
    bool isCurrent() => generation == _generation && _initializedUid == uid;
    if (!isCurrent()) return;
    _registeredToken = token;
    final userRef = _db.collection('users').doc(uid);

    // Keep the legacy consumer field working while older production rules and
    // senders are still deployed. A denied compatibility-projection write must
    // not prevent the other token representation from being attempted.
    if (!AppConfig.appRole.isHost) {
      try {
        await userRef.update({'fcmToken': token});
      } catch (error, stackTrace) {
        _logError(error, stackTrace, resource: 'users');
      }
    }

    try {
      final installationId = await _pushInstallationId();
      final packageInfo = await PackageInfo.fromPlatform();
      if (!isCurrent()) return;
      await userRef.collection('pushInstallations').doc(installationId).set({
        'token': token,
        'appRole': AppConfig.appRoleName,
        'environment': AppConfig.environmentName,
        'platform': _platformName,
        'appVersion': packageInfo.version,
        'buildNumber': packageInfo.buildNumber,
        'locale': PlatformDispatcher.instance.locale.toLanguageTag(),
        'timeZone': DateTime.now().timeZoneName,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (error, stackTrace) {
      _logError(error, stackTrace, resource: 'push_installations');
    }
  }

  void _logError(
    Object error,
    StackTrace stackTrace, {
    required String resource,
    String action = 'save push token',
  }) {
    _errorLogger.logAppException(
      normalizeBackendError(
        error,
        stackTrace: stackTrace,
        context: BackendErrorContext(
          service: resource == 'push_notifications'
              ? BackendService.messaging
              : BackendService.firestore,
          action: action,
          resource: resource,
        ),
      ),
    );
  }

  Future<String> _pushInstallationId() {
    return _installationId ??= _loadOrCreatePushInstallationId();
  }

  Future<String> _loadOrCreatePushInstallationId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_installationIdPreferenceKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final generated =
        '${AppConfig.appRoleName}_${_platformName}_'
        '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}_'
        '${Random.secure().nextInt(1 << 31).toRadixString(36)}';
    await prefs.setString(_installationIdPreferenceKey, generated);
    return generated;
  }

  String get _platformName {
    if (kIsWeb) return 'web';
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      TargetPlatform.macOS => 'macos',
      TargetPlatform.windows => 'windows',
      TargetPlatform.linux => 'linux',
      TargetPlatform.fuchsia => 'fuchsia',
    };
  }
}

// keepalive: FCM service owns app-wide token/message registration lifecycle.
@Riverpod(keepAlive: true)
FcmService fcmService(Ref ref) {
  final service = FcmService(
    ref.watch(firebaseFirestoreProvider),
    ref.watch(errorLoggerProvider),
  );
  ref.onDispose(() => unawaited(service.reset()));
  return service;
}
