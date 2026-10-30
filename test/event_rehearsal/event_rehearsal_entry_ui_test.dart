import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_customise_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_entry_scaffold.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_start_sheet.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_rehearsal_configuration_test.dart' show rehearsalSourceEvent;

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets('entry loading centers feedback in the bounded route viewport', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        const EventRehearsalEntryStateScaffold(child: CatchLoadingIndicator()),
      ),
    );
    await tester.pump();
    final viewport = tester.getRect(find.byType(CatchLoadingIndicator));
    final progress = tester.getCenter(find.byType(CircularProgressIndicator));
    expect(viewport.height, greaterThan(200));
    expect(progress.dy, closeTo(viewport.center.dy, 1));
    expect(tester.takeException(), isNull);
  });
  for (final (width, scale, dark) in [
    (390.0, 1.0, false),
    (390.0, 2.0, false),
    (1024.0, 1.0, true),
  ]) {
    testWidgets(
      'entry and optional controls fit width $width scale $scale dark $dark',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 844);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        await tester.pumpWidget(
          _app(
            _Harness(configuration: _configuration()),
            scale: scale,
            dark: dark,
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Rehearse your next event'), findsOneWidget);
        expect(find.text('Normal flow'), findsOneWidget);
        expect(find.byType(TextField), findsNothing);
        expect(find.text('Start rehearsal'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await _capture(tester, 'entry-$width-$scale-$dark');
        await tester.ensureVisible(find.text('Customise rehearsal'));
        await tester.tap(find.text('Customise rehearsal'));
        await pumpFeatureUi(tester);
        expect(find.text('24 attendees from this event'), findsOneWidget);
        expect(find.text('Event title'), findsNothing);
        expect(find.text('Number of simulated guests'), findsNothing);
        expect(tester.takeException(), isNull);
        await _capture(tester, 'customise-$width-$scale-$dark');
        await tester.ensureVisible(find.text('Event details'));
        await tester.tap(find.text('Event details'));
        await pumpFeatureUi(tester);
        await tester.ensureVisible(find.text('Event title'));
        await pumpFeatureUi(tester);
        expect(find.text('Event title'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await _capture(tester, 'details-$width-$scale-$dark');
      },
    );
  }

  testWidgets('edits survive Done and reset restores the selected source', (
    tester,
  ) async {
    await tester.pumpWidget(_app(_Harness(configuration: _configuration())));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Customise rehearsal'));
    await tester.tap(find.text('Customise rehearsal'));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Use simulated guests'));
    await tester.tap(find.text('Use simulated guests'));
    await pumpFeatureUi(tester);
    final countField = find.descendant(
      of: find.widgetWithText(CatchField, 'Number of simulated guests'),
      matching: find.byType(TextField),
    );
    await tester.ensureVisible(countField);
    await tester.enterText(countField, '31');
    await tester.tap(find.text('Done'));
    await pumpFeatureUi(tester);
    expect(find.text('Custom settings · Edit or reset'), findsOneWidget);
    await tester.ensureVisible(find.text('Customise rehearsal'));
    await tester.tap(find.text('Customise rehearsal'));
    await pumpFeatureUi(tester);
    expect(find.text('31'), findsOneWidget);
    await tester.ensureVisible(find.text('Reset to default settings'));
    await tester.tap(find.text('Reset to default settings'));
    await pumpFeatureUi(tester);
    expect(find.text('Number of simulated guests'), findsNothing);
    await tester.tap(find.text('Done'));
    await pumpFeatureUi(tester);
    expect(find.text('Guests, event details and playbook'), findsOneWidget);
  });

  testWidgets('invalid count stays in settings with a visible correction', (
    tester,
  ) async {
    await tester.pumpWidget(_app(_Harness(configuration: _configuration())));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Customise rehearsal'));
    await tester.tap(find.text('Customise rehearsal'));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Use simulated guests'));
    await tester.tap(find.text('Use simulated guests'));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(
      find.widgetWithText(CatchField, 'Number of simulated guests'),
    );
    await tester.enterText(
      find.descendant(
        of: find.widgetWithText(CatchField, 'Number of simulated guests'),
        matching: find.byType(TextField),
      ),
      '51',
    );
    await tester.tap(find.text('Done'));
    await pumpFeatureUi(tester);
    expect(find.byType(EventRehearsalCustomiseSheet), findsOneWidget);
    expect(find.text('Choose between 2 and 50 guests.'), findsOneWidget);
  });

  testWidgets('starting-point choices fit phone and large text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    for (final scale in [1.0, 2.0]) {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: EventRehearsalStartSheet(
                event: rehearsalSourceEvent().copyWith(
                  name: 'Wednesday Trivia Night',
                  bookedCount: 24,
                ),
              ),
            ),
          ),
          scale: scale,
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.text('Start dress rehearsal'), findsOneWidget);
      expect(find.text('Rehearse Wednesday Trivia Night'), findsOneWidget);
      expect(find.text('Create a custom rehearsal'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _capture(tester, 'start-sheet-390-$scale-false');
    }
  });
}

EventRehearsalConfiguration _configuration() =>
    EventRehearsalConfiguration.defaults(
      organizerDefaults: const OrganizerHostDefaults(
        primaryActivityKind: ActivityKind.singlesMixer,
      ),
      event: rehearsalSourceEvent(),
    );

Widget _app(Widget home, {double scale = 1, bool dark = false}) => MaterialApp(
  theme: dark ? AppTheme.dark : AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  builder: (context, child) => RepaintBoundary(
    key: const ValueKey('rehearsal-capture'),
    child: MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: child!,
    ),
  ),
  home: home,
);

class _Harness extends StatefulWidget {
  const _Harness({required this.configuration});
  final EventRehearsalConfiguration configuration;
  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  late EventRehearsalConfiguration configuration = widget.configuration;

  @override
  Widget build(BuildContext context) => EventRehearsalEntryScaffold(
    configuration: configuration,
    onChooseSource: () {},
    onChooseScenario: () {},
    onStart: () {},
    onCustomise: () async {
      final updated = await showCatchBottomSheet<EventRehearsalConfiguration>(
        context: context,
        builder: (_) =>
            EventRehearsalCustomiseSheet(configuration: configuration),
      );
      if (updated != null && mounted) {
        setState(() => configuration = updated);
      }
    },
  );
}

Future<void> _capture(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('REHEARSAL_CAPTURES')) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('rehearsal-capture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await File(
      '/private/tmp/rehearsal-$name.png',
    ).writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
