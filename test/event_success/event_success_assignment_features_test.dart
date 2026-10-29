import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_assignment_features_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

const _choiceQuestion = EventSuccessAssignmentFeatureQuestion(
  questionId: 'question-1',
  label: 'Music style',
  kind: 'singleChoice',
  options: [
    EventSuccessAssignmentFeatureOption(optionId: 'jazz', label: 'Jazz'),
    EventSuccessAssignmentFeatureOption(optionId: 'folk', label: 'Folk'),
  ],
);
const _source = EventSuccessAssignmentFeatureSource(
  formId: 'form-1',
  formTitle: 'Event questions',
  versionId: 'version-1',
  isActiveVersion: true,
  questions: [_choiceQuestion],
);
final _publishedForm = HostFormSummary(
  organizerId: 'organizer-1',
  formId: 'form-1',
  title: 'Event questions',
  description: null,
  purpose: HostFormPurpose.registration,
  status: HostFormLifecycleStatus.published,
  templateId: null,
  publicFormId: 'public-1',
  defaultTargetKind: HostFormTargetKind.event,
  defaultTargetId: 'event-1',
  activeVersionId: 'version-1',
  draftRevision: 2,
  publishedVersion: 1,
  submittedResponseCount: 8,
  consequences: const HostFormConsequences.unavailable(),
  updatedAt: DateTime.utc(2026, 9, 23),
  publishedAt: DateTime.utc(2026, 9, 23),
  lastResponseAt: null,
);

EventSuccessAssignmentFeaturePreview _preview({
  List<EventSuccessAssignmentFeatureRule> rules = const [],
  int revision = 3,
}) => EventSuccessAssignmentFeaturePreview(
  eventId: 'event-1',
  revision: revision,
  rosterCount: 8,
  sources: const [_source],
  savedRules: rules,
  coverage: [
    for (final rule in rules)
      EventSuccessAssignmentFeatureCoverage(
        featureId: rule.featureId,
        grantedCount: 5,
        usableCount: 4,
        missingCount: 4,
      ),
  ],
);

void main() {
  if (Platform.environment.containsKey('CATCH_MATCHING_HOST_REVIEW_DIR')) {
    setUpAll(loadCatchTestFonts);
  }

  test('published option identity and explicit ordinal order survive mapping', () {
    final rule = EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: _source,
      question: _choiceQuestion,
      kind: 'ordinal',
      mode: 'preferDifferent',
      weight: 2,
      ordinalOrder: const ['folk', 'jazz'],
    );
    expect(rule.toJson()['optionIds'], ['jazz', 'folk']);
    expect(rule.toJson()['scoreByOptionId'], {'folk': 0, 'jazz': 1});
    expect(rule.versionId, 'version-1');
    expect(rule.questionId, 'question-1');
    expect(
      () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: _source,
        question: _choiceQuestion,
        kind: 'ordinal',
        mode: 'preferDifferent',
        weight: 2,
        ordinalOrder: const ['folk'],
      ),
      throwsArgumentError,
    );
  });

  test('number mapping requires finite distinct bounds', () {
    const number = EventSuccessAssignmentFeatureQuestion(
      questionId: 'distance',
      label: 'Distance',
      kind: 'number',
      options: [],
    );
    const source = EventSuccessAssignmentFeatureSource(
      formId: 'form-2', formTitle: 'Run form',
      versionId: 'version-2', isActiveVersion: true,
      questions: [number],
    );
    expect(
      () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: source, question: number, kind: 'number',
        mode: 'preferSimilar', weight: 1,
        minimum: double.nan, maximum: 10,
      ),
      throwsArgumentError,
    );
    expect(
      () => EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: source, question: number, kind: 'number',
        mode: 'preferSimilar', weight: 1,
        minimum: 10, maximum: 10,
      ),
      throwsArgumentError,
    );
  });

  testWidgets('Host sees only aggregate usable roster coverage and saves a removal',
      (tester) async {
    final savedRule = EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: _source, question: _choiceQuestion, kind: 'category',
      mode: 'preferSimilar', weight: 1,
    );
    var savedRevision = -1;
    List<EventSuccessAssignmentFeatureRule>? savedRules;
    await tester.pumpWidget(_harness(
      viewerUid: 'host-1',
      onPreview: ({required eventId, required rules,
          required sourceFormIds}) async => _preview(rules: rules.isEmpty
          ? [savedRule] : rules),
      onSave: ({required eventId, required expectedRevision,
          required requestId, required rules}) async {
        savedRevision = expectedRevision;
        savedRules = rules;
        return const EventSuccessAssignmentFeatureSaveResult(
          eventId: 'event-1', revision: 4, replayed: false,
        );
      },
    ));
    await pumpFeatureUi(tester);
    final coverageRow = find.ancestor(
      of: find.textContaining('4 of 8 current roster'),
      matching: find.byType(CatchField),
    );
    expect(find.descendant(
      of: coverageRow,
      matching: find.text('Music style'),
    ), findsOneWidget);
    expect(find.textContaining('4 of 8 current roster'), findsOneWidget);
    expect(find.textContaining('Jazz'), findsNothing);
    await _captureMatchingFixture(tester);
    await tester.ensureVisible(find.text('Remove question'));
    await tester.tap(find.text('Remove question'));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Save matching preferences'));
    await tester.tap(find.text('Save matching preferences'));
    await pumpFeatureUi(tester);
    expect(savedRevision, 3);
    expect(savedRules, isEmpty);
  });

  testWidgets('account change discards an in-flight published catalog',
      (tester) async {
    final pending = Completer<EventSuccessAssignmentFeaturePreview>();
    Future<EventSuccessAssignmentFeaturePreview> preview({
      required String eventId,
      required List<EventSuccessAssignmentFeatureRule> rules,
      required List<String> sourceFormIds,
    }) => pending.future;
    Future<EventSuccessAssignmentFeatureSaveResult> save({
      required String eventId,
      required int expectedRevision,
      required String requestId,
      required List<EventSuccessAssignmentFeatureRule> rules,
    }) => throw const ValidationException('Unexpected save.');
    await tester.pumpWidget(_harness(
      viewerUid: 'host-1', onPreview: preview, onSave: save,
    ));
    await tester.pump();
    await tester.pumpWidget(_harness(
      viewerUid: null, onPreview: preview, onSave: save,
    ));
    pending.complete(_preview());
    await pumpFeatureUi(tester);
    expect(find.text('Music style'), findsNothing);
    expect(find.text('Form answer matching'), findsNothing);
  });

  testWidgets('a rule sheet cannot apply after the organizer changes',
      (tester) async {
    Future<EventSuccessAssignmentFeaturePreview> preview({
      required String eventId,
      required List<EventSuccessAssignmentFeatureRule> rules,
      required List<String> sourceFormIds,
    }) async => _preview(rules: rules);
    Future<EventSuccessAssignmentFeatureSaveResult> save({
      required String eventId,
      required int expectedRevision,
      required String requestId,
      required List<EventSuccessAssignmentFeatureRule> rules,
    }) => throw const ValidationException('Unexpected save.');
    await tester.pumpWidget(_harness(
      viewerUid: 'host-1', onPreview: preview, onSave: save,
    ));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Choose a published form'));
    await pumpFeatureUi(tester);
    await tester.tap(find.descendant(
      of: find.byType(CatchSheet),
      matching: find.widgetWithText(CatchField, 'Event questions'),
    ));
    await pumpFeatureUi(tester);
    await tester.tap(find.widgetWithText(CatchField, 'Music style'));
    await pumpFeatureUi(tester);
    expect(find.text('Answer type'), findsOneWidget);

    await tester.pumpWidget(_harness(
      viewerUid: 'host-2', onPreview: preview, onSave: save,
    ));
    await pumpFeatureUi(tester);
    expect(find.text('Answer type'), findsNothing);
    expect(find.text('Save matching preferences'), findsNothing);
  });

  testWidgets('save in flight disables form and question edits', (tester) async {
    final savedRule = EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: _source, question: _choiceQuestion, kind: 'category',
      mode: 'preferSimilar', weight: 1,
    );
    final savePending = Completer<EventSuccessAssignmentFeatureSaveResult>();
    await tester.pumpWidget(_harness(
      viewerUid: 'host-1',
      onPreview: ({required eventId, required rules,
          required sourceFormIds}) async => _preview(
            rules: rules.isEmpty ? [savedRule] : rules,
          ),
      onSave: ({required eventId, required expectedRevision,
          required requestId, required rules}) => savePending.future,
    ));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Choose a published form'));
    await pumpFeatureUi(tester);
    await tester.tap(find.descendant(
      of: find.byType(CatchSheet),
      matching: find.widgetWithText(CatchField, 'Event questions'),
    ));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Remove question'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Save matching preferences'));
    await tester.pump();
    expect(find.descendant(
      of: find.widgetWithText(CatchField, 'Music style'),
      matching: find.byType(GestureDetector),
    ), findsNothing);
    expect(find.text('Answer type'), findsNothing);
    expect(find.descendant(
      of: find.widgetWithText(CatchField, 'Choose a published form'),
      matching: find.byType(GestureDetector),
    ), findsNothing);
    expect(find.byType(CatchSheet), findsNothing);

    savePending.complete(const EventSuccessAssignmentFeatureSaveResult(
      eventId: 'event-1', revision: 4, replayed: false,
    ));
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);
  });

  testWidgets('background hides the catalog until a fresh preview completes',
      (tester) async {
    var previews = 0;
    final resumed = Completer<EventSuccessAssignmentFeaturePreview>();
    Future<EventSuccessAssignmentFeaturePreview> preview({
      required String eventId,
      required List<EventSuccessAssignmentFeatureRule> rules,
      required List<String> sourceFormIds,
    }) {
      previews++;
      return previews == 1 ? Future.value(_preview()) : resumed.future;
    }
    await tester.pumpWidget(_harness(
      viewerUid: 'host-1',
      onPreview: preview,
      onSave: ({required eventId, required expectedRevision,
          required requestId, required rules}) =>
          throw const ValidationException('Unexpected save.'),
    ));
    await pumpFeatureUi(tester);
    expect(find.text('Form answer matching'), findsWidgets);
    // Inactive still permits a privacy frame before paused disables frames.
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await pumpFeatureUi(tester);
    expect(find.text('Form answer matching'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();
    expect(find.text('Form answer matching'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.text('Music style'), findsNothing);
    resumed.complete(_preview());
    await pumpFeatureUi(tester);
    expect(find.text('Form answer matching'), findsWidgets);
  });
}

Widget _harness({
  required String? viewerUid,
  required Future<EventSuccessAssignmentFeaturePreview> Function({
    required String eventId,
    required List<EventSuccessAssignmentFeatureRule> rules,
    required List<String> sourceFormIds,
  }) onPreview,
  required Future<EventSuccessAssignmentFeatureSaveResult> Function({
    required String eventId,
    required int expectedRevision,
    required String requestId,
    required List<EventSuccessAssignmentFeatureRule> rules,
  }) onSave,
}) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(
    body: SingleChildScrollView(
      child: RepaintBoundary(
        key: const ValueKey('matching-host-fixture'),
        child: EventSuccessAssignmentFeaturesSection(
          eventId: 'event-1', viewerUid: viewerUid,
          enabled: true, sequenceUnsupported: false,
          formsState: CatchAsyncState<List<HostFormSummary>>.data(
            [_publishedForm],
          ),
          onLoadMoreForms: null, onPreview: onPreview, onSave: onSave,
        ),
      ),
    ),
  ),
);

Future<void> _captureMatchingFixture(WidgetTester tester) async {
  final directory = Platform.environment['CATCH_MATCHING_HOST_REVIEW_DIR'];
  if (directory == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('matching-host-fixture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    final file = File('$directory/fixture-current-roster-coverage.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
