part of 'host_event_offer_workspace_test.dart';

@Dependencies([HostEventOfferWorkspaceController])
void _preparationRegressionTests() {
  test(
    'personal preparation overlaps fresh reads and cancellation prevents preview',
    () async {
      final targets = _PersonalTargets();
      final gateway = _Offers();
      final offers = TestHostEventOfferController(gateway);
      final response = Completer<HostFormResponseDetail>();
      var reads = 0;
      final workspace = _preparationWorkspace(
        targets: targets,
        offerController: offers,
        getResponse: (_) => ++reads == 1
            ? Future.value(_detail('contact-one'))
            : response.future,
      );
      await workspace.start();
      await workspace.choose(workspace.events.single);
      expect(workspace.personalMode, isTrue);
      workspace.setPersonalLink(
        'contact-one',
        'https://pay.example.test/person',
      );
      final configuration = Completer<void>();
      targets.gate = configuration.future;
      final preparing = workspace.previewPersonal();
      await Future<void>.delayed(Duration.zero);
      expect(reads, 2);
      expect(targets.configurationCalls, 2);
      expect(workspace.stage, HostOfferWorkspaceStage.preparingOffer);
      workspace.cancelPreparation();
      response.complete(_detail('contact-one'));
      configuration.complete();
      await preparing;
      expect(workspace.event, isNull);
      expect(gateway.previewCalls, 0);
      expect(workspace.hasError, isFalse);
    },
  );

  test(
    'personal preview rechecks approval before an authoritative preview',
    () async {
      final gateway = _Offers();
      var approved = true;
      final workspace = _preparationWorkspace(
        targets: _PersonalTargets(),
        offerController: TestHostEventOfferController(gateway),
        getResponse: (_) async =>
            _detail('contact-one', applicationId: 'application-one'),
        reviewed: (_) async => approved,
      );
      await workspace.start();
      await workspace.choose(workspace.events.single);
      workspace.setPersonalLink(
        'contact-one',
        'https://pay.example.test/person',
      );
      approved = false;
      await workspace.previewPersonal();
      expect(workspace.missingContacts.single.applicationId, 'application-one');
      expect(workspace.draft, isNull);
      expect(gateway.previewCalls, 0);
    },
  );

  test(
    'query change after recovery keeps the exact saved command available',
    () async {
      final query = HostResponseQueryController(_Query());
      addTearDown(query.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      final outbox = _PreparationOutbox();
      final offers = TestHostEventOfferController(
        _Offers(),
        outbox: outbox,
        accountId: 'manager',
      );
      final workspace = _preparationWorkspace(
        offerController: offers,
        query: query,
      );
      await workspace.start();
      await workspace.choose(workspace.events.single);
      final original = workspace.draft!;
      outbox.saved = HostOfferPendingCommit(
        draft: original,
        preview: const HostOfferPreview(
          planDigest: 'digest',
          rows: [
            HostOfferPreviewRow(
              offerId: 'offer-one',
              revision: 0,
              generation: 0,
              status: 'new',
            ),
          ],
        ),
        requestId: 'saved_request_001',
      );
      await workspace.choose(workspace.event!);
      query.clearSelection();
      expect(workspace.selectionStale, isTrue);
      expect(workspace.draft, same(original));
      expect(workspace.event?.eventId, 'event-one');
      expect(workspace.commitRequestId, 'saved_request_001');
      await offers.commit('saved_request_001');
      expect(offers.view.status, HostOfferFlowStatus.committed);
      expect(workspace.hasUnresolvedCommand, isFalse);
    },
  );

  test(
    'query change during a lost commit response retains exact retry identity',
    () async {
      final query = HostResponseQueryController(_Query());
      addTearDown(query.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      final outbox = _PreparationOutbox()
        ..commitGate = Completer<HostOfferCommitReceipt?>();
      final offers = TestHostEventOfferController(
        _Offers(),
        outbox: outbox,
        accountId: 'manager',
      );
      final workspace = _preparationWorkspace(
        offerController: offers,
        query: query,
      );
      await workspace.start();
      await workspace.choose(workspace.events.single);
      final original = workspace.draft!;
      final request = workspace.commitRequestId!;
      await offers.preview(
        draft: original,
        now: DateTime.fromMillisecondsSinceEpoch(1799990000000),
        eventStartsAt: _start,
      );
      final committing = offers.commit(request);
      query.clearSelection();
      outbox.commitGate!.complete(null);
      await committing;
      expect(offers.view.status, HostOfferFlowStatus.failure);
      expect(workspace.draft, same(original));
      expect(workspace.event?.eventId, 'event-one');
      expect(workspace.commitRequestId, request);
      expect(workspace.hasUnresolvedCommand, isTrue);
      await workspace.retry();
      expect(workspace.commitRequestId, request);
      outbox.commitGate = null;
      await offers.commit(request);
      expect(offers.view.status, HostOfferFlowStatus.committed);
      expect(workspace.hasUnresolvedCommand, isFalse);
    },
  );

  test(
    'query invalidation fences delayed recovery without losing its saved command',
    () async {
      final query = HostResponseQueryController(_Query());
      addTearDown(query.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      final outbox = _PreparationOutbox()..delayRecovery = true;
      final offers = TestHostEventOfferController(
        _Offers(),
        outbox: outbox,
        accountId: 'manager',
      );
      final workspace = _preparationWorkspace(
        offerController: offers,
        query: query,
      );
      await workspace.start();
      final event = workspace.events.single;
      final preparing = workspace.choose(event);
      await Future<void>.delayed(Duration.zero);
      expect(workspace.canCancelPreparation, isFalse);
      query.clearSelection();
      outbox.saved = HostOfferPendingCommit(
        draft: HostOfferBatchDraft(
          organizerId: 'org',
          eventId: 'event-one',
          rows: [
            HostOfferRow(
              organizerId: 'org',
              eventId: 'event-one',
              contactId: 'contact-one',
              sourceKind: HostOfferSourceKind.formResponse,
              sourceId: 'response-one',
              expiresAt: DateTime.fromMillisecondsSinceEpoch(1799995000000),
            ),
          ],
        ),
        preview: const HostOfferPreview(
          planDigest: 'digest',
          rows: [
            HostOfferPreviewRow(
              offerId: 'offer-one',
              revision: 0,
              generation: 0,
              status: 'new',
            ),
          ],
        ),
        requestId: 'saved_request_001',
      );
      outbox.recovery.complete(outbox.saved);
      await preparing;
      expect(offers.view.pendingRequestId, isNull);
      expect(workspace.ids, isEmpty);
      query.toggleSelection('response-one');
      await workspace.start();
      await workspace.choose(workspace.events.single);
      expect(workspace.draft, same(outbox.saved!.draft));
      expect(workspace.commitRequestId, 'saved_request_001');
      workspace.cancelPreparation();
      workspace.changeEvent();
      expect(workspace.event?.eventId, 'event-one');
      expect(workspace.hasUnresolvedCommand, isTrue);
    },
  );

  test(
    'completed receipt metadata does not block retry after an offer-list failure',
    () async {
      final outbox = _PreparationOutbox();
      final offers = TestHostEventOfferController(
        _Offers(),
        outbox: outbox,
        accountId: 'manager',
      );
      var failList = false;
      final workspace = _preparationWorkspace(
        offerController: offers,
        list: ({required organizerId, required eventId, afterOfferId}) async {
          if (failList) throw StateError('Transient list failure');
          return const {'items': <Object>[], 'nextCursor': null};
        },
      );
      await workspace.start();
      await workspace.choose(workspace.events.single);
      final draft = workspace.draft!;
      await offers.preview(
        draft: draft,
        now: DateTime.fromMillisecondsSinceEpoch(1799990000000),
        eventStartsAt: _start,
      );
      await offers.commit(workspace.commitRequestId!);
      await Future<void>.delayed(Duration.zero);
      // The offers listener fails when the host listens again.
      failList = true;
      await workspace.refreshOffers();
      expect(workspace.hasError, isTrue);
      expect(offers.view.pendingRequestId, isNotNull);
      expect(workspace.hasUnresolvedCommand, isFalse);
      failList = false;
      await workspace.retry();
      expect(workspace.hasError, isFalse);
      expect(workspace.draft, isNot(same(draft)));
      expect(workspace.commitRequestId, isNot(offers.view.pendingRequestId));
    },
  );

  test('selection starts independent reads together, listens to the '
      "people's offers once their contacts are known, and rejects late "
      'cancelled results after a new preparation', () async {
    final targets = _PreparationTargets();
    final responses = List.generate(
      2,
      (_) => Completer<HostFormResponseDetail>(),
    );
    final existing = List.generate(2, (_) => Completer<Map<String, Object?>>());
    var responseReads = 0;
    var offerReads = 0;
    final workspace = _preparationWorkspace(
      targets: targets,
      getResponse: (_) => responses[responseReads++].future,
      list: ({required organizerId, required eventId, afterOfferId}) =>
          existing[offerReads++].future,
    );
    await workspace.start();
    final event = workspace.events.single;
    final first = workspace.choose(event);
    expect(workspace.event, same(event));
    expect(workspace.stage, HostOfferWorkspaceStage.preparingOffer);
    await Future<void>.delayed(Duration.zero);
    expect(targets.configurationCalls, 1);
    expect(responseReads, 1);
    // The offers listener needs the selected contacts first.
    expect(offerReads, 0);
    await workspace.choose(event); // repeated tap must dispatch nothing
    expect(targets.configurationCalls, 1);
    workspace.cancelPreparation();
    expect(workspace.event, isNull);
    expect(workspace.stage, HostOfferWorkspaceStage.idle);
    expect(workspace.events.single, same(event));
    final second = workspace.choose(event);
    await Future<void>.delayed(Duration.zero);
    responses[1].complete(_detail('contact-current'));
    targets.configurations[1].complete(
      await _Targets().configuration(organizerId: 'org', eventId: 'event-one'),
    );
    await Future<void>.delayed(Duration.zero);
    expect(offerReads, 1);
    existing[0].complete(const {'items': <Object>[], 'nextCursor': null});
    await second;
    expect(workspace.draft!.rows.single.contactId, 'contact-current');
    responses[0].complete(_detail('contact-stale'));
    targets.configurations[0].complete(
      await _Targets().configuration(organizerId: 'org', eventId: 'event-one'),
    );
    await first;
    expect(workspace.draft!.rows.single.contactId, 'contact-current');
    expect(workspace.hasError, isFalse);
    expect(targets.listCalls, 1);
    // The cancelled preparation never listened to offers.
    expect(offerReads, 1);
  });

  test(
    'preparation retry preserves selection after a manager read fails',
    () async {
      final targets = _PreparationTargets();
      final workspace = _preparationWorkspace(targets: targets);
      await workspace.start();
      final first = workspace.choose(workspace.events.single);
      await Future<void>.delayed(Duration.zero);
      targets.configurations.single.completeError(
        FirebaseFunctionsException(
          code: 'permission-denied',
          message: 'Manager access changed',
        ),
      );
      await first;
      expect(workspace.event?.eventId, 'event-one');
      expect(workspace.draft, isNull);
      expect(workspace.hasError, isTrue);
      final retry = workspace.retry();
      await Future<void>.delayed(Duration.zero);
      targets.configurations.last.complete(
        await _Targets().configuration(
          organizerId: 'org',
          eventId: 'event-one',
        ),
      );
      await retry;
      expect(workspace.hasError, isFalse);
      expect(workspace.draft, isNotNull);
      expect(targets.listCalls, 1);
      expect(targets.configurationCalls, 2);
    },
  );

  test(
    'late application rejection blocks a draft even when other reads finish',
    () async {
      final approval = Completer<bool>();
      final workspace = _preparationWorkspace(
        getResponse: (_) async =>
            _detail('contact-one', applicationId: 'application-one'),
        reviewed: (_) => approval.future,
      );
      await workspace.start();
      final preparing = workspace.choose(workspace.events.single);
      await Future<void>.delayed(Duration.zero);
      expect(workspace.draft, isNull);
      approval.complete(false);
      await preparing;
      expect(workspace.missingContacts.single.applicationId, 'application-one');
      expect(workspace.draft, isNull);
    },
  );

  for (final withdrawn in [false, true]) {
    test(
      'fresh ${withdrawn ? 'withdrawn' : 'revoked'} response blocks preparation',
      () async {
        final workspace = _preparationWorkspace(
          getResponse: (_) async => _detail(
            'contact-one',
            status: withdrawn
                ? HostFormResponseStatus.withdrawn
                : HostFormResponseStatus.submitted,
            origin: withdrawn
                ? HostFormDataOrigin.respondentGranted
                : HostFormDataOrigin.revoked,
          ),
        );
        await workspace.start();
        await workspace.choose(workspace.events.single);
        expect(workspace.hasError, isTrue);
        expect(workspace.draft, isNull);
        expect(workspace.selectedOffer, isNull);
      },
    );
  }

  test('Back disposal does not publish delayed manager data', () async {
    final targets = _PreparationTargets();
    final workspace = _preparationWorkspace(
      targets: targets,
      autoDispose: false,
    );
    await workspace.start();
    var notifications = 0;
    workspace.addListener(() => notifications++);
    final preparing = workspace.choose(workspace.events.single);
    await Future<void>.delayed(Duration.zero);
    final notifier = workspace.notifier;
    final selected = workspace.events.single;
    workspace.dispose();
    // Callbacks captured by a removed screen must not restart its work.
    await notifier.loadEvents();
    await notifier.choose(selected);
    await notifier.returnForConversion('response-one');
    await notifier.refreshOffers();
    await notifier.openSettings();
    notifier.changeEvent();
    notifier.closeExisting();
    notifier.setPersonalLink('contact-one', 'https://example.com/pay');
    final before = notifications;
    targets.configurations.single.complete(
      await _Targets().configuration(organizerId: 'org', eventId: 'event-one'),
    );
    await preparing;
    expect(notifications, before);
    expect(workspace.draft, isNull);
  });

  test(
    'approval reads are bounded to four and cancellation stops later batches',
    () async {
      final pending = <Completer<bool>>[];
      var current = true;
      final preparing = HostOfferWorkspacePolicy.missingContacts(
        details: List.generate(
          9,
          (index) => _detail('contact-$index', responseId: 'response-$index'),
        ),
        isResponseReviewed: (_) {
          final next = Completer<bool>();
          pending.add(next);
          return next.future;
        },
        isCurrent: () => current,
      );
      expect(pending.length, 4);
      current = false;
      final failure = expectLater(preparing, throwsStateError);
      for (final read in pending) {
        read.complete(true);
      }
      await failure;
      expect(pending.length, 4);
    },
  );

  testWidgets('recipient chooser orders existing events first and keeps '
      'preparation visible and cancellable', (tester) async {
    final targets = _PreparationTargets();
    final offers = TestHostEventOfferController(_Offers());
    addTearDown(offers.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            child: TestHostEventOfferWorkspaceSection(
              organizerId: 'org',
              accountId: 'manager',
              responseId: 'response-one',
              recipientLabel: 'Kabir',
              offerController: offers,
              initiallyReviewSelection: true,
              targets: targets,
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
                    blockers: [],
                  ),
              copyMessage: (_) async {},
              openHandoff: (_) async => false,
              getResponseDetail: (_) async => _detail('contact-one'),
              openResponseForConversion: (_) async {},
              openEventSettings: (_) async {},
              onCreateEvent: () async {},
              copy: _copy,
              now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Choose an event for Kabir'), findsOneWidget);
    final target = find.byKey(const ValueKey('offer-target-event-one'));
    final create = find.byKey(const ValueKey('offer-create-event'));
    expect(
      tester.getTopLeft(target).dy,
      lessThan(tester.getTopLeft(create).dy),
    );
    await tester.tap(target);
    await pumpFeatureUi(tester);
    expect(find.text('Sunday run'), findsOneWidget);
    expect(find.text('Preparing offer'), findsOneWidget);
    expect(find.text('Configure payment'), findsNothing);
    expect(create, findsNothing);
    await tester.tap(find.byKey(const ValueKey('offer-cancel-preparation')));
    await pumpFeatureUi(tester);
    targets.configurations.single.complete(
      await _Targets().configuration(organizerId: 'org', eventId: 'event-one'),
    );
    await pumpFeatureUi(tester);
    expect(target, findsOneWidget);
    expect(find.text('Preview offers'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

class _PreparationTargets extends _Targets {
  final configurations = <Completer<HostOfferEventConfiguration>>[];
  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) {
    configurationCalls++;
    final pending = Completer<HostOfferEventConfiguration>();
    configurations.add(pending);
    return pending.future;
  }
}

@Dependencies([HostEventOfferWorkspaceController])
TestHostEventOfferWorkspaceController _preparationWorkspace({
  bool autoDispose = true,
  TestHostEventOfferController? offerController,
  HostResponseQueryController? query,
  HostOfferEventTargetsGateway? targets,
  Future<HostFormResponseDetail> Function(String)? getResponse,
  Future<bool> Function(HostFormResponseDetail)? reviewed,
  Future<Map<String, Object?>> Function({
    required String organizerId,
    required String eventId,
    String? afterOfferId,
  })?
  list,
}) {
  final offers = offerController ?? TestHostEventOfferController(_Offers());
  final workspace = TestHostEventOfferWorkspaceController(
    organizerId: 'org',
    accountId: 'manager',
    responseId: query == null ? 'response-one' : null,
    queryController: query,
    offerController: offers,
    targets: targets ?? _Targets(),
    listOffers:
        list ??
        ({required organizerId, required eventId, afterOfferId}) async =>
            const {'items': <Object>[], 'nextCursor': null},
    getOffer:
        ({required organizerId, required eventId, required contactId}) async =>
            _existingOffer(),
    prepareHandoff: ({required offer}) async => const HostOfferHandoff(
      kind: 'blocked',
      offerId: 'offer-one',
      blockers: [],
    ),
    copyMessage: (_) async {},
    openHandoff: (_) async => false,
    getResponseDetail: getResponse ?? (_) async => _detail('contact-one'),
    isResponseReviewed: reviewed,
    openResponseForConversion: (_) async {},
    openEventSettings: (_) async {},
    now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
  );
  addTearDown(offers.dispose);
  if (autoDispose) addTearDown(workspace.dispose);
  return workspace;
}

class _PreparationOutbox implements HostOfferCommitOutbox {
  bool delayRecovery = false;
  Completer<HostOfferCommitReceipt?>? commitGate;
  HostOfferPendingCommit? saved;
  final recovery = Completer<HostOfferPendingCommit?>();
  @override
  Future<HostOfferPendingCommit?> pending({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) {
    if (delayRecovery) {
      delayRecovery = false;
      return recovery.future;
    }
    return Future.value(saved);
  }

  @override
  Future<HostOfferCommitReceipt?> submit({
    required String accountId,
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  }) async {
    saved = HostOfferPendingCommit(
      draft: draft,
      preview: preview,
      requestId: requestId,
    );
    if (commitGate != null) return commitGate!.future;
    saved = null;
    return HostOfferCommitReceipt(
      organizerId: draft.organizerId,
      eventId: draft.eventId,
      requestId: requestId,
      results: const [
        HostOfferPreviewRow(
          offerId: 'offer-one',
          revision: 1,
          generation: 1,
          status: 'committed',
        ),
      ],
    );
  }
}

class _PersonalTargets extends _Targets {
  Future<void>? gate;
  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) async {
    final base = await super.configuration(
      organizerId: organizerId,
      eventId: eventId,
    );
    if (gate != null) await gate;
    return HostOfferEventConfiguration(
      organizerId: base.organizerId,
      eventId: base.eventId,
      eventSourceRevision: base.eventSourceRevision,
      startsAt: base.startsAt,
      serverNow: base.serverNow,
      suggestedExpiresAt: base.suggestedExpiresAt,
      paymentTerms: {
        ...base.paymentTerms!,
        'preferredCollection': 'personalRequest',
      },
    );
  }
}
