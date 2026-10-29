import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  test('openExternal uses external application launch mode', () async {
    Uri? launchedUri;
    LaunchMode? launchMode;
    final controller = ExternalLinkController((
      uri, {
      mode = LaunchMode.platformDefault,
    }) async {
      launchedUri = uri;
      launchMode = mode;
      return true;
    });

    final opened = await controller.openExternal(
      Uri.parse('https://catchdates.com/help'),
    );

    expect(opened, isTrue);
    expect(launchedUri, Uri.parse('https://catchdates.com/help'));
    expect(launchMode, LaunchMode.externalApplication);
  });

  test('rejects relative URIs before launching', () async {
    var launchCallCount = 0;
    final controller = ExternalLinkController((
      uri, {
      mode = LaunchMode.platformDefault,
    }) async {
      launchCallCount += 1;
      return true;
    });

    final opened = await controller.openExternal(Uri.parse('/help'));

    expect(opened, isFalse);
    expect(launchCallCount, 0);
  });

  test('openHostApp uses the configured host app handoff URL', () async {
    Uri? launchedUri;
    LaunchMode? launchMode;
    final controller = ExternalLinkController((
      uri, {
      mode = LaunchMode.platformDefault,
    }) async {
      launchedUri = uri;
      launchMode = mode;
      return true;
    });

    final opened = await controller.openHostApp();

    expect(opened, isTrue);
    expect(launchedUri, Uri.parse('https://catchdates.com/host'));
    expect(launchMode, LaunchMode.externalApplication);
  });

  test(
    'openWhatsappHandoff opens the native app scheme with prefilled text',
    () async {
      Uri? launchedUri;
      LaunchMode? launchMode;
      final controller = ExternalLinkController((
        uri, {
        mode = LaunchMode.platformDefault,
      }) async {
        launchedUri = uri;
        launchMode = mode;
        return true;
      });

      final opened = await controller.openWhatsappHandoff(
        phoneE164: '+91 98765 43210',
        message: ' Hi Ananya, see you Sunday! ',
      );

      expect(opened, isTrue);
      expect(launchedUri?.scheme, 'whatsapp');
      expect(launchedUri?.host, 'send');
      expect(launchedUri?.queryParameters['phone'], '919876543210');
      expect(
        launchedUri?.queryParameters['text'],
        'Hi Ananya, see you Sunday!',
      );
      expect(launchMode, LaunchMode.externalApplication);
    },
  );

  test(
    'openWhatsappHandoff falls back to wa.me when the app is absent',
    () async {
      final launchedUris = <Uri>[];
      final controller = ExternalLinkController((
        uri, {
        mode = LaunchMode.platformDefault,
      }) async {
        launchedUris.add(uri);
        return launchedUris.length > 1;
      });

      final opened = await controller.openWhatsappHandoff(
        phoneE164: '+91 98765 43210',
        message: 'Hello',
      );

      expect(opened, isTrue);
      expect(launchedUris, hasLength(2));
      expect(launchedUris.first.scheme, 'whatsapp');
      expect(launchedUris.last.host, 'wa.me');
      expect(launchedUris.last.path, '/919876543210');
      expect(launchedUris.last.queryParameters['text'], 'Hello');
    },
  );

  test(
    'openWhatsappHandoff rejects invalid destinations and empty copy',
    () async {
      var calls = 0;
      final controller = ExternalLinkController((
        uri, {
        mode = LaunchMode.platformDefault,
      }) async {
        calls += 1;
        return true;
      });

      expect(
        await controller.openWhatsappHandoff(
          phoneE164: '123',
          message: 'Hello',
        ),
        isFalse,
      );
      expect(
        await controller.openWhatsappHandoff(
          phoneE164: '+919876543210',
          message: ' ',
        ),
        isFalse,
      );
      expect(calls, 0);
    },
  );
}
