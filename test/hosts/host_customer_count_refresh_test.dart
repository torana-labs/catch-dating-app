import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../clubs/clubs_test_helpers.dart';
import '../test_pump_helpers.dart';

const _organizer = 'organizer-1';
const _otherOrganizer = 'organizer-2';
const _uid = 'host-1';

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  testWidgets('create acknowledgement refreshes retained People counts once', (
    tester,
  ) async {
    final repository = _ContactsRepository();
    final harness = await _pumpPeople(tester, repository);
    final peopleState = tester.state(find.byType(HostCustomersScreen));
    _expectCounts(tester, all: 2, newPeople: 1);

    await _openAndSubmitCustomer(tester);
    expect(repository.creates, 1);
    expect(repository.countReads, {_organizer: 1, _otherOrganizer: 1});
    expect(repository.summaryReads[_organizer], 1);
    expect(repository.directoryReads[_organizer], 1);
    expect(
      tester.state(find.byType(HostCustomersScreen, skipOffstage: false)),
      same(peopleState),
    );

    repository.acknowledgeCreate();
    await pumpFeatureUi(tester);
    expect(find.byType(HostAddCustomerScreen), findsNothing);
    expect(tester.state(find.byType(HostCustomersScreen)), same(peopleState));
    expect(
      harness.router.routeInformationProvider.value.uri.queryParameters,
      containsPair('contactId', 'created-contact'),
    );
    // The detail pane is now selected. Inspect the retained index rather than
    // remounting People, which would hide a missed count invalidation.
    _expectCounts(tester, all: 3, newPeople: 2);
    expect(repository.countReads, {_organizer: 2, _otherOrganizer: 1});
    expect(repository.summaryReads[_organizer], 2);
    expect(repository.directoryReads[_organizer], 2);
    _expectOtherOrganizerUnchanged(harness);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cancelled creation does not refetch counts', (tester) async {
    final repository = _ContactsRepository();
    final harness = await _pumpPeople(tester, repository);
    final peopleState = tester.state(find.byType(HostCustomersScreen));
    await _openCustomer(tester);
    harness.router.pop();
    await pumpFeatureUi(tester);

    expect(tester.state(find.byType(HostCustomersScreen)), same(peopleState));
    expect(repository.creates, 0);
    _expectNoRefresh(repository);
    _expectCounts(tester, all: 2, newPeople: 1);
    _expectOtherOrganizerUnchanged(harness);
  });

  testWidgets('failed creation keeps the form and does not refetch counts', (
    tester,
  ) async {
    final repository = _ContactsRepository();
    final harness = await _pumpPeople(tester, repository);
    await _openAndSubmitCustomer(tester);
    repository.creation.completeError(StateError('create rejected'));
    await pumpFeatureUi(tester);

    expect(find.byType(HostAddCustomerScreen), findsOneWidget);
    expect(repository.creates, 1);
    _expectNoRefresh(repository);
    harness.router.pop();
    await pumpFeatureUi(tester);
    _expectNoRefresh(repository);
    _expectCounts(tester, all: 2, newPeople: 1);
    _expectOtherOrganizerUnchanged(harness);
    expect(tester.takeException(), isNull);
  });

  testWidgets('coverage refresh reloads summary and scoped New count', (
    tester,
  ) async {
    final repository = _ContactsRepository()
      ..coverage = HostAudienceSourceCoverage.partial;
    final harness = await _pumpPeople(tester, repository);
    repository.addStoredCustomer();
    final refresh = find.byKey(
      const ValueKey('host-customers-refresh-coverage'),
    );
    await tester.ensureVisible(refresh);
    await pumpFeatureUi(tester);
    expect(refresh.hitTestable(), findsOneWidget);
    await tester.tap(refresh);
    await pumpFeatureUi(tester);

    _expectCounts(tester, all: 3, newPeople: 2);
    expect(repository.summaryReads[_organizer], 2);
    expect(repository.directoryReads[_organizer], 2);
    expect(repository.countReads, {_organizer: 2, _otherOrganizer: 1});
    _expectOtherOrganizerUnchanged(harness);
  });

  testWidgets('summary retry refreshes its independently cached New count', (
    tester,
  ) async {
    final repository = _ContactsRepository()..failSummary = true;
    final harness = await _pumpPeople(tester, repository);
    expect(repository.countReads[_organizer], 1);
    repository.failSummary = false;
    repository.addStoredCustomer();
    await tester.tap(find.text('Reload customers'));
    await pumpFeatureUi(tester);

    _expectCounts(tester, all: 3, newPeople: 2);
    expect(repository.summaryReads[_organizer], 2);
    expect(repository.directoryReads[_organizer], 1);
    expect(repository.countReads, {_organizer: 2, _otherOrganizer: 1});
    _expectOtherOrganizerUnchanged(harness);
  });
}

Future<({ProviderContainer container, GoRouter router})> _pumpPeople(
  WidgetTester tester,
  _ContactsRepository repository,
) async {
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWithValue(const AsyncData(_uid)),
      hostOperableClubsProvider(_uid).overrideWithValue(
        AsyncData([buildClub(id: _organizer, ownerUserId: _uid)]),
      ),
      hostContactsRepositoryProvider.overrideWithValue(repository),
      hostMessagingSetupProvider(
        _organizer,
      ).overrideWithValue(const AsyncLoading()),
      // Detail content is outside this count contract; avoid any live reads
      // after the real editor returns its acknowledged customer identity.
      hostAudienceContactDetailProvider(
        _organizer,
        'created-contact',
      ).overrideWithValue(
        AsyncError(StateError('detail not loaded'), StackTrace.empty),
      ),
    ],
  );
  addTearDown(container.dispose);
  final other = container.listen(_newCount(_otherOrganizer), (_, _) {});
  addTearDown(other.close);
  final router = GoRouter(
    initialLocation: Routes.hostAudienceScreen.path,
    routes: [
      GoRoute(
        path: Routes.hostAudienceScreen.path,
        name: Routes.hostAudienceScreen.name,
        builder: (_, state) => HostCustomersScreen(
          initialOrganizerId: _organizer,
          initialContactId: state.uri.queryParameters['contactId'],
        ),
      ),
      GoRoute(
        path: Routes.hostAddCustomerScreen.path,
        name: Routes.hostAddCustomerScreen.name,
        builder: (_, state) => HostAddCustomerScreen(
          organizerId: state.uri.queryParameters['organizerId']!,
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
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
  await pumpFeatureUi(tester);
  expect(repository.countReads, {_organizer: 1, _otherOrganizer: 1});
  return (container: container, router: router);
}

HostCustomerSegmentCountProvider _newCount(String organizerId) =>
    hostCustomerSegmentCountProvider(
      HostCustomerSegmentCountRequest(
        organizerId: organizerId,
        filter: HostCustomerFilter.newToOrganizer,
      ),
    );

void _expectOtherOrganizerUnchanged(
  ({ProviderContainer container, GoRouter router}) harness,
) => expect(
  harness.container.read(_newCount(_otherOrganizer)).requireValue.count,
  3,
);

void _expectCounts(
  WidgetTester tester, {
  required int all,
  required int newPeople,
}) {
  final summary = tester.widget<HostCustomersSummarySection>(
    find.byType(HostCustomersSummarySection, skipOffstage: false),
  );
  expect(summary.summary.requireValue.contactCount, all);
  expect(summary.newCustomerCount?.count, newPeople);
  expect(find.text('All  $all', skipOffstage: false), findsOneWidget);
  expect(find.text('New  $newPeople', skipOffstage: false), findsOneWidget);
}

void _expectNoRefresh(_ContactsRepository repository) {
  expect(repository.countReads, {_organizer: 1, _otherOrganizer: 1});
  expect(repository.summaryReads[_organizer], 1);
  expect(repository.directoryReads[_organizer], 1);
}

Future<void> _openCustomer(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('host-customers-add-customer')));
  await pumpFeatureUi(tester);
  expect(find.byType(HostAddCustomerScreen), findsOneWidget);
}

Future<void> _openAndSubmitCustomer(WidgetTester tester) async {
  await _openCustomer(tester);
  for (final field in {
    'name': 'New Person',
    'email': 'new@example.com',
  }.entries) {
    await tester.enterText(
      find.descendant(
        of: find.byKey(ValueKey('host-add-customer-${field.key}')),
        matching: find.byType(TextField),
      ),
      field.value,
    );
  }
  await tester.tap(find.byKey(const ValueKey('host-add-customer-submit')));
  // The acknowledgement is deliberately still pending; do not settle the
  // submit button's loading animation before completing the repository call.
  await tester.pump();
}

class _ContactsRepository extends Fake implements HostContactsRepository {
  final creation = Completer<HostCreatedCustomer>();
  final countReads = <String, int>{};
  final summaryReads = <String, int>{};
  final directoryReads = <String, int>{};
  final allCounts = {_organizer: 2, _otherOrganizer: 5};
  final newCounts = {_organizer: 1, _otherOrganizer: 3};
  var coverage = HostAudienceSourceCoverage.exact;
  var creates = 0;
  var failSummary = false;

  void addStoredCustomer() {
    allCounts[_organizer] = allCounts[_organizer]! + 1;
    newCounts[_organizer] = newCounts[_organizer]! + 1;
  }

  void acknowledgeCreate() {
    addStoredCustomer();
    creation.complete(
      const HostCreatedCustomer(
        organizerId: _organizer,
        contactId: 'created-contact',
        displayName: 'New Person',
        revision: 1,
      ),
    );
  }

  @override
  Future<HostCreatedCustomer> createContact({
    required String organizerId,
    required String displayName,
    String? phoneE164,
    String? email,
    String? initialNote,
  }) {
    expect(organizerId, _organizer);
    expect(displayName, 'New Person');
    expect(email, 'new@example.com');
    creates += 1;
    return creation.future;
  }

  @override
  Future<({int count, HostAudienceMatchCountCoverage coverage})> countContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async {
    expect(query.segment, HostAudienceSegment.newToOrganizer);
    expect(query.search, isNull);
    countReads.update(organizerId, (value) => value + 1, ifAbsent: () => 1);
    return (
      count: newCounts[organizerId]!,
      coverage: HostAudienceMatchCountCoverage.exact,
    );
  }

  @override
  Future<HostCrmSummary> getSummary(String organizerId) async {
    summaryReads.update(organizerId, (value) => value + 1, ifAbsent: () => 1);
    if (failSummary) throw StateError('summary unavailable');
    return HostCrmSummary(
      organizerId: organizerId,
      contactCount: allCounts[organizerId]!,
      pastAttendeeCount: 1,
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
  }

  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    directoryReads.update(organizerId, (value) => value + 1, ifAbsent: () => 1);
    return HostAudiencePage(
      organizerId: organizerId,
      contacts: [
        for (var index = 0; index < allCounts[organizerId]!; index++)
          HostAudienceContact(
            contactId: 'contact-$index',
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
            sourceCoverage: coverage,
            revision: 1,
          ),
      ],
      nextCursor: null,
      matchCount: allCounts[organizerId]!,
      matchCountCoverage: HostAudienceMatchCountCoverage.exact,
      sourceCoverage: coverage,
      projectionVersion: 1,
    );
  }
}
