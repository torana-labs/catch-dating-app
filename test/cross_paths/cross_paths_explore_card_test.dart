import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_explore_card.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart' as club_test;
import '../events/events_test_helpers.dart' as event_test;

void main() {
  testWidgets('person and event remain distinct accessible actions', (
    tester,
  ) async {
    final fixture = _fixture();
    var profileTaps = 0;
    var eventTaps = 0;

    await _pumpCard(
      tester,
      CrossPathsExploreCard(
        suggestion: fixture.suggestion,
        event: fixture.eventItem.event,
        onProfileSelected: () => profileTaps += 1,
        onEventSelected: () => eventTaps += 1,
      ),
    );

    expect(find.byType(CatchPolaroid), findsOneWidget);
    expect(find.text('PEOPLE YOU COULD MEET'), findsOneWidget);
    expect(find.text('Rhea, 29'), findsOneWidget);
    expect(find.text('See the event'), findsOneWidget);

    await tester.ensureVisible(find.text('Rhea, 29'));
    await tester.tap(find.text('Rhea, 29'));
    await tester.pump();
    expect(profileTaps, 1);
    expect(eventTaps, 0);

    await tester.ensureVisible(find.text('See the event'));
    await tester.tap(find.text('See the event'));
    await tester.pump();
    expect(eventTaps, 1);
  });

  testWidgets('card remains overflow-free at text scale 2', (tester) async {
    final fixture = _fixture();
    tester.view.physicalSize = const Size(430, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pumpCard(
      tester,
      CrossPathsExploreCard(
        suggestion: fixture.suggestion,
        event: fixture.eventItem.event,
        onProfileSelected: () {},
        onEventSelected: () {},
      ),
      textScaler: const TextScaler.linear(2),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('See the event'), findsOneWidget);
  });

  testWidgets('reports one impression when the lazy feed card mounts', (
    tester,
  ) async {
    final fixture = _fixture();
    var impressions = 0;

    await _pumpCard(
      tester,
      CrossPathsExploreCard(
        suggestion: fixture.suggestion,
        event: fixture.eventItem.event,
        onImpression: () => impressions += 1,
      ),
    );
    await tester.pump();

    expect(impressions, 1);
  });

  testWidgets('profile preview remains overflow-free at text scale 2', (
    tester,
  ) async {
    final fixture = _fixture();
    tester.view.physicalSize = const Size(430, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream<String?>.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: CrossPathsProfilePreviewSheet(
                  suggestion: fixture.suggestion,
                  event: fixture.eventItem.event,
                  onEventSelected: () {},
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
  });

  testWidgets('pair inventory offers an invitation before booking', (
    tester,
  ) async {
    final fixture = _fixture(pairHoldAvailable: true);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('viewer-1')),
          watchOutgoingCrossPathsInvitationProvider(
            'viewer-1',
            fixture.suggestion.event.eventId,
          ).overrideWith((ref) => Stream<CrossPathsInvitation?>.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: CrossPathsProfilePreviewSheet(
                suggestion: fixture.suggestion,
                event: fixture.eventItem.event,
                onEventSelected: () {},
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Ask to go together'), findsOneWidget);
    expect(find.text('Join the event to invite'), findsNothing);
  });
}

Future<void> _pumpCard(
  WidgetTester tester,
  Widget child, {
  TextScaler textScaler = TextScaler.noScaling,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: MediaQuery(
        data: MediaQueryData(textScaler: textScaler),
        child: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: child,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

({CrossPathsSuggestion suggestion, ExploreEventItem eventItem}) _fixture({
  bool pairHoldAvailable = false,
}) {
  final start = DateTime(2026, 8, 8, 18);
  final club = club_test.buildClub();
  final event = event_test.buildEvent(startTime: start);
  final suggestion = CrossPathsSuggestion.fromCallableData({
    'person': {
      'uid': 'candidate-1',
      'name': 'Rhea Kapoor',
      'age': 29,
      'gender': 'woman',
      'city': 'in-mh-mumbai',
      'photoUrls': [
        'https://example.com/one.jpg',
        'https://example.com/two.jpg',
        'https://example.com/three.jpg',
      ],
      'promptAnswers': [
        {'prompt': 'A perfect event', 'answer': 'A sunset walk'},
        {'prompt': 'Typical Sunday', 'answer': 'Coffee and a long read'},
        {'prompt': 'Together we could', 'answer': 'Try every new place'},
      ],
      'relationshipGoal': 'relationship',
    },
    'event': {
      'eventId': event.id,
      'organizerId': 'organizer-1',
      'startTime': start.toUtc().toIso8601String(),
      'endTime': start.add(const Duration(hours: 1)).toUtc().toIso8601String(),
      'meetingPoint': event.meetingPoint,
      'activityKind': event.activityKind.name,
      'photoUrl': null,
      'viewerBookingStatus': 'canBookNow',
      'pairHoldAvailable': pairHoldAvailable,
    },
    'reasonCodes': [
      'attending_event',
      'booking_available',
      'mutual_preferences',
      'showcase_ready',
    ],
    'suggestionToken': 'tttttttttttttttttttttttttttttttttttttttt.token',
    'tokenExpiresAt': '2026-08-08T17:00:00.000Z',
  });
  final displaySuggestion = CrossPathsSuggestion(
    profile: suggestion.profile.copyWith(profilePhotos: const []),
    event: suggestion.event,
    reasonCodes: suggestion.reasonCodes,
    suggestionToken: suggestion.suggestionToken,
    tokenExpiresAt: suggestion.tokenExpiresAt,
    rankingVersion: suggestion.rankingVersion,
  );
  return (
    suggestion: displaySuggestion,
    eventItem: ExploreEventItem(event: event, club: club),
  );
}
