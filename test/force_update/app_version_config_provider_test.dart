import 'package:catch_dating_app/contexts/account/data/app_version_config_provider.dart';
import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('force-update keys are scoped to the installable app role', () {
    expect(
      appVersionConfigKeyFor(AppRole.consumer, 'min_build_ios'),
      'consumer_min_build_ios',
    );
    expect(
      appVersionConfigKeyFor(AppRole.host, 'store_url_android'),
      'host_store_url_android',
    );
  });

  test('bundled defaults keep both app roles non-blocking', () {
    for (final role in AppRole.values) {
      expect(
        kAppVersionConfigDefaults[appVersionConfigKeyFor(role, 'min_version')],
        '0.0.0',
      );
      expect(
        kAppVersionConfigDefaults[appVersionConfigKeyFor(
          role,
          'min_build_ios',
        )],
        0,
      );
      expect(
        kAppVersionConfigDefaults[appVersionConfigKeyFor(
          role,
          'store_url_ios',
        )],
        isEmpty,
      );
    }
  });

  test('Consumer keeps legacy gate until its scoped value is remote', () {
    expect(
      resolveAppVersionConfigValue(
        role: AppRole.consumer,
        scopedValue: 0,
        scopedValueIsRemote: false,
        legacyConsumerValue: 42,
      ),
      42,
    );
    expect(
      resolveAppVersionConfigValue(
        role: AppRole.consumer,
        scopedValue: 7,
        scopedValueIsRemote: true,
        legacyConsumerValue: 42,
      ),
      7,
    );
  });

  test('Host never inherits a legacy Consumer gate', () {
    expect(
      resolveAppVersionConfigValue(
        role: AppRole.host,
        scopedValue: 0,
        scopedValueIsRemote: false,
        legacyConsumerValue: 42,
      ),
      0,
    );
  });
}
