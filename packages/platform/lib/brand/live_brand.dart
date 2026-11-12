import 'package:catch_kernel/brand.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'live_brand.g.dart';

// The same shapes packages/brand/brand.schema.json allows, so a malformed
// config/brand document can never put an arbitrary link in front of a user.
final _appStoreLink = RegExp(
  r'^https://apps\.apple\.com/(?:[a-z]{2}/)?app/(?:[a-z0-9-]+/)?id[0-9]+$',
);
final _playStoreLink = RegExp(
  r'^https://play\.google\.com/store/apps/details\?id=[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$',
);

Uri? _validLink(String? value, RegExp shape) =>
    value != null && shape.hasMatch(value) ? Uri.parse(value) : null;

/// One app's store listings. A null link means the app is not on that store.
@immutable
final class StoreLinks {
  const StoreLinks({this.ios, this.android});

  /// Links from generated values, dropping any that fail the shape check.
  factory StoreLinks.fromStrings({
    required String? ios,
    required String? android,
  }) => StoreLinks(
    ios: _validLink(ios, _appStoreLink),
    android: _validLink(android, _playStoreLink),
  );

  /// Reads a `stores.consumer` or `stores.host` map from config/brand.
  ///
  /// A slot that is present and null means "not on that store"; a slot that is
  /// missing, not a string or not a store URL keeps the [fallback] link.
  factory StoreLinks.fromConfig(Object? value, StoreLinks fallback) {
    if (value is! Map) return fallback;
    Uri? slot(String key, RegExp shape, Uri? fallbackLink) {
      if (!value.containsKey(key)) return fallbackLink;
      final raw = value[key];
      if (raw == null) return null;
      return raw is String
          ? _validLink(raw, shape) ?? fallbackLink
          : fallbackLink;
    }

    return StoreLinks(
      ios: slot('ios', _appStoreLink, fallback.ios),
      android: slot('android', _playStoreLink, fallback.android),
    );
  }

  final Uri? ios;
  final Uri? android;

  /// The listing for [platform], or null on the web, desktop or a store the
  /// app is not on.
  Uri? forPlatform(TargetPlatform platform, {bool isWeb = kIsWeb}) {
    if (isWeb) return null;
    return switch (platform) {
      TargetPlatform.iOS => ios,
      TargetPlatform.android => android,
      _ => null,
    };
  }

  @override
  bool operator ==(Object other) =>
      other is StoreLinks && other.ios == ios && other.android == android;

  @override
  int get hashCode => Object.hash(ios, android);
}

/// The brand values the apps may update without a release: today the store
/// links, read from config/brand (packages/brand/brand.json as published by
/// tool/firebase/create_config_brand.mjs).
@immutable
final class LiveBrand {
  const LiveBrand({required this.consumer, required this.host});

  /// Reads a config/brand document, slot by slot over [fallback].
  factory LiveBrand.fromConfig(
    Map<String, Object?>? data, {
    LiveBrand? fallback,
  }) {
    final base = fallback ?? LiveBrand.generated;
    final stores = data?['stores'];
    if (stores is! Map) return base;
    return LiveBrand(
      consumer: StoreLinks.fromConfig(stores['consumer'], base.consumer),
      host: StoreLinks.fromConfig(stores['host'], base.host),
    );
  }

  /// The reviewed values compiled into the app (packages/kernel/lib/brand.dart).
  static final generated = LiveBrand(
    consumer: StoreLinks.fromStrings(
      ios: Brand.storesConsumerIos,
      android: Brand.storesConsumerAndroid,
    ),
    host: StoreLinks.fromStrings(
      ios: Brand.storesHostIos,
      android: Brand.storesHostAndroid,
    ),
  );

  /// The Catch app's listings.
  final StoreLinks consumer;

  /// The Catch Host app's listings.
  final StoreLinks host;

  @override
  bool operator ==(Object other) =>
      other is LiveBrand && other.consumer == consumer && other.host == host;

  @override
  int get hashCode => Object.hash(consumer, host);
}

/// The brand values to use, read once from config/brand (Firestore serves its
/// offline cache when the network is slow) and kept for the session. Nothing
/// reads this at startup: a store link awaits it when tapped, and any failure
/// or a slow read falls back to the generated values.
// keepalive: account-free: one read of a public config document, shared by
// every screen that links to a store.
@Riverpod(keepAlive: true)
Future<LiveBrand> liveBrand(Ref ref) async {
  try {
    final snap = await ref
        .watch(firebaseFirestoreProvider)
        .doc('config/brand')
        .get()
        .timeout(const Duration(seconds: 3));
    return LiveBrand.fromConfig(snap.data());
  } catch (error, stackTrace) {
    // A store link is never worth an error screen: use the reviewed values.
    ref
        .read(errorLoggerProvider)
        .logAppException(
          normalizeBackendError(
            error,
            stackTrace: stackTrace,
            context: const BackendErrorContext(
              service: BackendService.firestore,
              action: 'read live brand config',
              resource: 'config/brand',
            ),
          ),
        );
    return LiveBrand.generated;
  }
}
