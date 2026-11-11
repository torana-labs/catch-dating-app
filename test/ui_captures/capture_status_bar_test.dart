import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/capture_device.dart';
import 'support/capture_pump.dart';

void main() {
  late Directory output;

  setUp(() => output = Directory.systemTemp.createTempSync('catch-status-'));
  tearDown(() => output.deleteSync(recursive: true));

  test('the generic phone is the iPhone 17 Pro screen with its safe areas', () {
    const phone = CaptureDevice.genericPhone;
    expect(CaptureDevice.fromId('generic-phone'), same(phone));
    expect(phone.size, const Size(402, 874));
    expect(phone.safeArea, const EdgeInsets.only(top: 62, bottom: 34));
    expect(phone.showsStatusBar, isTrue);
    expect(CaptureDevice.iphone17Pro.showsStatusBar, isFalse);
  });

  test('the unframed marketing devices match the exporter\'s device table', () {
    const tablet = CaptureDevice.genericTablet;
    expect(CaptureDevice.fromId('generic-tablet'), same(tablet));
    expect(tablet.size, const Size(1194, 834));
    expect(tablet.safeArea, const EdgeInsets.only(top: 24, bottom: 20));
    expect(tablet.showsStatusBar, isFalse);
    const desktop = CaptureDevice.desktopBrowser;
    expect(CaptureDevice.fromId('desktop-browser'), same(desktop));
    expect(desktop.size, const Size(1440, 900));
    expect(desktop.safeArea, EdgeInsets.zero);
    expect(desktop.showsStatusBar, isFalse);
  });

  testWidgets('generic phone captures draw a clean status bar in the top '
      'safe area, light and dark', (tester) async {
    final colors = <Color?>[];
    await captureCatchWidget(
      tester,
      id: 'status-bar',
      device: CaptureDevice.genericPhone,
      outputDirectory: output,
      builder: (context) => const SizedBox.expand(),
      drive: (tester) async {
        final bar = find.byType(CaptureStatusBar);
        expect(bar, findsOneWidget);
        expect(tester.getRect(bar), const Rect.fromLTWH(0, 0, 402, 62));
        final time = find.text(CaptureStatusBar.time);
        expect(time, findsOneWidget);
        expect(tester.getRect(time).bottom, lessThanOrEqualTo(62));
        colors.add(tester.widget<CaptureStatusBar>(bar).color);
      },
    );
    expect(colors, const [Color(0xFF000000), Color(0xFFFFFFFF)]);
  });

  testWidgets('other devices keep their screens unchanged', (tester) async {
    await captureCatchWidget(
      tester,
      id: 'no-status-bar',
      device: CaptureDevice.iphone17Pro,
      themes: const [CaptureTheme.light],
      outputDirectory: output,
      builder: (context) => const SizedBox.expand(),
      drive: (tester) async {
        expect(find.byType(CaptureStatusBar), findsNothing);
      },
    );
  });
}
