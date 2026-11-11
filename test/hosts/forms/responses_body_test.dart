import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/hosts/forms/response_body.dart';
import 'package:catch_dating_app/hosts/forms/response_state.dart';
import 'package:catch_dating_app/hosts/forms/responses_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'forms_fixtures.dart';

Future<void> _pumpResponses(
  WidgetTester tester,
  HostResponsesState state, {
  ValueChanged<HostResponsesView>? onView,
  ValueChanged<HostResponsesFilter>? onFilter,
  ValueChanged<HostFormInboxEntry>? onOpen,
}) => pumpFormsBody(
  tester,
  HostResponsesBody(
    state: state,
    now: formsNow,
    onView: onView ?? (_) {},
    onFilter: onFilter ?? (_) {},
    onOpen: onOpen ?? (_) {},
    onLoadMore: () {},
  ),
);

void main() {
  group('Responses', () {
    testWidgets('an application form shows the views, the review filter and '
        'one row per answer', (tester) async {
      final filters = <HostResponsesFilter>[];
      final opened = <HostFormInboxEntry>[];
      await _pumpResponses(
        tester,
        HostResponsesState(
          status: HostResponsesStatus.content,
          filter: HostResponsesFilter.submitted,
          entries: formEntries,
        ),
        onFilter: filters.add,
        onOpen: opened.add,
      );

      expect(find.text('Responses'), findsOneWidget);
      expect(find.text('Questions'), findsOneWidget);
      expect(find.text('Results'), findsOneWidget);
      expect(find.text('Reviewing'), findsOneWidget);
      expect(find.text('Not now'), findsOneWidget);
      expect(find.text('Tara Menon'), findsOneWidget);
      expect(find.text('Steady pace · 5 km · Instagram'), findsOneWidget);
      expect(find.text('New'), findsNWidgets(4));

      await tester.tap(find.text('In'));
      await tester.pump();
      expect(filters, [HostResponsesFilter.approved]);
      await tester.tap(find.text('Ishaan Bose'));
      expect(opened.single.entryId, 'entry-ishaan');
    });

    testWidgets('the filters carry Offered and each filter\'s count', (
      tester,
    ) async {
      final filters = <HostResponsesFilter>[];
      await _pumpResponses(
        tester,
        HostResponsesState(
          status: HostResponsesStatus.content,
          filter: HostResponsesFilter.submitted,
          counts: const {
            HostResponsesFilter.submitted: 4,
            HostResponsesFilter.offered: 2,
          },
          entries: formEntries,
        ),
        onFilter: filters.add,
      );

      expect(find.text('Offered'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      await tester.ensureVisible(find.text('Offered'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Offered'));
      await tester.pump();
      expect(filters, [HostResponsesFilter.offered]);
    });

    testWidgets('a form nobody reviews has no filter, and none says so', (
      tester,
    ) async {
      await _pumpResponses(
        tester,
        const HostResponsesState(status: HostResponsesStatus.content),
      );

      expect(find.text('Reviewing'), findsNothing);
      expect(find.text('Nothing here.'), findsOneWidget);
    });

    testWidgets('Results counts each question', (tester) async {
      final views = <HostResponsesView>[];
      await _pumpResponses(
        tester,
        HostResponsesState(
          status: HostResponsesStatus.content,
          view: HostResponsesView.results,
          results: formAnalytics.questions,
        ),
        onView: views.add,
      );

      expect(find.text('Your easy pace'), findsOneWidget);
      expect(find.text('61 answers'), findsOneWidget);
      expect(find.text('Steady'), findsOneWidget);
      expect(find.text('32'), findsOneWidget);

      await tester.tap(find.text('Questions'));
      await tester.pump();
      expect(views, [HostResponsesView.questions]);
    });

    testWidgets('every form at once has no form views', (tester) async {
      await _pumpResponses(
        tester,
        HostResponsesState(
          status: HostResponsesStatus.content,
          forForm: false,
          entries: formEntries,
        ),
      );

      expect(find.text('Results'), findsNothing);
      expect(find.text('Nikhil Rao'), findsOneWidget);
    });
  });

  group('One answer', () {
    testWidgets('shows the person, their answers, the payment and the note', (
      tester,
    ) async {
      final note = TextEditingController(text: 'Knee injury, 5 km loop');
      addTearDown(note.dispose);
      await pumpFormsBody(
        tester,
        HostResponseBody(
          state: const HostResponseState(
            status: HostResponseStatus.content,
            name: 'Tara Menon',
            review: HostApplicationReviewStatus.submitted,
            facts: ['Instagram bio', '+919820144718'],
            answers: [
              HostResponseAnswer(
                question: 'Your easy pace',
                answer: 'Steady, 6:00 to 7:00 a km',
              ),
              HostResponseAnswer(
                question: 'Anything we should know?',
                answer: null,
              ),
            ],
            payment: '₹499.00 · Captured',
            showNote: true,
          ),
          note: note,
          onOpenFile: (_) {},
        ),
      );

      expect(find.text('Tara Menon'), findsOneWidget);
      expect(find.text('New'), findsOneWidget);
      expect(find.text('Instagram bio · +919820144718'), findsOneWidget);
      expect(find.text('Answers'), findsOneWidget);
      expect(find.text('Steady, 6:00 to 7:00 a km'), findsOneWidget);
      expect(find.text('Left blank'), findsOneWidget);
      expect(find.text('₹499.00 · Captured'), findsOneWidget);
      expect(find.text('Your note'), findsOneWidget);
      expect(find.text('Knee injury, 5 km loop'), findsOneWidget);
    });

    testWidgets('an answer nobody reviews has no note', (tester) async {
      final note = TextEditingController();
      addTearDown(note.dispose);
      await pumpFormsBody(
        tester,
        HostResponseBody(
          state: const HostResponseState(
            status: HostResponseStatus.content,
            withdrawn: true,
          ),
          note: note,
          onOpenFile: (_) {},
        ),
      );

      expect(find.text('Someone'), findsOneWidget);
      expect(find.text('Withdrawn'), findsOneWidget);
      expect(find.text('No answers to show.'), findsOneWidget);
      expect(find.text('Your note'), findsNothing);
    });
  });
}
