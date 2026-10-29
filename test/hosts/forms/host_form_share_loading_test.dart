import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_share_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'unknown form share structure centers loading below the top bar',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final pending = Completer<HostFormShareAssets>();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormShareAssetsControllerProvider(
              organizerId: 'org-1',
              formId: 'form-1',
            ).overrideWith((ref) => pending.future),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: const HostFormShareScreen(
              organizerId: 'org-1',
              formId: 'form-1',
            ),
          ),
        ),
      );

      final topBar = tester.getRect(find.byType(CatchTopBar));
      final progress = tester.getCenter(find.byType(CircularProgressIndicator));
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsNothing);
      expect(progress.dy, closeTo((topBar.bottom + 844) / 2, 40));
    },
  );
}
