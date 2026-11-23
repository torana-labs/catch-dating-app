import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_screen.dart';
import 'package:catch_dating_app/hosts/people/person_body.dart';
import 'package:catch_dating_app/hosts/people/person_screen.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../people_fixtures.dart';
import '../people_test_pump.dart';
import 'duplicates_fixtures.dart';

const _org = 'organizer-1';

Future<void> _pumpApp(
  WidgetTester tester,
  Widget home, {
  required List<Override> overrides,
}) async {
  tester.view.physicalSize = peoplePhone;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      retry: (_, _) => null,
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: catchNoticeOverlayBuilder,
        home: home,
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

HostActiveContactMerge _merge() => HostActiveContactMerge(
  mergeReceiptId: 'receipt-1',
  sourceContactId: 'rk-import',
  sourceDisplayName: 'Rhea K',
  evidence: const ['managerConfirmed', 'sameVerifiedPhone'],
  conflicts: const [],
  movedFactCount: 4,
  mergedAt: DateTime(2026, 11, 20, 18),
);

void main() {
  testWidgets('Merge confirms the kept record, merges, reads the review '
      'again and offers Undo', (tester) async {
    final contacts = FakeDuplicateContacts({
      null: duplicatePage(open: [duplicatePairMap('pair-1')]),
    });
    await _pumpApp(
      tester,
      const HostPeopleDuplicatesScreen(organizerId: _org),
      overrides: [hostContactsRepositoryProvider.overrideWithValue(contacts)],
    );

    expect(find.text('Possible duplicates'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-duplicate-merge-pair-1')));
    await pumpFeatureUi(tester);
    expect(find.text('Merge these records?'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-merge-confirm')));
    await pumpFeatureUi(tester);

    expect(contacts.merges.single.survivor, 'rk');
    expect(contacts.merges.single.confirm, isTrue);
    expect(contacts.listCursors, [null, null]);
    expect(find.text('Merged into Rhea Kapoor'), findsOneWidget);

    await tester.tap(find.text('Undo'));
    await pumpFeatureUi(tester);

    expect(contacts.undos, ['receipt-1']);
    expect(contacts.listCursors, [null, null, null]);
  });

  testWidgets('Not the same person records the decision and reads the '
      'review again', (tester) async {
    final contacts = FakeDuplicateContacts({
      null: duplicatePage(open: [duplicatePairMap('pair-1')]),
    });
    await _pumpApp(
      tester,
      const HostPeopleDuplicatesScreen(organizerId: _org),
      overrides: [hostContactsRepositoryProvider.overrideWithValue(contacts)],
    );

    await tester.tap(
      find.byKey(const ValueKey('host-duplicate-different-pair-1')),
    );
    await pumpFeatureUi(tester);

    expect(contacts.reviews.single.differentPeople, isTrue);
    expect(contacts.listCursors, [null, null]);
    expect(find.text('Marked as different people'), findsOneWidget);
  });

  testWidgets('a person lists the records merged into them with Undo '
      'merge', (tester) async {
    final undone = <String>[];
    final detail = HostAudienceContactDetail.fromReadModels(
      organizerId: _org,
      contact: peopleContact('rk', 'Rhea Kapoor', nights: 2),
      linkedAccount: true,
      facts: HostContactDetailFacts(
        traits: peopleDetail().traits,
        revenue: peopleDetail().revenue,
        events: const [],
        eventsTruncated: false,
        activeMerges: [_merge()],
      ),
      notes: const [],
      notesTruncated: false,
    );
    await pumpPeopleBody(
      tester,
      HostPersonBody(
        state: personState(detail: detail),
        onMessage: () {},
        onAddTag: () {},
        onRetry: () {},
        onUndoMerge: (merge) => undone.add(merge.mergeReceiptId),
      ),
    );

    expect(find.text('Merged into this record'), findsOneWidget);
    expect(find.text('Rhea K'), findsOneWidget);
    expect(find.text('Merged Fri 20 Nov'), findsOneWidget);
    await tester.ensureVisible(find.text('Undo merge'));
    await tester.tap(find.text('Undo merge'));
    expect(undone, ['receipt-1']);

    await pumpPeopleBody(
      tester,
      HostPersonBody(
        state: personState(),
        onMessage: () {},
        onAddTag: () {},
        onRetry: () {},
        onUndoMerge: (merge) => undone.add(merge.mergeReceiptId),
      ),
    );
    expect(find.text('Merged into this record'), findsNothing);
  });

  testWidgets('Undo merge on a person asks first, then undoes the merge by '
      'its receipt', (tester) async {
    final contacts = FakeDuplicateContacts({null: duplicatePage()});
    final detail = peopleDetail();
    await _pumpApp(
      tester,
      const HostPersonScreen(organizerId: _org, contactId: 'rk'),
      overrides: [
        hostContactsRepositoryProvider.overrideWithValue(contacts),
        hostContactSummaryRowProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value((
            contact: peopleContact('rk', 'Rhea Kapoor', nights: 6),
            linkedAccount: true,
          )),
        ),
        hostContactDetailFactsProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value(
            HostContactDetailFacts(
              traits: detail.traits,
              revenue: detail.revenue,
              events: detail.events,
              eventsTruncated: false,
              activeMerges: [_merge()],
            ),
          ),
        ),
        hostContactNotesProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value((notes: const [], truncated: false)),
        ),
      ],
    );

    await tester.ensureVisible(find.text('Undo merge'));
    await tester.tap(find.text('Undo merge'));
    await pumpFeatureUi(tester);
    expect(find.text('Undo this merge?'), findsOneWidget);
    expect(
      find.text(
        'Rhea K’s nights, sources and contact details go back to their own '
        'record.',
      ),
      findsOneWidget,
    );
    await tester.tap(
      find.descendant(
        of: find.byType(CatchDialog<bool>),
        matching: find.text('Undo merge'),
      ),
    );
    await pumpFeatureUi(tester);

    expect(contacts.undos, ['receipt-1']);
    expect(find.text('Merge undone'), findsOneWidget);
    expect(const HostPersonState.loading().merges, isEmpty);
  });
}
