part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerCommunicationsTests() {
  testWidgets('customer timeline joins form and reply history', (tester) async {
    final opened = <String>[];
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerTimelineSection(
          customer: _customerDetail(),
          onOpenFormResponse: (id) => opened.add('form:$id'),
          onOpenEvent: (id) => opened.add('event:$id'),
          onOpenCatchThread: (id) => opened.add('chat:$id'),
          onOpenWhatsappThread: (_) {},
        ),
      ),
    );

    expect(find.text('Message received'), findsOneWidget);
    expect(find.text('Sunday Run sign-up'), findsOneWidget);
    expect(find.text('See you there!'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('See you there!')).dy,
      lessThan(tester.getTopLeft(find.text('Sunday Run Club')).dy),
    );
    await tester.tap(find.text('See you there!'));
    await tester.tap(find.text('Sunday Run Club'));
    await tester.tap(find.text('Sunday Run sign-up'));
    expect(opened, ['chat:match-1', 'event:event-1', 'form:response-1']);
  });

  testWidgets(
    'customer detail separates overview, details, memory and history',
    (tester) async {
      tester.view.physicalSize = const Size(390, 3600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final detail = _customerDetail();
      await _pumpHostScreen(
        tester,
        const HostCustomerDetailScreen(
          organizerId: 'organizer-1',
          contactId: 'contact-1',
        ),
        overrides: [
          firebaseAuthProvider.overrideWithValue(
            MockFirebaseAuth(mockUser: MockUser(uid: _hostUid), signedIn: true),
          ),
          uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
          hostAudienceContactDetailProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(detail)),
          hostCommunicationPlanProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
        ],
      );

      expect(find.byType(HostCustomerIdentityCard), findsNothing);
      final memoryY = tester
          .getTopLeft(find.byType(HostCustomerMemoryPreview))
          .dy;
      final activityY = tester
          .getTopLeft(find.byType(HostCustomerOverviewSectionList))
          .dy;
      expect(activityY, lessThan(memoryY));
      expect(find.byType(HostCustomerOverviewSectionList), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-customer-controls')),
        findsNothing,
      );
      await tester.tap(
        find.byKey(const ValueKey('host-customer-memory-preview')),
      );
      await pumpFeatureUi(tester);
      expect(find.byType(HostCustomerMemorySection), findsOneWidget);
      expect(find.byType(HostCustomerOverviewSectionList), findsNothing);
      await tester.ensureVisible(find.text('History'));
      await tester.tap(find.text('History'));
      await pumpFeatureUi(tester);
      expect(find.byType(HostCustomerTimelineSection), findsOneWidget);
      expect(find.byType(HostCustomerOverviewSectionList), findsNothing);
      expect(
        find.byKey(const ValueKey('host-customer-controls')),
        findsNothing,
      );
      final copy = AppLocalizationsEn();
      expect(find.text(copy.hostsHostAudienceRemoveAction), findsNothing);
      await tester.tap(
        find.byKey(const ValueKey('host-customer-record-actions')),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text(copy.hostsHostAudienceRemoveAction));
      await pumpFeatureUi(tester);
      expect(find.text(copy.hostsHostAudienceRemoveTitle), findsOneWidget);
      expect(find.text(copy.hostsHostAudienceRemoveBody), findsOneWidget);
      await tester.tap(
        find.text(copy.coreCatchAdaptiveDialogVisiblecopyCancel),
      );
      await pumpFeatureUi(tester);
      await tester.ensureVisible(find.text('Overview'));
      await tester.tap(find.text('Overview'));
      await pumpFeatureUi(tester);
      expect(find.byType(HostCustomerMemoryPreview), findsOneWidget);
      expect(find.byType(HostCustomerTimelineSection), findsNothing);
    },
  );

  testWidgets('customer detail exposes only the recommended message route', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pumpHostScreen(
      tester,
      const HostCustomerDetailScreen(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(_customerDetail())),
        hostCommunicationPlanProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(
          AsyncData(
            _individualCommunicationPlan(whatsappHandoffAvailable: false),
          ),
        ),
      ],
    );

    expect(find.text('Message'), findsOneWidget);
    expect(find.text('Message Ananya Rao'), findsNothing);
    expect(find.byType(HostCustomerReachSection), findsNothing);
    await tester.tap(find.text('Details'));
    await pumpFeatureUi(tester);
    expect(find.text('Opens the Catch conversation.'), findsOneWidget);
    expect(find.byKey(const ValueKey('host-customer-message')), findsOneWidget);
    expect(
      find.ancestor(
        of: find.byKey(const ValueKey('host-customer-message')),
        matching: find.byType(CatchLegacyTopBar),
      ),
      findsOneWidget,
    );
    expect(find.text('You press send'), findsNothing);
  });

  testWidgets(
    'wide customer detail gives attendance and spend separate sections',
    (tester) async {
      tester.view.physicalSize = const Size(1000, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await _pumpHostScreen(
        tester,
        const HostCustomerDetailScreen(
          organizerId: 'organizer-1',
          contactId: 'contact-1',
        ),
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
          hostAudienceContactDetailProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_customerDetail())),
          hostCommunicationPlanProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
        ],
      );

      final overview = find.byType(HostCustomerOverviewSectionList);
      final attendance = find.descendant(
        of: overview,
        matching: find.text('Attended'),
      );
      final spend = find.descendant(
        of: overview,
        matching: find.text('RECORDED SPEND'),
      );
      expect(attendance, findsOneWidget);
      expect(spend, findsOneWidget);
      expect(
        tester.getTopLeft(attendance).dy,
        lessThan(tester.getTopLeft(spend).dy),
      );
      expect(
        tester.getRect(attendance).left,
        closeTo(tester.getRect(spend).left, 0.5),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('customer WhatsApp handoff pre-fills copy and opens the app', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    Uri? launchedUri;
    final lifecycle = <String>[];
    final functions = _ManualHandoffTestFunctions(lifecycle)
      ..responses['prepareOrganizerManualSendTask'] =
          _manualHandoffTaskResponse()
      ..responses['openOrganizerManualSendTask'] = _manualHandoffTaskResponse(
        status: 'handoffOpened',
        revision: 2,
        openCount: 1,
        openedAtMillis: 1700000000500,
      );
    final detail = _customerDetail(phoneE164: '+91 98765 43210');

    await _pumpHostScreen(
      tester,
      const HostCustomerDetailScreen(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(detail)),
        hostCommunicationPlanProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(
          AsyncData(_individualCommunicationPlan(catchChatAvailable: false)),
        ),
        firebaseFunctionsProvider.overrideWithValue(functions),
        hostCommunicationRepositoryProvider.overrideWithValue(
          HostCommunicationRepository(functions),
        ),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          lifecycle.add('launch');
          launchedUri = uri;
          return true;
        }),
      ],
    );

    await tester.tap(find.byKey(const ValueKey('host-customer-message')));
    await pumpFeatureUi(tester);

    expect(find.text('WhatsApp app'), findsOneWidget);
    expect(find.textContaining('You review it and press Send'), findsWidgets);
    final messageInput = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-whatsapp-message')),
        matching: find.byType(TextField),
      ),
    );
    expect(messageInput.controller?.text, 'Hi Ananya Rao,');

    await tester.tap(
      find.byKey(const ValueKey('host-customer-confirm-whatsapp')),
    );
    await pumpFeatureUi(tester);

    expect(launchedUri?.scheme, 'whatsapp');
    expect(launchedUri?.host, 'send');
    expect(launchedUri?.queryParameters['phone'], '919876543210');
    expect(launchedUri?.queryParameters['text'], 'Hi Ananya Rao,');
    expect(lifecycle, [
      'call:prepareOrganizerManualSendTask',
      'launch',
      'call:openOrganizerManualSendTask',
    ]);
    final prepare = functions.calls['prepareOrganizerManualSendTask']!.single;
    expect(prepare['organizerId'], 'organizer-1');
    expect(prepare['contactId'], 'contact-1');
    expect(prepare['intent'], 'individualConversation');
    expect(prepare['prefillText'], 'Hi Ananya Rao,');
    expect(
      functions.calls['openOrganizerManualSendTask']!.single,
      containsPair('expectedRevision', 1),
    );
  });

  testWidgets('customer email handoff pre-fills copy and records the attempt', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    Uri? launchedUri;
    final lifecycle = <String>[];
    final functions = _ManualHandoffTestFunctions(lifecycle)
      ..responses['recordOrganizerContactOutreach'] = <String, Object?>{
        'organizerId': 'organizer-1',
        'contactId': 'contact-1',
        'outreachId': 'outreach-1',
        'channel': 'email',
        'outcome': 'attempted',
        'note': null,
        'authorUid': _hostUid,
        'occurredAtMillis': 1700000000000,
        'createdAtMillis': 1700000000000,
        'updatedAtMillis': 1700000000000,
        'revision': 1,
      };
    final detail = _customerDetail(email: 'ananya@example.com');

    await _pumpHostScreen(
      tester,
      const HostCustomerDetailScreen(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(detail)),
        hostCommunicationPlanProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(
          AsyncData(
            _individualCommunicationPlan(
              catchChatAvailable: false,
              whatsappHandoffAvailable: false,
              emailHandoffAvailable: true,
            ),
          ),
        ),
        firebaseFunctionsProvider.overrideWithValue(functions),
        hostContactsRepositoryProvider.overrideWithValue(
          HostContactsRepository(functions),
        ),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          lifecycle.add('launch');
          launchedUri = uri;
          return true;
        }),
      ],
    );

    await tester.tap(find.byKey(const ValueKey('host-customer-message')));
    await pumpFeatureUi(tester);

    expect(find.text('Email app'), findsOneWidget);
    expect(
      find.textContaining('Ananya Rao · ananya@example.com'),
      findsOneWidget,
    );
    final messageInput = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-email-message')),
        matching: find.byType(TextField),
      ),
    );
    expect(messageInput.controller?.text, 'Hi Ananya Rao,');

    await tester.tap(find.byKey(const ValueKey('host-customer-confirm-email')));
    await pumpFeatureUi(tester);

    expect(launchedUri?.scheme, 'mailto');
    expect(launchedUri?.path, 'ananya@example.com');
    expect(launchedUri?.queryParameters['body'], 'Hi Ananya Rao,');
    expect(lifecycle, ['launch', 'call:recordOrganizerContactOutreach']);
    final outreach = functions.calls['recordOrganizerContactOutreach']!.single;
    expect(outreach['organizerId'], 'organizer-1');
    expect(outreach['contactId'], 'contact-1');
    expect(outreach['channel'], 'email');
    expect(outreach['outcome'], 'attempted');
    expect(tester.takeException(), isNull);
  });
}

class _ManualHandoffTestFunctions extends Fake implements FirebaseFunctions {
  _ManualHandoffTestFunctions(this.lifecycle);

  final List<String> lifecycle;
  final Map<String, Object?> responses = {};
  final Map<String, List<Map<Object?, Object?>>> calls = {};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _ManualHandoffTestCallable(
        name: name,
        lifecycle: lifecycle,
        response: () => responses[name],
        calls: calls.putIfAbsent(name, () => []),
      );
}

class _ManualHandoffTestCallable extends Fake implements HttpsCallable {
  _ManualHandoffTestCallable({
    required this.name,
    required this.lifecycle,
    required this.response,
    required this.calls,
  });

  final String name;
  final List<String> lifecycle;
  final Object? Function() response;
  final List<Map<Object?, Object?>> calls;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    lifecycle.add('call:$name');
    calls.add(parameters as Map<Object?, Object?>);
    return _ManualHandoffTestCallableResult<T>(response() as T);
  }
}

class _ManualHandoffTestCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  _ManualHandoffTestCallableResult(this.value);

  final T value;

  @override
  T get data => value;
}

Map<String, Object?> _manualHandoffTaskResponse({
  String status = 'queued',
  int revision = 1,
  int openCount = 0,
  int? openedAtMillis,
}) => {
  'organizerId': 'organizer-1',
  'taskId': 'task-1',
  'contactId': 'contact-1',
  'displayName': 'Ananya Rao',
  'routeId': 'personalWhatsappHandoff',
  'deliveryMode': 'byHand',
  'status': status,
  'active': true,
  'revision': revision,
  'phoneE164': '+919876543210',
  'prefillText': 'Hi Ananya Rao,',
  'openCount': openCount,
  'createdAtMillis': 1700000000000,
  'updatedAtMillis': 1700000000000,
  'openedAtMillis': openedAtMillis,
  'expiresAtMillis': 1702592000000,
};
