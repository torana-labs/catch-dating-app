import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_question_tile.dart';
import 'package:catch_dating_app/hosts/forms/form_question_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_body.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_state.dart';
import 'package:catch_dating_app/hosts/forms/form_section_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms_fixtures.dart';

/// Records every draft command the question sheet sends.
class _Editor extends Fake implements HostFormEditorController {
  final updates = <Map<String, Object?>>[];
  final moves = <(int, int, int)>[];
  final sectionMoves = <(String, int)>[];
  final removed = <(int, int)>[];

  @override
  void updateQuestion(
    int sectionIndex,
    int questionIndex, {
    String? label,
    String? helpText,
    bool clearHelpText = false,
    HostFormQuestionKind? kind,
    bool? required,
    String? canonicalFieldId,
    bool clearCanonicalField = false,
    HostFormPrivacyClass? privacyClass,
    HostFormPrefillPolicy? prefillPolicy,
    HostFormPresentation? hostPresentation,
    HostFormAnswerDestination? answerDestination,
    bool? eventProfileAudience,
    HostFormQuestionValidation? validation,
  }) => updates.add({
    'at': (sectionIndex, questionIndex),
    'helpText': ?helpText,
    'kind': ?kind,
    'validation': ?validation,
  });

  @override
  void moveQuestion(int sectionIndex, int questionIndex, int delta) =>
      moves.add((sectionIndex, questionIndex, delta));

  @override
  void moveQuestionToSection({
    required String questionId,
    required int targetSectionIndex,
  }) => sectionMoves.add((questionId, targetSectionIndex));

  @override
  void removeQuestion(int sectionIndex, int questionIndex) =>
      removed.add((sectionIndex, questionIndex));
}

HostFormDefinition _definition() {
  final base = HostFormDefinition.fromMap(const {
    'schemaVersion': 1,
    'title': 'Quiz night',
    'description': null,
    'purpose': 'general',
    'identityPolicy': 'anonymous',
    'sections': [
      {
        'sectionId': 'placeholder',
        'title': 'Placeholder',
        'description': null,
        'pageBreak': false,
        'questions': <Object?>[],
      },
    ],
    'logicRules': <Object?>[],
    'appearance': {
      'preset': 'minimal',
      'logoAssetId': null,
      'coverAssetId': null,
      'activityKind': null,
    },
    'availability': {
      'opensAt': null,
      'closesAt': null,
      'responseLimit': null,
      'closedMessage': null,
    },
    'consent': {
      'consentCopy': 'I consent.',
      'consentVersion': 'v1',
      'retentionCopy': 'Kept for this form.',
    },
    'completion': {
      'title': 'Thanks',
      'message': null,
      'actionKind': 'none',
      'actionLabel': null,
      'actionUrl': null,
    },
  });
  return base
      .replaceSection(
        0,
        HostFormSection.create(sectionId: 'about', title: 'About you')
            .addQuestion(formQuestion('name', 'Your name'))
            .addQuestion(
              formQuestion(
                'teams',
                'Team size',
                kind: HostFormQuestionKind.number,
              ),
            ),
      )
      .addSection(
        HostFormSection.create(
          sectionId: 'night',
          title: 'On the night',
        ).addQuestion(
          formQuestion('files', 'Your photos', kind: HostFormQuestionKind.file),
        ),
      );
}

Future<_Editor> _pumpSheet(
  WidgetTester tester, {
  required int section,
  required int question,
  TextScaler textScaler = TextScaler.noScaling,
  VoidCallback? onRemoved,
}) async {
  final editor = _Editor();
  tester.view.physicalSize = const Size(390, 3200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(textScaler: textScaler),
        child: child!,
      ),
      home: CatchRoot(
        child: CatchScreen(
          body: CatchPageBody.screen(
            child: HostFormQuestionSheet(
              definition: _definition(),
              sectionIndex: section,
              questionIndex: question,
              editor: editor,
              onRemoved: onRemoved ?? () {},
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return editor;
}

void main() {
  setUpAll(loadCatchTestFonts);
  group('Question settings', () {
    testWidgets('a text question offers its answer type, help text, profile '
        'use, place, length and format rules and the advanced choices', (
      tester,
    ) async {
      await _pumpSheet(tester, section: 0, question: 0);

      for (final label in [
        'Answer type',
        'Help text',
        'Profile use',
        'Move to section',
        'Move up',
        'Move down',
        'Minimum characters',
        'Maximum characters',
        'Text format',
        'Custom validation message',
        'Data classification',
        'Prefill behavior',
        'Host response view',
        'Remove question',
      ]) {
        expect(find.text(label), findsWidgets, reason: label);
      }
      expect(find.text('Minimum value'), findsNothing);
    });

    testWidgets('help text and rules save when they lose focus', (
      tester,
    ) async {
      final editor = await _pumpSheet(tester, section: 0, question: 1);

      expect(find.text('Minimum value'), findsOneWidget);
      expect(find.text('Maximum value'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('host-form-rule-min-number-teams-null')),
        '2.5',
      );
      await tester.enterText(
        find.byKey(const ValueKey('host-form-question-help-teams-null')),
        'Count yourself in',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.tap(find.text('Answer rules'));
      await pumpFeatureUi(tester);

      final validation = editor.updates
          .map((update) => update['validation'])
          .whereType<HostFormQuestionValidation>()
          .last;
      expect(validation.minNumber, 2.5);
      expect(
        editor.updates.map((update) => update['helpText']).whereType<String>(),
        contains('Count yourself in'),
      );
    });

    testWidgets('a file question limits files, size and types', (tester) async {
      await _pumpSheet(tester, section: 1, question: 0);

      expect(find.text('Maximum files'), findsOneWidget);
      expect(find.text('Maximum size per file (MB)'), findsOneWidget);
      expect(find.text('Allowed types (comma separated)'), findsOneWidget);
      expect(find.text('Move up'), findsOneWidget);
    });

    testWidgets('moves the question and removes it', (tester) async {
      var closed = 0;
      final editor = await _pumpSheet(
        tester,
        section: 0,
        question: 1,
        onRemoved: () => closed++,
      );

      await tester.tap(
        find.byKey(const ValueKey('host-form-question-up-teams')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-question-down-teams')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-question-remove-teams')),
      );
      await pumpFeatureUi(tester);

      expect(editor.moves, [(0, 1, -1)]);
      expect(editor.removed, [(0, 1)]);
      expect(closed, 1);
    });

    testWidgets('fits at twice the text size', (tester) async {
      await _pumpSheet(
        tester,
        section: 0,
        question: 0,
        textScaler: const TextScaler.linear(2),
      );

      expect(tester.takeException(), isNull);
      expect(find.text('Profile use'), findsOneWidget);
    });
  });

  group('Question builder sections', () {
    final definition = _definition();
    HostFormQuestionsState state({
      HostFormQuestionsSave save = HostFormQuestionsSave.saved,
      List<String> issues = const [],
    }) => HostFormQuestionsState(
      status: HostFormQuestionsStatus.content,
      questions: HostFormQuestionsState.slots(definition),
      sections: HostFormQuestionsState.sectionsOf(definition),
      save: save,
      issues: issues,
    );

    testWidgets('groups questions under their sections, with Edit, Add a '
        'section and every answer type', (tester) async {
      final edited = <String>[];
      final settings = <String>[];
      var addSection = 0;
      var moreKinds = 0;
      await pumpFormsBody(
        tester,
        HostFormQuestionsBody(
          state: HostFormQuestionsState(
            status: HostFormQuestionsStatus.content,
            questions: HostFormQuestionsState.slots(definition),
            sections: HostFormQuestionsState.sectionsOf(definition),
            openQuestionId: 'name',
          ),
          onOpen: (_) {},
          onRequiredChanged: (_, _) {},
          onLabelChanged: (_, _) {},
          onOptionChanged: (_, _, _) {},
          onAddOption: (_) {},
          onRemove: (_) {},
          onAdd: (_) {},
          onRetrySave: () {},
          onSettings: (slot) => settings.add(slot.question.questionId),
          onEditSection: edited.add,
          onAddSection: () => addSection++,
          onMoreKinds: () => moreKinds++,
        ),
      );

      expect(find.text('About you'), findsOneWidget);
      expect(find.text('On the night'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('host-forms-section-night')),
          matching: find.text('Your photos'),
        ),
        findsOneWidget,
      );
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('host-forms-section-night')),
          matching: find.text('Edit'),
        ),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-forms-question-settings-name')),
      );
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-forms-add-section')),
      );
      await tester.tap(find.byKey(const ValueKey('host-forms-add-section')));
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-forms-add-more')),
      );
      await tester.tap(find.byKey(const ValueKey('host-forms-add-more')));

      expect(edited, ['night']);
      expect(settings, ['name']);
      expect([addSection, moreKinds], [1, 1]);
    });

    testWidgets('a conflict offers Reload and issues show their count', (
      tester,
    ) async {
      var reloaded = 0;
      await pumpFormsBody(
        tester,
        HostFormQuestionsBody(
          state: state(
            save: HostFormQuestionsSave.conflict,
            issues: const ['Add a label to every question.'],
          ),
          onOpen: (_) {},
          onRequiredChanged: (_, _) {},
          onLabelChanged: (_, _) {},
          onOptionChanged: (_, _, _) {},
          onAddOption: (_) {},
          onRemove: (_) {},
          onAdd: (_) {},
          onRetrySave: () {},
          onReload: () => reloaded++,
        ),
      );

      expect(find.text('This form changed elsewhere'), findsOneWidget);
      expect(find.text('Fix 1 form issue'), findsOneWidget);
      expect(find.text('Add a label to every question.'), findsOneWidget);
      await tester.tap(find.text('Reload form'));
      expect(reloaded, 1);
    });
  });

  group('Section sheet and answer types', () {
    testWidgets('renames, adds to, moves and removes a section', (
      tester,
    ) async {
      final titles = <String>[];
      final moves = <int>[];
      var added = 0;
      var removed = 0;
      await pumpFormsBody(
        tester,
        CatchPageBody.screen(
          child: HostFormSectionSheet(
            title: 'About you',
            index: 0,
            count: 2,
            questionCount: 2,
            sectionId: 'about',
            onTitleChanged: titles.add,
            onAddQuestion: () => added++,
            onMove: moves.add,
            onRemove: () => removed++,
          ),
        ),
      );

      await tester.enterText(
        find.byKey(const ValueKey('host-form-section-title-about-About you')),
        'Who you are ',
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-section-add-about')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-section-up-about')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-section-down-about')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-form-section-remove-about')),
      );
      await pumpFeatureUi(tester);

      expect(titles, ['Who you are']);
      expect(moves, [1]);
      expect([added, removed], [1, 1]);
    });

    testWidgets('the picker lists all thirteen answer types', (tester) async {
      await pumpFormsBody(
        tester,
        const CatchPageBody.screen(child: HostFormKindPicker()),
      );

      for (final kind in HostFormQuestionKind.values) {
        expect(
          find.byKey(ValueKey('host-form-kind-${kind.name}')),
          findsOneWidget,
          reason: kind.name,
        );
      }
    });
  });

  group('Question tile', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('the whole question reads at 375 wide, text x$scale', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(375, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(
          MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: CatchRoot(
              child: CatchScreen(
                body: CatchPageBody.screen(
                  child: HostFormQuestionTile(
                    question: formQuestion(
                      'name',
                      'What should we call you on the night?',
                      required: true,
                    ),
                    open: false,
                    onOpen: () {},
                    onRequiredChanged: (_) {},
                    onLabelChanged: (_) {},
                    onOptionChanged: (_, _) {},
                    onAddOption: () {},
                    onRemove: () {},
                  ),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);

        expect(tester.takeException(), isNull);
        final title = find.text('What should we call you on the night?');
        final paragraph = tester.renderObject<RenderParagraph>(
          find.descendant(of: title, matching: find.byType(RichText)),
        );
        expect(paragraph.didExceedMaxLines, isFalse);
        final chip = find.byKey(
          const ValueKey('host-forms-question-required-name'),
        );
        if (scale >= 2) {
          expect(
            tester.getTopLeft(chip).dy,
            greaterThanOrEqualTo(tester.getBottomLeft(title).dy),
          );
        } else {
          expect(
            tester.getTopLeft(chip).dy,
            lessThan(tester.getBottomLeft(title).dy),
          );
        }
      });
    }
  });
}
