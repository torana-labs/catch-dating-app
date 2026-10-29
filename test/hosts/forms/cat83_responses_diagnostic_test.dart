// CAT-83 regression: count actual repository reads through the shipped
// controller while keeping account, version, and stale-result fences intact.
import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../clubs/clubs_test_helpers.dart';
import '../../test_pump_helpers.dart';

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  test(
    'generated equal-request family shares one actual initial read',
    () async {
      final repo = _Repository(_Auth('A'));
      final container = ProviderContainer(
        overrides: [hostFormsRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      const request = HostFormResponseListRequest(
        organizerId: 'org',
        includeApplications: true,
      );
      const equalRequest = HostFormResponseListRequest(
        organizerId: 'org',
        includeApplications: true,
      );
      final first = hostFormResponsesControllerProvider(request);
      final second = hostFormResponsesControllerProvider(equalRequest);
      expect(first, second);
      container.listen(first, (_, _) {});
      container.listen(second, (_, _) {});
      expect(repo.calls, hasLength(1));
      final result = container.read(first.future);
      repo.complete(0, 'family-control');
      await result;
      expect(
        container.read(second).requireValue.responses.single.responseId,
        'family-control',
      );
      repo.report('family-control');
    },
  );

  testWidgets('real cold Responses mount starts one unresolved read', (
    tester,
  ) async {
    final h = await _Harness.mount(tester);
    expect(h.repo.calls, hasLength(1));
    expect(h.repo.calls.every((c) => !c.result.isCompleted), isTrue);
    h.repo.complete(0, 'current-read');
    await _frames(tester);
    expect(find.text('current-read'), findsOneWidget);
    expect(h.repo.calls, hasLength(1));
    h.repo.report('cold-unfiltered');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'same account rebuild is stable; warm remount forces one fresh read',
    (tester) async {
      final h = await _Harness.mount(tester, automatic: true);
      expect(h.repo.calls, hasLength(1));
      final count = h.repo.calls.length;
      h.rebuild();
      h.actors.add('A');
      await _frames(tester);
      expect(h.repo.calls, hasLength(count));
      final keeper = h.container.listen(
        hostFormResponsesControllerProvider(h.repo.calls.last.request),
        (_, _) {},
      );
      h.visible = false;
      h.rebuild();
      await _frames(tester);
      h.visible = true;
      h.rebuild();
      await _frames(tester);
      expect(h.repo.calls, hasLength(count + 1));
      expect(
        identical(
          h.repo.calls.first.request.accountMountKey,
          h.repo.calls.last.request.accountMountKey,
        ),
        isFalse,
      );
      keeper.close();
      h.repo.report('same-account-rebuild-and-warm-remount');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('same-account remount refreshes a retained unresolved request', (
    tester,
  ) async {
    final h = await _Harness.mount(tester);
    expect(h.repo.calls, hasLength(1));
    final keeper = h.container.listen(
      hostFormResponsesControllerProvider(h.repo.calls.single.request),
      (_, _) {},
    );
    h.visible = false;
    h.rebuild();
    await _frames(tester);
    h.visible = true;
    h.rebuild();
    await _frames(tester);
    h.repo.report('unresolved-same-account-remount');
    expect(h.repo.calls, hasLength(2));
    expect(
      identical(
        h.repo.calls.first.request.accountMountKey,
        h.repo.calls.last.request.accountMountKey,
      ),
      isFalse,
    );
    h.repo.complete(0, 'pre-remount-row');
    await _frames(tester);
    expect(find.text('pre-remount-row'), findsNothing);
    h.repo.complete(1, 'fresh-remount-row');
    await _frames(tester);
    expect(find.text('fresh-remount-row'), findsOneWidget);
    keeper.close();
    expect(tester.takeException(), isNull);
  });

  testWidgets('builder-style keyed A-B-A rejects retained unresolved A', (
    tester,
  ) async {
    final h = await _Harness.mount(tester, fullScreen: false, formId: 'form');
    expect(h.repo.calls.map((c) => c.actor), ['A']);
    final keeper = h.container.listen(
      hostFormResponsesControllerProvider(h.repo.calls.single.request),
      (_, _) {},
    );
    h.switchActor('B');
    await _frames(tester);
    h.switchActor('A');
    await _frames(tester);
    h.repo.report('builder-style-retained-ABA');
    expect(h.repo.calls.map((c) => c.actor), ['A', 'B', 'A']);
    expect(
      identical(
        h.repo.calls.first.request.accountMountKey,
        h.repo.calls.last.request.accountMountKey,
      ),
      isFalse,
    );
    h.repo.complete(0, 'obsolete-original-A');
    h.repo.complete(1, 'obsolete-B');
    await _frames(tester);
    expect(find.text('obsolete-original-A'), findsNothing);
    expect(find.text('obsolete-B'), findsNothing);
    h.repo.complete(2, 'fresh-returned-A');
    await _frames(tester);
    expect(find.text('fresh-returned-A'), findsOneWidget);
    keeper.close();
    expect(tester.takeException(), isNull);
  });

  for (final failOld in [false, true]) {
    testWidgets(
      'unresolved account A-B-A rejects old results; failure=$failOld',
      (tester) async {
        final h = await _Harness.mount(tester);
        expect(h.repo.calls.map((c) => c.actor), ['A']);
        h.switchActor('B');
        await _frames(tester);
        final bCalls = h.repo.calls.where((c) => c.actor == 'B').toList();
        expect(bCalls, isNotEmpty);
        final beforeReturn = h.repo.calls.length;
        h.switchActor('A');
        await _frames(tester);
        expect(h.repo.calls.length, greaterThan(beforeReturn));
        expect(h.repo.calls.last.actor, 'A');
        expect(h.repo.calls.map((c) => c.request.accountUid), ['A', 'B', 'A']);
        expect(h.repo.calls.map((c) => c.request.accountGeneration), [0, 1, 2]);
        final current = h.repo.calls.length - 1;
        for (var i = 0; i < current; i++) {
          if (failOld) {
            h.repo.calls[i].result.completeError(StateError('obsolete-$i'));
          } else {
            h.repo.complete(i, 'obsolete-$i');
          }
        }
        await _frames(tester);
        for (var i = 0; i < current; i++) {
          expect(find.text('obsolete-$i'), findsNothing);
        }
        h.repo.complete(current, 'fresh-returned-A');
        await _frames(tester);
        expect(find.text('fresh-returned-A'), findsOneWidget);
        for (var i = 0; i < current; i++) {
          expect(find.text('obsolete-$i'), findsNothing);
        }
        h.repo.report('unresolved-account-ABA-failure-$failOld');
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'loaded old-account rows vanish before the new actor read settles',
    (tester) async {
      final h = await _Harness.mount(tester, automatic: true);
      final oldLabel = h.repo.calls.last.label!;
      expect(find.text(oldLabel), findsOneWidget);
      h.repo.automatic = false;
      // Live FirebaseAuth changes before the uid stream catches up.
      h.auth.uid = 'B';
      h.rebuild();
      await tester.pump();
      expect(find.text(oldLabel), findsNothing);
      h.switchActor('B');
      await _frames(tester);
      expect(find.text(oldLabel), findsNothing);
      expect(h.repo.calls.last.actor, 'B');
      h.repo.complete(h.repo.calls.length - 1, 'new-account-row');
      await _frames(tester);
      expect(find.text('new-account-row'), findsOneWidget);
      expect(find.text(oldLabel), findsNothing);
      h.repo.report('old-account-row-exclusion');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('selected form cold mount resolves version with two reads', (
    tester,
  ) async {
    final h = await _Harness.mount(
      tester,
      formId: 'form',
      automatic: true,
      versions: true,
    );
    expect(h.repo.calls.map((c) => c.request.formId), ['form', 'form']);
    expect(h.repo.calls.map((c) => c.request.versionId), [null, 'form_v2']);
    expect(
      identical(
        h.repo.calls.first.request.accountMountKey,
        h.repo.calls.last.request.accountMountKey,
      ),
      isTrue,
    );
    expect(h.repo.calls.map((c) => c.request.accountUid), ['A', 'A']);
    expect(h.repo.calls.map((c) => c.request.accountGeneration), [0, 0]);
    h.repo.report('cold-selected-form');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'selected form change and explicit version changes count requests',
    (tester) async {
      final h = await _Harness.mount(
        tester,
        fullScreen: false,
        formId: 'form',
        automatic: true,
        versions: true,
      );
      expect(h.repo.calls.map((c) => c.request.versionId), [null, 'form_v2']);
      final beforeForm = h.repo.calls.length;
      h.formId = 'other';
      h.rebuild();
      await _frames(tester);
      expect(h.repo.calls.skip(beforeForm).map((c) => c.request.formId), [
        'other',
        'other',
      ]);
      expect(h.repo.calls.skip(beforeForm).map((c) => c.request.versionId), [
        null,
        'other_v2',
      ]);
      final beforeSheet = h.repo.calls.length;
      await tester.tap(find.text('Filters'));
      await pumpFeatureUi(tester);
      expect(h.repo.calls, hasLength(beforeSheet));
      final v1 = find.byKey(const ValueKey('response-version-other_v1'));
      await tester.ensureVisible(v1);
      await tester.tap(v1);
      await pumpFeatureUi(tester);
      expect(h.repo.calls.length, beforeSheet + 1);
      expect(h.repo.calls.last.request.versionId, 'other_v1');
      final all = find.byKey(const ValueKey('response-version-'));
      await tester.ensureVisible(all);
      await tester.tap(all);
      await pumpFeatureUi(tester);
      expect(h.repo.calls.length, beforeSheet + 2);
      expect(h.repo.calls.last.request.versionId, isNull);
      expect(
        h.repo.calls.every((c) => c.request.answerFilters.isEmpty),
        isTrue,
      );
      h.repo.report('form-and-explicit-version-transitions');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('required absent account starts zero response requests', (
    tester,
  ) async {
    final h = await _Harness.mount(tester, fullScreen: false, actor: null);
    expect(h.repo.calls, isEmpty);
    h.repo.report('absent-account');
    expect(tester.takeException(), isNull);
  });
}

Future<void> _frames(WidgetTester tester) async {
  for (var frame = 0; frame < 16; frame++) {
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 16));
  }
}

class _Harness {
  _Harness(
    this.auth,
    this.repo,
    this.actors,
    this.container, {
    required this.fullScreen,
    this.formId,
    this.actor,
  });
  final _Auth auth;
  final _Repository repo;
  final StreamController<String?> actors;
  final ProviderContainer container;
  final revision = ValueNotifier(0);
  final bool fullScreen;
  String? formId;
  String? actor;
  bool visible = true;
  void rebuild() => revision.value++;
  void switchActor(String value) {
    actor = value;
    auth.uid = value;
    actors.add(value);
    rebuild();
  }

  static Future<_Harness> mount(
    WidgetTester tester, {
    bool fullScreen = true,
    String? formId,
    String? actor = 'A',
    bool automatic = false,
    bool versions = false,
  }) async {
    await tester.binding.setSurfaceSize(const Size(1200, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final auth = _Auth(actor);
    final repo = _Repository(auth)
      ..automatic = automatic
      ..versions = versions;
    final actors = StreamController<String?>.broadcast(sync: true);
    final container = ProviderContainer(
      overrides: [
        firebaseAuthProvider.overrideWithValue(auth),
        uidProvider.overrideWith((ref) async* {
          yield actor;
          yield* actors.stream;
        }),
        for (final uid in ['A', 'B'])
          hostOperableClubsProvider(uid).overrideWithValue(
            AsyncData([buildClub(id: 'org', ownerUserId: uid)]),
          ),
        hostFormsRepositoryProvider.overrideWithValue(repo),
      ],
    );
    final h = _Harness(
      auth,
      repo,
      actors,
      container,
      fullScreen: fullScreen,
      formId: formId,
      actor: actor,
    );
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      container.dispose();
      await actors.close();
      h.revision.dispose();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: ValueListenableBuilder<int>(
            valueListenable: h.revision,
            builder: (_, _, _) => !h.visible
                ? const SizedBox.shrink()
                : h.fullScreen
                ? HostFormsScreen(
                    initialResponses: true,
                    initialOrganizerId: 'org',
                    initialFormId: h.formId,
                  )
                : Scaffold(
                    body: CustomScrollView(
                      slivers: [
                        HostFormResponsesSection(
                          // HostFormBuilderScreen also keys the panel by actor.
                          key: ValueKey('form-responses-${h.actor}'),
                          organizerId: 'org',
                          accountId: h.actor,
                          requireAccount: true,
                          formId: h.formId,
                          showFormContext: false,
                        ),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
    await _frames(tester);
    return h;
  }
}

class _Call {
  _Call(this.actor, this.request);
  final String? actor;
  final HostFormResponseListRequest request;
  final result = Completer<HostFormResponsePage>();
  String? label;
}

class _Repository extends Fake implements HostFormsRepository {
  _Repository(this.auth);
  final _Auth auth;
  final calls = <_Call>[];
  bool automatic = false;
  bool versions = false;
  @override
  Future<HostFormPage> listForms(HostFormListRequest request) async =>
      HostFormPage(
        organizerId: request.organizerId,
        items: const [],
        nextCursor: null,
      );
  @override
  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest request,
  ) {
    final call = _Call(auth.uid, request);
    calls.add(call);
    if (automatic) {
      complete(calls.length - 1, '${auth.uid}-read-${calls.length}');
    }
    return call.result.future;
  }

  void complete(int index, String label) {
    final call = calls[index];
    call.label = label;
    final form = call.request.formId ?? 'form';
    final row = HostFormResponseSummary(
      responseId: label,
      formId: form,
      formTitle: 'Diagnostic form',
      versionId: call.request.versionId ?? '${form}_v2',
      version: 2,
      status: HostFormResponseStatus.submitted,
      identityKind: HostFormResponseIdentityKind.catchAccount,
      identity: HostFormResponseIdentity(
        displayName: label,
        email: null,
        phoneE164: null,
        origin: HostFormDataOrigin.respondentGranted,
      ),
      sourceLinkId: null,
      sourceLabel: null,
      submittedAt: DateTime.utc(2026, 10, 20),
      withdrawnAt: null,
      highlights: const [],
      conversionKinds: const {},
    );
    call.result.complete(
      HostFormResponsePage(
        organizerId: call.request.organizerId,
        items: [row],
        nextCursor: null,
        versionScope: versions && call.request.formId != null
            ? HostFormResponseVersionScope(
                activeVersionId: '${form}_v2',
                publishedVersion: 2,
              )
            : null,
      ),
    );
  }

  void report(String scenario) {
    // Machine-readable evidence counts actual repository invocations. No provider
    // controller is overridden; no Firebase service is contacted.
    // ignore: avoid_print
    print(
      'CAT83 ${jsonEncode({
        'scenario': scenario,
        'count': calls.length,
        'requests': calls.map((c) => {'actor': c.actor, 'accountUid': c.request.accountUid, 'accountGeneration': c.request.accountGeneration, 'organizer': c.request.organizerId, 'form': c.request.formId, 'version': c.request.versionId, 'cursor': c.request.cursor, 'includeApplications': c.request.includeApplications, 'label': c.label}).toList(),
      })}',
    );
  }
}

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
