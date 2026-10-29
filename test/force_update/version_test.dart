import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/contexts/account/domain/platform_build_resolver.dart';
import 'package:catch_dating_app/contexts/account/domain/version.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('isUpdateRequired', () {
    test('#25 same version → no update required', () {
      expect(isUpdateRequired(current: '2.3.4', minimum: '2.3.4'), isFalse);
    });

    test('#26 lower major → update required', () {
      expect(isUpdateRequired(current: '1.9.9', minimum: '2.0.0'), isTrue);
    });

    test('#27 same major, lower minor → update required', () {
      expect(isUpdateRequired(current: '2.1.9', minimum: '2.2.0'), isTrue);
    });

    test('same major+minor, lower patch → update required', () {
      expect(isUpdateRequired(current: '2.2.1', minimum: '2.2.2'), isTrue);
    });

    test('#28 current above minimum → no update required', () {
      expect(isUpdateRequired(current: '3.0.0', minimum: '2.9.9'), isFalse);
    });

    test('non-parseable current treated as 0.0.0 → update required', () {
      expect(
        isUpdateRequired(current: 'bad-version', minimum: '1.0.0'),
        isTrue,
      );
    });

    test('non-parseable minimum treated as 0.0.0 → no update required', () {
      expect(
        isUpdateRequired(current: '1.0.0', minimum: 'bad-version'),
        isFalse,
      );
    });
  });

  group('isBuildUpdateRequired', () {
    test('minimum build zero disables build gate', () {
      expect(
        isBuildUpdateRequired(currentBuild: '1', minimumBuild: 0),
        isFalse,
      );
    });

    test('lower build requires update', () {
      expect(
        isBuildUpdateRequired(currentBuild: '41', minimumBuild: 42),
        isTrue,
      );
    });

    test('same or newer build does not require update', () {
      expect(
        isBuildUpdateRequired(currentBuild: '42', minimumBuild: 42),
        isFalse,
      );
      expect(
        isBuildUpdateRequired(currentBuild: '43', minimumBuild: 42),
        isFalse,
      );
    });

    test('non-numeric current build fails closed when gate is configured', () {
      expect(
        isBuildUpdateRequired(currentBuild: 'local', minimumBuild: 42),
        isTrue,
      );
    });
  });

  group('minimumBuildForPlatform', () {
    const config = AppVersionConfig(
      minBuildAndroid: 10,
      minBuildIos: 20,
      minBuildWeb: 30,
      minBuildMacos: 40,
    );

    test('selects web gate explicitly', () {
      expect(minimumBuildForPlatform(config, AppBuildPlatform.web), 30);
    });

    test('selects native platform gates', () {
      expect(minimumBuildForPlatform(config, AppBuildPlatform.android), 10);
      expect(minimumBuildForPlatform(config, AppBuildPlatform.ios), 20);
      expect(minimumBuildForPlatform(config, AppBuildPlatform.macos), 40);
    });
  });
}
