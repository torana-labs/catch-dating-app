import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_planner_commands_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'planner_captures.dart';
import 'planner_fixtures.dart';
import 'planner_storage_fixtures.dart';

// The planner's "send to hotels" and "share with family" issue a web link,
// then open the share sheet. A link that lands after the screen closed opens
// no share sheet and throws nothing; one that lands while the screen is open
// is shared.

void main() {
  setUpAll(loadCatchTestFonts);

  for (final (name, screen, choose, button) in [
    (
      'ID tracker send to hotels',
      plannerIdTrackerCapture,
      // With two hotels, sending waits for one to be chosen.
      find.text('Lakeview Haveli 162'),
      find.byKey(const ValueKey<String>('host-programme-ids-send')),
    ),
    (
      'guests share with family',
      plannerGuestsCapture,
      null,
      find.text('Share with the family'),
    ),
  ]) {
    group(name, () {
      testWidgets('shares the link while the screen is open', (tester) async {
        final probe = await _Probe.open(tester, screen(), choose);
        await tester.tap(button);
        await tester.pump();
        expect(probe.links, 1);

        probe.link.complete((token: 'link-token', expiresAt: _expires));
        await tester.pump();
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(probe.shared, hasLength(1));
        expect(probe.shared.single, contains('link-token'));
        await pumpFeatureUiFor(tester, const Duration(minutes: 1));
      });

      testWidgets('a link that lands after the screen closes opens no share '
          'sheet', (tester) async {
        final probe = await _Probe.open(tester, screen(), choose);
        await tester.tap(button);
        await tester.pump();
        expect(probe.links, 1);

        await probe.close();
        probe.link.complete((token: 'link-token', expiresAt: _expires));
        await tester.pump();
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(probe.shared, isEmpty);
        await pumpFeatureUiFor(tester, const Duration(minutes: 1));
      });
    });
  }
}

final _expires = DateTime(2026, 12, 2);

class _Probe {
  _Probe._(this.tester);

  final WidgetTester tester;
  final link = Completer<({String token, DateTime expiresAt})>();
  final shared = <String>[];
  var links = 0;
  late final ProviderContainer container;

  static Future<_Probe> open(
    WidgetTester tester,
    Widget screen,
    Finder? choose,
  ) async {
    tester.view.physicalSize = plannerDesktopSize;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final probe = _Probe._(tester);
    probe.container = ProviderContainer(
      overrides: [
        ...plannerCaptureOverrides(),
        programIdTrackerProvider(
          plannerProgramId,
          'haveli',
        ).overrideWith((ref) async => plannerIdTracker),
        hostProgrammePlannerCommandsProvider.overrideWith(
          () => _Commands(probe),
        ),
        externalShareControllerProvider.overrideWithValue(
          ExternalShareController((params) async {
            probe.shared.add(params.text ?? '');
          }),
        ),
      ],
    );
    addTearDown(probe.container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: probe.container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: screen,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    if (choose != null) {
      await tester.tap(choose);
      await pumpFeatureUi(tester);
    }
    return probe;
  }

  Future<void> close() => tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const SizedBox()),
  );
}

class _Commands extends HostProgrammePlannerCommands {
  _Commands(this.probe);

  final _Probe probe;

  @override
  Future<({String token, DateTime expiresAt})> issueWebLink({
    required String programId,
    required ProgramWebLinkKind kind,
    required String subjectId,
  }) {
    probe.links++;
    return probe.link.future;
  }
}
