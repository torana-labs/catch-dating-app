import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

/// Store review requires in-app Privacy, Terms and Help destinations, and
/// environments differ only in identity, so every build reads the same
/// canonical public routes.
const _expectedLegalDefines = {
  'CATCH_PRIVACY_POLICY_URL': '${Brand.webOrigin}/privacy/',
  'CATCH_TERMS_URL': '${Brand.webOrigin}/terms/',
  'CATCH_HELP_URL': '${Brand.webOrigin}/help/',
};

void main() {
  for (final environment in ['dev', 'staging', 'prod', 'local']) {
    test('$environment dart defines configure the public legal links', () {
      final defines =
          jsonDecode(
                File(
                  'tool/env/dart_defines/$environment.json',
                ).readAsStringSync(),
              )
              as Map<String, dynamic>;

      for (final MapEntry(:key, :value) in _expectedLegalDefines.entries) {
        expect(defines[key], value, reason: key);
        expect(AppConfig.configuredExternalUriFor(value), isNotNull);
      }
    });
  }

  test('privacy, terms and help never alias the same route', () {
    expect(_expectedLegalDefines.values.toSet(), hasLength(3));
  });

  test('legal URL getters resolve overridden define values', () {
    AppConfig.overrideLegalUrlDefinesForTesting(_expectedLegalDefines);
    addTearDown(AppConfig.resetLegalUrlDefinesOverrideForTesting);

    expect(
      AppConfig.privacyPolicyUrl,
      Uri.parse('${Brand.webOrigin}/privacy/'),
    );
    expect(AppConfig.termsUrl, Uri.parse('${Brand.webOrigin}/terms/'));
    expect(AppConfig.helpUrl, Uri.parse('${Brand.webOrigin}/help/'));

    AppConfig.overrideLegalUrlDefinesForTesting(const {
      'CATCH_PRIVACY_POLICY_URL': 'http://${Brand.webDomain}/privacy/',
      'CATCH_TERMS_URL': '',
    });
    expect(AppConfig.privacyPolicyUrl, isNull);
    expect(AppConfig.termsUrl, isNull);
  });
}
