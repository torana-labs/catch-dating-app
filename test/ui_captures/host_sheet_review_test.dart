import 'dart:io';

import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies
void main() {
  setUpAll(loadCatchTestFonts);
  setUp(() {
    AppConfig.configureEntrypointRole(AppRole.host);
  });
  tearDown(() {
    AppConfig.resetEntrypointRoleOverrideForTesting();
  });
  const output = String.fromEnvironment('SHEET_REVIEW_OUTPUT');
  final cases = <String, WidgetBuilder>{
    'organizer-picker': (_) => HostOrganizerSwitcherSheet(
      organizers: [
        HostOperationsFixtures.primaryOrganizer,
        HostOperationsFixtures.dinnerOrganizer,
      ],
      selectedOrganizerId: HostOperationsFixtures.primaryOrganizer.id,
    ),
  };
  for (final entry in cases.entries) {
    testWidgets('Host sheet review ${entry.key}', (tester) async {
      if (output.isEmpty) return;
      await captureCatchWidget(
        tester,
        id: entry.key,
        outputDirectory: Directory(output),
        device: CaptureDevice.iphone17Pro,
        includeOverlays: true,
        builder: (context) => Center(
          child: CatchButton(
            label: 'Open',
            onPressed: () {
              showCatchBottomSheet<void>(
                context: context,
                builder: entry.value,
              );
            },
          ),
        ),
        drive: (tester) async {
          await tester.tap(find.text('Open'));
          await pumpFeatureUi(tester);
        },
      );
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }
}
