part of 'host_customer_hit_targets_test.dart';

const _actor = 'hit-target-host';
const _organizer = 'hit-target-organizer';
final _copy = AppLocalizationsEn();
final _detail = find.byType(HostCustomerDetailScreen);
final _detailMenu = find.byKey(const ValueKey('host-customer-record-actions'));
final _offline = find.byKey(
  const ValueKey('status_strip.connectivity.offline'),
);

String _peopleLocation({bool selected = true}) => Uri(
  path: Routes.hostAudienceScreen.path,
  queryParameters: {
    'organizerId': _organizer,
    if (selected) 'contactId': 'person-0',
  },
).toString();

typedef _CrmHarness = ({
  GoRouter router,
  StreamController<List<ConnectivityResult>> connectivity,
});

Future<_CrmHarness> _pumpCrm(
  WidgetTester tester, {
  double width = 1600,
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 1000);
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  final connectivity = StreamController<List<ConnectivityResult>>();
  final router = GoRouter(
    initialLocation: _peopleLocation(),
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) => HostAppShell(
          navigationShell: navigationShell,
          requestedOrganizerId: _organizer,
        ),
        branches: [
          _unusedBranch('/host/today'),
          _unusedBranch('/host/events'),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.hostAudienceScreen.path,
                name: Routes.hostAudienceScreen.name,
                builder: (_, state) => hostAudienceScreenForUri(state.uri),
              ),
            ],
          ),
          _unusedBranch('/host/inbox'),
          _unusedBranch('/host/organizer'),
        ],
      ),
    ],
  );
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value(_actor)),
      hostOperableOrganizersProvider(_actor).overrideWithValue(
        AsyncData([buildOrganizer(id: _organizer, ownerUserId: _actor)]),
      ),
      hostContactsRepositoryProvider.overrideWithValue(_Contacts()),
      hostMessagingSetupProvider(
        _organizer,
      ).overrideWithValue(const AsyncLoading()),
      hostCommunicationPlanProvider(_organizer, 'person-0').overrideWithValue(
        AsyncError(
          StateError('Messaging unavailable in this fixture'),
          StackTrace.empty,
        ),
      ),
      totalUnreadCountProvider(_actor).overrideWithValue(0),
      appShellFcmInitializationProvider(
        _actor,
        router,
      ).overrideWith((ref) async {}),
      errorLoggerProvider.overrideWithValue(ErrorLogger()),
      appAnalyticsProvider.overrideWithValue(AppAnalytics()),
      appConnectivityProvider.overrideWith((ref) => connectivity.stream),
      forceUpdateRequiredProvider.overrideWith((ref) => const AsyncData(false)),
      profileLocationInitializerProvider.overrideWith(_NoLocation.new),
    ],
  );
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    router.dispose();
    container.dispose();
    await connectivity.close();
  });
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MyApp(routerProvider: Provider<GoRouter>((ref) => router)),
    ),
  );
  connectivity.add([ConnectivityResult.wifi]);
  await pumpFeatureUi(tester);
  expect(_detail, findsOneWidget);
  expect(_detailMenu, findsOneWidget);
  expect(tester.takeException(), isNull);
  return (router: router, connectivity: connectivity);
}

StatefulShellBranch _unusedBranch(String path) => StatefulShellBranch(
  routes: [GoRoute(path: path, builder: (_, _) => const SizedBox.shrink())],
);

class _NoLocation extends ProfileLocationInitializer {
  @override
  Future<void> build() async {}
}

Future<void> _tapCenter(WidgetTester tester, Finder target) async {
  expect(target, findsOneWidget);
  final center = tester.getCenter(target);
  final path = tester.hitTestOnBinding(center).path.join('\n');
  expect(
    target.hitTestable(),
    findsOneWidget,
    reason: 'Center $center hit:\n$path',
  );
  await tester.tap(target);
}

Future<void> _openDetailMenu(WidgetTester tester) async {
  await _tapCenter(tester, _detailMenu);
  await pumpFeatureUi(tester);
  expect(find.text(_copy.hostCustomersLogOutreach), findsOneWidget);
}

Future<void> _openIndexMenu(WidgetTester tester) async {
  final menu = find.descendant(
    of: find.byType(HostAudienceHeader),
    matching: find.byType(CatchActionMenu<HostAudienceMenuAction>),
  );
  await _tapCenter(tester, menu);
  await pumpFeatureUi(tester);
  expect(find.text(_copy.hostCustomersReviewDuplicates), findsOneWidget);
}

Future<void> _dismissMenu(WidgetTester tester, String visibleItem) async {
  await tester.sendKeyEvent(LogicalKeyboardKey.escape);
  await pumpFeatureUi(tester);
  expect(find.text(visibleItem), findsNothing);
}

Future<void> _dismissPointerMenu(
  WidgetTester tester,
  String visibleItem,
) async {
  final panel = find.byWidgetPredicate(
    (widget) => widget is CatchMenu<Object?> && widget.builder == null,
  );
  expect(panel, findsOneWidget);
  // The app's top-left corner is outside both CRM menus. Dispatch a real
  // outside pointer event; hardware Escape remains covered by keyboard cases.
  const outside = Offset(1, 1);
  expect(tester.getRect(panel).contains(outside), isFalse);
  await tester.tapAt(outside);
  await pumpFeatureUi(tester);
  expect(find.text(visibleItem), findsNothing);
}

void _expectSearchContinuity(
  WidgetTester tester,
  Finder search,
  TextEditingValue expectedValue,
  Element originalElement,
) {
  expect(search, findsOneWidget);
  final current = tester.widget<EditableText>(search);
  final reason =
      'Editor identity changed: ${!identical(tester.element(search), originalElement)}; '
      'current focus: ${current.focusNode.hasFocus}; '
      'current value: ${current.controller.value}; '
      'primary focus: ${FocusManager.instance.primaryFocus}';
  expect(current.focusNode.hasFocus, isTrue, reason: reason);
  expect(current.controller.value, expectedValue, reason: reason);
}

Future<void> _showNotes(WidgetTester tester) async {
  await _tapCenter(
    tester,
    find.descendant(
      of: find.byType(HostCustomerDetailTabBar),
      matching: find.text(_copy.hostCustomersNotes),
    ),
  );
  await pumpFeatureUi(tester);
  expect(find.byKey(const ValueKey('host-customer-memory')), findsOneWidget);
}

bool _focusWithin(Finder target) {
  final owner = target.evaluate().single;
  final context = FocusManager.instance.primaryFocus?.context;
  if (context == null) return false;
  if (identical(context, owner)) return true;
  var found = false;
  context.visitAncestorElements((element) {
    if (identical(element, owner)) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

Future<void> _tabTo(WidgetTester tester, Finder target) async {
  // Bounded traversal through actual shell, index and detail focus targets.
  // No requestFocus or synthetic activation bypasses reachability.
  for (var step = 0; step < 100; step++) {
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await pumpFeatureUi(tester);
    if (_focusWithin(target)) return;
  }
  fail(
    'Tab did not reach $target; primary focus: ${FocusManager.instance.primaryFocus}',
  );
}

void _expectHeaderBounds(WidgetTester tester) {
  final detailBounds = tester.getRect(_detail);
  final menuBounds = tester.getRect(_detailMenu);
  final detailRail = tester.getRect(find.byType(HostCustomerDetailTabBar));
  final indexRail = tester.getRect(find.byType(HostAudienceTabRail));
  expect(detailBounds.contains(menuBounds.center), isTrue);
  expect(menuBounds.bottom, lessThanOrEqualTo(detailRail.top));
  expect(menuBounds.overlaps(indexRail), isFalse);
  expect(
    tester.getRect(find.byType(HostAudienceHeader)).overlaps(detailBounds),
    isFalse,
  );
}

ScrollPosition _workspaceHorizontalPosition(WidgetTester tester) {
  final owner = find.byType(CatchNavigationViewport).evaluate().single;
  final scroll = find.byElementPredicate((element) {
    final widget = element.widget;
    if (widget is! SingleChildScrollView ||
        widget.scrollDirection != Axis.horizontal) {
      return false;
    }
    var belongsToWorkspace = false;
    element.visitAncestorElements((ancestor) {
      if (identical(ancestor, owner)) {
        belongsToWorkspace = true;
        return false;
      }
      if (ancestor.widget is Scrollable) return false;
      return true;
    });
    return belongsToWorkspace;
  });
  // The workspace owns this controller; peer tab rails use their own scrolls.
  expect(scroll, findsOneWidget);
  return tester.widget<SingleChildScrollView>(scroll).controller!.position;
}

class _Contacts extends Fake implements HostContactsRepository {
  static const count = 24;

  @override
  Future<HostCrmSummary> getSummary(String organizerId) async => HostCrmSummary(
    organizerId: organizerId,
    contactCount: count,
    pastAttendeeCount: 0,
    repeatAttendeeCount: 0,
    linkedAccountCount: 0,
    importedContactCount: 0,
    whatsappOptInCount: 0,
    smsOptInCount: 0,
    truncated: false,
    inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
    whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
    smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
  );

  @override
  Future<({int count, HostAudienceMatchCountCoverage coverage})> countContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async => (count: count, coverage: HostAudienceMatchCountCoverage.exact);

  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async => HostAudiencePage(
    organizerId: organizerId,
    contacts: [
      for (var index = 0; index < count; index++)
        HostAudienceContact(
          contactId: 'person-$index',
          displayName: 'Person $index',
          phoneE164: null,
          email: null,
          identityState: HostAudienceIdentityState.unlinked,
          identityConfidence: 'unverified',
          ambiguousCandidateCount: 0,
          attendedEventCount: 0,
          expectedEventCount: 0,
          lastAttendedAt: null,
          segments: const {},
          whatsappStatus: HostAudiencePermissionStatus.unknown,
          whatsappAdminSuppressed: false,
          smsStatus: HostAudiencePermissionStatus.unknown,
          sourceCoverage: HostAudienceSourceCoverage.exact,
          revision: 1,
        ),
    ],
    nextCursor: null,
    matchCount: count,
    matchCountCoverage: HostAudienceMatchCountCoverage.exact,
    sourceCoverage: HostAudienceSourceCoverage.exact,
    projectionVersion: 1,
  );

  @override
  Future<HostAudienceContactDetail> getContactOverview(
    String organizerId,
    String contactId,
  ) async {
    final detail = hostCustomerSkeletonDetail(
      organizerId: organizerId,
      contactId: contactId,
      displayName: 'Person 0',
      manualTagLabel: 'Regular guest',
      noteBody: 'First conversation',
    );
    // Real CRM records make the production Notes pane scroll at both scales.
    // This fresh fixture owns the list; no application state is mutated.
    detail.notes.addAll([
      for (var index = 0; index < 16; index++)
        HostCustomerNote(
          noteId: 'note-$index',
          body: 'Conversation $index: interested in the next community event.',
          authorUid: _actor,
          createdAt: DateTime(2026, 8, 17),
          updatedAt: DateTime(2026, 8, 17),
          revision: 1,
        ),
    ]);
    return detail;
  }
}
