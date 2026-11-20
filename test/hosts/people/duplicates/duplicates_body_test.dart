import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_body.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_dating_app/hosts/people/duplicates/widgets/merge_confirm_sheet.dart';
import 'package:catch_dating_app/hosts/people/parts/people_duplicates_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../people_test_pump.dart';
import 'duplicates_fixtures.dart';

class _Calls {
  final views = <HostDuplicatesView>[];
  final merges = <String>[];
  final different = <String>[];
  final reopened = <String>[];
  int more = 0;
  int retry = 0;
}

Future<_Calls> _pump(
  WidgetTester tester,
  HostDuplicatesState state, {
  String? pendingPairId,
}) async {
  final calls = _Calls();
  await pumpPeopleBody(
    tester,
    HostPeopleDuplicatesBody(
      state: state,
      pendingPairId: pendingPairId,
      onView: calls.views.add,
      onMerge: (pair) => calls.merges.add(pair.candidateId),
      onDifferent: (pair) => calls.different.add(pair.candidateId),
      onReopen: (pair) => calls.reopened.add(pair.candidateId),
      onLoadMore: () => calls.more++,
      onRetry: () => calls.retry++,
    ),
  );
  return calls;
}

HostDuplicatesState _ready({
  HostDuplicatesView view = HostDuplicatesView.open,
  List<HostContactMergeCandidate>? pairs,
  bool canLoadMore = false,
  bool truncated = false,
}) => HostDuplicatesState(
  status: HostDuplicatesStatus.ready,
  view: view,
  pairs: pairs ?? [duplicatePair('pair-1')],
  openCount: 1,
  markedCount: 2,
  canLoadMore: canLoadMore,
  truncated: truncated,
);

void main() {
  testWidgets('a pair shows both people side by side with the evidence, '
      'shared nights and sources, and runs Merge and Not the same '
      'person', (tester) async {
    final calls = await _pump(tester, _ready(truncated: true));

    expect(find.text('Rhea Kapoor'), findsOneWidget);
    expect(find.text('Rhea K'), findsOneWidget);
    expect(find.text('+919800000001'), findsNWidgets(2));
    expect(find.text('rhea@example.com'), findsOneWidget);
    expect(find.text('From a Catch booking'), findsOneWidget);
    expect(find.text('From a spreadsheet'), findsOneWidget);
    expect(find.text('Catch account'), findsOneWidget);
    expect(find.text('Same verified phone'), findsOneWidget);
    expect(find.text('Both on 2 nights'), findsOneWidget);
    expect(find.textContaining('A name alone never makes a pair'), findsOne);
    expect(find.textContaining('more pairs may show up later'), findsOne);

    await tester.tap(find.byKey(const ValueKey('host-duplicate-merge-pair-1')));
    await tester.tap(
      find.byKey(const ValueKey('host-duplicate-different-pair-1')),
    );
    await tester.tap(
      find.byKey(const ValueKey('host-duplicates-view-markedDifferent')),
    );

    expect(calls.merges, ['pair-1']);
    expect(calls.different, ['pair-1']);
    expect(calls.views, [HostDuplicatesView.markedDifferent]);
    expect(find.text('Show again'), findsNothing);
  });

  testWidgets('while a command runs, every pair waits', (tester) async {
    final calls = await _pump(
      tester,
      _ready(pairs: [duplicatePair('pair-1'), duplicatePair('pair-2')]),
      pendingPairId: 'pair-1',
    );

    await tester.tap(find.byKey(const ValueKey('host-duplicate-merge-pair-2')));
    await tester.tap(
      find.byKey(const ValueKey('host-duplicate-different-pair-2')),
    );

    expect(calls.merges, isEmpty);
    expect(calls.different, isEmpty);
  });

  testWidgets('Marked different offers Show again, only to the teammate who '
      'marked the pair', (tester) async {
    final calls = await _pump(
      tester,
      _ready(
        view: HostDuplicatesView.markedDifferent,
        pairs: [
          duplicatePair('pair-1', marked: true),
          duplicatePair('pair-2', marked: true, canReopen: false),
        ],
      ),
    );

    expect(find.text('Merge'), findsNothing);
    expect(
      find.text('Only the teammate who marked this can show it again.'),
      findsOneWidget,
    );
    await tester.tap(
      find.byKey(const ValueKey('host-duplicate-reopen-pair-1')),
    );
    await tester.tap(
      find.byKey(const ValueKey('host-duplicate-reopen-pair-2')),
    );

    expect(calls.reopened, ['pair-1']);
  });

  testWidgets('the review shows its empty, error and Show more states', (
    tester,
  ) async {
    var calls = await _pump(tester, _ready(pairs: const []));
    expect(find.text('No possible duplicates.'), findsOneWidget);

    calls = await _pump(
      tester,
      const HostDuplicatesState(status: HostDuplicatesStatus.error),
    );
    expect(find.text('We couldn’t load possible duplicates'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(calls.retry, 1);

    calls = await _pump(tester, _ready(canLoadMore: true));
    await tester.tap(find.byKey(const ValueKey('host-duplicates-show-more')));
    expect(calls.more, 1);
  });

  testWidgets('the People row counts the pairs to review', (tester) async {
    var taps = 0;
    await pumpPeopleBody(
      tester,
      PeopleDuplicatesRow(
        summary: const HostPeopleDuplicateSummary(
          openCount: 3,
          markedCount: 0,
          atLeast: false,
        ),
        onTap: () => taps++,
      ),
    );

    expect(find.text('Possible duplicates'), findsOneWidget);
    expect(find.text('3 pairs to review'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-people-duplicates')));
    expect(taps, 1);
  });

  group('merge confirmation', () {
    Future<List<String?>> pumpSheet(
      WidgetTester tester,
      HostContactMergeCandidate pair,
    ) async {
      final popped = <String?>[];
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: CatchRoot(
            child: Builder(
              builder: (context) => CatchButton(
                label: 'Open',
                onPressed: () async => popped.add(
                  await showCatchBottomSheet<String>(
                    context: context,
                    builder: (_) => HostMergeConfirmSheet(pair: pair),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      return popped;
    }

    testWidgets('keeps the Catch account by default, says what moves and '
        'that it can be undone, and pops the kept record', (tester) async {
      final popped = await pumpSheet(tester, duplicatePair('pair-1'));

      expect(find.text('Merge these records?'), findsOneWidget);
      expect(
        find.text(
          'Rhea K’s nights, sources and contact details move to Rhea '
          'Kapoor, and Rhea K leaves your People list.',
        ),
        findsOneWidget,
      );
      expect(
        find.text('You can undo this from Rhea Kapoor’s page.'),
        findsOneWidget,
      );
      expect(find.textContaining('differ'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('host-merge-keep-rk-import')));
      await tester.pump();
      expect(
        find.text('You can undo this from Rhea K’s page.'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('host-merge-confirm')));
      await tester.pumpAndSettle();

      expect(popped, ['rk-import']);
    });

    testWidgets('names the phone and email differences it confirms', (
      tester,
    ) async {
      await pumpSheet(
        tester,
        duplicatePair(
          'pair-1',
          matchKinds: const ['sameImportedPhone'],
          contacts: [
            duplicatePersonMap(
              'a',
              'Ishaan Mehta',
              phone: '+919800000002',
              email: 'ishaan@example.com',
            ),
            duplicatePersonMap(
              'b',
              'Ishaan M',
              phone: '+919800000003',
              email: 'im@example.com',
            ),
          ],
        ),
      );

      expect(
        find.text(
          'Their phone numbers differ. Merge only if they are the same person.',
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          'Their emails differ. Merge only if they are the same person.',
        ),
        findsOneWidget,
      );
    });
  });
}
