import 'package:catch_dating_app/hosts/presentation/inbox/host_event_announcement_field.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_send_intent_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_back_button.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_send_intent_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (name, builder, type) in <(String, WidgetBuilder, Type)>[
      ('send choices', hostSendIntentMenuStates, HostSendIntentMenu),
      (
        'announcement readiness',
        hostEventAnnouncementFieldStates,
        HostEventAnnouncementField,
      ),
      ('back button', hostSendsBackButtonStates, HostSendsBackButton),
    ]) {
      testWidgets('$name previews fit at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(520, 2000);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: MediaQuery(
                data: MediaQueryData(
                  textScaler: TextScaler.linear(scale),
                  disableAnimations: true,
                ),
                child: Builder(builder: builder),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(2));
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump(const Duration(milliseconds: 1));
        }
      });
    }
  }
}
