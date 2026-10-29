import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_invitation_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart' as event_test;
import '../test_pump_helpers.dart';

void main() {
  testWidgets('recipient sees accept and decline actions', (tester) async {
    final fixture = _fixture();

    await _pumpInvitation(tester, fixture.invitation, fixture);
    await tester.scrollUntilVisible(find.text('Accept and make a plan'), 180);

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.text('Cross Paths invitation'), findsOneWidget);
    expect(find.text('Rhea Kapoor, 29'), findsOneWidget);
    expect(find.text('Accept and make a plan'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Decline'), 120);
    expect(find.text('Decline'), findsOneWidget);
  });

  testWidgets('accepted invitation exposes its event plan actions', (
    tester,
  ) async {
    final fixture = _fixture(status: CrossPathsInvitationStatus.accepted);

    await _pumpInvitation(tester, fixture.invitation, fixture);
    await tester.scrollUntilVisible(find.text('Open event plan'), 180);

    expect(find.text('Open event plan'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Cancel event plan'), 120);
    expect(find.text('Cancel event plan'), findsOneWidget);
    expect(find.text('Accept and make a plan'), findsNothing);
  });

  testWidgets('requester sees a held-not-booked state and booking action', (
    tester,
  ) async {
    final fixture = _fixture(
      status: CrossPathsInvitationStatus.accepted,
      withPairHold: true,
    );

    await _pumpInvitation(tester, fixture.invitation, fixture);
    await tester.scrollUntilVisible(
      find.text('Your pair spot is held — you are not booked yet'),
      180,
    );

    expect(
      find.text('Your pair spot is held — you are not booked yet'),
      findsWidgets,
    );
    expect(find.textContaining('you are not booked yet'), findsWidgets);
    expect(
      find.text('Your booking: Held, not booked · Their booking: Confirmed'),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(find.text('Complete booking'), 140);
    expect(find.text('Complete booking'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Open event plan'), 140);
    expect(find.text('Open event plan'), findsOneWidget);
    expect(
      tester
          .widget<CatchButton>(
            find.widgetWithText(CatchButton, 'Open event plan'),
          )
          .onPressed,
      isNull,
    );
  });

  testWidgets('recipient sees the requester booking state without a CTA', (
    tester,
  ) async {
    final fixture = _fixture(
      status: CrossPathsInvitationStatus.accepted,
      withPairHold: true,
      viewerIsRequester: false,
    );

    await _pumpInvitation(tester, fixture.invitation, fixture);
    await tester.scrollUntilVisible(
      find.textContaining('waiting for the person who sent'),
      180,
    );

    expect(
      find.textContaining('waiting for the person who sent'),
      findsOneWidget,
    );
    expect(find.text('Complete booking'), findsNothing);
  });

  for (final viewerIsRequester in [true, false]) {
    testWidgets(
      'expired invitation opens its event for ${viewerIsRequester ? 'requester' : 'attendee'}',
      (tester) async {
        final fixture = _fixture(
          status: CrossPathsInvitationStatus.invalidated,
          withPairHold: true,
          viewerIsRequester: viewerIsRequester,
          pairHoldStatus: CrossPathsPairHoldStatus.expired,
        );
        GoRouterState? destination;
        final router = _invitationRouter(
          fixture,
          onEvent: (state) => destination = state,
        );
        addTearDown(router.dispose);

        await _pumpInvitation(
          tester,
          fixture.invitation,
          fixture,
          router: router,
        );
        await tester.scrollUntilVisible(find.text('See the event'), 120);

        expect(find.text('This pair spot is no longer held'), findsOneWidget);
        expect(
          find.text('Your booking: Not booked · Their booking: Confirmed'),
          findsOneWidget,
        );
        expect(find.text('Complete booking'), findsNothing);
        expect(find.text('Open event plan'), findsNothing);
        expect(find.text('Cancel event plan'), findsNothing);
        expect(destination, isNull);
        expect(tester.takeException(), isNull);

        await tester.tap(find.text('See the event'));
        await pumpFeatureUi(tester);

        expect(tester.takeException(), isNull);
        expect(find.byKey(const ValueKey('event-destination')), findsOneWidget);
        expect(destination?.name, Routes.eventDetailScreen.name);
        expect(
          destination?.uri.toString(),
          '/organizers/club-1/events/event-1',
        );
        expect(destination?.pathParameters, {
          'clubId': fixture.event.clubId,
          'eventId': fixture.event.id,
        });
        expect(destination?.extra, same(fixture.event));

        // Unmount the invitation to dispose its periodic hold timer.
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }

  testWidgets('active invitation keeps the booking action on its own route', (
    tester,
  ) async {
    final fixture = _fixture(
      status: CrossPathsInvitationStatus.accepted,
      withPairHold: true,
    );
    GoRouterState? destination;
    final router = _invitationRouter(
      fixture,
      onEvent: (state) => destination = state,
    );
    addTearDown(router.dispose);

    await _pumpInvitation(tester, fixture.invitation, fixture, router: router);
    await tester.scrollUntilVisible(find.text('Complete booking'), 140);

    expect(
      tester
          .widget<CatchButton>(
            find.widgetWithText(CatchButton, 'Complete booking'),
          )
          .onPressed,
      isNotNull,
    );
    expect(find.text('See the event'), findsNothing);
    expect(find.byKey(const ValueKey('event-destination')), findsNothing);
    expect(destination, isNull);
    expect(
      router.routeInformationProvider.value.uri.path,
      '/cross-paths/invitations/invitation-1',
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}

Future<void> _pumpInvitation(
  WidgetTester tester,
  CrossPathsInvitation invitation,
  _InvitationFixture fixture, {
  GoRouter? router,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('viewer-1')),
        watchCrossPathsInvitationProvider(
          invitation.id,
        ).overrideWith((ref) => Stream.value(invitation)),
        watchPublicProfileProvider(
          fixture.suggestion.profile.uid,
        ).overrideWith((ref) => Stream.value(fixture.suggestion.profile)),
        watchEventProvider(
          fixture.event.id,
        ).overrideWith((ref) => Stream.value(fixture.event)),
        if (fixture.pairHold != null)
          watchCrossPathsPairHoldProvider(
            fixture.pairHold!.id,
          ).overrideWith((ref) => Stream.value(fixture.pairHold)),
      ],
      child: router != null
          ? MaterialApp.router(
              theme: AppTheme.light,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              routerConfig: router,
            )
          : MaterialApp(
              theme: AppTheme.light,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: CrossPathsInvitationScreen(invitationId: invitation.id),
            ),
    ),
  );
  await tester.pump();
  await tester.pump();
  await tester.pump();
  await tester.pump();
}

// The real invitation callback and GoRouter use the canonical named route
// contract. Only the event destination is a sentinel; this does not exercise
// Event Detail providers, backend eligibility, or native navigation.
GoRouter _invitationRouter(
  _InvitationFixture fixture, {
  required ValueChanged<GoRouterState> onEvent,
}) => GoRouter(
  initialLocation: '/cross-paths/invitations/${fixture.invitation.id}',
  routes: [
    GoRoute(
      path: Routes.crossPathsInvitationScreen.path,
      name: Routes.crossPathsInvitationScreen.name,
      builder: (_, state) => CrossPathsInvitationScreen(
        invitationId: state.pathParameters['invitationId']!,
      ),
    ),
    GoRoute(
      path: Routes.eventDetailScreen.path,
      name: Routes.eventDetailScreen.name,
      builder: (_, state) {
        onEvent(state);
        return const Scaffold(
          body: Text('Event destination', key: ValueKey('event-destination')),
        );
      },
    ),
  ],
);

_InvitationFixture _fixture({
  CrossPathsInvitationStatus status = CrossPathsInvitationStatus.pending,
  bool withPairHold = false,
  bool viewerIsRequester = true,
  CrossPathsPairHoldStatus pairHoldStatus = CrossPathsPairHoldStatus.active,
}) {
  final now = DateTime.now();
  final holdExpired =
      withPairHold && pairHoldStatus == CrossPathsPairHoldStatus.expired;
  final releasedAt = now.subtract(const Duration(minutes: 1));
  final event = event_test.buildEvent(
    meetingPoint: 'Kala Ghoda table room',
    startTime: now.add(const Duration(days: 3)),
  );
  final parsedSuggestion = CrossPathsSuggestion.fromCallableData({
    'person': {
      'uid': 'candidate-1',
      'name': 'Rhea Kapoor',
      'age': 29,
      'gender': 'woman',
      'city': 'in-mh-mumbai',
      'photoUrls': const [
        'https://example.com/one.jpg',
        'https://example.com/two.jpg',
        'https://example.com/three.jpg',
      ],
      'promptAnswers': const [
        {'prompt': 'A perfect event', 'answer': 'A sunset walk'},
        {'prompt': 'Typical Sunday', 'answer': 'Coffee and a long read'},
        {'prompt': 'Together we could', 'answer': 'Try every new place'},
      ],
      'relationshipGoal': 'relationship',
    },
    'event': {
      'eventId': event.id,
      'organizerId': event.organizerId,
      'startTime': event.startTime.toUtc().toIso8601String(),
      'endTime': event.endTime.toUtc().toIso8601String(),
      'meetingPoint': event.meetingPoint,
      'activityKind': event.activityKind.name,
      'photoUrl': null,
      'viewerBookingStatus': 'signedUp',
    },
    'reasonCodes': const [
      'attending_event',
      'viewer_attending',
      'mutual_preferences',
      'showcase_ready',
    ],
    'suggestionToken': 'tttttttttttttttttttttttttttttttttttttttt.token',
    'tokenExpiresAt': '2026-08-08T17:00:00.000Z',
  });
  final suggestion = CrossPathsSuggestion(
    profile: parsedSuggestion.profile.copyWith(profilePhotos: const []),
    event: parsedSuggestion.event,
    reasonCodes: parsedSuggestion.reasonCodes,
    suggestionToken: parsedSuggestion.suggestionToken,
    tokenExpiresAt: parsedSuggestion.tokenExpiresAt,
    rankingVersion: parsedSuggestion.rankingVersion,
  );
  final senderUid = withPairHold && viewerIsRequester
      ? 'viewer-1'
      : suggestion.profile.uid;
  final recipientUid = withPairHold && viewerIsRequester
      ? suggestion.profile.uid
      : 'viewer-1';
  final invitation = CrossPathsInvitation(
    id: 'invitation-1',
    eventId: event.id,
    senderUid: senderUid,
    recipientUid: recipientUid,
    participantIds: const ['candidate-1', 'viewer-1'],
    status: status,
    createdAt: now.subtract(const Duration(minutes: 20)),
    updatedAt: holdExpired ? releasedAt : now,
    expiresAt: now.add(const Duration(days: 1)),
    respondedAt: status == CrossPathsInvitationStatus.accepted || holdExpired
        ? now.subtract(const Duration(minutes: 15))
        : null,
    cancelledAt: null,
    // Matches the expiry transition in functions/src/crossPaths/pairHolds.ts.
    invalidatedAt: holdExpired ? releasedAt : null,
    invalidationReason: holdExpired
        ? CrossPathsInvitationInvalidationReason.holdExpired
        : null,
    conversationId:
        status == CrossPathsInvitationStatus.accepted && !withPairHold
        ? 'plan-1'
        : null,
    pairHoldId: withPairHold ? 'hold-1' : null,
  );
  final pairHold = withPairHold
      ? CrossPathsPairHold(
          id: 'hold-1',
          eventId: event.id,
          invitationId: invitation.id,
          requesterUid: senderUid,
          attendeeUid: recipientUid,
          participantIds: const ['viewer-1', 'candidate-1'],
          status: pairHoldStatus,
          requesterBookingStatus: holdExpired ? 'cancelled' : 'held',
          attendeeBookingStatus: 'signedUp',
          requesterPriceInPaise: 0,
          currency: 'INR',
          expiresAt: pairHoldStatus.isActive
              ? now.add(const Duration(minutes: 15))
              : releasedAt,
          conversationId: null,
        )
      : null;
  return _InvitationFixture(
    invitation: invitation,
    suggestion: suggestion,
    event: event,
    pairHold: pairHold,
  );
}

class _InvitationFixture {
  const _InvitationFixture({
    required this.invitation,
    required this.suggestion,
    required this.event,
    required this.pairHold,
  });

  final CrossPathsInvitation invitation;
  final CrossPathsSuggestion suggestion;
  final Event event;
  final CrossPathsPairHold? pairHold;
}
