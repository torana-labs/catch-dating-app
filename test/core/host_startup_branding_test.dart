import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/pages/startup/splash_screen.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    AppConfig.configureEntrypointRole(AppRole.host);
  });

  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  test('Host startup resolves dedicated light and dark marks', () {
    expect(
      SplashScreen.iconAssetForBrightness(
        Brightness.light,
        appRole: AppRole.host,
      ),
      SplashScreen.hostLightIconAsset,
    );
    expect(
      SplashScreen.iconAssetForBrightness(
        Brightness.dark,
        appRole: AppRole.host,
      ),
      SplashScreen.hostDarkIconAsset,
    );
  });

  testWidgets('Host startup paints the Host mark and semantic product name', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: AppTheme.light,
        home: const SplashScreen(),
      ),
    );

    final logo = tester.widget<Image>(find.byType(Image));
    expect(
      (logo.image as AssetImage).assetName,
      SplashScreen.hostLightIconAsset,
    );
    expect(find.bySemanticsLabel('Catch Host'), findsOneWidget);
  });
}
