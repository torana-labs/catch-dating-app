import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/brand/live_brand.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:url_launcher/url_launcher.dart';

part 'external_links.g.dart';

typedef ExternalUrlLauncher = Future<bool> Function(Uri uri, {LaunchMode mode});

// keepalive: launcher is a platform facade shared by controllers across routes.
@Riverpod(keepAlive: true)
ExternalUrlLauncher externalUrlLauncher(Ref ref) =>
    (uri, {mode = LaunchMode.platformDefault}) => launchUrl(uri, mode: mode);

// keepalive: link controller centralizes external navigation policy app-wide.
@Riverpod(keepAlive: true)
ExternalLinkController externalLinkController(Ref ref) =>
    ExternalLinkController(ref.watch(externalUrlLauncherProvider));

class ExternalLinkController {
  const ExternalLinkController(this._launchUrl);

  final ExternalUrlLauncher _launchUrl;

  Future<bool> openExternal(Uri uri) {
    if (!uri.hasScheme) return Future.value(false);
    return withBackendErrorContext(
      () => _launchUrl(uri, mode: LaunchMode.externalApplication),
      context: const BackendErrorContext(
        service: BackendService.external,
        action: 'open external link',
        resource: 'url_launcher',
      ),
    );
  }

  /// Opens Catch Host's store listing for this device, or its web page
  /// while the app is not on this device's store (and on the web).
  Future<bool> openHostApp({LiveBrand? brand, TargetPlatform? platform}) =>
      openExternal(
        (brand ?? LiveBrand.generated).host.forPlatform(
              platform ?? defaultTargetPlatform,
            ) ??
            AppConfig.hostAppUrl,
      );

  /// Opens the Catch app's store listing for this device, or the website's
  /// download page while the app is not on this device's store.
  Future<bool> openCatchApp({LiveBrand? brand, TargetPlatform? platform}) =>
      openExternal(
        (brand ?? LiveBrand.generated).consumer.forPlatform(
              platform ?? defaultTargetPlatform,
            ) ??
            AppConfig.publicSiteUrl.resolve('/download/'),
      );

  /// Opens a one-person WhatsApp handoff with editable text prefilled.
  ///
  /// This route intentionally returns only whether the external application
  /// opened. Catch cannot observe whether the host ultimately pressed Send.
  Future<bool> openWhatsappHandoff({
    required String phoneE164,
    required String message,
  }) async {
    final digits = phoneE164.replaceAll(RegExp(r'[^0-9]'), '');
    final body = message.trim();
    if (digits.length < 8 || digits.length > 15 || body.isEmpty) {
      return Future.value(false);
    }
    final parameters = <String, String>{'phone': digits, 'text': body};
    final appUri = Uri(
      scheme: 'whatsapp',
      host: 'send',
      queryParameters: parameters,
    );
    try {
      if (await openExternal(appUri)) return true;
    } on AppException {
      // Some platforms throw instead of returning false for an unavailable
      // custom scheme. The universal handoff remains a safe fallback.
    }
    return openExternal(
      Uri.https('wa.me', '/$digits', <String, String>{'text': body}),
    );
  }

  Future<bool> open(Uri uri) {
    if (!uri.hasScheme) return Future.value(false);
    return withBackendErrorContext(
      () => _launchUrl(uri),
      context: const BackendErrorContext(
        service: BackendService.external,
        action: 'open link',
        resource: 'url_launcher',
      ),
    );
  }
}
