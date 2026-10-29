import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository extends Fake implements HostFormsRepository {
  final requests = <HostFormResponseListRequest>[];
  final pending = <Completer<HostFormResponsePage>>[];

  @override
  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest request,
  ) {
    requests.add(request);
    final result = Completer<HostFormResponsePage>();
    pending.add(result);
    return result.future;
  }
}

HostFormResponseSummary _response(
  String id, {
  String title = 'Form',
  String formId = 'form',
}) => HostFormResponseSummary(
  responseId: id,
  formId: formId,
  formTitle: title,
  versionId: 'version-$id',
  version: 1,
  status: HostFormResponseStatus.submitted,
  identityKind: HostFormResponseIdentityKind.anonymous,
  identity: const HostFormResponseIdentity(
    displayName: null,
    email: null,
    phoneE164: null,
    origin: HostFormDataOrigin.anonymous,
  ),
  sourceLinkId: null,
  sourceLabel: null,
  submittedAt: DateTime.utc(2026, 10),
  withdrawnAt: null,
  highlights: const [],
  conversionKinds: const {},
);

HostFormResponsePage _page(
  String id, {
  String organizerId = 'org',
  String formId = 'form',
  String? cursor,
  String title = 'Form',
}) {
  final response = _response(id, title: title, formId: formId);
  return HostFormResponsePage(
    organizerId: organizerId,
    items: [response],
    entries: [HostFormInboxEntry.fromResponse(response)],
    nextCursor: cursor,
    versionScope: HostFormResponseVersionScope(
      activeVersionId: 'version-$id',
      publishedVersion: 1,
    ),
    answerFilterOptions: [
      HostFormResponseFilterOption(
        questionId: 'question-$id',
        label: id,
        options: {id: id},
      ),
    ],
  );
}

void _expectPage(HostFormResponsesState state, HostFormResponsePage page) {
  expect(state.responses, page.items);
  expect(state.inboxEntries, page.entries);
  expect(state.nextCursor, page.nextCursor);
  expect(state.versionScope, same(page.versionScope));
  expect(state.answerFilterOptions, page.answerFilterOptions);
  expect(state.loadingMore, isFalse);
  expect(state.loadMoreError, isNull);
}

void main() {
  const request = HostFormResponseListRequest(
    organizerId: 'org',
    formId: 'form',
    versionId: 'version',
    includeApplications: true,
    query: 'guest',
    answerFilters: {
      'city': {'Mumbai'},
    },
  );
  final provider = hostFormResponsesControllerProvider(request);

  ProviderContainer setup(_Repository repository) {
    final container = ProviderContainer(
      overrides: [hostFormsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    container.listen(provider, (_, _) {});
    return container;
  }

  Future<void> initial(
    ProviderContainer container,
    _Repository repository,
  ) async {
    final future = container.read(provider.future);
    repository.pending.last.complete(_page('original', cursor: 'page-2'));
    await future;
  }

  test(
    'pagination preserves request scope, retries and deduplicates rows',
    () async {
      final repository = _Repository();
      final container = setup(repository);
      await initial(container, repository);
      final controller = container.read(provider.notifier);
      final failed = controller.loadMore();
      await controller.loadMore();
      expect(repository.requests, [
        request,
        request.copyWith(cursor: 'page-2'),
      ]);
      final error = StateError('offline');
      repository.pending.last.completeError(error);
      await failed;
      expect(
        container.read(provider).requireValue.responses.single.responseId,
        'original',
      );
      expect(container.read(provider).requireValue.nextCursor, 'page-2');
      expect(container.read(provider).requireValue.loadMoreError, same(error));
      final retry = controller.loadMore();
      expect(repository.requests.last, request.copyWith(cursor: 'page-2'));
      final replacement = _page('original', title: 'Updated');
      repository.pending.last.complete(replacement);
      await retry;
      _expectPage(container.read(provider).requireValue, replacement);
      await controller.loadMore();
      expect(repository.requests, [
        request,
        request.copyWith(cursor: 'page-2'),
        request.copyWith(cursor: 'page-2'),
      ]);
    },
  );

  for (final fail in [false, true]) {
    test(
      'refresh rejects stale continuation ${fail ? 'failure' : 'success'}',
      () async {
        final repository = _Repository();
        final container = setup(repository);
        await initial(container, repository);
        final controller = container.read(provider.notifier);
        final old = controller.loadMore();
        final oldResult = repository.pending.last;
        container.invalidate(provider);
        final refreshed = container.read(provider.future);
        expect(repository.requests.last, request);
        final freshPage = _page('fresh');
        repository.pending.last.complete(freshPage);
        await refreshed;
        if (fail) {
          oldResult.completeError(StateError('stale failure'));
        } else {
          oldResult.complete(_page('stale', cursor: 'stale-cursor'));
        }
        await old;
        _expectPage(container.read(provider).requireValue, freshPage);
      },
    );

    test(
      'disposed continuation ${fail ? 'failure' : 'success'} cannot poison reopened scope',
      () async {
        final repository = _Repository();
        final container = setup(repository);
        await initial(container, repository);
        final oldController = container.read(provider.notifier);
        final old = oldController.loadMore();
        final oldResult = repository.pending.last;
        // A second container models returning to the same family after disposal.
        // Keep the first container's normal tear-down idempotent.
        container.dispose();
        final reopened = setup(repository);
        final reloaded = reopened.read(provider.future);
        expect(reopened.read(provider.notifier), isNot(same(oldController)));
        final freshPage = _page('reopened');
        repository.pending.last.complete(freshPage);
        await reloaded;
        final completed = expectLater(old, completes);
        if (fail) {
          oldResult.completeError(StateError('disposed failure'));
        } else {
          oldResult.complete(_page('disposed', cursor: 'wrong'));
        }
        await completed;
        _expectPage(reopened.read(provider).requireValue, freshPage);
      },
    );
  }

  test('a different request family retains its own rows and cursor', () async {
    final repository = _Repository();
    final container = setup(repository);
    await initial(container, repository);
    final old = container.read(provider.notifier).loadMore();
    final oldResult = repository.pending.last;
    const otherRequest = HostFormResponseListRequest(
      organizerId: 'other-org',
      formId: 'other-form',
      query: 'other guest',
    );
    final other = hostFormResponsesControllerProvider(otherRequest);
    container.listen(other, (_, _) {});
    final loaded = container.read(other.future);
    expect(repository.requests.last, otherRequest);
    final otherPage = _page(
      'other',
      organizerId: 'other-org',
      formId: 'other-form',
      cursor: 'other-next',
    );
    repository.pending.last.complete(otherPage);
    await loaded;
    oldResult.complete(_page('old-continuation', cursor: 'old-next'));
    await old;
    _expectPage(container.read(other).requireValue, otherPage);
  });
}
