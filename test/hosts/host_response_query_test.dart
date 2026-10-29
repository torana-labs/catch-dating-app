import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const city = HostResponseQueryField(
    questionId: 'city',
    label: 'Event city',
    kind: 'singleChoice',
    operators: {
      HostResponseOperator.present,
      HostResponseOperator.missing,
      HostResponseOperator.choiceAny,
      HostResponseOperator.choiceAll,
      HostResponseOperator.choiceNone,
    },
    sortable: true,
    options: {'Mumbai': 'Mumbai', 'Delhi': 'Delhi'},
  );
  const age = HostResponseQueryField(
    questionId: 'age',
    label: 'Age',
    kind: 'number',
    operators: {
      HostResponseOperator.present,
      HostResponseOperator.missing,
      HostResponseOperator.numberBetween,
    },
    sortable: true,
    options: {},
  );

  test('mixed typed conditions retain exact API shape across pagination', () {
    const predicate = HostResponseGroup(
      match: HostResponseMatch.all,
      children: [
        HostResponseCondition(
          questionId: 'city',
          operator: HostResponseOperator.choiceAny,
          values: ['Mumbai', 'Delhi'],
        ),
        HostResponseCondition(
          questionId: 'age',
          operator: HostResponseOperator.numberBetween,
          minimum: 21,
          maximum: 35,
        ),
      ],
    );
    const request = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
      predicate: predicate,
      sort: HostResponseSort(questionId: 'age', direction: 'asc'),
    );
    request.validate([city, age]);
    final first = request.toJson();
    final second = request.withCursor('page-two').toJson();
    expect(first['cursor'], isNull);
    expect(second['cursor'], 'page-two');
    expect(second['versionId'], 'form_v3');
    expect(second['predicate'], first['predicate']);
    expect(second['sort'], first['sort']);
    expect(second['limit'], 25);
    expect(second['statuses'], ['submitted']);
  });

  test('unpublished fields and invalid typed values cannot be applied', () {
    const unpublished = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
      predicate: HostResponseCondition(
        questionId: 'private_note',
        operator: HostResponseOperator.textContains,
        value: 'secret',
      ),
    );
    expect(() => unpublished.validate([city, age]), throwsArgumentError);

    const wrongKind = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
      predicate: HostResponseCondition(
        questionId: 'city',
        operator: HostResponseOperator.numberBetween,
        minimum: 20,
        maximum: 40,
      ),
    );
    expect(() => wrongKind.validate([city, age]), throwsArgumentError);

    const unknownChoice = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
      predicate: HostResponseCondition(
        questionId: 'city',
        operator: HostResponseOperator.choiceAny,
        values: ['Unpublished'],
      ),
    );
    expect(() => unknownChoice.validate([city, age]), throwsArgumentError);
  });

  test('twenty condition and three-level bounds mirror server limits', () {
    const condition = HostResponseCondition(
      questionId: 'city',
      operator: HostResponseOperator.present,
    );
    HostResponseGroup(
      match: HostResponseMatch.all,
      children: List.filled(19, condition),
    ).validate({'city': city});
    expect(
      () => HostResponseGroup(
        match: HostResponseMatch.all,
        children: List.filled(21, condition),
      ).validate({'city': city}),
      throwsArgumentError,
    );
    expect(
      () => const HostResponseGroup(
        match: HostResponseMatch.all,
        children: [
          HostResponseGroup(
            match: HostResponseMatch.any,
            children: [
              HostResponseGroup(
                match: HostResponseMatch.all,
                children: [condition],
              ),
            ],
          ),
        ],
      ).validate({'city': city}),
      throwsArgumentError,
    );
  });

  test('a changed result clears selected response identities', () {
    final first = _page('result-one', ['kabir', 'maya']);
    final selected = const HostResponseSelection(
      queryHash: 'query-one',
      resultHash: 'result-one',
    ).toggle('kabir', first);
    expect(selected.ids, {'kabir'});
    expect(() => selected.toggle('foreign', first), throwsArgumentError);
    expect(selected.reconcile(_page('result-two', ['kabir'])).ids, isEmpty);
    expect(selected.reconcile(first).ids, {'kabir'});
  });

  test(
    'malformed page and catalog fail instead of showing partial results',
    () {
      expect(
        () => HostResponseQueryPage.fromCallableData(const {
          'items': [],
          'nextCursor': null,
          'total': 1,
          'selectedIds': ['kabir'],
          'queryHash': 'query-one',
          'resultHash': 'result-one',
        }),
        throwsFormatException,
      );
      expect(
        HostResponseQueryField.fromMap(const {
          'questionId': 'city',
          'label': 'Event city',
          'kind': 'singleChoice',
          'operators': ['choiceAny'],
          'sortable': true,
          'options': [
            {'value': 'Mumbai', 'label': 'Mumbai'},
          ],
        }).operators,
        {HostResponseOperator.choiceAny},
      );

      final page = HostResponseQueryPage.fromCallableData({
        'form': const {
          'formId': 'form',
          'title': 'Sunday run RSVP',
          'versionId': 'form_v3',
          'version': 3,
        },
        'fieldCatalog': const [
          {
            'questionId': 'city',
            'label': 'Event city',
            'kind': 'singleChoice',
            'operators': ['choiceAny'],
            'sortable': true,
            'options': [
              {'value': 'Mumbai', 'label': 'Mumbai'},
            ],
          },
        ],
        'items': [_rowMap('kabir')],
        'total': 1,
        'nextCursor': null,
        'selectedIds': const ['kabir'],
        'queryHash': 'query-one',
        'resultHash': 'result-one',
      });
      expect(page.form.versionId, 'form_v3');
      expect(page.items.single.identity.primaryLabel, 'Guest kabir');
      expect(page.fieldCatalog.single.questionId, 'city');
      expect(page.items.single.sourceLinkId, isNull);
    },
  );

  test('a changed page two clears selection and requires refresh', () async {
    final gateway = _QueueGateway();
    final controller = HostResponseQueryController(gateway);
    addTearDown(controller.dispose);
    const request = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
    );
    final initial = controller.apply(request);
    gateway.completeNext(
      _queryPage(
        ids: ['kabir', 'maya'],
        visible: ['kabir'],
        hash: 'before',
        nextCursor: 'page-two',
      ),
    );
    await initial;
    controller.toggleSelection('kabir');
    expect(controller.selectionIntent?.ids, ['kabir']);

    final more = controller.loadMore();
    gateway.completeNext(
      _queryPage(ids: ['kabir', 'maya'], visible: ['maya'], hash: 'after'),
    );
    await more;
    expect(controller.view.status, HostResponseQueryStatus.stale);
    expect(controller.view.rows.map((row) => row.id), ['kabir']);
    expect(controller.view.selectedIds, isEmpty);
    expect(controller.selectionIntent, isNull);
    expect(controller.view.canLoadMore, isFalse);
  });

  test('offer review rechecks selected identities after event choice', () async {
    final gateway = _QueueGateway();
    final controller = HostResponseQueryController(gateway);
    addTearDown(controller.dispose);
    const request = HostResponseQueryRequest(
      organizerId: 'org', formId: 'form', versionId: 'form_v3');
    final first = controller.apply(request);
    gateway.completeNext(_queryPage(
      ids: ['kabir', 'maya'], visible: ['kabir'], hash: 'result-one'));
    await first;
    controller.toggleSelection('kabir');

    final stillCurrent = controller.revalidateSelection(
      ids: const ['kabir'], resultHash: 'result-one');
    gateway.completeNext(_queryPage(
      ids: ['kabir', 'maya'], visible: ['kabir'], hash: 'result-one'));
    expect(await stillCurrent, isTrue);

    final changed = controller.revalidateSelection(
      ids: const ['kabir'], resultHash: 'result-one');
    gateway.completeNext(_queryPage(
      ids: ['maya'], visible: ['maya'], hash: 'result-two'));
    expect(await changed, isFalse);
    expect(controller.selectionIntent?.ids, ['kabir'],
      reason: 'The caller must show refresh, not silently change review IDs.');

    final interrupted = controller.revalidateSelection(
      ids: const ['kabir'], resultHash: 'result-one');
    final newFilter = controller.apply(
      const HostResponseQueryRequest(
        organizerId: 'org', formId: 'form', versionId: 'form_v3',
        sort: HostResponseSort(direction: 'asc')));
    gateway.completeNext(_queryPage(
      ids: ['maya'], visible: ['maya'], hash: 'result-three'));
    await newFilter;
    gateway.completeAt(3, _queryPage(
      ids: ['kabir', 'maya'], visible: ['kabir'], hash: 'result-one'));
    expect(await interrupted, isFalse);
  });

  test('an older request cannot replace a newer filter result', () async {
    final gateway = _QueueGateway();
    final controller = HostResponseQueryController(gateway);
    addTearDown(controller.dispose);
    const first = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
    );
    const second = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
      sort: HostResponseSort(direction: 'asc'),
    );
    final older = controller.apply(first);
    final newer = controller.apply(second);
    gateway.completeAt(
      1,
      _queryPage(ids: ['maya'], visible: ['maya'], hash: 'newer'),
    );
    await newer;
    gateway.completeAt(
      0,
      _queryPage(ids: ['kabir'], visible: ['kabir'], hash: 'older'),
    );
    await older;
    expect(controller.view.rows.single.id, 'maya');
    expect(controller.view.request?.sort.direction, 'asc');
  });

  test('typed repository stale failure clears selection and asks refresh',
      () async {
    final gateway = _QueueGateway();
    final controller = HostResponseQueryController(gateway);
    addTearDown(controller.dispose);
    const request = HostResponseQueryRequest(
      organizerId: 'org',
      formId: 'form',
      versionId: 'form_v3',
    );
    final first = controller.apply(request);
    gateway.completeNext(_queryPage(
      ids: ['kabir', 'maya'],
      visible: ['kabir'],
      hash: 'before',
      nextCursor: 'page-two',
    ));
    await first;
    controller.toggleSelection('kabir');

    final more = controller.loadMore();
    gateway.failNext(const BackendOperationException(
      code: 'response-query-stale',
      message: 'Refresh to continue.',
      context: BackendErrorContext(
        service: BackendService.functions,
        action: 'query form responses',
      ),
    ));
    await more;
    expect(controller.view.status, HostResponseQueryStatus.stale);
    expect(controller.view.selectedIds, isEmpty);
    expect(controller.selectionIntent, isNull);
  });

  test(
    'scan budget and permission loss are separate from zero matches',
    () async {
      final gateway = _QueueGateway();
      final controller = HostResponseQueryController(gateway);
      addTearDown(controller.dispose);
      const request = HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v3',
      );
      final first = controller.apply(request);
      gateway.failNext(
        FirebaseFunctionsException(
          code: 'resource-exhausted',
          message: 'Form exceeds scan budget',
        ),
      );
      await first;
      expect(controller.view.status, HostResponseQueryStatus.budgetExceeded);
      expect(controller.view.error, isA<NetworkException>());
      expect(
        (controller.view.error! as AppException).code,
        'too-many-requests',
      );
      expect(controller.view.total, 0);

      final second = controller.apply(request);
      gateway.failNext(
        FirebaseFunctionsException(
          code: 'permission-denied',
          message: 'Manager access revoked',
        ),
      );
      await second;
      expect(controller.view.status, HostResponseQueryStatus.permissionLost);
      expect(controller.view.error, isA<PermissionException>());

      final third = controller.apply(request);
      gateway.failNext(const SignInRequiredException('query form responses'));
      await third;
      expect(controller.view.status, HostResponseQueryStatus.permissionLost);
      expect(controller.view.error, isA<SignInRequiredException>());
    },
  );
}

HostResponseQueryPage _page(String hash, List<String> ids) =>
    HostResponseQueryPage(
      form: _form,
      items: [for (final id in ids) HostResponseQueryRow.fromMap(_rowMap(id))],
      nextCursor: null,
      total: ids.length,
      selectedIds: ids.toSet(),
      queryHash: 'query-one',
      resultHash: hash,
      fieldCatalog: const [],
    );

HostResponseQueryPage _queryPage({
  required List<String> ids,
  required List<String> visible,
  required String hash,
  String? nextCursor,
}) => HostResponseQueryPage(
  form: _form,
  items: [for (final id in visible) HostResponseQueryRow.fromMap(_rowMap(id))],
  nextCursor: nextCursor,
  total: ids.length,
  selectedIds: ids.toSet(),
  queryHash: 'query-one',
  resultHash: hash,
  fieldCatalog: const [],
);

const _form = HostResponseQueryForm(
  formId: 'form',
  title: 'Sunday run RSVP',
  versionId: 'form_v3',
  version: 3,
);

Map<String, Object?> _rowMap(String id) => {
  'responseId': id,
  'formId': 'form',
  'formTitle': 'Sunday run RSVP',
  'versionId': 'form_v3',
  'version': 3,
  'status': 'submitted',
  'identityKind': 'phoneVerified',
  'identity': {
    'displayName': 'Guest $id',
    'email': null,
    'phoneE164': null,
    'origin': 'respondentGranted',
  },
  'sourceLinkId': null,
  'submittedAtMillis': 1790000000000,
  'withdrawnAtMillis': null,
};

class _QueueGateway implements HostResponseQueryGateway {
  final List<Completer<HostResponseQueryPage>> _pending = [];

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) {
    final completer = Completer<HostResponseQueryPage>();
    _pending.add(completer);
    return completer.future;
  }

  void completeNext(HostResponseQueryPage page) => _pending.last.complete(page);

  void completeAt(int index, HostResponseQueryPage page) =>
      _pending[index].complete(page);

  void failNext(Object error) => _pending.last.completeError(error);
}
