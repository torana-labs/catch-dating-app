import 'dart:io';

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

/// Production screen captures, complementing the package-level geometry tests.
/// Assets remain ignored run output; reviewed pixels are not a generated ledger.
void main() {
  for (final id in [
    'host_home_events_past',
    'host_people_phone',
    'host_clubs_management',
    'host_home_dashboard',
    'host_inbox_queries',
  ]) {
    for (final configuration in [
      (device: CaptureDevice.iphone17Pro, scale: 1.0),
      (device: CaptureDevice.iphone17Pro, scale: 2.0),
      (device: CaptureDevice.auditDesktop, scale: 1.0),
    ]) {
      testWidgets('$id ${configuration.device.id} ${configuration.scale}', (
        tester,
      ) async {
        final entry = findScreenCapture(id);
        final files = await captureCatchWidget(
          tester,
          id: '$id-${configuration.device.id}-${configuration.scale}',
          builder: entry.builder,
          providerOverrides: entry.providerOverrides,
          precache: entry.precache,
          device: configuration.device,
          textScale: configuration.scale,
          disableAnimations: true,
          themes: const [CaptureTheme.dark],
          outputDirectory: Directory('artifacts/ui-captures/host-composition'),
          cleanup: entry.cleanup,
          drive: (tester) async {
            await entry.drive?.call(tester);
            if (id == 'host_home_events_past' ||
                id == 'host_customers_populated' ||
                id == 'host_clubs_management') {
              final fields = id == 'host_clubs_management'
                  ? find.byWidgetPredicate(
                      (widget) =>
                          widget is CatchField &&
                          widget.title == 'Organizer name',
                    )
                  : find.byType(CatchField);
              expect(fields, findsWidgets);
              final field = fields.first;
              if (id == 'host_clubs_management') {
                await Scrollable.ensureVisible(
                  tester.element(field),
                  alignment: 0.35,
                );
                await tester.pump();
              }
              expect(field.hitTestable(), findsOneWidget);
              final mouse = await tester.createGesture(
                kind: PointerDeviceKind.mouse,
              );
              await mouse.addPointer(location: tester.getCenter(field));
              await mouse.moveTo(tester.getCenter(field));
              await tester.pump();
              // Whole interaction plane is checked separately from text gutters.
              final bounds = tester.getRect(field);
              expect(bounds.width, greaterThan(250));
              addTearDown(mouse.removePointer);
            }
          },
        );
        expect(files, hasLength(1));
        expect(tester.takeException(), isNull);
      }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
    }
  }
}
