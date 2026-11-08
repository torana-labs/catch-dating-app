import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/form_body.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_body.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_state.dart';
import 'package:catch_dating_app/hosts/forms/form_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms_fixtures.dart';

class _FormCalls {
  final opened = <HostFormInboxEntry>[];
  final letIn = <HostFormInboxEntry>[];
  int seeAll = 0;
  int change = 0;
  int share = 0;
  int edit = 0;
  int publish = 0;
}

Future<_FormCalls> _pumpForm(WidgetTester tester, HostFormState state) async {
  final calls = _FormCalls();
  await pumpFormsBody(
    tester,
    HostFormBody(
      state: state,
      now: formsNow,
      onOpenResponse: calls.opened.add,
      onLetIn: calls.letIn.add,
      onSeeAll: () => calls.seeAll++,
      onChangeConsequences: () => calls.change++,
      onShare: () => calls.share++,
      onEditQuestions: () => calls.edit++,
      onPublish: () => calls.publish++,
    ),
  );
  return calls;
}

void main() {
  group('A form', () {
    testWidgets('shows the status, questions, funnel, waiting answers and '
        'what happens next in board order', (tester) async {
      final calls = await _pumpForm(
        tester,
        HostFormState(
          status: HostFormStatus.content,
          form: formSummary(),
          questionLabels: const ['Your easy pace', 'How far', 'Phone'],
          analytics: formAnalytics,
          waiting: formEntries,
        ),
      );

      expect(find.text('Taking answers'), findsOneWidget);
      expect(find.text('Form · on your page'), findsOneWidget);
      expect(find.text('Join the Sunday run'), findsOneWidget);
      expect(
        find.text('3 questions: Your easy pace, How far, Phone'),
        findsOneWidget,
      );
      expect(find.text('412'), findsOneWidget);
      expect(find.text('23% of opens'), findsOneWidget);
      expect(find.text('64% finished'), findsOneWidget);
      expect(find.text('Waiting for you'), findsOneWidget);
      expect(find.text('3 to review'), findsOneWidget);
      expect(find.text('Tara Menon'), findsOneWidget);
      expect(find.text('See all 61 answers'), findsOneWidget);
      expect(find.text('Add them to People'), findsOneWidget);
      expect(find.text('Send them a message'), findsOneWidget);
      expect(find.text('Share the form'), findsOneWidget);

      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('host-form-waiting-entry-tara')),
          matching: find.text('Let in'),
        ),
      );
      expect(calls.letIn.single.entryId, 'entry-tara');
      await tester.tap(find.text('See all 61 answers'));
      await tester.tap(find.text('Change what happens'));
      await tester.ensureVisible(find.text('Edit questions'));
      await tester.tap(find.text('Share the form'));
      await tester.tap(find.text('Edit questions'));
      expect(
        [calls.seeAll, calls.change, calls.share, calls.edit],
        [1, 1, 1, 1],
      );
    });

    testWidgets('a draft offers Publish in place of Share', (tester) async {
      final calls = await _pumpForm(
        tester,
        HostFormState(
          status: HostFormStatus.content,
          form: formSummary(
            status: HostFormLifecycleStatus.draft,
            responses: 0,
            actions: const {},
          ),
        ),
      );

      expect(find.text('Draft'), findsOneWidget);
      expect(find.text('No questions yet'), findsOneWidget);
      expect(find.text('Nobody is waiting.'), findsOneWidget);
      expect(find.text('Nothing else happens yet.'), findsOneWidget);
      expect(find.text('Share the form'), findsNothing);
      await tester.ensureVisible(find.text('Publish'));
      await tester.tap(find.text('Publish'));
      expect(calls.publish, 1);
    });

    testWidgets('a person being let in cannot be let in twice', (tester) async {
      final calls = await _pumpForm(
        tester,
        HostFormState(
          status: HostFormStatus.content,
          form: formSummary(),
          waiting: formEntries.take(1).toList(),
          lettingIn: const {'application-tara'},
        ),
      );

      await tester.tap(find.text('Let in'));
      expect(calls.letIn, isEmpty);
    });

    testWidgets('loading draws a skeleton', (tester) async {
      await _pumpForm(tester, const HostFormState.loading());
      expect(find.byType(CatchSkeleton), findsOneWidget);
    });
  });

  group('Questions', () {
    final questions = HostFormQuestionsState(
      status: HostFormQuestionsStatus.content,
      questions: [
        HostFormQuestionSlot(
          sectionIndex: 0,
          questionIndex: 0,
          question: formQuestion(
            'name',
            'What should we call you on the night?',
            required: true,
          ),
        ),
        HostFormQuestionSlot(
          sectionIndex: 0,
          questionIndex: 1,
          question: formQuestion(
            'food',
            'Any food we should know about?',
            kind: HostFormQuestionKind.multiChoice,
            choices: const ['None', 'Vegetarian', 'Jain'],
          ),
        ),
      ],
    );

    testWidgets('one tile per question with its kind, requirement and '
        'choices, then Add a question', (tester) async {
      final required = <(String, bool)>[];
      final added = <HostFormQuestionKind>[];
      await pumpFormsBody(
        tester,
        HostFormQuestionsBody(
          state: questions,
          onOpen: (_) {},
          onRequiredChanged: (slot, value) =>
              required.add((slot.question.questionId, value)),
          onLabelChanged: (_, _) {},
          onOptionChanged: (_, _, _) {},
          onAddOption: (_) {},
          onRemove: (_) {},
          onAdd: added.add,
          onRetrySave: () {},
        ),
      );

      expect(
        find.text('What should we call you on the night?'),
        findsOneWidget,
      );
      expect(find.text('Short answer'), findsWidgets);
      expect(find.text('Choices · pick any'), findsOneWidget);
      expect(find.text('Required'), findsOneWidget);
      expect(find.text('Optional'), findsOneWidget);
      expect(find.text('Vegetarian'), findsOneWidget);
      expect(find.text('Add a question'), findsOneWidget);

      await tester.tap(find.text('Optional'));
      expect(required, [('food', true)]);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-forms-add-date')),
      );
      await tester.tap(find.byKey(const ValueKey('host-forms-add-date')));
      expect(added, [HostFormQuestionKind.date]);
    });

    testWidgets('an open question edits its wording and choices', (
      tester,
    ) async {
      final labels = <String>[];
      final options = <(int, String)>[];
      var addOption = 0;
      var removed = 0;
      await pumpFormsBody(
        tester,
        HostFormQuestionsBody(
          state: HostFormQuestionsState(
            status: HostFormQuestionsStatus.content,
            questions: questions.questions,
            openQuestionId: 'food',
          ),
          onOpen: (_) {},
          onRequiredChanged: (_, _) {},
          onLabelChanged: (_, label) => labels.add(label),
          onOptionChanged: (_, index, label) => options.add((index, label)),
          onAddOption: (_) => addOption++,
          onRemove: (_) => removed++,
          onAdd: (_) {},
          onRetrySave: () {},
        ),
      );

      await tester.enterText(
        find.byKey(const ValueKey('host-forms-question-label-food')),
        'Any food needs?',
      );
      await tester.enterText(
        find.byKey(const ValueKey('host-forms-option-food-1')),
        'Veg',
      );
      await tester.tap(find.text('Add a choice'));
      await tester.tap(find.text('Remove question'));
      expect(labels.last, 'Any food needs?');
      expect(options.last, (1, 'Veg'));
      expect([addOption, removed], [1, 1]);
    });

    testWidgets('a failed save says so with Try again', (tester) async {
      var retried = 0;
      await pumpFormsBody(
        tester,
        HostFormQuestionsBody(
          state: const HostFormQuestionsState(
            status: HostFormQuestionsStatus.content,
            save: HostFormQuestionsSave.failed,
          ),
          onOpen: (_) {},
          onRequiredChanged: (_, _) {},
          onLabelChanged: (_, _) {},
          onOptionChanged: (_, _, _) {},
          onAddOption: (_) {},
          onRemove: (_) {},
          onAdd: (_) {},
          onRetrySave: () => retried++,
        ),
      );

      expect(find.text('The questions could not be saved.'), findsOneWidget);
      expect(
        find.text('No questions yet. Add the first one below.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Try again'));
      expect(retried, 1);
    });
  });
}
