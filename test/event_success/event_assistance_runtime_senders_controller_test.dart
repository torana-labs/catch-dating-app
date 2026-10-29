import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_senders.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_runtime_sender_test.dart' as fixtures;

AssistanceRuntimeView _page({
  String? cursor = 'page-1',
  String? name,
  String? hash,
  String? sourceHash,
  int? now,
}) {
  final f = fixtures.fixture();
  final raw = (f['initial']! as Map).cast<String, Object?>();
  final view = (raw['view']! as Map).cast<String, Object?>();
  final setup = (view['senderSetup']! as Map).cast<String, Object?>();
  setup['nextCursors'] = {'catchEventRcs': ?cursor};
  if (name != null) {
    setup['choices'] = [
      for (final c in setup['choices']! as List)
        {
          ...c as Map,
          if (c['routeId'] == 'catchEventRcs') 'senderId': name,
          'reviewHash': ?hash,
        },
    ];
  }
  view['senderSetup'] = setup;
  if (sourceHash != null) view['sourceHash'] = sourceHash;
  if (now != null) view['serverTime'] = now;
  return AssistanceRuntimeView.fromJson(
    view,
    expectedScope: fixtures.fixtureScope(f),
  );
}

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late AssistanceRuntimeSession review;
  final scope = fixtures.readFixture(fixtures.fixture()).scope;
  final pageProvider = eventAssistanceRuntimeProvider(scope);
  const rcs = AssistanceMessageRoute.catchEventRcs;
  setUp(() async {
    repository = _Repository();
    auth = StreamController.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceRuntimeRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    final loaded = Completer<AssistanceRuntimeSession>();
    container.listen(pageProvider, (_, next) {
      if (!loaded.isCompleted && !next.isLoading) {
        if (next.hasError) {
          loaded.completeError(next.error!, next.stackTrace);
        } else if (next.asData case final data?) {
          loaded.complete(data.value);
        }
      }
    });
    auth.add('host-1');
    await container.pump();
    await container.pump();
    review = await loaded.future.timeout(const Duration(seconds: 10));
    container.listen(eventAssistanceRuntimeSendersProvider(review), (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  AssistanceRuntimeSenderDirectory directory() =>
      container.read(eventAssistanceRuntimeSendersProvider(review));
  Future<void> more() => container
      .read(eventAssistanceRuntimeSendersProvider(review).notifier)
      .loadMore(rcs);

  test(
    'explicit pages merge only their channel and become reviewed commands',
    () async {
      final first = directory();
      final load = more();
      expect(first.isCurrent, isFalse);
      expect(directory().loadingRoute, rcs);
      await more();
      expect(repository.pages, hasLength(1));
      expect(repository.cursors.single, {rcs: 'page-1'});
      repository.pages.single.complete(
        _page(cursor: null, name: 'later-sender'),
      );
      await load;
      expect(directory().choices, hasLength(4));
      expect(directory().cursors, isEmpty);
      final selected = directory().choices.singleWhere(
        (c) => c.senderId == 'later-sender',
      );
      final editor = eventAssistanceRuntimeEditorProvider(scope);
      container.listen(editor, (_, _) {});
      final owner = container.read(editor.notifier)..open(review);
      final oldConfig = fixtures.fixtureConfiguration(fixtures.fixture());
      owner.select(
        AssistanceRuntimeConfigure(
          AssistanceRuntimeConfiguration(
            routes: [
              AssistanceRuntimeRoute(route: rcs, senderId: selected.senderId),
            ],
            responseDeadline: oldConfig.responseDeadline,
            deliveryPolicy: oldConfig.deliveryPolicy,
            expiresAt: oldConfig.expiresAt,
            maxEvaluations: oldConfig.maxEvaluations,
          ),
        ),
        senders: directory(),
      );
      final form = container.read(editor) as AssistanceRuntimeForm;
      expect(form.canSubmit, isTrue);
      expect(form.change!.senderReviews!.single, same(selected));
      expect(() => directory().choices.clear(), throwsUnsupportedError);
    },
  );
  for (final fault in ['source', 'time', 'cursor', 'sender', 'permission']) {
    test('a $fault change clears choices and requires a full review', () async {
      final old = directory();
      final load = more();
      if (fault == 'permission') {
        repository.pages.single.completeError(StateError('Read denied'));
      } else {
        final originalId = review.view.senderSetup!.choices
            .singleWhere((c) => c.route == rcs)
            .senderId;
        repository.pages.single.complete(
          _page(
            cursor: fault == 'cursor' ? 'page-1' : 'page-2',
            sourceHash: fault == 'source' ? 'f' * 64 : null,
            now: fault == 'time' ? review.view.serverTime - 1 : null,
            name: fault == 'sender' ? originalId : null,
            hash: fault == 'sender' ? 'e' * 64 : null,
          ),
        );
      }
      await load;
      expect(directory().needsRefresh, isTrue);
      expect(directory().choices, isEmpty);
      expect(old.isCurrent, isFalse);
    });
  }
  test('an empty filtered page retains its advancing continuation', () async {
    final load = more();
    final f = fixtures.fixture();
    final raw = ((f['initial']! as Map)['view']! as Map)
        .cast<String, Object?>();
    raw['senderSetup'] = {
      'choices': [],
      'nextCursors': {'catchEventRcs': 'page-2'},
    };
    repository.pages.single.complete(
      AssistanceRuntimeView.fromJson(raw, expectedScope: scope),
    );
    await load;
    expect(directory().choices, hasLength(3));
    expect(directory().cursors[rcs], 'page-2');
  });
  for (final transition in ['refresh', 'signOut', 'sameUidReturn']) {
    test(
      '$transition retires the directory and ignores delayed pages',
      () async {
        final old = directory();
        final load = more();
        if (transition == 'refresh') {
          container.read(pageProvider.notifier).reload();
        } else {
          auth.add(null);
        }
        await container.pump();
        if (transition == 'sameUidReturn') {
          auth.add('host-1');
          await container.pump();
        }
        repository.pages.single.complete(
          _page(cursor: null, name: 'private-old'),
        );
        await load;
        expect(old.isCurrent, isFalse);
        expect(directory().choices, isEmpty);
        expect(directory().needsRefresh, isTrue);
      },
    );
  }
}

class _Repository extends Fake implements EventAssistanceRuntimeRepository {
  final pages = <Completer<AssistanceRuntimeView>>[];
  final cursors = <Map<AssistanceMessageRoute, String>>[];
  @override
  Future<AssistanceRuntimeView> fetch(
    EventAssistanceRuntimeScope scope,
  ) async => _page();
  @override
  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) {
    this.cursors.add(cursors);
    final page = Completer<AssistanceRuntimeView>();
    pages.add(page);
    return page.future;
  }
}
