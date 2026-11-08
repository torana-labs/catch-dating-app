import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_person_messaging_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  final cases = <String, WidgetBuilder>{
    'person-conversation': personConversationPreview,
    'selected-person': selectedPersonPreview,
  };
  for (final entry in cases.entries) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('${entry.key} renders at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(402, 874);
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final boundary = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: boundary,
            child: Builder(builder: entry.value),
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Riya Mehta'), findsWidgets);
        if (entry.key.endsWith('conversation') ||
            entry.key == 'selected-person') {
          expect(find.text('See you on Sunday!'), findsOneWidget);
          expect(find.text('Is there parking nearby?'), findsOneWidget);
        }
        final error = tester.takeException();
        await tester.runAsync(() async {
          final render =
              boundary.currentContext!.findRenderObject()!
                  as RenderRepaintBoundary;
          final image = await render.toImage();
          final bytes = (await image.toByteData(
            format: ui.ImageByteFormat.png,
          ))!;
          final output = File(
            '../artifacts/ui-captures/person-messaging/${entry.key}-$scale.png',
          );
          await output.parent.create(recursive: true);
          await output.writeAsBytes(bytes.buffer.asUint8List());
          image.dispose();
        });
        await tester.pumpWidget(const SizedBox());
        expect(error, isNull);
      });
    }
  }
}
