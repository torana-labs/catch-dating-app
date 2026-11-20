import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_controller.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';
import 'duplicates_fixtures.dart';

const _org = 'organizer-1';

ProviderContainer _container(FakeDuplicateContacts contacts) =>
    ProviderContainer.test(
      overrides: [hostContactsRepositoryProvider.overrideWithValue(contacts)],
      retry: (_, _) => null,
    );

void main() {
  test('the review lists pairs to review and pairs marked different, with '
      'counts that are a lower bound while pages follow', () async {
    final contacts = FakeDuplicateContacts({
      null: duplicatePage(
        open: [duplicatePairMap('pair-1'), duplicatePairMap('pair-2')],
        marked: [duplicatePairMap('pair-3', marked: true)],
        nextCursor: 'next',
        truncated: true,
      ),
    });
    final container = _container(contacts);
    container
      ..listen(
        hostDuplicatesControllerProvider(_org, HostDuplicatesView.open),
        (_, _) {},
      )
      ..listen(hostPeopleDuplicateSummaryProvider(_org), (_, _) {});
    await flushTestEventQueue();

    final open = container.read(
      hostDuplicatesControllerProvider(_org, HostDuplicatesView.open),
    );
    expect(open.status, HostDuplicatesStatus.ready);
    expect(open.pairs.map((pair) => pair.candidateId), ['pair-1', 'pair-2']);
    expect(open.openCount, 2);
    expect(open.markedCount, 1);
    expect(open.atLeast, isTrue);
    expect(open.truncated, isTrue);
    expect(open.canLoadMore, isTrue);
    final marked = container.read(
      hostDuplicatesControllerProvider(
        _org,
        HostDuplicatesView.markedDifferent,
      ),
    );
    expect(marked.pairs.single.canReopen, isTrue);
    final summary = container.read(hostPeopleDuplicateSummaryProvider(_org));
    expect(summary?.openCount, 2);
    expect(summary?.atLeast, isTrue);
    expect(summary?.visible, isTrue);
    expect(contacts.listCursors, [null]);
  });

  test('Show more reads the next page with the review cursor and shows a '
      'pair once', () async {
    final contacts = FakeDuplicateContacts({
      null: duplicatePage(open: [duplicatePairMap('pair-1')], nextCursor: 'c2'),
      'c2': duplicatePage(
        open: [duplicatePairMap('pair-1'), duplicatePairMap('pair-2')],
      ),
    });
    final container = _container(contacts);
    final provider = hostDuplicatesControllerProvider(
      _org,
      HostDuplicatesView.open,
    );
    container.listen(provider, (_, _) {});
    await flushTestEventQueue();

    await container
        .read(hostDuplicateReviewPagesProvider(_org).notifier)
        .loadMore();

    final state = container.read(provider);
    expect(contacts.listCursors, [null, 'c2']);
    expect(state.pairs.map((pair) => pair.candidateId), ['pair-1', 'pair-2']);
    expect(state.canLoadMore, isFalse);
    expect(state.atLeast, isFalse);
  });

  test(
    'a failed next page keeps the pairs and lets Show more retry it',
    () async {
      final contacts = FakeDuplicateContacts({
        null: duplicatePage(
          open: [duplicatePairMap('pair-1')],
          nextCursor: 'c2',
        ),
        'c2': StateError('offline'),
      });
      final container = _container(contacts);
      final provider = hostDuplicatesControllerProvider(
        _org,
        HostDuplicatesView.open,
      );
      container.listen(provider, (_, _) {});
      await flushTestEventQueue();

      await container
          .read(hostDuplicateReviewPagesProvider(_org).notifier)
          .loadMore();

      final state = container.read(provider);
      expect(state.pairs.single.candidateId, 'pair-1');
      expect(state.loadMoreError, isA<StateError>());
      expect(state.canLoadMore, isTrue);
    },
  );

  test('a review that cannot be read is an error and hides the People '
      'row', () async {
    final container = _container(
      FakeDuplicateContacts({null: StateError('denied')}),
    );
    container
      ..listen(
        hostDuplicatesControllerProvider(_org, HostDuplicatesView.open),
        (_, _) {},
      )
      ..listen(hostPeopleDuplicateSummaryProvider(_org), (_, _) {});
    await flushTestEventQueue();

    expect(
      container
          .read(hostDuplicatesControllerProvider(_org, HostDuplicatesView.open))
          .status,
      HostDuplicatesStatus.error,
    );
    expect(container.read(hostPeopleDuplicateSummaryProvider(_org)), isNull);
  });

  test('the commands merge into the kept record with the differences '
      'confirmed, mark and reopen pairs, and undo by receipt', () async {
    final contacts = FakeDuplicateContacts({null: duplicatePage()});
    final container = _container(contacts);
    final commands = container.read(hostDuplicateCommandsProvider);
    final pair = duplicatePair('pair-1');

    final receipt = await commands.merge(
      organizerId: _org,
      pair: pair,
      survivorContactId: 'rk-import',
    );
    await commands.markDifferent(organizerId: _org, pair: pair);
    await commands.reopen(organizerId: _org, pair: pair);
    await commands.undo(organizerId: _org, mergeReceiptId: receipt.receiptId);

    expect(contacts.merges.single, (
      candidateId: 'pair-1',
      survivor: 'rk-import',
      confirm: true,
    ));
    expect(receipt.movedFactCount, 4);
    expect(contacts.reviews, [
      (candidateId: 'pair-1', differentPeople: true),
      (candidateId: 'pair-1', differentPeople: false),
    ]);
    expect(contacts.undos, ['receipt-1']);
  });

  test('the kept record defaults to the Catch account and the differences '
      'come from the review', () {
    final pair = duplicatePair(
      'pair-1',
      contacts: [
        duplicatePersonMap('a', 'Ishaan Mehta', phone: '+919800000002'),
        duplicatePersonMap(
          'b',
          'Ishaan M',
          phone: '+919800000003',
          email: 'ishaan@example.com',
          linkedAccount: true,
        ),
      ],
    );
    expect(hostDefaultSurvivorId(pair), 'b');
    expect(hostMergeConflicts(pair), {HostMergeConflict.phone});
    expect(hostMergeConflicts(duplicatePair('pair-2')), isEmpty);
  });

  test('a detail view lists its active merges; one written before them '
      'lists none', () {
    Map<String, Object?> view({bool withMerges = true}) => {
      'organizerId': _org,
      'contactId': 'rk',
      'traits': {
        'expectedEventCount': 1,
        'attendedEventCount': 1,
        'cancelledEventCount': 0,
        'noShowCount': 0,
        'importedEventCount': 0,
        'attendanceRate': 1,
        'segmentIds': <String>[],
        'whatsappStatus': 'unknown',
        'sourceCoverage': 'exact',
      },
      'revenue': {'coverage': 'exact', 'amounts': <Object>[]},
      'events': <Object>[],
      'eventsTruncated': false,
      if (withMerges)
        'activeMerges': [
          {
            'mergeReceiptId': 'receipt-1',
            'sourceContactId': 'rk-import',
            'sourceDisplayName': 'Rhea K',
            'evidence': ['managerConfirmed', 'sameVerifiedPhone'],
            'conflicts': <String>[],
            'movedFactCount': 4,
            'mergedAtMillis': 1790000000000,
          },
        ],
      'version': 1,
    };
    final facts = HostContactDetailFacts.fromMap(view());
    expect(facts.activeMerges.single.sourceDisplayName, 'Rhea K');
    expect(facts.activeMerges.single.mergeReceiptId, 'receipt-1');
    expect(
      HostContactDetailFacts.fromMap(view(withMerges: false)).activeMerges,
      isEmpty,
    );
  });
}
