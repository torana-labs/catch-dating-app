import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart' show Timestamp;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter/widgets.dart' show SizedBox;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../test/hosts/support/host_crm_response_fixtures.dart';
import '../../test/organizers/organizers_test_helpers.dart' show buildOrganizer;
import '../../test/test_pump_helpers.dart';
import 'app_shell_test_harness.dart';

/// Answers one callable from a Host journey before the backend's own
/// fixtures. Return `null` to defer to [HostShellBackend].
typedef HostCallableHandler =
    FutureOr<Object?> Function(String name, Object? input);

const _journeyCity = {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'};
final _journeyHash = List.filled(64, 'a').join();

/// Deterministic Firebase backend for Host app-shell journeys.
///
/// The consumer harness fakes repositories one by one. Host screens read many
/// more organizer-scoped repositories, so Host journeys fake the Firebase
/// infrastructure instead: real Host repositories run against an in-memory
/// Firestore and a recording callable surface whose responses follow the
/// callable contracts. A repository that reaches a real Firebase singleton,
/// or a callable without a fixture, fails the journey instead of the network.
class HostShellBackend {
  HostShellBackend({required this.uid, HostCallableHandler? onCall}) {
    // A new backend is a new device: drafts and pending-update journals live
    // in preferences and survive a relaunch that reuses this backend.
    SharedPreferences.setMockInitialValues({});
    functions = RecordingHostFunctions(
      answer: (name, input) async =>
          await onCall?.call(name, input) ?? await _answer(name, input),
    );
  }

  final String uid;
  final FakeFirebaseFirestore firestore = FakeFirebaseFirestore();

  /// Host command journals (attendance outbox, imports) persist here instead
  /// of the device database.
  final MemoryCommandJournalStorage journal = MemoryCommandJournalStorage();

  /// Device-local Today focus choices, kept across a relaunch.
  final todayPreferences = MemoryHostTodayPreferences();
  late final RecordingHostFunctions functions;

  late final MockFirebaseAuth auth = MockFirebaseAuth(
    signedIn: true,
    mockUser: MockUser(uid: uid, phoneNumber: '+910000000000'),
  );

  /// Private event setups by event id, as `createPrivateEventSetup` stored
  /// them. Reads project these records the way the backend does.
  final privateEvents = <String, Map<String, Object?>>{};

  Future<void> seedOrganizer(Organizer organizer) => firestore
      .collection('organizers')
      .doc(organizer.id)
      .set(organizer.toJson());

  /// Writes a published event as the backend's publication command leaves it;
  /// `publicationState` is backend-owned and absent from [Event.toJson].
  Future<void> seedPublishedEvent(Event event) {
    _eventOrganizers[event.id] = event.clubId;
    return firestore.collection('events').doc(event.id).set({
      ...event.toJson(),
      'publicationState': 'published',
    });
  }

  final _eventOrganizers = <String, String>{};

  Future<void> seedAttendee(EventAttendee attendee) => firestore
      .collection('eventAttendees')
      .doc(attendee.id)
      .set(attendee.toJson());

  FutureOr<Object?> _answer(String name, Object? input) {
    final request = input is Map
        ? Map<String, Object?>.from(input)
        : const <String, Object?>{};
    final organizerId = request['organizerId'] as String?;
    final now = DateTime.now().millisecondsSinceEpoch;
    final eventId = request['eventId'] as String?;
    return switch (name) {
      'setEventAttendeeAttendance' => _setAttendance(request),
      'createOrganizer' => _createOrganizer(request),
      'getEventRosterInsights' => {
        'eventId': eventId,
        'organizerId': _eventOrganizers[eventId],
        'cutoffAtMillis': now,
        'sourceCoverage': 'exact',
        'spendCoverage': 'insufficientData',
        'rows': const <Object?>[],
        'computedAtMillis': now,
      },
      'createEventVenueSession' => {
        'eventId': eventId,
        'venueSessionToken': 'host-journey-venue-session',
        'expiresAtMillis': now + const Duration(minutes: 10).inMilliseconds,
        'refreshAfterMillis': now + const Duration(minutes: 5).inMilliseconds,
      },
      'createPrivateEventSetup' => _createPrivateEvent(request),
      'getPrivateEventSetup' => _privateEventSummary(
        request['eventId']! as String,
      ),
      'listPrivateEventSetups' => {
        'events': [
          if (request['scope'] != 'past')
            for (final eventId in privateEvents.keys)
              _privateEventInventoryItem(eventId),
        ],
        'nextCursor': null,
      },
      'getOrganizerEventSetupDefaults' => {
        'organizerId': organizerId,
        'city': _journeyCity,
        'timezone': null,
        'organizerDefaultsRevision': null,
        'basicsReviewedHash': _journeyHash,
        'preferencesRevision': 0,
        'preferences': const <String, Object?>{},
        'preferencesHash': _journeyHash,
        'reviewedDefaultsHash': _journeyHash,
      },
      'listOrganizerAttentionItems' => {
        'organizerId': organizerId,
        'policyVersion': 1,
        'generatedAtMillis': now,
        'horizonEndsAtMillis': now + const Duration(days: 7).inMilliseconds,
        'items': const <Object?>[],
        'coverage': [
          for (final kind in HostAttentionKind.values)
            {
              'kind': kind.name,
              'state': HostAttentionCoverageState.complete.name,
              'reason': 'Host journey fixture.',
            },
        ],
      },
      'getEventRehearsalSummary' => {'hasCompletedRehearsal': false},
      'listOrganizerPrograms' => {'programs': const <Object?>[]},
      'listOrganizerForms' => {
        'organizerId': organizerId,
        'items': const <Object?>[],
        'nextCursor': null,
      },
      'getOrganizerMessagingSetup' => {
        'organizerId': organizerId,
        'providerConfigured': false,
        'embeddedSignup': const <String, Object?>{},
        'connection': null,
        'templates': const <Object?>[],
      },
      'getOrganizerCrmSummary' => {
        'organizerId': organizerId,
        'contactCount': 0,
        'pastAttendeeCount': 0,
        'repeatAttendeeCount': 0,
        'advocateCount': 0,
        'highImpactAdvocateCount': 0,
        'linkedAccountCount': 0,
        'importedContactCount': 0,
        'whatsappOptInCount': 0,
        'smsOptInCount': 0,
        'truncated': false,
        'readiness': const {
          'inApp': 'currentEventOnly',
          'whatsapp': 'providerSetupRequired',
          'sms': 'providerAndDltSetupRequired',
        },
      },
      'listOrganizerContacts' => {
        ...crmEmptyAudiencePageData(),
        'organizerId': organizerId,
      },
      'listOrganizerWhatsappThreads' => {
        'organizerId': organizerId,
        'threads': const <Object?>[],
        'nextCursor': null,
      },
      _ => null,
    };
  }

  /// Creates the organizer document the way `createOrganizer` does: owned by
  /// the caller, so the Host organizer query observes it.
  Future<Map<String, Object?>> _createOrganizer(
    Map<String, Object?> request,
  ) async {
    final organizerId =
        request['organizerId'] as String? ?? 'host-journey-created-organizer';
    await seedOrganizer(
      buildOrganizer(
        id: organizerId,
        name: request['name']! as String,
        location: request['location']! as String,
        area: request['area']! as String,
        description: request['description']! as String,
        hostUserId: uid,
        ownerUserId: uid,
      ),
    );
    return {'organizerId': organizerId};
  }

  /// Applies the absolute desired attendance the way the callable does, so
  /// the roster updates through its own Firestore listener.
  Future<Map<String, Object?>> _setAttendance(
    Map<String, Object?> request,
  ) async {
    final attendeeId = request['attendeeId']! as String;
    final checkedIn = request['desiredCheckedIn']! as bool;
    final revision = (request['expectedRevision']! as int) + 1;
    final now = DateTime.now();
    await firestore.collection('eventAttendees').doc(attendeeId).update({
      'status': checkedIn
          ? EventAttendeeStatus.checkedIn.name
          : EventAttendeeStatus.registered.name,
      'checkedInAt': checkedIn ? Timestamp.fromDate(now) : null,
      'checkedInBy': checkedIn ? uid : null,
      'attendanceRevision': revision,
      'updatedAt': Timestamp.fromDate(now),
    });
    return {
      'attendeeId': attendeeId,
      'checkedIn': checkedIn,
      'acceptedRevision': revision,
      'replayed': false,
      'changed': true,
    };
  }

  Map<String, Object?> _createPrivateEvent(Map<String, Object?> request) {
    final eventId = 'host-journey-event-${privateEvents.length + 1}';
    privateEvents[eventId] = {
      'organizerId': request['organizerId'],
      'basics': Map<String, Object?>.from(request['basics']! as Map),
    };
    return {'eventId': eventId, 'setupRevision': 1, 'replayed': false};
  }

  Map<String, Object?> _privateEventInventoryItem(String eventId) {
    final summary = _privateEventSummary(eventId);
    return {
      for (final field in const [
        'eventId',
        'name',
        'city',
        'localDate',
        'localStartTime',
        'timezone',
        'startTimeMillis',
        'setupRevision',
        'status',
        'detailsConfigured',
      ])
        field: summary[field],
    };
  }

  Map<String, Object?> _privateEventSummary(String eventId) {
    final record = privateEvents[eventId]!;
    final basics = record['basics']! as Map<String, Object?>;
    final city = switch (basics['city']) {
      {'mode': 'set', 'value': final Map<Object?, Object?> value} => value,
      _ => _journeyCity,
    };
    final timezone = switch (basics['timezone']) {
      {'mode': 'set', 'value': final String value} => value,
      _ => 'Asia/Kolkata',
    };
    final localDate = basics['localDate']! as String;
    final localStartTime = basics['localStartTime']! as String;
    return {
      'eventId': eventId,
      'organizerId': record['organizerId'],
      'setupRevision': 1,
      'publicationState': 'private',
      'status': 'active',
      'name': basics['name'],
      'city': city,
      'localDate': localDate,
      'localStartTime': localStartTime,
      'timezone': timezone,
      'startTimeMillis': DateTime.parse(
        '${localDate}T$localStartTime',
      ).millisecondsSinceEpoch,
      'setupDefaults': const <String, Object?>{},
      'detailsConfigured': false,
      'canEditBasics': true,
      'canChangeCity': true,
      'eventDetails': const <String, Object?>{
        'endTimeMillis': null,
        'venueName': null,
        'sourceVenueId': null,
        'eventFormat': null,
      },
      'eventPreferences': null,
    };
  }
}

class MemoryHostTodayPreferences implements HostTodayPreferenceRepository {
  final _values = <(String, String), HostTodayPreference>{};

  /// A returning Host who already dismissed the first-run focus prompt.
  void skip({required String accountId, required String organizerId}) =>
      _values[(accountId, organizerId)] = const HostTodayPreference.skipped();

  @override
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope) async =>
      _values[(scope.accountId, scope.organizerId)] ??
      const HostTodayPreference.unanswered();

  @override
  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  ) async => _values[(scope.accountId, scope.organizerId)] = preference;
}

/// Records every callable request. A callable the backend cannot answer is
/// recorded in [unanswered] and fails with `unimplemented`, so a screen that
/// retries silently still fails the journey that asserts [unanswered].
class RecordingHostFunctions extends Fake implements FirebaseFunctions {
  RecordingHostFunctions({required this.answer});

  final HostCallableHandler answer;
  final calls = <({String name, Object? input})>[];
  final unanswered = <String>{};

  Iterable<String> get names => calls.map((call) => call.name);

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _RecordingCallable(this, name);
}

class _RecordingCallable extends Fake implements HttpsCallable {
  _RecordingCallable(this.owner, this.name);

  final RecordingHostFunctions owner;
  final String name;

  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    final response = await owner.answer(name, parameters);
    if (response == null) {
      owner.unanswered.add(name);
      throw FirebaseFunctionsException(
        code: 'unimplemented',
        message: 'Host journey has no fixture for callable $name.',
      );
    }
    return _CallableResult<T>(response as T);
  }
}

class _CallableResult<T> extends Fake implements HttpsCallableResult<T> {
  _CallableResult(this.data);

  @override
  final T data;
}

/// Overrides for the installable Host root: the shared app-shell fakes, with
/// the organizer and event repositories running against [backend].
///
/// [organizers] are seeded into the fake Firestore before the app mounts, so
/// the Host organizer graph is read through the real repository queries.
Future<List<Object>> hostAppShellTestOverrides({
  required HostShellBackend backend,
  required UserProfile user,
  required List<Organizer> organizers,
}) async {
  for (final organizer in organizers) {
    await backend.seedOrganizer(organizer);
  }
  return [
    ...appShellTestOverrides(
      uid: backend.uid,
      user: user,
      organizersRepository: OrganizersRepository(backend.firestore, backend.functions),
      eventRepository: EventRepository(backend.firestore, backend.functions),
    ),
    firebaseFirestoreProvider.overrideWithValue(backend.firestore),
    firebaseFunctionsProvider.overrideWithValue(backend.functions),
    firebaseAuthProvider.overrideWithValue(backend.auth),
    commandJournalStorageProvider.overrideWithValue(
      () async => backend.journal,
    ),
    hostTodayPreferenceRepositoryProvider.overrideWithValue(
      backend.todayPreferences,
    ),
  ];
}

/// Pumps the Host entrypoint's router with the Host app role selected.
Future<void> pumpHostAppShell(
  WidgetTester tester, {
  required List<Object> overrides,
  String initialRoute = '/host/today',
}) async {
  AppConfig.configureEntrypointRole(AppRole.host);
  addTearDown(AppConfig.resetEntrypointRoleOverrideForTesting);
  await pumpCatchAppShell(
    tester,
    initialRoute: initialRoute,
    routerProvider: hostGoRouterProvider,
    overrides: overrides,
  );
}

/// `eventVenueSession` waits at most four minutes between live venue QR
/// refreshes; advancing past that lets its loop observe disposal.
const _venueSessionRefreshCeiling = Duration(minutes: 5);

/// Unmounts the app and lets self-refreshing reads observe disposal before
/// the test ends.
Future<void> unmountHostAppShell(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox.shrink());
  await pumpFeatureUiFor(tester, _venueSessionRefreshCeiling);
}

/// Opens a Host bottom-navigation destination by its visible label.
Future<void> openHostTab(WidgetTester tester, String label) async {
  final destination = find.descendant(
    of: find.byKey(AppShellKeys.navigationBar),
    matching: find.bySemanticsLabel(RegExp('^$label')),
  );
  expect(
    destination,
    findsOneWidget,
    reason: 'The Host navigation must expose $label.',
  );
  await tester.tap(destination);
  await pumpRoute(tester);
}

/// Fails with the underlying errors when an app error surface is visible or
/// a screen called a callable that has no backend fixture.
void expectHostSurfaceLoaded(
  WidgetTester tester,
  HostShellBackend backend, {
  required String surface,
}) {
  final errors = [
    for (final widget in tester.widgetList(
      find.byType(CatchLocalizedErrorState),
    ))
      (widget as CatchLocalizedErrorState).error,
    for (final widget in tester.widgetList(
      find.byType(CatchLocalizedSliverErrorState),
    ))
      (widget as CatchLocalizedSliverErrorState).error,
    for (final widget in tester.widgetList(
      find.byType(CatchLocalizedErrorScaffold),
    ))
      (widget as CatchLocalizedErrorScaffold).error,
  ];
  expect(
    errors,
    isEmpty,
    reason: '$surface rendered app error state(s): ${errors.join(' | ')}',
  );
  expect(
    find.byType(CatchErrorState),
    findsNothing,
    reason: '$surface rendered a Catch error state.',
  );
  expect(
    find.byType(CatchSliverErrorState),
    findsNothing,
    reason: '$surface rendered a Catch sliver error state.',
  );
  expect(
    backend.functions.unanswered,
    isEmpty,
    reason: '$surface called callables without a Host journey fixture.',
  );
}
