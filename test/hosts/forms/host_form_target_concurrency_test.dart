import 'dart:async';
import 'dart:collection';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_target_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  test(
    'reload waits for sent save then newer target edit saves at fresh revision',
    () async {
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      final auth = _Auth('host-one');
      final repository = _Repository()..actor = () => auth.uid;
      final container = _container(accounts, auth, repository);
      addTearDown(container.dispose);
      accounts.add('host-one');
      await container.pump();
      final provider = hostFormEditorControllerProvider('org', 'form');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      final notifier = container.read(provider.notifier);

      notifier.updateTarget(
        kind: HostFormTargetKind.event,
        eventId: 'event-one',
        accountId: 'host-one',
      );
      repository.pendingSave = Completer<void>();
      final save = notifier.saveNow();
      await flushTestEventQueue();
      expect(repository.saves, 1);
      expect(repository.reads, 1);

      final reload = notifier.reload();
      await flushTestEventQueue();
      expect(repository.reads, 1); // No stale GET before the write settles.
      repository.pendingSave!.complete();
      expect(await save, isFalse);
      await reload;
      expect(repository.reads, 2);
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        'event-one',
      );
      notifier.updateTarget(
        kind: HostFormTargetKind.event,
        eventId: 'event-two',
        accountId: 'host-one',
      );
      expect(await notifier.saveNow(), isTrue);
      expect(repository.saves, 2);
      expect(repository.serverRevision, 4);
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        'event-two',
      );
    },
  );

  test('account rebuild waits for old save before manager read', () async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final repository = _Repository()..actor = () => auth.uid;
    final container = _container(accounts, auth, repository);
    addTearDown(container.dispose);
    accounts.add('host-one');
    await container.pump();
    final provider = hostFormEditorControllerProvider('org', 'form');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);
    final notifier = container.read(provider.notifier);
    notifier.updateTarget(
      kind: HostFormTargetKind.event,
      eventId: 'event-one',
      accountId: 'host-one',
    );
    repository.pendingSave = Completer<void>();
    final save = notifier.saveNow();
    await flushTestEventQueue();
    auth.uid = 'host-two';
    accounts.add('host-two');
    await container.pump();
    expect(repository.reads, 1);
    repository.pendingSave!.complete();
    expect(await save, isFalse);
    final current = await container.read(provider.future);
    expect(repository.reads, greaterThanOrEqualTo(2));
    expect(repository.readActors.last, 'host-two');
    expect(current.editor.definition.defaultTargetId, 'event-two');
    expect(notifier.editorBoundTo('host-two'), isTrue);
  });

  test('disposed provider ignores an in-flight save response', () async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final repository = _Repository()..actor = () => auth.uid;
    final container = _container(accounts, auth, repository);
    accounts.add('host-one');
    await container.pump();
    final provider = hostFormEditorControllerProvider('org', 'form');
    final subscription = container.listen(provider, (_, _) {});
    await container.read(provider.future);
    final notifier = container.read(provider.notifier);
    notifier.updateTarget(
      kind: HostFormTargetKind.event,
      eventId: 'event-one',
      accountId: 'host-one',
    );
    repository.pendingSave = Completer<void>();
    final save = notifier.saveNow();
    await flushTestEventQueue();

    final reload = notifier.reload();
    await flushTestEventQueue();
    expect(repository.reads, 1);
    subscription.close();
    container.dispose();
    repository.pendingSave!.complete();
    expect(await save, isFalse);
    await reload;
    expect(repository.reads, 1);
  });

  test('late actor mismatch schedules reload after save exits', () async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final repository = _Repository()..actor = () => auth.uid;
    final container = _container(accounts, auth, repository);
    addTearDown(container.dispose);
    accounts.add('host-one');
    await container.pump();
    final provider = hostFormEditorControllerProvider('org', 'form');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);
    final notifier = container.read(provider.notifier);
    notifier.updateTarget(
      kind: HostFormTargetKind.event,
      eventId: 'event-one',
      accountId: 'host-one',
    );
    repository.pendingSave = Completer<void>();
    final save = notifier.saveNow();
    await flushTestEventQueue();
    // Auth updates before its UID stream. A save callback must not await a
    // reload while it still owns the in-flight-save lock.
    auth.uid = 'host-two';
    repository.pendingSave!.complete();
    expect(await save, isFalse);
    await flushTestEventQueue();
    accounts.add('host-two');
    await container.pump();
    final current = await container.read(provider.future);
    expect(current.editor.definition.defaultTargetId, 'event-two');
    expect(notifier.editorBoundTo('host-two'), isTrue);
  });

  test(
    'undo after a successful target save cannot write as next actor',
    () async {
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      final auth = _Auth('host-one');
      final repository = _Repository()..actor = () => auth.uid;
      final container = _container(accounts, auth, repository);
      addTearDown(container.dispose);
      accounts.add('host-one');
      await container.pump();
      final provider = hostFormEditorControllerProvider('org', 'form');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      final notifier = container.read(provider.notifier);
      notifier.updateTarget(
        kind: HostFormTargetKind.event,
        eventId: 'event-one',
        accountId: 'host-one',
      );
      expect(await notifier.saveNow(), isTrue);
      expect(repository.saves, 1);

      // Firebase Auth can switch before its UID stream publishes the new value.
      auth.uid = 'host-two';
      notifier.undo();
      accounts.add('host-two');
      await container.pump();
      await container.read(provider.future);
      expect(repository.saves, 1);
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        'event-two',
      );
      expect(notifier.editorBoundTo('host-two'), isTrue);
    },
  );

  test('account change rebuilds editor and rejects late old read', () async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final repository = _Repository()..actor = () => auth.uid;
    final oldRead = Completer<HostFormEditor>();
    repository.pendingReads.add(oldRead);
    final oldReadStarted = Completer<void>();
    repository.pendingReadStarted = oldReadStarted;
    final container = _container(accounts, auth, repository);
    addTearDown(container.dispose);
    final provider = hostFormEditorControllerProvider('org', 'form');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    accounts.add('host-one');
    await container.pump();
    await flushTestEventQueue();
    expect(oldReadStarted.isCompleted, isTrue);
    expect(repository.readActors.last, 'host-one');

    auth.uid = 'host-two';
    accounts.add('host-two');
    await container.pump();
    await flushTestEventQueue();
    expect(repository.readActors.last, 'host-two');
    oldRead.complete(_editor(targetId: 'old-event'));
    await container.pump();
    final current = await container.read(provider.future);
    expect(current.editor.definition.defaultTargetId, 'event-two');
    expect(container.read(provider.notifier).editorBoundTo('host-two'), isTrue);
  });

  test('late first A read cannot claim editor after A to B to A', () async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final repository = _Repository()..actor = () => auth.uid;
    final oldRead = Completer<HostFormEditor>();
    repository.pendingReads.add(oldRead);
    final oldReadStarted = Completer<void>();
    repository.pendingReadStarted = oldReadStarted;
    final container = _container(accounts, auth, repository);
    addTearDown(container.dispose);
    final provider = hostFormEditorControllerProvider('org', 'form');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    accounts.add('host-one');
    await container.pump();
    await flushTestEventQueue();
    expect(oldReadStarted.isCompleted, isTrue);
    expect(repository.readActors.last, 'host-one');
    auth.uid = 'host-two';
    accounts.add('host-two');
    await container.pump();
    await flushTestEventQueue();
    expect(repository.readActors.last, 'host-two');
    auth.uid = 'host-one';
    accounts.add('host-one');
    await container.pump();
    await flushTestEventQueue();
    expect(repository.readActors.last, 'host-one');
    oldRead.complete(_editor(targetId: 'superseded-event'));
    await container.pump();
    final current = await container.read(provider.future);
    expect(current.editor.definition.defaultTargetId, isNull);
    expect(container.read(provider.notifier).editorBoundTo('host-one'), isTrue);
  });

  test(
    'A to B to A cursor cycle stops without accepting repeated page',
    () async {
      final controller = HostFormTargetController(
        organizerId: 'org',
        accountId: 'host-one',
        currentAccountId: () => 'host-one',
        loadPage: ({required organizerId, cursor}) async => switch (cursor) {
          null => HostOfferEventTargetPage([_event('one')], 'A'),
          'A' => HostOfferEventTargetPage([_event('two')], 'B'),
          _ => HostOfferEventTargetPage([_event('three')], 'A'),
        },
      );
      addTearDown(controller.dispose);
      await controller.refresh();
      await controller.loadMore();
      await controller.loadMore();
      expect(controller.hasLoadFailure, isTrue);
      expect(controller.canLoadMore, isFalse);
      expect(controller.events.map((event) => event.eventId), ['one', 'two']);
      expect(controller.event('three'), isNull);
    },
  );

  testWidgets('bound event refreshes when actor settles after first frame', (
    tester,
  ) async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-two');
    final notifier = _PickerNotifier();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: HostFormTargetSection(
                organizerId: 'org',
                definition: HostFormDefinition.fromMap(_definition).withTarget(
                  kind: HostFormTargetKind.event,
                  eventId: 'event-two',
                ),
                notifier: notifier,
                accountId: 'host-two',
                enableEventTargetSettings: true,
                hasPublishedVersion: false,
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(notifier._reads, 0);
    accounts.add('host-two');
    await pumpFeatureUi(tester);
    expect(notifier._reads, 1);
    expect(find.text('Event event-two'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}

ProviderContainer _container(
  StreamController<String?> accounts,
  _Auth auth,
  _Repository repository,
) => ProviderContainer(
  overrides: [
    uidProvider.overrideWith((ref) => accounts.stream),
    firebaseAuthProvider.overrideWithValue(auth),
    hostFormsRepositoryProvider.overrideWithValue(repository),
  ],
);

class _Auth extends Fake implements FirebaseAuth {
  _Auth(this.uid);
  String? uid;
  @override
  User? get currentUser => uid == null ? null : _User(uid!);
}

class _User extends Fake implements User {
  _User(this.uid);
  @override
  final String uid;
}

class _Repository extends Fake implements HostFormsRepository {
  String? Function()? actor;
  final pendingReads = Queue<Completer<HostFormEditor>>();
  Completer<void>? pendingReadStarted;
  final readActors = <String?>[];
  Completer<void>? pendingSave;
  int saves = 0;
  int reads = 0;
  int serverRevision = 2;
  String? serverTargetId;

  @override
  Future<HostFormEditor> getEditor({
    required String organizerId,
    required String formId,
  }) async {
    reads++;
    readActors.add(actor?.call());
    if (pendingReads.isNotEmpty) {
      final started = pendingReadStarted;
      if (started != null && !started.isCompleted) started.complete();
      return pendingReads.removeFirst().future;
    }
    return _editor(
      targetId: actor?.call() == 'host-two' ? 'event-two' : serverTargetId,
      draftRevision: serverRevision,
    );
  }

  @override
  Future<HostFormEditor> updateDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
    required HostFormDefinition definition,
  }) async {
    saves++;
    if (pendingSave case final pending?) await pending.future;
    if (expectedRevision != serverRevision) {
      throw StateError('Stale draft revision');
    }
    serverRevision++;
    serverTargetId = definition.defaultTargetId;
    return _editor(targetId: serverTargetId, draftRevision: serverRevision);
  }
}

class _PickerNotifier extends HostFormEditorController {
  int _reads = 0;
  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      throw UnimplementedError();

  @override
  Future<HostOfferEventTargetPage> listTargetEvents({String? cursor}) async {
    _reads++;
    return HostOfferEventTargetPage([_event('event-two')], null);
  }
}

HostFormEditor _editor({String? targetId, int draftRevision = 2}) =>
    HostFormEditor(
      form: HostFormSummary.fromMap({
        ..._summary,
        'draftRevision': draftRevision,
      }),
      definition: HostFormDefinition.fromMap({
        ..._definition,
        'defaultTargetKind': targetId == null ? 'organizer' : 'event',
        'defaultTargetId': targetId,
      }),
      validationIssues: const [],
    );

HostOfferEventTarget _event(String id) => HostOfferEventTarget(
  eventId: id,
  name: 'Event $id',
  startTime: DateTime(2026, 12),
  timezone: 'Asia/Kolkata',
  publicationState: 'private',
  setupRevision: 1,
);

const _definition = <String, Object?>{
  'title': 'Community intake',
  'description': null,
  'purpose': 'application',
  'identityPolicy': 'phoneVerified',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'sections': <Object?>[],
  'logicRules': <Object?>[],
  'appearance': {'preset': 'minimal'},
  'availability': <String, Object?>{},
  'consent': {
    'consentCopy': 'I consent.',
    'consentVersion': 'v1',
    'retentionCopy': 'Retained for this purpose.',
  },
  'completion': {'title': 'Thanks', 'actionKind': 'none'},
};

const _summary = <String, Object?>{
  'organizerId': 'org',
  'formId': 'form',
  'title': 'Community intake',
  'description': null,
  'purpose': 'application',
  'status': 'published',
  'templateId': 'community_application',
  'publicFormId': 'public-form',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'activeVersionId': 'version-one',
  'draftRevision': 2,
  'publishedVersion': 1,
  'submittedResponseCount': 0,
  'consequences': {
    'coverage': 'exact',
    'identityPolicy': 'phoneVerified',
    'enabledAutomationActionKinds': <Object?>[],
  },
  'updatedAtMillis': 1,
  'publishedAtMillis': 1,
  'lastResponseAtMillis': null,
};
