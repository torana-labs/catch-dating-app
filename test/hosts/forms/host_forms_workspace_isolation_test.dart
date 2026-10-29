import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../clubs/clubs_test_helpers.dart';
import '../../test_pump_helpers.dart';

// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  testWidgets('initial and same-workspace deep links retain exact filters', (
    tester,
  ) async {
    final h = await _Harness.mount(tester);
    final original = tester.state(find.byType(HostFormsScreen));
    expect(
      h.repo.responseRequests.any(
        (r) =>
            r.organizerId == 'a' &&
            r.formId == 'form-a' &&
            r.contactId == 'contact-a',
      ),
      isTrue,
    );
    h.router.go(_location(form: 'second', contact: 'second-contact'));
    await _frames(tester);
    expect(tester.state(find.byType(HostFormsScreen)), same(original));
    expect(h.panel(tester).formId, 'second');
    expect(h.panel(tester).contactId, 'second-contact');
    expect(h.repo.responseRequests.last.formId, 'second');
    expect(h.repo.responseRequests.last.contactId, 'second-contact');
  });

  testWidgets(
    'explicit valid route wins retained shell choice until shell switches',
    (tester) async {
      final h = await _Harness.mount(
        tester,
        location: _location(org: 'b', form: 'form-b', contact: 'contact-b'),
        retainedOrganizer: 'a',
      );
      final original = tester.state(find.byType(HostFormsScreen));
      expect(h.repo.forms.every((r) => r.organizerId == 'b'), isTrue);
      expect(h.panel(tester).formId, 'form-b');
      expect(
        h.repo.responseRequests.every((r) => r.organizerId == 'b'),
        isTrue,
      );
      h.router.go(_location(form: 'route-form', contact: 'route-contact'));
      await _frames(tester);
      expect(tester.state(find.byType(HostFormsScreen)), same(original));
      expect(h.panel(tester).organizerId, 'a');
      expect(h.panel(tester).formId, 'route-form');
      expect(h.repo.responseRequests.last.contactId, 'route-contact');
      h.select('b');
      await _frames(tester);
      expect(h.panel(tester).organizerId, 'b');
      expect(h.panel(tester).formId, isNull);
      expect(h.panel(tester).contactId, isNull);
    },
  );

  testWidgets(
    'unauthorized initial organizer never lends its IDs to fallback',
    (tester) async {
      final h = await _Harness.mount(
        tester,
        location: _location(org: 'foreign'),
      );
      expect(h.repo.forms.every((r) => r.organizerId == 'a'), isTrue);
      expect(h.repo.responseRequests, isNotEmpty);
      expect(
        h.repo.responseRequests.every(
          (r) =>
              r.organizerId == 'a' && r.formId == null && r.contactId == null,
        ),
        isTrue,
      );
      expect(h.uri.queryParameters['organizerId'], 'a');
      expect(h.uri.queryParameters.containsKey('formId'), isFalse);
      expect(h.uri.queryParameters.containsKey('contactId'), isFalse);
    },
  );

  testWidgets(
    'invalid later route clears IDs even when fallback stays unchanged',
    (tester) async {
      final h = await _Harness.mount(tester);
      final before = h.repo.responseRequests.length;
      h.router.go(
        _location(
          org: 'foreign',
          form: 'foreign-form',
          contact: 'foreign-contact',
        ),
      );
      await _frames(tester);
      expect(h.repo.responseRequests.skip(before), isNotEmpty);
      expect(
        h.repo.responseRequests
            .skip(before)
            .every(
              (r) =>
                  r.organizerId == 'a' &&
                  r.formId == null &&
                  r.contactId == null,
            ),
        isTrue,
      );
      expect(h.panel(tester).formId, isNull);
      expect(h.uri.queryParameters['organizerId'], 'a');
      expect(h.uri.queryParameters.containsKey('contactId'), isFalse);
    },
  );

  for (final returnToA in [false, true]) {
    testWidgets('retained Responses clears before new reads; ABA=$returnToA', (
      tester,
    ) async {
      final h = await _Harness.mount(tester);
      final original = tester.state(find.byType(HostFormsScreen));
      final oldPanel = h.panel(tester);
      final oldSearch = h.header(tester).search!;
      await tester.tap(find.text('Submitted'));
      await _frames(tester);
      oldSearch.onChanged!('private-a-query');
      final before = h.repo.responseRequests.length;
      h.select('b');
      if (returnToA) h.select('a'); // No frame between transitions.
      await _frames(tester);
      await pumpFeatureUiFor(tester, const Duration(seconds: 1));
      await _frames(tester);
      expect(tester.state(find.byType(HostFormsScreen)), same(original));
      final org = returnToA ? 'a' : 'b';
      expect(h.panel(tester).organizerId, org);
      expect(h.panel(tester).key, isNot(oldPanel.key));
      expect(h.repo.responseRequests.skip(before), isNotEmpty);
      expect(
        h.repo.responseRequests
            .skip(before)
            .every(
              (r) =>
                  r.organizerId == org &&
                  r.formId == null &&
                  r.contactId == null &&
                  r.query == null &&
                  r.reviewStatus == null,
            ),
        isTrue,
      );
      expect(h.repo.responseRequests.length - before, lessThanOrEqualTo(3));
      expect(h.repo.forms.last.accountGeneration, returnToA ? 2 : 1);
      expect(h.repo.forms.last.query, isNull);
      expect(h.uri.queryParameters, {
        'view': 'responses',
        'organizerId': org,
        'keep': 'yes',
      });
      final reads = h.repo.responseRequests.length;
      // Invoke callbacks retained by an old sheet/row after the switch.
      oldPanel.onFormChanged!('stale-form');
      oldSearch.onSubmitted!('stale-search');
      await _frames(tester);
      expect(h.repo.responseRequests.length, reads);
      expect(h.panel(tester).formId, isNull);
      expect(tester.takeException(), isNull);
    });
  }

  for (final fails in [false, true]) {
    testWidgets('held B directory cannot replace returned A; failure=$fails', (
      tester,
    ) async {
      final h = await _Harness.mount(
        tester,
        location: _location(view: 'forms'),
      );
      final original = tester.state(find.byType(HostFormsScreen));
      final pending = Completer<HostFormPage>();
      h.repo.heldForms = pending;
      h.repo.heldOrganizer = 'b';
      h.select('b');
      await _frames(tester);
      expect(h.repo.forms.last.organizerId, 'b');
      expect(find.byKey(const ValueKey('host-form-a')), findsNothing);
      h.select('a');
      await _frames(tester);
      expect(tester.state(find.byType(HostFormsScreen)), same(original));
      expect(find.byKey(const ValueKey('host-form-a')), findsOneWidget);
      final reads = h.repo.forms.length;
      if (fails) {
        pending.completeError(StateError('stale-directory-failure'));
      } else {
        pending.complete(_page('b'));
      }
      await _frames(tester);
      expect(h.repo.forms.length, reads);
      expect(h.repo.forms.where((r) => r.organizerId == 'b').length, 1);
      expect(find.byKey(const ValueKey('host-form-a')), findsOneWidget);
      expect(find.byKey(const ValueKey('host-form-b')), findsNothing);
      expect(h.uri.queryParameters['organizerId'], 'a');
      expect(tester.takeException(), isNull);
    });
  }

  for (final fails in [false, true]) {
    testWidgets(
      'held response pages stay outside returned workspace; failure=$fails',
      (tester) async {
        final h = await _Harness.mount(tester);
        final a = Completer<HostFormResponsePage>();
        final b = Completer<HostFormResponsePage>();
        h.repo.heldResponses['a'] = a;
        h.repo.heldResponses['b'] = b;
        h.header(tester).search!.onSubmitted!('held-a');
        await _frames(tester);
        expect(h.repo.responseRequests.last.query, 'held-a');
        h.select('b');
        await _frames(tester);
        final bRequest = h.repo.responseRequests.last;
        expect(bRequest.organizerId, 'b');
        expect(bRequest.formId, isNull);
        expect(bRequest.contactId, isNull);
        final retained = h.container.listen(
          hostFormResponsesControllerProvider(bRequest),
          (_, _) {},
        );
        addTearDown(retained.close);
        h.repo.heldResponses.remove('a');
        h.select('a');
        await _frames(tester);
        final reads = h.repo.responseRequests.length;
        expect(h.panel(tester).organizerId, 'a');
        if (fails) {
          a.completeError(StateError('stale-a-response-failure'));
          b.completeError(StateError('stale-b-response-failure'));
        } else {
          a.complete(_responsePage('a'));
          b.complete(_responsePage('b'));
        }
        await _frames(tester);
        expect(h.repo.responseRequests.length, reads);
        expect(h.panel(tester).formId, isNull);
        expect(find.text('stale-a'), findsNothing);
        expect(find.text('stale-b'), findsNothing);
        expect(find.byType(CatchNotice), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('new route filters survive pending workspace normalization', (
    tester,
  ) async {
    final h = await _Harness.mount(tester);
    h.select('b');
    h.router.go(
      _location(org: 'b', form: 'new-route-form', contact: 'new-route-contact'),
    );
    await _frames(tester);
    expect(h.uri.queryParameters['formId'], 'new-route-form');
    expect(h.panel(tester).formId, 'new-route-form');
    expect(
      h.repo.responseRequests
          .where((r) => r.organizerId == 'b')
          .every(
            (r) =>
                r.formId == 'new-route-form' &&
                r.contactId == 'new-route-contact',
          ),
      isTrue,
    );
  });

  for (final action in ['Archive form', 'Delete draft']) {
    testWidgets('$action requires current confirmation and dispatches once', (
      tester,
    ) async {
      final h = await _Harness.mount(
        tester,
        location: _location(view: 'forms'),
      );
      await _rowAction(tester, action);
      await tester.tap(find.widgetWithText(CatchButton, 'Cancel'));
      await _frames(tester);
      expect(h.repo.mutations, isEmpty);
      await _rowAction(tester, action);
      final confirm = find.descendant(
        of: find.byType(CatchDialog<bool>),
        matching: find.widgetWithText(CatchButton, action),
      );
      expect(confirm, findsOneWidget);
      await tester.tap(confirm);
      await _frames(tester);
      expect(h.repo.mutations, [
        action == 'Archive form' ? 'lifecycle:a' : 'delete:a',
      ]);
      expect(tester.takeException(), isNull);
    });
  }

  for (final action in ['Archive form', 'Delete draft']) {
    for (final change in ['organizerABA', 'actorABA', 'clubsABA', 'liveAuth']) {
      testWidgets('$action confirmation cannot dispatch after $change', (
        tester,
      ) async {
        final h = await _Harness.mount(
          tester,
          location: _location(view: 'forms'),
        );
        await _rowAction(tester, action);
        expect(find.byType(CatchDialog<bool>), findsOneWidget);
        await h.change(tester, change);
        final confirm = find.descendant(
          of: find.byType(CatchDialog<bool>),
          matching: find.widgetWithText(CatchButton, action),
        );
        expect(confirm, findsOneWidget);
        await tester.tap(confirm);
        await _frames(tester);
        expect(h.repo.mutations, isEmpty);
        expect(tester.takeException(), isNull);
      });
    }
  }

  for (final change in ['organizerABA', 'actorABA', 'clubsABA', 'liveAuth']) {
    for (final fails in [false, true]) {
      testWidgets(
        'duplicate completion is fenced after $change; failure=$fails',
        (tester) async {
          final h = await _Harness.mount(
            tester,
            location: _location(view: 'forms'),
          );
          final pending = Completer<HostFormEditor>();
          h.repo.duplicateResult = pending;
          await _rowAction(tester, 'Duplicate form');
          expect(h.repo.mutations, ['duplicate:a']);
          await h.change(tester, change);
          final uri = h.uri;
          final reads = h.repo.forms.length;
          if (fails) {
            pending.completeError(StateError('stale-duplicate-failure'));
          } else {
            pending.complete(_Editor(_form('a', id: 'duplicate')));
          }
          await _frames(tester);
          expect(h.uri, uri);
          expect(h.repo.forms.length, reads);
          expect(find.byType(CatchNotice), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  for (final phase in ['picker', 'confirmation', 'acknowledgment']) {
    for (final change in ['organizerABA', 'actorABA', 'clubsABA', 'liveAuth']) {
      testWidgets('import $phase is fenced after $change', (tester) async {
        final h = await _Harness.mount(tester);
        final pick = Completer<HostRosterTable?>();
        final ack = Completer<HostApplicationImportResult>();
        h.importer.nextPick = pick;
        h.importer.nextAck = ack;
        await tester.tap(find.byKey(const ValueKey('host-responses-import')));
        await _frames(tester);
        if (phase != 'picker') {
          pick.complete(_table);
          await _frames(tester);
          expect(find.byType(CatchSheet), findsOneWidget);
        }
        if (phase == 'acknowledgment') {
          await tester.tap(find.text('Import 1 response'));
          await _frames(tester);
          expect(h.importer.imports, ['a']);
        }
        await h.change(tester, change);
        final uri = h.uri;
        final reads = h.repo.responseRequests.length;
        if (phase == 'picker') {
          pick.complete(_table);
        } else if (phase == 'confirmation') {
          await tester.tap(find.text('Import 1 response'));
        } else {
          ack.complete(_receipt);
        }
        await _frames(tester);
        expect(h.importer.imports, phase == 'acknowledgment' ? ['a'] : isEmpty);
        expect(h.repo.responseRequests.length, reads);
        expect(h.uri, uri);
        expect(find.byType(CatchSheet), findsNothing);
        expect(find.byType(CatchNotice), findsNothing);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'old import failure/finally cannot release a new workspace picker',
    (tester) async {
      final h = await _Harness.mount(tester);
      final oldAck = Completer<HostApplicationImportResult>();
      h.importer.nextAck = oldAck;
      await tester.tap(find.byKey(const ValueKey('host-responses-import')));
      await _frames(tester);
      await tester.tap(find.text('Import 1 response'));
      await _frames(tester);
      h.select('b');
      await _frames(tester);
      final newPick = Completer<HostRosterTable?>();
      h.importer.nextPick = newPick;
      await tester.tap(find.byKey(const ValueKey('host-responses-import')));
      await _frames(tester);
      expect(h.importer.picks, 2);
      oldAck.completeError(StateError('old-import-failure'));
      await _frames(tester);
      expect(h.header(tester).primaryAction!.onPressed, isNull);
      expect(find.byType(CatchNotice), findsNothing);
      newPick.complete(null);
      await _frames(tester);
      expect(h.header(tester).primaryAction!.onPressed, isNotNull);
      expect(h.importer.imports, ['a']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'current import acknowledgment refreshes and clears its filters',
    (tester) async {
      final h = await _Harness.mount(tester);
      await tester.tap(find.byKey(const ValueKey('host-responses-import')));
      await _frames(tester);
      await tester.tap(find.text('Import 1 response'));
      await _frames(tester);
      expect(h.importer.imports, ['a']);
      expect(h.panel(tester).formId, isNull);
      expect(h.panel(tester).contactId, isNull);
      expect(h.repo.responseRequests.last.formId, isNull);
      expect(h.uri.queryParameters.containsKey('formId'), isFalse);
      expect(h.header(tester).primaryAction!.onPressed, isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
}

String _location({
  String org = 'a',
  String view = 'responses',
  String form = 'form-a',
  String contact = 'contact-a',
}) =>
    '${Routes.hostAudienceScreen.path}?view=$view&organizerId=$org&formId=$form&contactId=$contact&keep=yes';

// Fixed frames permit held repository reads and do not mistake spinner activity
// for a hung test. Every held future is completed before the fixture is disposed.
Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
  }
}

Future<void> _rowAction(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(
      of: find.byKey(const ValueKey('host-form-a')),
      matching: find.byTooltip('Form actions'),
    ),
  );
  await _frames(tester);
  final choice = find.byWidgetPredicate(
    (widget) => widget is CatchMenuRow && widget.item.label == label,
  );
  expect(choice, findsOneWidget);
  await tester.tap(choice);
  await _frames(tester);
}

class _Harness {
  _Harness(
    this.container,
    this.router,
    this.repo,
    this.importer,
    this.auth,
    this.actors,
    this.clubs,
  );
  final ProviderContainer container;
  final GoRouter router;
  final _Repository repo;
  final _Importer importer;
  final _Auth auth;
  final StreamController<String?> actors;
  final StreamController<List<Club>> clubs;
  Uri get uri => router.routeInformationProvider.value.uri;
  HostFormResponsesSection panel(WidgetTester tester) =>
      tester.widget(find.byType(HostFormResponsesSection));
  HostAudienceHeader header(WidgetTester tester) =>
      tester.widget(find.byType(HostAudienceHeader));
  void select(String id) => container
      .read(hostOrganizerSelectionProvider(auth.uid!).notifier)
      .select(id);

  Future<void> change(WidgetTester tester, String change) async {
    switch (change) {
      case 'organizerABA':
        select('b');
        select('a');
      case 'actorABA':
        auth.uid = 'other';
        actors.add('other');
        await _frames(tester);
        auth.uid = 'host';
        actors.add('host');
      case 'clubsABA':
        clubs.add([buildClub(id: 'b', ownerUserId: 'host')]);
        await tester.idle();
        final fallback = container.read(hostOperableClubsProvider('host'));
        expect(fallback.isLoading, isFalse);
        expect(fallback.hasError, isFalse);
        expect(fallback.requireValue.map((club) => club.id), ['b']);
        clubs.add([
          buildClub(id: 'a', ownerUserId: 'host'),
          buildClub(id: 'b', ownerUserId: 'host'),
        ]);
        await tester.idle();
        final restored = container.read(hostOperableClubsProvider('host'));
        expect(restored.isLoading, isFalse);
        expect(restored.hasError, isFalse);
        expect(
          restored.requireValue.map((club) => club.id),
          unorderedEquals(['a', 'b']),
        ); // Both resolved changes are observed before a frame.
      case 'liveAuth':
        auth.uid = 'other'; // The observed UID deliberately remains host.
    }
    await _frames(tester);
  }

  static Future<_Harness> mount(
    WidgetTester tester, {
    String? location,
    String? retainedOrganizer,
  }) async {
    await tester.binding.setSurfaceSize(const Size(1400, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final auth = _Auth();
    final actors = StreamController<String?>.broadcast(sync: true);
    final clubs = StreamController<List<Club>>.broadcast(sync: true);
    final repo = _Repository();
    final importer = _Importer();
    final container = ProviderContainer(
      overrides: [
        firebaseAuthProvider.overrideWithValue(auth),
        uidProvider.overrideWith((ref) async* {
          yield 'host';
          yield* actors.stream;
        }),
        watchClubsHostedByProvider('host').overrideWith((ref) async* {
          yield [
            buildClub(id: 'a', ownerUserId: 'host'),
            buildClub(id: 'b', ownerUserId: 'host'),
          ];
          yield* clubs.stream;
        }),
        watchClubsOwnedByProvider(
          'host',
        ).overrideWithValue(const AsyncData<List<Club>>([])),
        hostOperableClubsProvider('other').overrideWithValue(
          AsyncData([
            buildClub(id: 'a', ownerUserId: 'other'),
            buildClub(id: 'b', ownerUserId: 'other'),
          ]),
        ),
        hostFormsRepositoryProvider.overrideWithValue(repo),
        hostApplicationsControllerProvider.overrideWithValue(importer),
      ],
    );
    if (retainedOrganizer != null) {
      container
          .read(hostOrganizerSelectionProvider('host').notifier)
          .select(retainedOrganizer);
    }
    final router = GoRouter(
      initialLocation: location ?? _location(),
      routes: [
        GoRoute(
          path: Routes.hostAudienceScreen.path,
          name: Routes.hostAudienceScreen.name,
          builder: (_, state) => HostFormsScreen(
            initialOrganizerId: state.uri.queryParameters['organizerId'],
            initialResponses: state.uri.queryParameters['view'] == 'responses',
            initialFormId: state.uri.queryParameters['formId'],
            initialContactId: state.uri.queryParameters['contactId'],
          ),
        ),
        GoRoute(
          path: '/builder/:formId',
          name: Routes.hostFormBuilderScreen.name,
          builder: (_, _) => const Scaffold(body: Text('Builder')),
        ),
      ],
    );
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      router.dispose();
      container.dispose();
      await actors.close();
      await clubs.close();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
          builder: catchNoticeOverlayBuilder,
        ),
      ),
    );
    await _frames(tester);
    return _Harness(container, router, repo, importer, auth, actors, clubs);
  }
}

class _Repository extends Fake implements HostFormsRepository {
  final forms = <HostFormListRequest>[];
  final responseRequests = <HostFormResponseListRequest>[];
  final mutations = <String>[];
  final heldResponses = <String, Completer<HostFormResponsePage>>{};
  Completer<HostFormPage>? heldForms;
  String? heldOrganizer;
  Completer<HostFormEditor>? duplicateResult;
  @override
  Future<HostFormPage> listForms(HostFormListRequest request) async {
    forms.add(request);
    expectSync(request.limit, 25);
    if (request.organizerId == heldOrganizer) return heldForms!.future;
    return _page(request.organizerId);
  }

  @override
  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest request,
  ) async {
    responseRequests.add(request);
    expectSync(request.limit, 25);
    final held = heldResponses[request.organizerId];
    if (held != null) return held.future;
    return HostFormResponsePage(
      organizerId: request.organizerId,
      items: const [],
      nextCursor: null,
    );
  }

  @override
  Future<HostFormEditor> duplicate({
    required String organizerId,
    required String sourceFormId,
    required String requestId,
    String? title,
  }) async {
    mutations.add('duplicate:$organizerId');
    return duplicateResult!.future;
  }

  @override
  Future<void> deleteDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
  }) async {
    mutations.add('delete:$organizerId');
  }

  @override
  Future<HostFormSummary> setLifecycle({
    required String organizerId,
    required String formId,
    required HostFormLifecycleStatus expectedStatus,
    required HostFormLifecycleAction action,
  }) async {
    mutations.add('lifecycle:$organizerId');
    return _form(organizerId);
  }
}

class _Importer extends Fake implements HostApplicationsController {
  int picks = 0;
  final imports = <String>[];
  Completer<HostRosterTable?>? nextPick;
  Completer<HostApplicationImportResult>? nextAck;
  @override
  Future<HostRosterTable?> pickImportFile() async {
    picks++;
    return nextPick == null ? _table : nextPick!.future;
  }

  @override
  Future<HostApplicationImportResult> importDraft({
    required String organizerId,
    required HostApplicationImportDraft draft,
    required String consentCopy,
    required String consentVersion,
    required String retentionCopy,
  }) async {
    imports.add(organizerId);
    expectSync(draft.rows, [
      ['Asha Mehta'],
    ]);
    return nextAck == null ? _receipt : nextAck!.future;
  }
}

const _table = HostRosterTable(
  fileName: 'responses.csv',
  format: EventAttendeeImportFormat.csv,
  headers: ['Full name'],
  rows: [
    ['Asha Mehta'],
  ],
  suggestedMapping: {},
  adapter: HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.genericV1,
    support: HostRosterAdapterSupport.generic,
    confidence: 1,
  ),
);
const _receipt = HostApplicationImportResult(
  receiptId: 'receipt',
  status: 'completed',
  rowCount: 1,
  createdCount: 1,
  skippedCount: 0,
  replayed: false,
);
HostFormPage _page(String org) =>
    HostFormPage(organizerId: org, items: [_form(org)], nextCursor: null);
HostFormSummary _form(String org, {String? id}) => HostFormSummary(
  organizerId: org,
  formId: id ?? org,
  title: '$org form',
  description: null,
  purpose: HostFormPurpose.application,
  status: HostFormLifecycleStatus.draft,
  templateId: null,
  publicFormId: 'public-$org',
  defaultTargetKind: HostFormTargetKind.organizer,
  defaultTargetId: org,
  activeVersionId: null,
  draftRevision: 1,
  publishedVersion: 0,
  submittedResponseCount: 0,
  consequences: const HostFormConsequences.unavailable(),
  updatedAt: DateTime(2026, 10),
  publishedAt: null,
  lastResponseAt: null,
);

class _Editor extends Fake implements HostFormEditor {
  _Editor(this.form);
  @override
  final HostFormSummary form;
}

class _Auth extends Fake implements FirebaseAuth {
  String? uid = 'host';
  @override
  User? get currentUser => uid == null ? null : _User(uid!);
}

class _User extends Fake implements User {
  _User(this.uid);
  @override
  final String uid;
}

HostFormResponsePage _responsePage(String org) => HostFormResponsePage(
  organizerId: org,
  nextCursor: null,
  items: [
    HostFormResponseSummary(
      responseId: 'stale-$org',
      formId: 'form-$org',
      formTitle: 'Stale form',
      versionId: 'v1',
      version: 1,
      status: HostFormResponseStatus.submitted,
      identityKind: HostFormResponseIdentityKind.catchAccount,
      identity: HostFormResponseIdentity(
        displayName: 'stale-$org',
        email: null,
        phoneE164: null,
        origin: HostFormDataOrigin.respondentGranted,
      ),
      sourceLinkId: null,
      sourceLabel: null,
      submittedAt: DateTime(2026, 10),
      withdrawnAt: null,
      highlights: const [],
      conversionKinds: const {},
    ),
  ],
);
