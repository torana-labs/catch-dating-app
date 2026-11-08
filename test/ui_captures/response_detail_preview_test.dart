import 'dart:io';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../test_pump_helpers.dart';
import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

void main() {
  testWidgets('captures response detail configurations', (tester) async {
    // The legacy response-detail captures retired with their screen; the
    // application route renders the system response screen.
    for (final id in ['host_application_detail']) {
      final entry = findScreenCapture(id);
      await captureCatchWidget(
        tester,
        id: id,
        builder: entry.builder,
        drive: id.endsWith('_notes')
            ? (tester) async {
                final note = find.byWidgetPredicate(
                  (widget) =>
                      widget is CatchField &&
                      widget.title == 'Private review note',
                );
                expect(find.text('Save review note'), findsNothing);
                await tester.ensureVisible(note);
                await tester.tap(note);
                await pumpFeatureUi(tester);
                expect(find.text('Save review note'), findsOneWidget);
              }
            : null,
        providerOverrides: entry.providerOverrides,
        device: CaptureDevice.iphone17Pro,
        includeOverlays: true,
        textScale: id.endsWith('large_text') ? 2 : 1,
        outputDirectory: Directory(
          const String.fromEnvironment(
            'CAPTURE_OUTPUT_DIR',
            defaultValue: 'artifacts/response-detail-review/after',
          ),
        ),
      );
      expect(tester.takeException(), isNull);
    }
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
}
