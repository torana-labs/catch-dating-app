import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_settings_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  test(
    'pending target edit never saves under the next signed-in manager',
    () async {
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      final auth = _Auth('host-one');
      final repository = _TargetRepository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          hostFormsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final accountSubscription = container.listen(uidProvider, (_, _) {});
      addTearDown(accountSubscription.close);
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
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        'event-one',
      );

      auth.uid = 'host-two';
      expect(await notifier.saveNow(), isFalse);
      accounts.add('host-two');
      await container.pump();
      await container.read(provider.future);
      expect(repository.saves, 0);
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        isNull,
      );
    },
  );

  test(
    'old manager save response cannot restore target after account switch',
    () async {
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      final auth = _Auth('host-one');
      final pendingSave = Completer<void>();
      final repository = _TargetRepository()..pendingSave = pendingSave;
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          hostFormsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final accountSubscription = container.listen(uidProvider, (_, _) {});
      addTearDown(accountSubscription.close);
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
      final save = notifier.saveNow();
      await flushTestEventQueue();
      expect(repository.saves, 1);

      auth.uid = 'host-two';
      accounts.add('host-two');
      await container.pump();
      pendingSave.complete();
      expect(await save, isFalse);
      await container.read(provider.future);
      expect(repository.reads, greaterThanOrEqualTo(2));
      expect(
        container.read(provider).requireValue.editor.definition.defaultTargetId,
        isNull,
      );
    },
  );

  testWidgets('event picker discards old manager results and edits only the '
      'new manager selection', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _Auth('host-one');
    final editor = _Editor();
    final firstPage = Completer<HostOfferEventTargetPage>();
    editor._firstPage = firstPage;
    final provider = hostFormEditorControllerProvider('org', 'form');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          provider.overrideWith(() => editor),
          hostFormPaymentControllerProvider(
            'org',
          ).overrideWith(_PaymentSetup.new),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: Consumer(
                builder: (context, ref, _) {
                  final state = ref.watch(provider).asData?.value;
                  final uid = ref.watch(uidProvider).asData?.value;
                  if (state == null || uid == null) {
                    return const CircularProgressIndicator();
                  }
                  return HostFormSettingsSectionList(
                    organizerId: 'org',
                    definition: state.editor.definition,
                    notifier: ref.read(provider.notifier),
                    accountId: uid,
                    enableEventTargetSettings: true,
                    hasPublishedVersion: true,
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
    accounts.add('host-one');
    await pumpFeatureUi(tester);
    final choose = find.byKey(const ValueKey('host-form-target-choose-event'));
    await tester.ensureVisible(choose);
    await tester.tap(choose);
    await tester.pump();

    auth.uid = 'host-two';
    accounts.add('host-two');
    firstPage.complete(HostOfferEventTargetPage([_event('old-event')], null));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('host-form-target-event-old-event')),
      findsNothing,
    );

    await tester.ensureVisible(choose);
    await tester.tap(choose);
    await pumpFeatureUi(tester);
    final current = find.byKey(
      const ValueKey('host-form-target-event-new-event'),
    );
    await tester.ensureVisible(current);
    await tester.tap(current);
    await pumpFeatureUi(tester);
    expect(editor._writes, ['host-two/new-event']);
    expect(
      editor.state.requireValue.editor.definition.defaultTargetId,
      'new-event',
    );
    expect(find.textContaining('Changes to a published form'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test(
    'event target survives draft serialization and changes only explicitly',
    () {
      final reusable = HostFormDefinition.fromMap(const {
        'title': 'Community intake',
        'defaultTargetKind': 'organizer',
        'defaultTargetId': null,
        'futurePolicy': {'scope': 'organizer'},
      });
      final fixed = reusable.withTarget(
        kind: HostFormTargetKind.event,
        eventId: 'event-one',
      );
      final reopened = HostFormDefinition.fromMap(fixed.toJson());
      expect(reopened.defaultTargetKind, HostFormTargetKind.event);
      expect(reopened.defaultTargetId, 'event-one');
      expect(reopened.toJson()['futurePolicy'], {'scope': 'organizer'});
      expect(
        reopened.withTarget(
          kind: HostFormTargetKind.event,
          eventId: 'event-one',
        ),
        same(reopened),
      );
      expect(reopened.copyWith(title: 'Updated').defaultTargetId, 'event-one');
      final reset = reopened.withTarget(kind: HostFormTargetKind.organizer);
      expect(reset.defaultTargetKind, HostFormTargetKind.organizer);
      expect(reset.defaultTargetId, isNull);
      expect(
        () => reusable.withTarget(kind: HostFormTargetKind.event),
        throwsArgumentError,
      );

      final legacyCampaign = HostFormDefinition.fromMap(const {
        'defaultTargetKind': 'campaign',
        'defaultTargetId': 'campaign-one',
      });
      expect(
        legacyCampaign.copyWith(title: 'Edited').defaultTargetId,
        'campaign-one',
      );
    },
  );

  test(
    'picker pages preserve a linked event until absence is authoritative',
    () async {
      final cursors = <String?>[];
      final controller = HostFormTargetController(
        organizerId: 'org',
        accountId: 'host-one',
        currentAccountId: () => 'host-one',
        loadPage: ({required organizerId, cursor}) async {
          expect(organizerId, 'org');
          cursors.add(cursor);
          return cursor == null
              ? HostOfferEventTargetPage([_event('event-one')], 'next')
              : HostOfferEventTargetPage([_event('event-two')], null);
        },
      );
      addTearDown(controller.dispose);
      await controller.refresh();
      expect(controller.events.map((event) => event.eventId), ['event-one']);
      expect(controller.bindingUnavailable('old-bound-event'), isFalse);
      await controller.loadMore();
      expect(cursors, [null, 'next']);
      expect(controller.event('event-two')?.name, 'Event event-two');
      expect(controller.bindingUnavailable('old-bound-event'), isTrue);
    },
  );

  test('late old-account targets cannot appear or become selectable', () async {
    var accountId = 'host-one';
    final latePage = Completer<HostOfferEventTargetPage>();
    final controller = HostFormTargetController(
      organizerId: 'org',
      accountId: 'host-one',
      currentAccountId: () => accountId,
      loadPage: ({required organizerId, cursor}) => latePage.future,
    );
    addTearDown(controller.dispose);
    final load = controller.refresh();
    accountId = 'host-two';
    latePage.complete(HostOfferEventTargetPage([_event('old-event')], null));
    await load;
    expect(controller.events, isEmpty);
    expect(controller.isCurrentAccount, isFalse);
    expect(controller.event('old-event'), isNull);
  });

  test(
    'failed manager read shows error and retry discards stale page',
    () async {
      var fail = false;
      final controller = HostFormTargetController(
        organizerId: 'org',
        accountId: 'host-one',
        currentAccountId: () => 'host-one',
        loadPage: ({required organizerId, cursor}) async {
          if (fail) throw StateError('Manager read failed');
          return HostOfferEventTargetPage([_event('event-one')], null);
        },
      );
      addTearDown(controller.dispose);
      await controller.refresh();
      fail = true;
      await controller.refresh();
      expect(controller.events, isEmpty);
      expect(controller.hasLoadFailure, isTrue);
      fail = false;
      await controller.refresh();
      expect(controller.hasLoadFailure, isFalse);
      expect(controller.event('event-one'), isNotNull);
    },
  );

  test(
    'repeating target cursor fails closed without duplicate pagination',
    () async {
      final controller = HostFormTargetController(
        organizerId: 'org',
        accountId: 'host-one',
        currentAccountId: () => 'host-one',
        loadPage: ({required organizerId, cursor}) async => cursor == null
            ? HostOfferEventTargetPage([_event('event-one')], 'repeat')
            : HostOfferEventTargetPage([_event('event-two')], 'repeat'),
      );
      addTearDown(controller.dispose);
      await controller.refresh();
      await controller.loadMore();
      expect(controller.hasLoadFailure, isTrue);
      expect(controller.events.map((event) => event.eventId), ['event-one']);
    },
  );
}

HostOfferEventTarget _event(String id) => HostOfferEventTarget(
  eventId: id,
  name: 'Event $id',
  startTime: DateTime(2026, 12),
  timezone: 'Asia/Kolkata',
  publicationState: 'private',
  setupRevision: 1,
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

class _PaymentSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: false, connections: []),
      );
}

class _Editor extends HostFormEditorController {
  Completer<HostOfferEventTargetPage>? _firstPage;
  final _writes = <String>[];

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      HostFormEditorState(
        editor: HostFormEditor(
          form: HostFormSummary.fromMap(_summary),
          definition: HostFormDefinition.fromMap(_definition),
          validationIssues: const [],
        ),
      );

  @override
  Future<HostOfferEventTargetPage> listTargetEvents({String? cursor}) {
    if (_firstPage case final pending?) {
      _firstPage = null;
      return pending.future;
    }
    return Future.value(HostOfferEventTargetPage([_event('new-event')], null));
  }

  @override
  void updateTarget({
    required HostFormTargetKind kind,
    required String accountId,
    String? eventId,
  }) {
    _writes.add('$accountId/$eventId');
    final current = state.requireValue;
    state = AsyncData(
      current.copyWith(
        editor: current.editor.copyWith(
          definition: current.editor.definition.withTarget(
            kind: kind,
            eventId: eventId,
          ),
        ),
      ),
    );
  }
}

class _TargetRepository extends Fake implements HostFormsRepository {
  int saves = 0;
  int reads = 0;
  Completer<void>? pendingSave;

  @override
  Future<HostFormEditor> getEditor({
    required String organizerId,
    required String formId,
  }) async {
    reads++;
    return HostFormEditor(
      form: HostFormSummary.fromMap(_summary),
      definition: HostFormDefinition.fromMap(_definition),
      validationIssues: const [],
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
    return HostFormEditor(
      form: HostFormSummary.fromMap(_summary),
      definition: definition,
      validationIssues: const [],
    );
  }
}

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
