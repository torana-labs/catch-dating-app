import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/hosts/organizer/tracking/host_tracking_settings_controller.dart';
import 'package:catch_dating_app/hosts/organizer/tracking/host_tracking_settings_input_section.dart';
import 'package:catch_dating_app/hosts/organizer/tracking/host_tracking_settings_section.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final disabled = <String, Object?>{
    'organizerId': 'organizer-a',
    'revision': 7,
    'metaPixelId': null,
    'googleMeasurementId': null,
    'enabled': false,
    'publicationAllowed': false,
    'policyReason': 'policyReviewRequired',
    'canEdit': true,
    'editBlockedReason': 'none',
  };
  test(
    'Private settings reject cross-organiser and policy-enabled responses',
    () {
      expect(
        () => HostTrackingSettings.fromResponse(disabled, 'organizer-b'),
        throwsFormatException,
      );
      expect(
        () => HostTrackingSettings.fromResponse({
          ...disabled,
          'enabled': true,
        }, 'organizer-a'),
        throwsFormatException,
      );
      expect(
        () => HostTrackingSettings.fromResponse({
          ...disabled,
          'publicationAllowed': true,
        }, 'organizer-a'),
        throwsFormatException,
      );
      final current = HostTrackingSettings.fromResponse(
        disabled,
        'organizer-a',
      );
      expect(current.revision, 7);
      expect(current.enabled, isFalse);
      expect(current.canEdit, isTrue);
    },
  );
  test('the stored document reads with defaults and the policy kept off', () {
    final never = HostTrackingSettings.fromDocument(
      null,
      'organizer-a',
      canEdit: false,
    );
    expect(never.revision, 0);
    expect(never.metaPixelId, isNull);
    expect(never.canEdit, isFalse);
    expect(never.editBlockedReason, 'unclaimed');
    final stored = HostTrackingSettings.fromDocument(
      {
        'organizerId': 'organizer-a',
        'revision': 3,
        'metaPixelId': '123456',
        'googleMeasurementId': 'G-ABCD1234',
        'enabled': false,
        'updatedByUid': 'manager',
        'updatedAtMillis': 1,
      },
      'organizer-a',
      canEdit: true,
    );
    expect(stored.revision, 3);
    expect(stored.metaPixelId, '123456');
    expect(stored.googleMeasurementId, 'G-ABCD1234');
    expect(stored.enabled, isFalse);
    expect(stored.editBlockedReason, 'none');
    expect(
      () => HostTrackingSettings.fromDocument(
        {'organizerId': 'organizer-b', 'revision': 1},
        'organizer-a',
        canEdit: true,
      ),
      throwsFormatException,
    );
    expect(
      () => HostTrackingSettings.fromDocument(
        {'organizerId': 'organizer-a', 'revision': 1, 'metaPixelId': 'x'},
        'organizer-a',
        canEdit: true,
      ),
      throwsFormatException,
    );
  });

  test('editing follows the organizer as the server decides it', () {
    final firstParty = _organizer();
    expect(organizerTrackingEditable(firstParty), isTrue);
    expect(
      organizerTrackingEditable(
        firstParty.copyWith(
          ownership: OrganizerOwnership.fromJson(const {'state': 'claimed'}),
        ),
      ),
      isFalse,
    );
    expect(
      organizerTrackingEditable(
        firstParty.copyWith(
          ownership: OrganizerOwnership.fromJson(const {'state': 'claimed'}),
          claim: OrganizerClaim.fromJson(const {'state': 'verified'}),
        ),
      ),
      isTrue,
    );
    expect(
      organizerTrackingEditable(firstParty.copyWith(archived: true)),
      isFalse,
    );
    expect(
      organizerTrackingEditable(
        firstParty.copyWith(
          claim: OrganizerClaim.fromJson(const {'state': 'suppressed'}),
        ),
      ),
      isFalse,
    );
    expect(
      organizerTrackingEditable(firstParty.copyWith(ownerUserId: null)),
      isFalse,
    );
  });

  test(
    'Settings saves retain displayed revision and explicit null IDs',
    () async {
      final repository = _RecordingTrackingRepository();
      final current = HostTrackingSettings.fromResponse(
        disabled,
        'organizer-a',
      );
      final container = _container(repository);
      addTearDown(container.dispose);
      container.listen(hostTrackingSettingsControllerProvider, (_, _) {});
      await container
          .read(hostTrackingSettingsControllerProvider)
          .save(
            scope: _scope(container, 'account-a', 'organizer-a'),
            current: current,
            metaPixelId: null,
            googleMeasurementId: null,
            enabled: false,
          );
      expect(repository.request!.toJson(), {
        'organizerId': 'organizer-a',
        'expectedRevision': 7,
        'metaPixelId': null,
        'googleMeasurementId': null,
        'enabled': false,
      });
      expect(current.revision, 7);
    },
  );
  test(
    'save errors and pending state are account and organizer scoped',
    () async {
      final repository = _RecordingTrackingRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final ax = _scope(container, 'account-a', 'organizer-a');
      final ay = _scope(container, 'account-a', 'organizer-b');
      final bx = _scope(container, 'account-b', 'organizer-a');
      final mutation = HostTrackingSettingsController.saveMutation;
      container.listen(mutation(ax), (_, _) {});
      container.listen(mutation(ay), (_, _) {});
      container.listen(mutation(bx), (_, _) {});
      final completion = Completer<HostTrackingSettings>();
      final pending = mutation(ax).run(container, (_) => completion.future);
      final failure = expectLater(pending, throwsStateError);
      expect(container.read(mutation(ax)), isA<MutationPending>());
      expect(container.read(mutation(ay)), isA<MutationIdle>());
      expect(container.read(mutation(bx)), isA<MutationIdle>());
      completion.completeError(StateError('old account error'));
      await failure;
      expect(container.read(mutation(ax)), isA<MutationError>());
      expect(container.read(mutation(ay)), isA<MutationIdle>());
      expect(container.read(mutation(bx)), isA<MutationIdle>());
    },
  );

  test('stale account or organizer cannot issue a save', () async {
    final repository = _RecordingTrackingRepository();
    final container = _container(repository);
    addTearDown(container.dispose);
    container.listen(hostTrackingSettingsControllerProvider, (_, _) {});
    final controller = container.read(hostTrackingSettingsControllerProvider);
    for (final scope in [
      _scope(container, 'account-b', 'organizer-a'),
      _scope(container, 'account-a', 'organizer-b'),
    ]) {
      await expectLater(
        controller.save(
          scope: scope,
          current: HostTrackingSettings.fromResponse(disabled, 'organizer-a'),
          metaPixelId: null,
          googleMeasurementId: null,
          enabled: false,
        ),
        throwsA(isA<SignInRequiredException>()),
      );
    }
    expect(repository.writes, 0);
  });

  testWidgets('account changes reset drafts and fence late saves and reentry', (
    tester,
  ) async {
    final repository = _RecordingTrackingRepository();
    final accounts = StreamController<String?>();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => accounts.stream),
        hostTrackingSettingsRepositoryProvider.overrideWithValue(repository),
        _organizerOverride,
      ],
    );
    addTearDown(accounts.close);
    addTearDown(container.dispose);
    Future<void> pump() => pumpFeatureUi(tester);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const Scaffold(
            body: SingleChildScrollView(
              child: HostTrackingSettingsSection(organizerId: 'organizer-a'),
            ),
          ),
        ),
      ),
    );
    expect(repository.reads, 0);
    accounts.add('account-a');
    await pump();
    final oldScope = _scope(container, 'account-a', 'organizer-a');
    var editor = tester.widget<HostTrackingSettingsInputSection>(
      find.byType(HostTrackingSettingsInputSection),
    );
    tester
            .widget<CatchField<dynamic>>(
              find.byKey(const ValueKey('host-tracking-meta-id')),
            )
            .controller!
            .text =
        '123456';
    repository.pending = Completer<HostTrackingSettings>();
    final oldSave = editor.onSave(
      metaPixelId: '123456',
      googleMeasurementId: null,
      enabled: false,
    );
    await pumpUntilFound(
      tester,
      find.byWidgetPredicate(
        (widget) =>
            widget is HostTrackingSettingsInputSection && widget.pending,
      ),
    );
    expect(
      tester
          .widget<HostTrackingSettingsInputSection>(
            find.byType(HostTrackingSettingsInputSection),
          )
          .pending,
      isTrue,
    );
    final readForB = repository.pendingRead =
        StreamController<HostTrackingSettings>();
    addTearDown(readForB.close);
    accounts.add('account-b');
    await pumpUntilFound(tester, find.byType(CircularProgressIndicator));
    expect(find.byType(HostTrackingSettingsInputSection), findsNothing);
    readForB.add(_settings('organizer-a'));
    repository.pendingRead = null;
    await pump();
    editor = tester.widget<HostTrackingSettingsInputSection>(
      find.byType(HostTrackingSettingsInputSection),
    );
    expect(editor.pending, isFalse);
    expect(editor.error, isNull);
    expect(
      tester
          .widget<CatchField<dynamic>>(
            find.byKey(const ValueKey('host-tracking-meta-id')),
          )
          .controller!
          .text,
      isEmpty,
    );
    final readsForB = repository.reads;
    repository.pending!.complete(_settings('organizer-a', revision: 8));
    await oldSave;
    await pump();
    expect(repository.reads, readsForB);
    expect(
      tester
          .widget<HostTrackingSettingsInputSection>(
            find.byType(HostTrackingSettingsInputSection),
          )
          .error,
      isNull,
    );
    accounts.add(null);
    await pump();
    expect(find.byType(HostTrackingSettingsInputSection), findsNothing);
    accounts.add('account-a');
    await pump();
    final newScope = _scope(container, 'account-a', 'organizer-a');
    expect(newScope.session, isNot(same(oldScope.session)));
    expect(
      container.read(HostTrackingSettingsController.saveMutation(newScope)),
      isA<MutationIdle>(),
    );
    expect(
      tester
          .widget<CatchField<dynamic>>(
            find.byKey(const ValueKey('host-tracking-meta-id')),
          )
          .controller!
          .text,
      isEmpty,
    );
    // A new session with the same account must also fence the previous pending save.
    editor = tester.widget<HostTrackingSettingsInputSection>(
      find.byType(HostTrackingSettingsInputSection),
    );
    repository.pending = Completer<HostTrackingSettings>();
    final beforeSignOut = editor.onSave(
      metaPixelId: '987654',
      googleMeasurementId: null,
      enabled: false,
    );
    await pumpUntilFound(
      tester,
      find.byWidgetPredicate(
        (widget) =>
            widget is HostTrackingSettingsInputSection && widget.pending,
      ),
    );
    accounts.add(null);
    await pump();
    accounts.add('account-a');
    await pump();
    final reenteredScope = _scope(container, 'account-a', 'organizer-a');
    expect(reenteredScope.session, isNot(same(newScope.session)));
    final readsAfterReentry = repository.reads;
    repository.pending!.completeError(StateError('expired session save'));
    await beforeSignOut;
    await pump();
    expect(repository.reads, readsAfterReentry);
    editor = tester.widget<HostTrackingSettingsInputSection>(
      find.byType(HostTrackingSettingsInputSection),
    );
    expect(editor.pending, isFalse);
    expect(editor.error, isNull);
    expect(
      container.read(
        HostTrackingSettingsController.saveMutation(reenteredScope),
      ),
      isA<MutationIdle>(),
    );
    await tester.pumpWidget(const SizedBox());
  });

  test(
    'private reads require settled auth and discard old session results',
    () async {
      final repository = _RecordingTrackingRepository();
      final accounts = StreamController<String?>();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          hostTrackingSettingsRepositoryProvider.overrideWithValue(repository),
          _organizerOverride,
        ],
      );
      addTearDown(accounts.close);
      addTearDown(container.dispose);
      container.listen(hostTrackingSettingsProvider('organizer-a'), (_, _) {});
      accounts.add(null);
      await flushTestEventQueue();
      await container.pump();
      await expectLater(
        container.read(hostTrackingSettingsProvider('organizer-a').future),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(repository.reads, 0);
      final read = repository.pendingRead =
          StreamController<HostTrackingSettings>();
      addTearDown(read.close);
      accounts.add('account-a');
      await flushTestEventQueue();
      await container.pump();
      accounts.add(null);
      await flushTestEventQueue();
      await container.pump();
      read.add(_settings('organizer-a', revision: 99));
      await container.pump();
      expect(
        container.read(hostTrackingSettingsProvider('organizer-a')).asData,
        isNull,
      );
    },
  );

  // Carried from the retired organiser workspace test library.
  for (final canEdit in [true, false]) {
    testWidgets('Host tracking policy gate and server eligibility $canEdit', (
      tester,
    ) async {
      var saves = 0;
      String? savedMeta;
      String? savedGoogle;
      bool? savedEnabled;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: HostTrackingSettingsInputSection(
                current: HostTrackingSettings(
                  organizerId: 'settings-owner',
                  revision: 4,
                  metaPixelId: null,
                  googleMeasurementId: null,
                  enabled: false,
                  publicationAllowed: false,
                  canEdit: canEdit,
                  editBlockedReason: canEdit ? 'none' : 'unclaimed',
                ),
                pending: false,
                onReload: () {},
                onSave:
                    ({
                      required metaPixelId,
                      required googleMeasurementId,
                      required enabled,
                    }) async {
                      saves++;
                      savedMeta = metaPixelId;
                      savedGoogle = googleMeasurementId;
                      savedEnabled = enabled;
                    },
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final toggle = tester.widget<CatchField>(
        find.byKey(const ValueKey('host-tracking-enabled')),
      );
      expect(toggle.toggled, isFalse);
      expect(toggle.onToggle, isNull);
      expect(
        find.byKey(const ValueKey('host-tracking-policy-blocked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('host-tracking-unclaimed')),
        canEdit ? findsNothing : findsOneWidget,
      );
      final save = tester.widget<CatchButton>(
        find.byKey(const ValueKey('host-tracking-save')),
      );
      expect(save.onPressed == null, !canEdit);
      if (canEdit) {
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(savedMeta, isNull);
        expect(savedGoogle, isNull);
        expect(savedEnabled, isFalse);
        final meta = find.descendant(
          of: find.byKey(const ValueKey('host-tracking-meta-id')),
          matching: find.byType(EditableText),
        );
        await tester.enterText(meta, '<script>pixel()</script>');
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(
          find.text('Enter a valid provider ID or leave this field blank.'),
          findsOneWidget,
        );
      }
      expect(tester.takeException(), isNull);
    });
  }
}

class _RecordingTrackingRepository implements HostTrackingSettingsRepository {
  SetOrganizerTrackingSettingsCallableRequest? request;
  int writes = 0;
  int reads = 0;
  Completer<HostTrackingSettings>? pending;
  // Each test closes the controller it hands over in a tear-down.
  // ignore: close_sinks
  StreamController<HostTrackingSettings>? pendingRead;
  @override
  Stream<HostTrackingSettings> watch(
    String organizerId, {
    required bool canEdit,
  }) {
    reads++;
    return pendingRead?.stream ?? Stream.value(_settings(organizerId));
  }

  @override
  Future<HostTrackingSettings> save(
    SetOrganizerTrackingSettingsCallableRequest request,
  ) async {
    writes++;
    this.request = request;
    if (pending != null) return pending!.future;
    return HostTrackingSettings(
      organizerId: request.organizerId,
      revision: request.expectedRevision + 1,
      metaPixelId: request.metaPixelId,
      googleMeasurementId: request.googleMeasurementId,
      enabled: false,
      publicationAllowed: false,
      canEdit: true,
      editBlockedReason: 'none',
    );
  }
}

ProviderContainer _container(_RecordingTrackingRepository repository) =>
    ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account-a')),
        hostTrackingSettingsRepositoryProvider.overrideWithValue(repository),
        _organizerOverride,
      ],
    );

Organizer _organizer() => Organizer(
  id: 'organizer-a',
  name: 'Lantern Lane',
  description: 'Quiz nights.',
  location: 'mumbai',
  area: 'Bandra',
  hostUserId: 'account-a',
  ownerUserId: 'account-a',
  createdAt: DateTime(2026),
  ownership: OrganizerOwnership.fromJson(const {'state': 'userCreated'}),
);

final _organizerOverride = watchOrganizerProvider.overrideWith(
  (ref, id) => Stream.value(_organizer().copyWith(id: id)),
);
HostTrackingSettingsScope _scope(
  ProviderContainer container,
  String account,
  String organizer,
) => (
  accountId: account,
  organizerId: organizer,
  session: container.read(authenticatedSessionProvider).asData!.value,
);
HostTrackingSettings _settings(String organizer, {int revision = 7}) =>
    HostTrackingSettings(
      organizerId: organizer,
      revision: revision,
      metaPixelId: null,
      googleMeasurementId: null,
      enabled: false,
      publicationAllowed: false,
      canEdit: true,
      editBlockedReason: 'none',
    );
