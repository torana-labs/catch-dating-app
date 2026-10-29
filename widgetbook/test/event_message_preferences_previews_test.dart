import 'package:catch_dating_app/event_success/presentation/event_message_channel_accordion.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preference_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preferences_navigation_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preferences_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_sender_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_message_preferences_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (name, builder, type) in <(String, WidgetBuilder, Type)>[
      (
        'event detail entry',
        eventMessagePreferencesNavigation,
        EventMessagePreferencesNavigationSection,
      ),
      (
        'message preferences sheet',
        eventMessagePreferencesSheet,
        EventMessagePreferencesSheet,
      ),
      (
        'sender permission',
        eventMessageSenderSection,
        EventMessageSenderSection,
      ),
      (
        'permission facts',
        eventMessagePreferenceSection,
        EventMessagePreferenceSection,
      ),
      (
        'channel disclosure',
        eventMessageChannelAccordion,
        EventMessageChannelAccordion,
      ),
    ]) {
      testWidgets('$name preview mounts at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(520, 2000);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              ...GlobalMaterialLocalizations.delegates,
            ],
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
        expect(find.byType(type), findsOneWidget);
      });
    }
  }
}
