import 'dart:async';

import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/push/fcm_service.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart' as app_router;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart' as run_helpers;
import '../onboarding/onboarding_test_helpers.dart' as onboarding_helpers;
import '../organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../support/profile_readiness_fixtures.dart';
import '../test_pump_helpers.dart';

class _ControlledProfileRepository
    extends onboarding_helpers.FakeOnboardingUserProfileRepository {
  final reads = <String?>[];
  final attempts = <StreamController<UserProfile?>>[];

  @override
  Stream<UserProfile?> watchUserProfile({required String? uid}) {
    reads.add(uid);
    final attempt = StreamController<UserProfile?>.broadcast();
    attempts.add(attempt);
    return attempt.stream;
  }

  Future<void> dispose() async {
    for (final attempt in attempts) {
      await attempt.close();
    }
  }
}

class _FakeMatchRepository extends Fake implements MatchRepository {
  _FakeMatchRepository({this.match});

  Match? match;

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {}

  @override
  Stream<Match?> watchMatch({required String matchId}) => Stream.value(match);

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) =>
      Stream.value([]);
}

class _FakeConversationRepository implements ConversationRepository {
  _FakeConversationRepository();

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {}

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      Stream.value([]);

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      'message-1';

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {}

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {}
}

Match _buildMatch({
  String id = 'match-1',
  String user1Id = 'runner-1',
  String user2Id = 'runner-2',
}) => Match(
  id: id,
  user1Id: user1Id,
  user2Id: user2Id,
  eventIds: const ['event-1'],
  createdAt: DateTime(2026, 4, 23, 9),
);

Future<(ProviderContainer, GoRouter)> _pumpRouterApp(
  WidgetTester tester, {
  required Match? match,
  PublicProfile? routedProfile,
  PublicProfile? streamedProfile,
}) async {
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      matchRepositoryProvider.overrideWithValue(
        _FakeMatchRepository(match: match),
      ),
      conversationRepositoryProvider.overrideWithValue(
        _FakeConversationRepository(),
      ),
      watchEventProvider('event-1').overrideWith((ref) => Stream.value(null)),
      if (streamedProfile != null)
        watchPublicProfileProvider(
          streamedProfile.uid,
        ).overrideWith((ref) => Stream.value(streamedProfile)),
    ],
  );
  addTearDown(container.dispose);

  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, _) => const Scaffold()),
      GoRoute(
        path: '/chats/:matchId',
        builder: (context, state) => ChatScreen(
          matchId: state.pathParameters['matchId']!,
          otherProfile: state.extra is PublicProfile
              ? state.extra! as PublicProfile
              : null,
        ),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await _settleRoute(tester);

  if (routedProfile != null) {
    router.go('/chats/match-1', extra: routedProfile);
  } else {
    router.go('/chats/match-1', extra: 'unexpected-extra');
  }
  await _settleRoute(tester);

  return (container, router);
}

Future<void> _settleRoute(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUi(tester);
}

// Profile recovery deliberately renders an animating loading indicator.
// Advance route/provider frames without waiting for that animation to settle.
Future<void> _pumpProfileRoute(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
  await tester.pump();
}

void main() {
  for (final profileExists in [true, false]) {
    testWidgets(
      'production router retries profile failure before '
      '${profileExists ? 'resuming the exact destination' : 'starting onboarding'}',
      (tester) async {
        const destination = '/payment-history?source=receipt&item=one%20two';
        final profiles = _ControlledProfileRepository();
        final auth = onboarding_helpers.FakeAuthRepository()
          ..currentUserValue = onboarding_helpers.TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final container = onboarding_helpers.createOnboardingTestContainer(
          overrides: [
            app_router.initialAppLocationProvider.overrideWith(
              (ref) => destination,
            ),
            uidProvider.overrideWithValue(const AsyncData('runner-1')),
            authRepositoryProvider.overrideWithValue(auth),
            userProfileRepositoryProvider.overrideWithValue(profiles),
            onboardingDraftRepositoryProvider.overrideWithValue(
              onboarding_helpers.FakeOnboardingDraftRepository(),
            ),
            watchPaymentsForUserProvider(
              'runner-1',
            ).overrideWith((ref) => Stream.value(const [])),
          ],
        );
        addTearDown(() async {
          await tester.pumpWidget(const SizedBox.shrink());
          container.dispose();
          await profiles.dispose();
          await auth.dispose();
        });
        final router = container.read(app_router.consumerGoRouterProvider);
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp.router(
              theme: AppTheme.light,
              routerConfig: router,
            ),
          ),
        );
        await _pumpProfileRoute(tester);
        expect(profiles.reads, ['runner-1']);
        profiles.attempts.single.addError(StateError('profile unavailable'));
        await _pumpProfileRoute(tester);

        expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
        expect(find.byType(OnboardingScreen), findsNothing);
        expect(router.routeInformationProvider.value.uri.path, '/loading');
        expect(
          router.routeInformationProvider.value.uri.queryParameters['from'],
          destination,
        );

        await tester.tap(find.text('Reload profile'));
        await _pumpProfileRoute(tester);
        expect(profiles.reads, ['runner-1', 'runner-1']);
        expect(find.byType(CatchLocalizedErrorState), findsNothing);
        expect(find.byType(OnboardingScreen), findsNothing);
        expect(router.routeInformationProvider.value.uri.path, '/loading');
        profiles.attempts.last.add(
          profileExists ? buildSocialReadyUser() : null,
        );
        await _pumpProfileRoute(tester);

        final uri = router.routeInformationProvider.value.uri;
        if (profileExists) {
          expect(uri.toString(), destination);
          expect(find.byType(PaymentHistoryScreen), findsOneWidget);
          expect(find.byType(OnboardingScreen), findsNothing);
        } else {
          expect(uri.path, '/onboarding');
          expect(uri.queryParameters['from'], destination);
          expect(find.byType(OnboardingScreen), findsOneWidget);
          expect(find.byType(PaymentHistoryScreen), findsNothing);
        }
        expect(tester.takeException(), isNull);
      },
    );
  }

  test(
    'legacy Programs URL preserves organizer, saved ID and remaining query on Events',
    () {
      final original = Uri.parse(
        '/host/programs?organizerId=org-1&programId=program-1&tag=a&tag=b',
      );
      final redirected = Uri.parse(
        app_router.hostProgramsLegacyRedirect(original),
      );
      expect(redirected.path, '/host/events');
      expect(redirected.queryParametersAll, original.queryParametersAll);
    },
  );

  test('host Audience route resolves all four peer workspaces', () {
    final audiences =
        app_router.hostAudienceScreenForUri(
              Uri.parse(
                '/host/audience?view=audiences&organizerId=organizer-1&contactId=contact-1',
              ),
            )
            as HostCustomersScreen;
    final forms =
        app_router.hostAudienceScreenForUri(
              Uri.parse('/host/audience?view=forms&organizerId=organizer-1'),
            )
            as HostFormsScreen;
    final responses =
        app_router.hostAudienceScreenForUri(
              Uri.parse(
                '/host/audience?view=responses&organizerId=organizer-1&formId=form-1',
              ),
            )
            as HostFormsScreen;

    expect(audiences.initialView, HostAudienceView.audiences);
    expect(audiences.initialContactId, 'contact-1');
    expect(forms.initialResponses, isFalse);
    expect(responses.initialResponses, isTrue);
    expect(responses.initialFormId, 'form-1');
  });

  test('host inbox route restores the campaigns saved audience', () {
    final screen = app_router.hostInboxScreenForUri(
      Uri.parse(
        '/host/inbox?workspace=campaigns&compose=1&audienceId=audience-1&threadId=match-2',
      ),
      initialOrganizerId: 'organizer-2',
    );

    expect(screen.initialWorkspace, HostMessagingWorkspace.campaigns);
    expect(screen.initialSavedAudienceId, 'audience-1');
    expect(screen.initialOrganizerId, 'organizer-2');
    expect(screen.initialThreadId, 'match-2');
  });

  test('saved audience compose restores its organizer from the URI', () {
    final screen = app_router.hostInboxScreenForUri(
      Uri.parse(
        '/host/inbox?workspace=campaigns&compose=1&audienceId=audience-1&organizerId=organizer-2',
      ),
    );
    expect(screen.initialOrganizerId, 'organizer-2');
    expect(screen.initialSavedAudienceId, 'audience-1');
  });

  test('host inbox route ignores an audience outside compose mode', () {
    final screen = app_router.hostInboxScreenForUri(
      Uri.parse('/host/inbox?workspace=campaigns&audienceId=audience-1'),
    );

    expect(screen.initialWorkspace, HostMessagingWorkspace.campaigns);
    expect(screen.initialSavedAudienceId, isNull);
  });

  test('host inbox route parses program scope and organizer', () {
    final screen = app_router.hostInboxScreenForUri(
      Uri.parse('/host/inbox?programId=program-1&organizerId=organizer-2'),
    );

    expect(screen.initialScope, const HostInboxScope.program('program-1'));
    expect(screen.initialOrganizerId, 'organizer-2');
  });

  test('host inbox route prefers event scope over program scope', () {
    final screen = app_router.hostInboxScreenForUri(
      Uri.parse('/host/inbox?eventId=event-1&programId=program-1'),
    );

    expect(screen.initialScope, const HostInboxScope.event('event-1'));
  });

  testWidgets(
    'create-event route fetches the club when no extra is available',
    (tester) async {
      final organizer = organizer_helpers.buildOrganizer();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          fetchOrganizerProvider(
            'club-1',
          ).overrideWith((ref) async => organizer),
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: const HostCreateEventRouteScreen(clubId: 'club-1'),
          ),
        ),
      );

      await tester.pump();
      await tester.pump();

      expect(find.byType(PrivateEventCreateScreen), findsOneWidget);
      expect(find.text('Club not found.'), findsNothing);
      // The private create flow schedules draft timers; unmount to settle them.
      await tester.pumpWidget(const SizedBox.shrink());
      await pumpFeatureUiFor(tester, const Duration(seconds: 5));
    },
  );

  testWidgets('chat route hydrates the profile when extra is invalid', (
    tester,
  ) async {
    await _pumpRouterApp(
      tester,
      match: _buildMatch(),
      streamedProfile: run_helpers.buildPublicProfile(
        uid: 'runner-2',
        name: 'Taylor',
      ),
    );

    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Taylor'), findsOneWidget);
  });

  testWidgets('chat route uses a routed PublicProfile extra immediately', (
    tester,
  ) async {
    await _pumpRouterApp(
      tester,
      match: null,
      routedProfile: run_helpers.buildPublicProfile(
        uid: 'runner-2',
        name: 'Jordan',
      ),
    );

    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Jordan'), findsOneWidget);
  });

  testWidgets('FCM navigation helper drives the real chat route', (
    tester,
  ) async {
    final result = await _pumpRouterApp(
      tester,
      match: _buildMatch(),
      streamedProfile: run_helpers.buildPublicProfile(
        uid: 'runner-2',
        name: 'Taylor',
      ),
    );
    final router = result.$2;

    router.go('/');
    await _settleRoute(tester);

    navigateToMessageRoute(router, {'matchId': 'match-1'});
    await _settleRoute(tester);

    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Taylor'), findsOneWidget);
  });
}
