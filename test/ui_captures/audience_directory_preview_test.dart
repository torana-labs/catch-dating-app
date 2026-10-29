import 'dart:io';

import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

void main() {
  testWidgets(
    'captures the four Audience directories',
    (tester) async {
      for (final (entryId, lifecycle) in [
        ('host_customers_populated', null),
        ('host_customers_audiences_populated', null),
        ('host_forms_populated', null),
        ('host_responses_populated', null),
        for (final status in [
          'Submitted',
          'In review',
          'Approved',
          'Waitlisted',
          'Declined',
          'Withdrawn',
        ])
          ('host_responses_populated', status),
      ]) {
        final entry = findScreenCapture(entryId);
        final artifacts = await captureCatchWidget(
          tester,
          id: lifecycle == null
              ? entryId
              : 'host_responses_${lifecycle.toLowerCase().replaceAll(' ', '_')}',
          drive: lifecycle == null
              ? null
              : (tester) async {
                  final option = find.descendant(
                    of: find.byKey(const ValueKey('host-responses-lifecycle')),
                    matching: find.text(lifecycle),
                  );
                  final button = find.ancestor(
                    of: option,
                    matching: find.byType(
                      CatchChoiceButton<HostApplicationReviewStatus?>,
                    ),
                  );
                  await Scrollable.of(
                    tester.element(button),
                    axis: Axis.horizontal,
                  ).position.ensureVisible(
                    tester.renderObject(button),
                    alignment: 0.5,
                  );
                  await tester.tap(option);
                },
          builder: entry.builder,
          providerOverrides: entry.providerOverrides,
          device: CaptureDevice.iphone17Pro,
          includeOverlays: true,
          pixelRatio: 2,
          textScale: double.parse(
            const String.fromEnvironment(
              'CAPTURE_TEXT_SCALE',
              defaultValue: '1',
            ),
          ),
          outputDirectory: Directory(
            const String.fromEnvironment(
              'CAPTURE_OUTPUT_DIR',
              defaultValue: 'artifacts/audience-directory-preview',
            ),
          ),
        );
        expect(artifacts, hasLength(2));
        expect(tester.takeException(), isNull);
      }
    },
    variant: TargetPlatformVariant.only(TargetPlatform.iOS),
  );
}
