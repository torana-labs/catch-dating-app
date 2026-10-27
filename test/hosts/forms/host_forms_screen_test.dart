import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/domain/host_application_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
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

  test('directory pagination keeps account and session identity', () {
    const first = HostFormListRequest(
      organizerId: 'forms-club',
      accountUid: 'host-1',
      accountGeneration: 2,
    );
    final pageTwo = first.copyWith(cursor: 'next-page');
    expect(pageTwo.accountUid, 'host-1');
    expect(pageTwo.accountGeneration, 2);
    expect(pageTwo.cursor, 'next-page');
    expect(
      first,
      isNot(
        const HostFormListRequest(
          organizerId: 'forms-club',
          accountUid: 'host-2',
          accountGeneration: 2,
        ),
      ),
    );
    expect(
      first,
      isNot(
        const HostFormListRequest(
          organizerId: 'forms-club',
          accountUid: 'host-1',
          accountGeneration: 3,
        ),
      ),
    );
  });

  testWidgets('Responses empty state centers below controls and above nav', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 800);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _FixedHostFormResponsesController([]),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CatchTabViewportScope(
            index: 2,
            bottomOverlayInset: 100,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            child: Scaffold(
              body: CustomScrollView(
                slivers: [HostFormResponsesSection(organizerId: 'org-1')],
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final toolbarBottom = tester
        .getRect(
          find
              .ancestor(
                of: find.text('Filters'),
                matching: find.byType(CatchSection),
              )
              .first,
        )
        .bottom;
    final empty = find.byType(CatchEmptyState);
    final iconTop = tester
        .getRect(
          find
              .descendant(of: empty, matching: find.byType(CatchIconTile))
              .first,
        )
        .top;
    final messageBottom = tester
        .getRect(
          find.text(
            'Share a published form. New submissions will appear here.',
          ),
        )
        .bottom;
    final contentCenter = (iconTop + messageBottom) / 2;
    final availableCenter = (toolbarBottom + 700) / 2;
    expect(contentCenter, closeTo(availableCenter, 24));
  });

  testWidgets('Host Forms keeps Audience composition across route states', (
    tester,
  ) async {
    for (final (screen, view) in [
      (const HostFormsScreen(), HostAudienceView.forms),
      (
        const HostFormsScreen(initialResponses: true),
        HostAudienceView.responses,
      ),
    ]) {
      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncLoading<String?>()),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);

      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(
            AsyncError<String?>(StateError('uid failed'), StackTrace.current),
          ),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);

      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(null)),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
      expect(find.text('Sign in required'), findsOneWidget);

      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          hostOperableClubsProvider(
            'host-1',
          ).overrideWithValue(const AsyncLoading<List<Club>>()),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);

      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          hostOperableClubsProvider('host-1').overrideWithValue(
            AsyncError<List<Club>>(
              StateError('clubs failed'),
              StackTrace.current,
            ),
          ),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);

      await _pumpFormsRouteState(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          hostOperableClubsProvider(
            'host-1',
          ).overrideWithValue(const AsyncData<List<Club>>([])),
        ],
        settle: false,
      );
      _expectFormsAudienceStateOwner(tester, selected: view);
      expect(find.byType(HostAudienceNoOrganizerEmptyState), findsOneWidget);
      expect(find.byType(CatchSliverEmptyState), findsOneWidget);
      final createButton = tester.widget<CatchButton>(
        find.descendant(
          of: find.byType(CatchSliverEmptyState),
          matching: find.byType(CatchButton),
        ),
      );
      expect(createButton.size, CatchButtonSize.md);
    }
  });

  for (final width in [402.0, 1200.0]) {
    testWidgets(
      'Audience Forms and Responses use shared tabs and view-aware search at $width',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 874);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final formRequests = <HostFormListRequest>[];
        final responseRequests = <HostFormResponseListRequest>[];
        final club = buildClub(id: 'forms-club', ownerUserId: 'host-1');

        final router = GoRouter(
          initialLocation: '/host/audience?view=forms&organizerId=forms-club',
          routes: [
            GoRoute(
              path: Routes.hostAudienceScreen.path,
              name: Routes.hostAudienceScreen.name,
              builder: (context, state) => HostFormsScreen(
                initialResponses:
                    state.uri.queryParameters['view'] == 'responses',
                initialOrganizerId: state.uri.queryParameters['organizerId'],
                initialFormId: state.uri.queryParameters['formId'],
              ),
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              firebaseAuthProvider.overrideWithValue(_TestAuth('host-1')),
              uidProvider.overrideWith((ref) => Stream.value('host-1')),
              hostOperableClubsProvider(
                'host-1',
              ).overrideWithValue(AsyncData([club])),
              hostFormsDirectoryControllerProvider.overrideWith2(
                (_) => _FixedHostFormsDirectoryController(formRequests),
              ),
              hostFormResponsesControllerProvider.overrideWith2(
                (_) => _FixedHostFormResponsesController(responseRequests),
              ),
            ],
            child: MaterialApp.router(
              theme: AppTheme.light,
              routerConfig: router,
            ),
          ),
        );
        await pumpFeatureUi(tester);

        final scaffold = find.byType(CatchRootScreenScaffold);
        expect(scaffold, findsOneWidget);
        expect(
          find.byKey(const ValueKey('host-audience-view-tabs')),
          findsOneWidget,
        );
        expect(find.text('People'), findsOneWidget);
        expect(find.text('Groups'), findsOneWidget);
        expect(find.text('Forms'), findsWidgets);
        expect(find.text('Responses'), findsOneWidget);
        expect(find.byKey(const ValueKey('host-forms-create')), findsOneWidget);
        expect(find.byType(CatchTopBarPrimaryButton), findsOneWidget);
        expect(find.byType(CatchSearchField), findsOneWidget);
        expect(
          tester
              .widget<CatchSearchField>(find.byType(CatchSearchField))
              .placeholder,
          'Search forms',
        );
        expect(find.byType(CatchChoiceInput<String>), findsOneWidget);

        await tester.tap(find.text('Published'));
        await pumpFeatureUi(tester);
        expect(formRequests.last.statuses, {HostFormLifecycleStatus.published});

        await tester.tap(find.byIcon(CatchIcons.search));
        await pumpFeatureUiFor(tester, CatchMotion.base);
        await pumpFeatureUi(tester);
        final search = find.byType(CatchSearchField);
        expect(
          tester.widget<CatchSearchField>(search).mode,
          CatchSearchFieldMode.expanding,
        );
        await tester.enterText(
          find.descendant(of: search, matching: find.byType(TextField)),
          '  waiver  ',
        );
        await pumpFeatureUiFor(tester, CatchMotion.searchDebounce);
        await pumpFeatureUi(tester);
        expect(formRequests.last.query, 'waiver');
        expect(responseRequests, isEmpty);
        await tester.tap(find.text('Filters'));
        await pumpFeatureUi(tester);
        final sheet = find.byType(CatchSheet);
        Finder chip(String label) => find.descendant(
          of: sheet,
          matching: find.widgetWithText(CatchChip, label),
        );
        for (final label in ['Application', 'Registration', 'Intake']) {
          await tester.ensureVisible(chip(label));
          await tester.tap(chip(label));
          await pumpFeatureUi(tester);
        }
        expect(formRequests.last.purposes, {
          HostFormPurpose.application,
          HostFormPurpose.registration,
          HostFormPurpose.intake,
        });
        await tester.ensureVisible(chip('Paused'));
        await tester.tap(chip('Paused'));
        await pumpFeatureUi(tester);
        expect(formRequests.last.statuses, {
          HostFormLifecycleStatus.published,
          HostFormLifecycleStatus.paused,
        });
        expect(formRequests.last.query, 'waiver');
        expect(sheet, findsOneWidget, reason: 'Selections keep the sheet open');
        for (final label in [
          'Application',
          'Registration',
          'Intake',
          'Published',
          'Paused',
        ]) {
          expect(tester.widget<CatchChip>(chip(label)).selected, isTrue);
          expect(
            find.descendant(
              of: chip(label),
              matching: find.byIcon(CatchIcons.check),
            ),
            findsOneWidget,
          );
        }
        await tester.ensureVisible(chip('Registration'));
        await tester.tap(chip('Registration'));
        await pumpFeatureUi(tester);
        expect(formRequests.last.purposes, {
          HostFormPurpose.application,
          HostFormPurpose.intake,
        });
        await tester.ensureVisible(find.text('Close'));
        await tester.tap(find.text('Close'));
        await pumpFeatureUi(tester);
        expect(sheet, findsNothing);
        final rail = tester.widget<CatchChoiceInput<String>>(
          find.byType(CatchChoiceInput<String>),
        );
        expect(
          rail.selected,
          isEmpty,
          reason: 'Multiple statuses must not falsely activate All',
        );
        await tester.tap(find.text('Filters'));
        await pumpFeatureUi(tester);
        expect(tester.widget<CatchChip>(chip('Intake')).selected, isTrue);
        await tester.tap(find.text('Reset all'));
        await pumpFeatureUi(tester);
        expect(formRequests.last.purposes, isEmpty);
        expect(
          formRequests.last.statuses,
          HostFormLifecycleStatus.values.toSet(),
          reason: 'No selected status means all statuses, including archived',
        );
        expect(formRequests.last.query, 'waiver');
        await tester.ensureVisible(find.text('Close'));
        await tester.tap(find.text('Close'));
        await pumpFeatureUi(tester);

        await tester.tap(find.text('Responses'));
        await pumpFeatureUiFor(tester, CatchMotion.base);
        await pumpFeatureUi(tester);
        expect(find.byKey(const ValueKey('host-forms-create')), findsNothing);
        expect(find.byType(CatchSearchField), findsOneWidget);
        expect(
          tester
              .widget<CatchSearchField>(find.byType(CatchSearchField))
              .placeholder,
          'Search responses',
        );
        expect(
          find.byKey(const ValueKey('host-responses-import')),
          findsOneWidget,
        );
        expect(
          find.descendant(
            of: find.byType(CatchTopBar),
            matching: find.byKey(const ValueKey('host-responses-import')),
          ),
          findsOneWidget,
        );
        await tester.tap(find.text('Submitted'));
        await pumpFeatureUi(tester);
        expect(responseRequests.last.includeApplications, isTrue);
        expect(
          responseRequests.last.reviewStatus,
          HostApplicationReviewStatus.submitted,
        );

        // Switching views resets the expanding search. Open the Responses
        // field before typing so this exercises the visible user control.
        await tester.tap(find.byIcon(CatchIcons.search));
        await pumpFeatureUiFor(tester, CatchMotion.base);
        await pumpFeatureUi(tester);
        expect(
          tester.widget<CatchSearchField>(find.byType(CatchSearchField)).mode,
          CatchSearchFieldMode.expanding,
        );

        await tester.enterText(
          find.descendant(
            of: find.byType(CatchSearchField),
            matching: find.byType(TextField),
          ),
          '  submitted  ',
        );
        await pumpFeatureUiFor(tester, CatchMotion.searchDebounce);
        await pumpFeatureUi(tester);
        expect(responseRequests.last.query, 'submitted');
        expect(formRequests.last.query, 'waiver');
      },
    );
  }

  testWidgets('Response form scope survives tab changes and route updates', (
    tester,
  ) async {
    final requests = <HostFormResponseListRequest>[];
    final router = GoRouter(
      initialLocation:
          '/host/audience?view=responses&organizerId=forms-club&formId=first',
      routes: [
        GoRoute(
          path: Routes.hostAudienceScreen.path,
          name: Routes.hostAudienceScreen.name,
          builder: (context, state) => HostFormsScreen(
            initialResponses: state.uri.queryParameters['view'] == 'responses',
            initialOrganizerId: state.uri.queryParameters['organizerId'],
            initialFormId: state.uri.queryParameters['formId'],
          ),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          firebaseAuthProvider.overrideWithValue(_TestAuth('host-1')),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          hostOperableClubsProvider('host-1').overrideWithValue(
            AsyncData([buildClub(id: 'forms-club', ownerUserId: 'host-1')]),
          ),
          hostFormsDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostFormsDirectoryController([]),
          ),
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _FixedHostFormResponsesController(requests),
          ),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await pumpFeatureUi(tester);
    expect(requests.last.formId, 'first');
    await tester.tap(find.text('Forms'));
    await pumpFeatureUi(tester);
    expect(
      router.routeInformationProvider.value.uri.queryParameters['view'],
      'forms',
    );
    expect(
      router.routeInformationProvider.value.uri.queryParameters['formId'],
      'first',
    );
    await tester.tap(find.text('Responses'));
    await pumpFeatureUi(tester);
    expect(requests.last.formId, 'first');
    router.go(
      '/host/audience?view=responses&organizerId=forms-club&formId=second',
    );
    await pumpFeatureUi(tester);
    expect(requests.last.formId, 'second');
    expect(tester.takeException(), isNull);
  });

  for (final returnToA in [false, true]) {
    testWidgets(
      'account switch ${returnToA ? 'return' : 'settle'} hides old forms',
      (tester) async {
        final accounts = StreamController<String?>();
        addTearDown(accounts.close);
        final auth = _TestAuth('host-1');
        final nextDirectory = Completer<HostFormsDirectoryState>();
        final pendingReadDisposals = _ReadDisposeProbe();
        final directoryRequests = <HostFormListRequest>[];
        String? routeMarker;
        late StateSetter rebuildRoute;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              firebaseAuthProvider.overrideWithValue(auth),
              uidProvider.overrideWith((ref) => accounts.stream),
              hostOperableClubsProvider('host-1').overrideWithValue(
                AsyncData([buildClub(id: 'forms-club', ownerUserId: 'host-1')]),
              ),
              hostOperableClubsProvider('host-2').overrideWithValue(
                AsyncData([buildClub(id: 'forms-club', ownerUserId: 'host-2')]),
              ),
              hostFormsDirectoryControllerProvider.overrideWith2(
                (_) => _AccountSwitchDirectoryController(
                  auth,
                  nextDirectory,
                  pendingReadDisposals,
                  directoryRequests,
                ),
              ),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: StatefulBuilder(
                builder: (context, setState) {
                  rebuildRoute = setState;
                  return HostFormsScreen(initialContactId: routeMarker);
                },
              ),
            ),
          ),
        );
        accounts.add('host-1');
        await pumpFeatureUi(tester);
        expect(find.byKey(const ValueKey('host-form-old')), findsOneWidget);
        expect(directoryRequests.last.accountUid, 'host-1');
        expect(directoryRequests.last.accountGeneration, 0);

        // FirebaseAuth switches before uidProvider emits. The old manager's row
        // must disappear in that intermediate frame.
        auth.uid = 'host-2';
        rebuildRoute(() => routeMarker = 'switched');
        await tester.pump();
        expect(find.byKey(const ValueKey('host-form-old')), findsNothing);
        expect(find.byType(HostAudienceStateScaffold), findsOneWidget);

        accounts.add('host-2');
        await tester.pump();
        await tester.pump();
        expect(find.byKey(const ValueKey('host-form-old')), findsNothing);
        expect(find.byKey(const ValueKey('host-form-new')), findsNothing);
        // The pending manager read intentionally keeps a loading animation
        // alive. Advance frames without waiting for a settled screen.
        for (var frame = 0; frame < 5; frame++) {
          await tester.pump();
        }
        expect(pendingReadDisposals.count, 0);
        expect(directoryRequests.last.accountUid, 'host-2');
        expect(directoryRequests.last.accountGeneration, 1);

        // Returning to A while B is still pending must start a new A-scoped
        // read; B's later completion must never replace A's visible page.
        if (returnToA) {
          auth.uid = 'host-1';
          accounts.add('host-1');
          // Wait for the account-scoped read, not just the next scheduled frame.
          // Keep asserting that the original account's row actually returns.
          await pumpUntilFound(
            tester,
            find.byKey(const ValueKey('host-form-old')),
          );
          expect(find.byKey(const ValueKey('host-form-old')), findsOneWidget);
          expect(directoryRequests.last.accountUid, 'host-1');
          expect(directoryRequests.last.accountGeneration, 2);
        }

        nextDirectory.complete(
          HostFormsDirectoryState(
            forms: [
              _formSummary(
                id: 'new',
                status: HostFormLifecycleStatus.published,
              ),
            ],
            nextCursor: null,
          ),
        );
        await pumpFeatureUi(tester);
        expect(
          find.byKey(const ValueKey('host-form-old')),
          returnToA ? findsOneWidget : findsNothing,
        );
        expect(
          find.byKey(const ValueKey('host-form-new')),
          returnToA ? findsNothing : findsOneWidget,
        );
      },
    );
  }

  testWidgets('Forms directory is flat and published row menus stay bounded', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1440, 1000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final club = buildClub(id: 'forms-club', ownerUserId: 'host-1');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          firebaseAuthProvider.overrideWithValue(_TestAuth('host-1')),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          hostOperableClubsProvider(
            'host-1',
          ).overrideWithValue(AsyncData([club])),
          hostFormsDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostFormsDirectoryController(
              <HostFormListRequest>[],
              forms: [
                _formSummary(
                  id: 'published',
                  status: HostFormLifecycleStatus.published,
                ),
                _formSummary(
                  id: 'paused',
                  status: HostFormLifecycleStatus.paused,
                ),
                _formSummary(
                  id: 'legacy',
                  status: HostFormLifecycleStatus.published,
                  consequences: const HostFormConsequences.unavailable(),
                ),
              ],
            ),
          ),
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _FixedHostFormResponsesController(
              <HostFormResponseListRequest>[],
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostFormsScreen(),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byKey(CatchSectionSurface.rowGroupClipKey), findsNothing);
    expect(find.byKey(const ValueKey('host-form-published')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const ValueKey('host-form-published'))).width,
      1440,
      reason:
          'The interaction band spans the page; text stays in its readable lane',
    );
    expect(find.byKey(const ValueKey('host-form-paused')), findsOneWidget);
    expect(find.textContaining('Published · 12 responses'), findsNWidgets(2));
    expect(find.textContaining('Paused · 12 responses'), findsOneWidget);
    expect(find.textContaining('Verifies email'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpFormsRouteState(
  WidgetTester tester,
  HostFormsScreen screen, {
  required List overrides,
  bool settle = true,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        firebaseAuthProvider.overrideWithValue(_TestAuth('host-1')),
        ...overrides,
      ],
      child: MaterialApp(theme: AppTheme.light, home: screen),
    ),
  );
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
  }
}

void _expectFormsAudienceStateOwner(
  WidgetTester tester, {
  required HostAudienceView selected,
}) {
  expect(find.byType(HostAudienceStateScaffold), findsOneWidget);
  expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
  expect(find.byType(CatchRootScreenPageScrollView), findsOneWidget);
  expect(find.byType(HostAudienceTabRail), findsOneWidget);
  expect(find.byType(CatchErrorScaffold), findsNothing);
  expect(find.byType(HostLoadingScreen), findsNothing);
  expect(
    tester
        .widget<HostAudienceTabRail>(find.byType(HostAudienceTabRail))
        .selected,
    selected,
  );
  expect(
    tester
        .widget<CatchRootScreenPageScrollView>(
          find.byType(CatchRootScreenPageScrollView),
        )
        .bodyLayout,
    CatchPageBodyMode.standard,
  );
}

class _TestAuth extends Fake implements FirebaseAuth {
  _TestAuth(this.uid);
  String? uid;

  @override
  User? get currentUser => uid == null ? null : _TestUser(uid!);
}

class _TestUser extends Fake implements User {
  _TestUser(this.uid);
  @override
  final String uid;
}

class _AccountSwitchDirectoryController extends HostFormsDirectoryController {
  _AccountSwitchDirectoryController(
    this.auth,
    this.nextDirectory,
    this.pendingReadDisposals,
    this.requests,
  );
  final _TestAuth auth;
  final Completer<HostFormsDirectoryState> nextDirectory;
  final _ReadDisposeProbe pendingReadDisposals;
  final List<HostFormListRequest> requests;

  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async {
    requests.add(request);
    if (auth.uid == 'host-1') {
      return HostFormsDirectoryState(
        forms: [
          _formSummary(id: 'old', status: HostFormLifecycleStatus.published),
        ],
        nextCursor: null,
      );
    }
    ref.onDispose(() => pendingReadDisposals.count++);
    return nextDirectory.future;
  }
}

class _ReadDisposeProbe {
  int count = 0;
}

class _FixedHostFormsDirectoryController extends HostFormsDirectoryController {
  _FixedHostFormsDirectoryController(
    this.requests, {
    this.forms = const <HostFormSummary>[],
  });

  final List<HostFormListRequest> requests;
  final List<HostFormSummary> forms;

  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async {
    requests.add(request);
    return HostFormsDirectoryState(forms: forms, nextCursor: null);
  }
}

class _FixedHostFormResponsesController extends HostFormResponsesController {
  _FixedHostFormResponsesController(this.requests);

  final List<HostFormResponseListRequest> requests;

  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return const HostFormResponsesState(responses: [], nextCursor: null);
  }
}

HostFormSummary _formSummary({
  required String id,
  required HostFormLifecycleStatus status,
  HostFormConsequences consequences = const HostFormConsequences(
    coverage: HostFormConsequenceCoverage.exact,
    identityPolicy: HostFormIdentityPolicy.emailVerified,
    enabledAutomationActionKinds: {
      HostFormAutomationActionKind.createCrmContact,
    },
  ),
}) => HostFormSummary(
  organizerId: 'forms-club',
  formId: id,
  title: '$id form',
  description: null,
  purpose: HostFormPurpose.application,
  status: status,
  templateId: null,
  publicFormId: 'public-$id',
  defaultTargetKind: HostFormTargetKind.organizer,
  defaultTargetId: 'forms-club',
  activeVersionId: 'version-$id',
  draftRevision: 1,
  publishedVersion: 1,
  submittedResponseCount: 12,
  consequences: consequences,
  updatedAt: DateTime(2026, 8, 26),
  publishedAt: DateTime(2026, 8, 20),
  lastResponseAt: DateTime(2026, 8, 26),
);
