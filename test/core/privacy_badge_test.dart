import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('CatchPrivacyBadge renders each handoff visibility mode', (
    tester,
  ) async {
    final copy = catchPrivacyBadgeCopy(AppLocalizationsEn());
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchPrivacyBadge(copy: copy),
              CatchPrivacyBadge(
                copy: copy,
                variant: CatchPrivacyBadgeVariant.catchPrivate,
              ),
              CatchPrivacyBadge(
                copy: copy,
                variant: CatchPrivacyBadgeVariant.hostCanSee,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Private to you'), findsOneWidget);
    expect(find.text('Catch private'), findsOneWidget);
    expect(find.text('Host can see'), findsOneWidget);
    expect(find.byIcon(CatchIcons.locked), findsOneWidget);
    expect(find.byIcon(CatchIcons.safety), findsOneWidget);
    expect(find.byIcon(CatchIcons.show), findsOneWidget);
    expect(find.byType(CatchBadge), findsNWidgets(3));
  });
}
