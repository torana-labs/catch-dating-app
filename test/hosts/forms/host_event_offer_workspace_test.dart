import 'dart:async';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_offer_workspace_policy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_capability.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_workspace_section.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';
import 'event_offer_controller_test_support.dart';

part 'host_event_offer_workspace_fixtures.dart';
part 'host_offer_preparation_cases.dart';

@Dependencies([HostEventOfferWorkspaceController])
void main() {
  _preparationRegressionTests();
  testWidgets('route footer follows event choice and clears on account loss', (
    tester,
  ) async {
    final auth = _SwitchingAuth('manager');
    final accounts = StreamController<String?>();
    final storage = MemoryCommandJournalStorage();
    final functions = _RouteFunctions();
    addTearDown(accounts.close);
    addTearDown(storage.close);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          firebaseFunctionsProvider.overrideWithValue(functions),
          commandJournalStorageProvider.overrideWithValue(() async => storage),
          hostFormResponseDetailProvider(
            organizerId: 'org',
            responseId: 'response-one',
          ).overrideWith((ref) async => _detail('contact-one')),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const HostResponseOfferScreen(
            organizerId: 'org',
            responseId: 'response-one',
          ),
        ),
      ),
    );
    accounts.add('manager');
    await pumpUntilFound(
      tester,
      find.byKey(const ValueKey('offer-target-event-one')),
    );
    final workspaceElement = tester.element(
      find.byType(HostEventOfferWorkspaceSection),
    );
    final preview = AppLocalizationsEn().hostEventOfferPreview;
    expect(find.text(preview), findsNothing);
    await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
    await pumpUntilFound(tester, find.text(preview));
    final dock = find.byType(CatchDock);
    expect(dock, findsOneWidget);
    expect(tester.getBottomLeft(dock).dy, greaterThan(500));
    expect(
      tester.element(find.byType(HostEventOfferWorkspaceSection)),
      same(workspaceElement),
    );
    await tester.tap(find.text('Sunday run'));
    await pumpFeatureUi(tester);
    expect(find.text(preview), findsNothing);
    final delayedConfiguration = Completer<void>();
    functions.configurationGate = delayedConfiguration.future;
    await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
    await pumpFeatureUi(tester);
    expect(
      find.text(AppLocalizationsEn().hostEventOfferPreparing),
      findsOneWidget,
    );
    auth.uid = null;
    accounts.add(null);
    await pumpFeatureUi(tester);
    expect(find.text(preview), findsNothing);
    expect(find.byType(HostEventOfferWorkspaceSection), findsNothing);
    delayedConfiguration.complete();
    await pumpFeatureUi(tester);
    expect(find.text(preview), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('legacy response cache is hidden until the new manager read '
      'resolves', (tester) async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _SwitchingAuth('host-one');
    final responses = _LegacyResponseScript();
    var accountId = 'host-one';
    late StateSetter updateRoute;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _SwitchingLegacyResponses(responses),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: StatefulBuilder(
            builder: (context, setState) {
              updateRoute = setState;
              return Scaffold(
                body: CustomScrollView(
                  slivers: [
                    HostFormResponsesSection(
                      organizerId: 'org',
                      accountId: accountId,
                      requireAccount: true,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
    accounts.add('host-one');
    await pumpUntilFound(tester, find.text('Maya'));
    expect(find.text('Maya'), findsOneWidget);

    responses.nextResponse = Completer<HostFormResponsesState>();
    auth.uid = 'host-two';
    updateRoute(() => accountId = 'host-two');
    accounts.add('host-two');
    await tester.pump();
    await tester.pump();
    expect(find.text('Maya'), findsNothing);

    responses.nextResponse!.completeError(StateError('Fixture read failed'));
    await pumpFeatureUi(tester);
    expect(find.byType(CatchLocalizedSliverErrorState), findsOneWidget);
    expect(find.text('Maya'), findsNothing);

    responses.nextResponse = Completer<HostFormResponsesState>();
    tester
        .widget<CatchLocalizedSliverErrorState>(
          find.byType(CatchLocalizedSliverErrorState),
        )
        .onRetry!();
    await tester.pump();
    await tester.pump();
    expect(find.text('Maya'), findsNothing);

    responses.nextResponse!.complete(
      HostFormResponsesState(
        responses: [
          _SwitchingLegacyResponses.response('Rohan', 'response-two'),
        ],
        nextCursor: null,
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Rohan'), findsOneWidget);
    expect(find.text('Maya'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('account switch clears prior response rows and selection before '
      'the next manager query resolves', (tester) async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final auth = _SwitchingAuth('host-one');
    final query = _SwitchingQuery();
    final l10n = AppLocalizationsEn();
    final selectedLabel = find.text(l10n.hostResponseQuerySelected(count: 1));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          firebaseAuthProvider.overrideWithValue(auth),
          firebaseFunctionsProvider.overrideWithValue(_UnusedFunctions()),
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _SwitchingLegacyResponses(),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                HostFormResponsesSection(
                  organizerId: 'org',
                  formId: 'form',
                  queryCapability: HostResponseQueryCapability(
                    versionId: 'form_v1',
                    copy: hostResponseQueryCapability(
                      AppLocalizationsEn(),
                      versionId: 'form_v1',
                    ).copy,
                    gateway: query,
                    onReviewSelection: (_, _) {},
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    accounts.add('host-one');
    await pumpUntilFound(tester, find.text(l10n.hostResponseQueryOpenAnswers));
    expect(query.calls, 0);
    expect(
      find.byKey(const ValueKey('host-responses-lifecycle')),
      findsOneWidget,
    );
    await tester.tap(find.text(l10n.hostResponseQueryOpenAnswers));
    await pumpUntilFound(
      tester,
      find.byTooltip('${l10n.hostResponseQuerySelect}: Maya'),
    );
    expect(find.text('Maya'), findsOneWidget);
    await tester.tap(find.byTooltip('${l10n.hostResponseQuerySelect}: Maya'));
    await pumpFeatureUi(tester);
    expect(selectedLabel, findsOneWidget);

    await tester.tap(find.text(l10n.hostResponseQueryReviewInbox));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('host-responses-lifecycle')),
      findsOneWidget,
    );
    expect(selectedLabel, findsNothing);
    await tester.tap(find.text(l10n.hostResponseQueryOpenAnswers));
    await pumpFeatureUi(tester);
    expect(selectedLabel, findsNothing);
    expect(
      find.text(l10n.hostResponseQueryVersionScope(version: 1)),
      findsOneWidget,
    );
    await tester.tap(find.byTooltip('${l10n.hostResponseQuerySelect}: Maya'));
    await pumpFeatureUi(tester);
    expect(selectedLabel, findsOneWidget);
    final beforeSwitch = query.calls;

    query.nextResponse = Completer<HostResponseQueryPage>();
    auth.uid = 'host-two';
    accounts.add('host-two');
    await tester.pump();
    await tester.pump();
    expect(find.text('Maya'), findsNothing);
    expect(selectedLabel, findsNothing);
    expect(query.calls, beforeSwitch + 1);

    query.nextResponse!.complete(_SwitchingQuery.page('Rohan', 'response-two'));
    await pumpFeatureUi(tester);
    expect(find.text('Rohan'), findsOneWidget);
    expect(find.text('Maya'), findsNothing);
    expect(selectedLabel, findsNothing);
    expect(tester.takeException(), isNull);
  });

  test('published response queries always include the offer workspace', () {
    final capability = hostResponseQueryCapability(
      AppLocalizationsEn(),
      versionId: 'form_v1',
    );
    expect(capability.offerWorkspace, isNotNull);
  });

  test('response query mount preserves external search and contact scope', () {
    bool allowed({String? search, String? contact}) =>
        canMountHostResponseQuery(
          enabled: true,
          formId: 'form',
          searchQuery: search,
          contactId: contact,
        );
    expect(allowed(), isTrue);
    expect(allowed(search: 'Maya'), isFalse);
    expect(allowed(contact: 'contact-one'), isFalse);
    expect(
      canMountHostResponseQuery(
        enabled: true,
        formId: null,
        searchQuery: null,
        contactId: null,
      ),
      isFalse,
    );
  });

  if (Platform.environment['CATCH_RSVP_FLOW_REVIEW_DIR'] case final output?) {
    setUpAll(loadCatchTestFonts);
    for (final stage in ['choose', 'empty', 'review', 'confirm', 'existing']) {
      for (final scale in [1.0, 2.0]) {
        testWidgets('capture unified offer $stage at $scale', (tester) async {
          final controller = TestHostEventOfferController(_Offers());
          addTearDown(controller.dispose);
          await captureCatchWidget(
            tester,
            id: 'offer-$stage-$scale',
            device: CaptureDevice.iphone17Pro,
            textScale: scale,
            outputDirectory: Directory(output),
            builder: (context) => TestHostEventOfferWorkspaceSection(
              organizerId: 'org',
              accountId: 'manager',
              responseId: 'response-one',
              offerController: controller,
              targets: _Targets(empty: stage == 'empty'),
              initiallyReviewSelection: true,
              listOffers:
                  ({
                    required organizerId,
                    required eventId,
                    afterOfferId,
                  }) async => {
                    'items': stage == 'existing'
                        ? [
                            {
                              'offerId': 'offer-one',
                              'eventId': 'event-one',
                              'contactId': 'contact-one',
                              'effectiveStatus': 'offered',
                            },
                          ]
                        : <Object>[],
                    'nextCursor': null,
                  },
              getOffer:
                  ({
                    required organizerId,
                    required eventId,
                    required contactId,
                  }) async => _existingOffer(),
              prepareHandoff: ({required offer}) async => HostOfferHandoff(
                kind: 'prepared',
                offerId: offer.offerId,
                blockers: const [],
                contactId: offer.contactId,
                editableText:
                    'Hi Maya, you have an offer for Sunday run. Open your invitation to confirm your place.',
                copyText: 'Synthetic invitation for review',
              ),
              copyMessage: (_) async {},
              openHandoff: (_) async => false,
              getResponseDetail: (_) async => _detail('contact-one'),
              openResponseForConversion: (_) async {},
              openEventSettings: (_) async {},
              onCreateEvent: () async {},
              copy: hostEventOfferWorkspaceCopy(context.l10n),
              now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
              layoutBuilder: (body, action) => CatchRouteScaffold(
                topBarBuilder: (context, scrolledUnder) =>
                    const CatchTopBar.route(
                      title: 'Offer an event',
                      navigation: CatchTopBarNavigation(
                        mode: CatchTopBarNavigationMode.back,
                      ),
                    ),
                footer: action,
                body: CatchRouteBody.standardSections(
                  sections: [CatchSectionListItem(child: body)],
                ),
              ),
            ),
            drive: (tester) async {
              await pumpFeatureUi(tester);
              if (stage != 'choose' && stage != 'empty') {
                await tester.tap(
                  find.byKey(const ValueKey('offer-target-event-one')),
                );
                await pumpFeatureUi(tester);
              }
              if (stage == 'confirm') {
                await tester.ensureVisible(find.text('Preview offers'));
                await tester.tap(find.text('Preview offers'));
                await pumpFeatureUi(tester);
              }
              if (stage == 'review' ||
                  stage == 'confirm' ||
                  stage == 'existing') {
                final dock = find.byKey(
                  const ValueKey('catch_bottom_action.page_action'),
                );
                expect(dock, findsOneWidget);
                final viewportHeight =
                    tester.view.physicalSize.height /
                    tester.view.devicePixelRatio;
                expect(
                  tester.getBottomLeft(dock).dy,
                  lessThanOrEqualTo(viewportHeight),
                );
                expect(
                  tester.getBottomLeft(dock).dy,
                  greaterThan(viewportHeight - 100),
                );
              }
              if ((stage == 'review' || stage == 'confirm') && scale == 1) {
                expect(
                  tester.getTopLeft(find.text('Sunday run')).dx,
                  closeTo(tester.getTopLeft(find.text('Recipient')).dx, 1),
                );
              }
              expect(tester.takeException(), isNull);
            },
          );
        });
      }
    }
  }

  for (final approved in [false, true]) {
    test(
      'single response uses the shared flow and checks application review: $approved',
      () async {
        final offers = TestHostEventOfferController(_Offers());
        final targets = _Targets();
        var reviewed = approved;
        var reads = 0;
        final workspace = TestHostEventOfferWorkspaceController(
          organizerId: 'org',
          accountId: 'manager',
          responseId: 'response-one',
          offerController: offers,
          targets: targets,
          listOffers:
              ({required organizerId, required eventId, afterOfferId}) async =>
                  const {'items': <Object>[], 'nextCursor': null},
          getOffer:
              ({
                required organizerId,
                required eventId,
                required contactId,
              }) async => _existingOffer(),
          prepareHandoff: ({required offer}) async => const HostOfferHandoff(
            kind: 'blocked',
            offerId: 'offer-one',
            blockers: [],
          ),
          copyMessage: (_) async {},
          openHandoff: (_) async => false,
          getResponseDetail: (_) async {
            reads++;
            return _detail('contact-one', applicationId: 'application-one');
          },
          isResponseReviewed: (_) async => reviewed,
          openResponseForConversion: (_) async => reviewed = true,
          openEventSettings: (_) async {},
          now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
        );
        addTearDown(workspace.dispose);
        addTearDown(offers.dispose);
        await workspace.start();
        await workspace.choose(workspace.events.single);
        expect(workspace.missingContacts.isEmpty, approved);
        if (!approved) {
          expect(workspace.draft, isNull);
          await workspace.returnForConversion('response-one');
          expect(reads, 2);
        }
        expect(workspace.draft!.rows.single.sourceId, 'application-one');
        final chosen = workspace.event!;
        workspace.changeEvent();
        expect(workspace.event, isNull);
        expect(workspace.draft, isNull);
        await workspace.choose(chosen);
        expect(workspace.draft!.rows.single.contactId, 'contact-one');
      },
    );
  }

  test(
    'single response rejects an identity changed by an asynchronous detail read',
    () async {
      final offers = TestHostEventOfferController(_Offers());
      final workspace = TestHostEventOfferWorkspaceController(
        organizerId: 'org',
        accountId: 'manager',
        responseId: 'different-response',
        offerController: offers,
        targets: _Targets(),
        listOffers:
            ({required organizerId, required eventId, afterOfferId}) async =>
                const {'items': <Object>[], 'nextCursor': null},
        getOffer:
            ({
              required organizerId,
              required eventId,
              required contactId,
            }) async => _existingOffer(),
        prepareHandoff: ({required offer}) async => const HostOfferHandoff(
          kind: 'blocked',
          offerId: 'offer-one',
          blockers: [],
        ),
        copyMessage: (_) async {},
        openHandoff: (_) async => false,
        getResponseDetail: (_) async => _detail('contact-one'),
        openResponseForConversion: (_) async {},
        openEventSettings: (_) async {},
        now: DateTime.now,
      );
      addTearDown(workspace.dispose);
      addTearDown(offers.dispose);
      await workspace.start();
      await workspace.choose(workspace.events.single);
      expect(workspace.hasError, isTrue);
      expect(workspace.draft, isNull);
    },
  );

  for (final applicationId in [null, 'application-one']) {
    test('saved target revalidates response and admission source '
        'for ${applicationId ?? 'registration'}', () async {
      final source = _Query();
      final query = HostResponseQueryController(source);
      final offers = TestHostEventOfferController(_Offers());
      final targets = _Targets();
      addTearDown(query.dispose);
      addTearDown(offers.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      final workspace = TestHostEventOfferWorkspaceController(
        organizerId: 'org',
        accountId: 'manager',
        queryController: query,
        offerController: offers,
        listOffers:
            ({required organizerId, required eventId, afterOfferId}) async =>
                const {'items': <Object>[], 'nextCursor': null},
        getOffer:
            ({
              required organizerId,
              required eventId,
              required contactId,
            }) async => _existingOffer(applicationId: applicationId),
        prepareHandoff: ({required offer}) async => const HostOfferHandoff(
          kind: 'blocked',
          offerId: 'offer-one',
          blockers: ['fixture'],
        ),
        copyMessage: (_) async {},
        openHandoff: (_) async => false,
        targets: targets,
        getResponseDetail: (_) async =>
            _detail('contact-one', applicationId: applicationId),
        openResponseForConversion: (_) async {},
        openEventSettings: (_) async => targets.revision = 2,
        now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
        initialEventTarget: HostOfferEventTarget(
          eventId: 'event-one',
          name: 'Freshly saved',
          startTime: _start,
          timezone: 'Asia/Kolkata',
          publicationState: 'private',
          setupRevision: 1,
        ),
      );
      addTearDown(workspace.dispose);
      await workspace.start();
      expect(targets.listCalls, 0);
      expect(targets.configurationCalls, 1);
      expect(workspace.event?.name, 'Freshly saved');
      await workspace.openSettings();
      expect(workspace.event?.setupRevision, 2);
      expect(targets.configurationCalls, 2);
      if (applicationId != null) {
        expect(
          workspace.draft!.rows.single.sourceKind,
          HostOfferSourceKind.application,
        );
        expect(workspace.draft!.rows.single.sourceId, 'application-one');
        await workspace.selectExisting({
          'offerId': 'offer-one',
          'eventId': 'event-one',
          'contactId': 'contact-one',
        });
        expect(workspace.selectedResponseId, 'response-one');
        final offer = workspace.selectedOffer!;
        expect(
          () => HostFormAdmissionScope.fromOffer(offer),
          throwsFormatException,
        );
        final scope = HostFormAdmissionScope.fromOffer(
          offer,
          responseId: workspace.selectedResponseId,
        );
        expect(scope.responseId, 'response-one');
        expect(scope.offerId, 'offer-one');
        workspace.manualUpdated(
          _existingOffer(applicationId: 'another-application'),
        );
        expect(workspace.selectedResponseId, isNull);
      }
      source.hash = 'changed';
      await workspace.choose(workspace.event!);
      expect(workspace.selectionStale, isTrue);
      expect(targets.configurationCalls, 2);
    });
  }

  test('workspace controller invalidates selected offer context when the '
      'underlying query selection changes', () async {
    final query = HostResponseQueryController(_Query());
    final offers = TestHostEventOfferController(_Offers());
    addTearDown(query.dispose);
    addTearDown(offers.dispose);
    await query.apply(
      const HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v1',
      ),
    );
    query.toggleSelection('response-one');
    final workspace = TestHostEventOfferWorkspaceController(
      organizerId: 'org',
      accountId: 'manager',
      queryController: query,
      offerController: offers,
      listOffers:
          ({required organizerId, required eventId, afterOfferId}) async =>
              const {'items': <Object>[], 'nextCursor': null},
      getOffer:
          ({
            required organizerId,
            required eventId,
            required contactId,
          }) async => _existingOffer(),
      prepareHandoff: ({required offer}) async => const HostOfferHandoff(
        kind: 'blocked',
        offerId: 'offer-one',
        blockers: ['fixture'],
      ),
      copyMessage: (_) async {},
      openHandoff: (_) async => false,
      targets: _Targets(),
      getResponseDetail: (_) async => _detail('contact-one'),
      openResponseForConversion: (_) async {},
      openEventSettings: (_) async {},
      now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
    );
    addTearDown(workspace.dispose);

    await workspace.start();
    expect(workspace.ids, ['response-one']);
    expect(workspace.events.single.eventId, 'event-one');
    query.clearSelection();
    expect(workspace.ids, isEmpty);
    expect(workspace.events, isEmpty);
    expect(workspace.draft, isNull);
  });

  testWidgets('CRM conversion return rechecks exact selected response before '
      'offer preview', (tester) async {
    final query = HostResponseQueryController(_Query());
    final offers = _Offers();
    final offerController = TestHostEventOfferController(offers);
    addTearDown(query.dispose);
    addTearDown(offerController.dispose);
    await query.apply(
      const HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v1',
      ),
    );
    query.toggleSelection('response-one');
    String? contactId;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: TestHostEventOfferWorkspaceSection(
              organizerId: 'org',
              accountId: 'manager',
              queryController: query,
              offerController: offerController,
              listOffers:
                  ({
                    required organizerId,
                    required eventId,
                    afterOfferId,
                  }) async => const {'items': <Object>[], 'nextCursor': null},
              getOffer:
                  ({
                    required organizerId,
                    required eventId,
                    required contactId,
                  }) async => _existingOffer(),
              prepareHandoff: ({required offer}) async =>
                  const HostOfferHandoff(
                    kind: 'blocked',
                    offerId: 'offer-one',
                    blockers: ['fixture'],
                  ),
              copyMessage: (_) async {},
              openHandoff: (_) async => false,
              targets: _Targets(),
              getResponseDetail: (_) async => _detail(contactId),
              openResponseForConversion: (_) async => contactId = 'contact-one',
              openEventSettings: (_) async {},
              copy: _copy,
              now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Create event offers'));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
    await pumpFeatureUi(tester);
    expect(find.text('Convert response first'), findsOneWidget);
    expect(offers.previewCalls, 0);

    await tester.tap(find.byKey(const ValueKey('offer-convert-response-one')));
    await pumpFeatureUi(tester);
    expect(find.text('Preview offers'), findsOneWidget);
    expect(offers.previewCalls, 0);
    await tester.tap(find.text('Preview offers'));
    await pumpFeatureUi(tester);
    expect(offers.previewCalls, 1);
    expect(offers.previewed!.rows.single.contactId, 'contact-one');
    expect(offers.previewed!.rows.single.sourceId, 'response-one');
  });

  testWidgets(
    'changed query result blocks event choice without partial offers',
    (tester) async {
      final source = _Query();
      final query = HostResponseQueryController(source);
      final offers = _Offers();
      final offerController = TestHostEventOfferController(offers);
      addTearDown(query.dispose);
      addTearDown(offerController.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      var detailReads = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: TestHostEventOfferWorkspaceSection(
                organizerId: 'org',
                accountId: 'manager',
                queryController: query,
                offerController: offerController,
                listOffers:
                    ({
                      required organizerId,
                      required eventId,
                      afterOfferId,
                    }) async => const {'items': <Object>[], 'nextCursor': null},
                getOffer:
                    ({
                      required organizerId,
                      required eventId,
                      required contactId,
                    }) async => _existingOffer(),
                prepareHandoff: ({required offer}) async =>
                    const HostOfferHandoff(
                      kind: 'blocked',
                      offerId: 'offer-one',
                      blockers: ['fixture'],
                    ),
                copyMessage: (_) async {},
                openHandoff: (_) async => false,
                targets: _Targets(),
                getResponseDetail: (_) async {
                  detailReads++;
                  return _detail('contact-one');
                },
                openResponseForConversion: (_) async {},
                openEventSettings: (_) async {},
                copy: _copy,
                now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Create event offers'));
      await pumpFeatureUi(tester);
      source.hash = 'changed';
      await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
      await pumpFeatureUi(tester);
      expect(find.text('Selection changed'), findsOneWidget);
      expect(detailReads, 0);
      expect(offers.previewCalls, 0);
    },
  );

  for (final payment in [
    (amount: 50000, mode: 'manualInstructions'),
    (amount: 0, mode: 'manualInstructions'),
    (amount: 50000, mode: 'catchCheckout'),
  ]) {
    testWidgets(
      'existing ${payment.mode} ${payment.amount} offer shows appropriate payment controls and handoff',
      (tester) async {
        final query = HostResponseQueryController(_Query());
        final offers = _Offers();
        final controller = TestHostEventOfferController(offers);
        addTearDown(query.dispose);
        addTearDown(controller.dispose);
        await query.apply(
          const HostResponseQueryRequest(
            organizerId: 'org',
            formId: 'form',
            versionId: 'form_v1',
          ),
        );
        query.toggleSelection('response-one');
        final copied = <String>[];
        final opened = <Uri>[];
        var preparations = 0;
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: SingleChildScrollView(
                child: TestHostEventOfferWorkspaceSection(
                  organizerId: 'org',
                  accountId: 'manager',
                  queryController: query,
                  offerController: controller,
                  listOffers:
                      ({
                        required organizerId,
                        required eventId,
                        afterOfferId,
                      }) async => const {
                        'items': [
                          {
                            'offerId': 'offer-one',
                            'eventId': 'event-one',
                            'contactId': 'contact-one',
                            'effectiveStatus': 'offered',
                          },
                          {
                            'offerId': 'unrelated-offer',
                            'eventId': 'event-one',
                            'contactId': 'another-contact',
                            'effectiveStatus': 'offered',
                          },
                        ],
                        'nextCursor': null,
                      },
                  getOffer:
                      ({
                        required organizerId,
                        required eventId,
                        required contactId,
                      }) async => _existingOffer(
                        amount: payment.amount,
                        mode: payment.mode,
                      ),
                  prepareHandoff: ({required offer}) async {
                    preparations++;
                    return HostOfferHandoff(
                      kind: 'prepared',
                      blockers: const [],
                      offerId: offer.offerId,
                      contactId: offer.contactId,
                      editableText: 'Hi Maya',
                      copyText: 'Hi Maya',
                      whatsappUrl: Uri.parse('https://wa.me/911234567890'),
                    );
                  },
                  copyMessage: (text) async => copied.add(text),
                  openHandoff: (uri) async {
                    opened.add(uri);
                    return true;
                  },
                  targets: _Targets(),
                  getResponseDetail: (_) async => _detail('contact-one'),
                  openResponseForConversion: (_) async {},
                  openEventSettings: (_) async {},
                  copy: _copy,
                  now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        await tester.tap(find.text('Create event offers'));
        await pumpFeatureUi(tester);
        await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
        await pumpFeatureUi(tester);
        expect(
          find.byKey(const ValueKey('offer-existing-unrelated-offer')),
          findsNothing,
        );
        expect(
          find.byKey(const ValueKey('offer-existing-offer-one')),
          findsNothing,
        );
        // The single existing offer opens automatically.
        final manualReview = find.byType(HostManualPaymentReviewSection);
        if (payment.amount > 0 && payment.mode == 'manualInstructions') {
          await pumpUntilFound(tester, manualReview);
          final referenceInput = find.descendant(
            of: manualReview,
            matching: find.byType(TextField),
          );
          expect(referenceInput, findsOneWidget);
          // Empty row inputs show an inline Add prompt; editing reveals the label.
          await tester.ensureVisible(referenceInput);
          await tester.enterText(referenceInput, 'demo-reference');
          await pumpFeatureUi(tester);
          expect(find.text('Payment reference'), findsOneWidget);
          FocusManager.instance.primaryFocus?.unfocus();
        } else {
          expect(manualReview, findsNothing);
        }
        await tester.ensureVisible(find.text('Prepare personal handoff'));
        await tester.tap(find.text('Prepare personal handoff'));
        await pumpFeatureUi(tester);
        expect(preparations, 1);
        expect(find.text('Hi Maya'), findsOneWidget);
        await tester.ensureVisible(find.text('Copy message'));
        await tester.tap(find.text('Copy message'));
        await pumpFeatureUi(tester);
        expect(copied, ['Hi Maya']);
        await tester.ensureVisible(find.text('Open WhatsApp'));
        await tester.tap(find.text('Open WhatsApp'));
        await pumpFeatureUi(tester);
        expect(opened.single.host, 'wa.me');
        expect(
          find.text('Message copied. Sending is your choice.'),
          findsOneWidget,
        );
        expect(offers.previewCalls, 0);
      },
    );
  }

  testWidgets('existing offer discovers and replays saved manual command', (
    tester,
  ) async {
    final query = HostResponseQueryController(_Query());
    final pending = _PendingMutation();
    final controller = TestHostEventOfferController(
      _Offers(),
      mutationOutbox: pending,
      accountId: 'manager',
    );
    addTearDown(query.dispose);
    addTearDown(controller.dispose);
    await query.apply(
      const HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v1',
      ),
    );
    query.toggleSelection('response-one');
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: TestHostEventOfferWorkspaceSection(
              organizerId: 'org',
              accountId: 'manager',
              queryController: query,
              offerController: controller,
              listOffers:
                  ({
                    required organizerId,
                    required eventId,
                    afterOfferId,
                  }) async => const {
                    'items': [
                      {
                        'offerId': 'offer-one',
                        'eventId': 'event-one',
                        'contactId': 'contact-one',
                        'effectiveStatus': 'offered',
                      },
                    ],
                    'nextCursor': null,
                  },
              getOffer:
                  ({
                    required organizerId,
                    required eventId,
                    required contactId,
                  }) async => _existingOffer(),
              prepareHandoff: ({required offer}) async => HostOfferHandoff(
                kind: 'blocked',
                offerId: offer.offerId,
                blockers: const ['fixture'],
              ),
              copyMessage: (_) async {},
              openHandoff: (_) async => false,
              targets: _Targets(),
              getResponseDetail: (_) async => _detail('contact-one'),
              openResponseForConversion: (_) async {},
              openEventSettings: (_) async {},
              copy: _copy,
              now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Create event offers'));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('offer-target-event-one')));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('offer-existing-offer-one')),
      findsNothing,
    );
    // The single existing offer opens automatically.
    await pumpFeatureUi(tester);
    expect(pending.reads, greaterThan(0));
    expect(
      find.byKey(const ValueKey('offer-retry-saved-mutation')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('offer-retry-saved-mutation')));
    await pumpFeatureUi(tester);
    expect(pending.replays, 1);
    expect(pending.newMutations, 0);
  });

  testWidgets('event picker shows in-flow create action only when the parent '
      'enables private setup', (tester) async {
    final query = HostResponseQueryController(_Query());
    final offers = _Offers();
    final offerController = TestHostEventOfferController(offers);
    addTearDown(query.dispose);
    addTearDown(offerController.dispose);
    await query.apply(
      const HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v1',
      ),
    );
    query.toggleSelection('response-one');
    var createCalls = 0;
    Widget section({Future<void> Function()? onCreateEvent}) => MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: SingleChildScrollView(
          child: TestHostEventOfferWorkspaceSection(
            organizerId: 'org',
            accountId: 'manager',
            queryController: query,
            offerController: offerController,
            listOffers:
                ({
                  required organizerId,
                  required eventId,
                  afterOfferId,
                }) async => const {'items': <Object>[], 'nextCursor': null},
            getOffer:
                ({
                  required organizerId,
                  required eventId,
                  required contactId,
                }) async => _existingOffer(),
            prepareHandoff: ({required offer}) async => const HostOfferHandoff(
              kind: 'blocked',
              offerId: 'offer-one',
              blockers: ['fixture'],
            ),
            copyMessage: (_) async {},
            openHandoff: (_) async => false,
            targets: _Targets(),
            getResponseDetail: (_) async => _detail('contact-one'),
            openResponseForConversion: (_) async {},
            openEventSettings: (_) async {},
            copy: _copy,
            now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
            onCreateEvent: onCreateEvent,
          ),
        ),
      ),
    );
    const createButton = Key('offer-create-event');
    await tester.pumpWidget(section());
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Create event offers'));
    await pumpFeatureUi(tester);
    expect(find.byKey(createButton), findsNothing);

    await tester.pumpWidget(section(onCreateEvent: () async => createCalls++));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.byKey(createButton));
    await tester.tap(find.byKey(createButton));
    await pumpFeatureUi(tester);
    expect(createCalls, 1);
    expect(offers.previewCalls, 0);
  });
}
