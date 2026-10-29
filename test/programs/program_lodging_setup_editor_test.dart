import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_setup_page_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_lodging_test_fixtures.dart';

Future<void> pumpEditor(
  WidgetTester tester,
  ProgramLodgingDraft draft,
  Future<void> Function(ProgramLodgingDraft, List<Map<String, Object?>>) save,
) async {
  final scrollController = ScrollController();
  addTearDown(scrollController.dispose);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: SingleChildScrollView(
          key: const ValueKey('lodging-editor-scroll'),
          controller: scrollController,
          child: ProgramLodgingSetupPageBody(
            initial: draft,
            onSave: save,
            onCancel: () {},
            resolveDates: (_, _) async =>
                (startsAtMillis: 100, endsAtMillis: 300),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Finder editorScrollable(WidgetTester tester) {
  final wrapper = tester.widget<SingleChildScrollView>(
    find.byKey(const ValueKey('lodging-editor-scroll')),
  );
  final finder = find.byWidgetPredicate(
    (widget) =>
        widget is Scrollable &&
        identical(widget.controller, wrapper.controller),
  );
  expect(finder, findsOneWidget);
  return finder;
}

void main() {
  testWidgets('empty setup cannot save invented household sharing', (
    tester,
  ) async {
    final draft = ProgramLodgingDraft(
      catalog: ProgramLodgingCatalog.fromMap(
        lodgingSetupCatalogJson(),
        programId: 'program',
      ),
    );
    var writes = 0;
    await pumpEditor(tester, draft, (_, _) async => writes++);
    await tester.scrollUntilVisible(
      find.text('Save setup and plan rooms'),
      500,
      scrollable: editorScrollable(tester),
    );
    final button = tester.widget<CatchButton>(
      find.byWidgetPredicate(
        (w) => w is CatchButton && w.label == 'Save setup and plan rooms',
      ),
    );
    expect(button.onPressed, isNull);
    expect(draft.rows('parties'), isEmpty);
    expect(writes, 0);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('new inventory requires the host to enter a room type', (
    tester,
  ) async {
    final draft = ProgramLodgingDraft(
      catalog: ProgramLodgingCatalog.fromMap(
        lodgingSetupCatalogJson(),
        programId: 'program',
      ),
    );
    await pumpEditor(tester, draft, (_, _) async {});
    final field = find.descendant(
      of: find.byKey(const ValueKey('lodging-inventory-room-type')),
      matching: find.byType(TextField),
    );
    await tester.scrollUntilVisible(
      field,
      500,
      scrollable: editorScrollable(tester),
    );
    expect(tester.widget<TextField>(field).controller!.text, isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'verified staged setup saves original stable identities and revision',
    (tester) async {
      final draft = ProgramLodgingDraft(
        catalog: ProgramLodgingCatalog.fromMap(
          lodgingSetupCatalogJson(),
          programId: 'program',
        ),
        configuration: lodgingSetupConfigurationJson(),
      );
      ProgramLodgingDraft? saved;
      await pumpEditor(tester, draft, (value, adoptions) async {
        saved = value;
        expect(adoptions, isEmpty);
      });
      await tester.scrollUntilVisible(
        find.text('Save setup and plan rooms'),
        500,
        scrollable: editorScrollable(tester),
      );
      await tester.tap(find.text('Save setup and plan rooms'));
      await pumpFeatureUi(tester);
      expect(saved!.expectedRevision, 1);
      expect(saved!.rows('parties').single['guestIds'], ['guest']);
      expect(saved!.rows('inventory').single['id'], 'unit');
      expect(saved!.rows('inventory').single['physicalRoomId'], 'room');
      expect(saved!.setup.containsKey('guests'), false);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
