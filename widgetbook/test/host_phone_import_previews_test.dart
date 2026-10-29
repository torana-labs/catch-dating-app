import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_guest_section.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_saved_review_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_phone_import_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (name, builder, type, count)
        in <(String, WidgetBuilder, Type, int)>[
          ('review', hostPhoneImportReviewStates, PhoneImportReviewScreen, 2),
          ('guests', hostPhoneImportGuestStates, PhoneImportGuestSection, 3),
          (
            'saved',
            hostPhoneImportSavedReviewState,
            PhoneImportSavedReviewSection,
            1,
          ),
          (
            'no access',
            hostPhoneImportAccessUnavailableState,
            PhoneImportScreen,
            1,
          ),
        ]) {
      testWidgets('$name previews fit both themes at text scale $scale', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(520, 2000);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: Builder(
                builder: (context) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.linear(scale),
                    disableAnimations: true,
                  ),
                  child: Builder(builder: builder),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(count));
          if (type == PhoneImportReviewScreen) {
            expect(
              find.textContaining('Nothing is saved or'),
              findsNWidgets(2),
            );
          }
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
        }
      });
    }
  }
}
