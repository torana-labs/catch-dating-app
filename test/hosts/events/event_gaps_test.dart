import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_body.dart';
import 'package:catch_dating_app/hosts/events/event_guests_body.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_body.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/insights/host_event_reviews_screen.dart';
import 'package:catch_dating_app/hosts/live/live_scores_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import '../../support/catch_test_fonts.dart';
import 'events_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget body, {
  CatchThemeMode theme = CatchThemeMode.day,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: theme,
        child: CatchScreen(bodyScrolls: false, body: body),
      ),
    ),
  );
  await tester.pump();
}

HostEventGuestsState _waitlist({int capacity = 4}) => HostEventGuestsState(
  status: HostEventGuestsStatus.ready,
  event: tonightEvent.copyWith(capacityLimit: capacity),
  lists: const {
    HostEventGuestList.booked: [
      HostEventGuest(id: 'a-aanya', name: 'Aanya Sharma', uid: 'u-aanya'),
    ],
    HostEventGuestList.waitlist: [
      HostEventGuest(
        id: 'a-nikhil',
        name: 'Nikhil Rao',
        uid: 'u-nikhil',
        offered: true,
      ),
      HostEventGuest(id: 'a-rhea', name: 'Rhea Kapoor', uid: 'u-rhea'),
      HostEventGuest(id: 'a-walkin', name: 'Walk-in'),
      HostEventGuest(id: 'a-tara', name: 'Tara Menon', uid: 'u-tara'),
      HostEventGuest(id: 'a-ishaan', name: 'Ishaan Bose', uid: 'u-ishaan'),
    ],
  },
);

final _made = DateTime(2026, 10, 20, 18);

EventInviteLink _invite(String id, String label, {bool off = false}) =>
    EventInviteLink(
      id: id,
      eventId: tonightEvent.id,
      organizerId: tonightEvent.organizerId,
      hostUid: 'host-1',
      label: label,
      openCount: 14,
      confirmedCount: 5,
      disabledAt: off ? _made : null,
      createdAt: _made,
      updatedAt: _made,
    );

void main() {
  setUpAll(loadCatchTestFonts);

  group('Guests', () {
    test('offers the places left to the first guests in line', () {
      // Three places left; Nikhil already holds an offer and the walk-in
      // has no account, so Rhea, Tara and Ishaan get them.
      expect(_waitlist().offerAllUids, ['u-rhea', 'u-tara', 'u-ishaan']);
      expect(_waitlist(capacity: 2).offerAllUids, ['u-rhea']);
      expect(_waitlist(capacity: 1).offerAllUids, isEmpty);
      expect(_waitlist(capacity: 0).offerAllUids, isEmpty);
    });

    testWidgets('waitlist offers the next places and opens a guest', (
      tester,
    ) async {
      var offeredAll = 0;
      final opened = <String>[];
      await _pump(
        tester,
        HostEventGuestsBody(
          state: _waitlist(),
          list: HostEventGuestList.waitlist,
          onView: (_) {},
          onList: (_) {},
          onLetIn: (_) {},
          onOffer: (_) {},
          onOfferAll: () => offeredAll++,
          onGuest: (guest) => opened.add(guest.id),
          onMessageAll: () {},
          onDownload: () {},
          onRetry: () {},
        ),
      );

      expect(find.text('Offered'), findsOneWidget);
      await tester.tap(find.text('Offer the next 3 places'));
      expect(offeredAll, 1);

      await tester.tap(find.text('Rhea Kapoor'));
      await tester.tap(find.text('Walk-in'));
      expect(opened, ['a-rhea']);
    });

    testWidgets('one place left offers through the row, not all at once', (
      tester,
    ) async {
      await _pump(
        tester,
        HostEventGuestsBody(
          state: _waitlist(capacity: 2),
          list: HostEventGuestList.waitlist,
          onView: (_) {},
          onList: (_) {},
          onLetIn: (_) {},
          onOffer: (_) {},
          onOfferAll: () {},
          onMessageAll: () {},
          onDownload: () {},
          onRetry: () {},
        ),
      );

      expect(
        find.byKey(const ValueKey<String>('host-event-guests-offer-all')),
        findsNothing,
      );
    });
  });

  group('Workspace', () {
    testWidgets(
      'links to sharing, guest sources and moments; arrival opens moments',
      (tester) async {
        final actions = <HostEventWorkspaceAction>[];
        await _pump(
          tester,
          HostEventWorkspaceBody(
            state: HostEventWorkspaceState(
              status: HostEventWorkspaceStatus.ready,
              event: tonightEvent,
              planSteps: 5,
              door: const ['Kabir Rao'],
              doorChecked: true,
              arrivalReady: true,
            ),
            now: eventsNow,
            onView: (_) {},
            onAction: actions.add,
            onRetry: () {},
          ),
        );

        await tester.tap(find.text('Share and invite links'));
        await tester.tap(find.text('Guest sources'));
        await tester.tap(find.text('Moments'));
        await tester.tap(find.text('Arrival message is ready'));
        expect(actions, [
          HostEventWorkspaceAction.share,
          HostEventWorkspaceAction.sources,
          HostEventWorkspaceAction.moments,
          HostEventWorkspaceAction.moments,
        ]);
      },
    );

    test('only an event nobody booked can be deleted', () {
      DateTime at(int hour) => DateTime(2026, 11, 3, hour);
      final unused = buildEvent(
        id: 'unused',
        organizerId: 'organizer-1',
        startTime: at(19),
        endTime: at(21),
        bookedCount: 0,
      );
      expect(hostEventCanDelete(unused), isTrue);
      expect(hostEventCanDelete(tonightEvent), isFalse);
    });
  });

  testWidgets('a night with no plan offers to edit the event', (tester) async {
    var edits = 0;
    await _pump(
      tester,
      HostEventPlanBody(
        state: const HostEventPlanState(status: HostEventPlanStatus.noPlan),
        options: const {},
        onOption: (_, _) {},
        onRetry: () {},
        onEditEvent: () => edits++,
      ),
    );

    await tester.tap(find.text('Edit the event'));
    expect(edits, 1);
  });

  group('Share and invite links', () {
    testWidgets('an invite-only night lists its named links', (tester) async {
      final copied = <String>[];
      final off = <String>[];
      var created = 0;
      await _pump(
        tester,
        HostEventShareBody(
          link: 'https://example.test/e/1?invite=CODE',
          inviteOnly: true,
          onCopy: () {},
          onShare: () {},
          inviteLinks: [
            _invite('office', 'Office group'),
            _invite('climb', 'Climbing club', off: true),
          ],
          newLabel: 'Book club',
          onCreate: () => created++,
          onCopyInvite: (invite) => copied.add(invite.id),
          onTurnOff: (invite) => off.add(invite.id),
        ),
      );

      expect(find.text('Private link'), findsOneWidget);
      expect(find.text('14 opened · 5 booked'), findsOneWidget);
      expect(find.text('Turned off'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey<String>('host-event-invite-copy-office')),
      );
      await tester.tap(
        find.byKey(const ValueKey<String>('host-event-invite-off-office')),
      );
      expect(
        find.byKey(const ValueKey<String>('host-event-invite-copy-climb')),
        findsNothing,
      );
      await tester.tap(find.text('Make and copy the link'));
      expect(copied, ['office']);
      expect(off, ['office']);
      expect(created, 1);
    });

    testWidgets('a public night shows only its link', (tester) async {
      var copies = 0;
      await _pump(
        tester,
        HostEventShareBody(
          link: 'https://example.test/e/1',
          inviteOnly: false,
          onCopy: () => copies++,
          onShare: () {},
        ),
      );

      expect(find.text('Your link'), findsOneWidget);
      expect(find.text('Invite links'), findsNothing);
      await tester.tap(find.text('Copy link'));
      expect(copies, 1);
    });

    testWidgets('making a link waits for a name', (tester) async {
      var created = 0;
      await _pump(
        tester,
        HostEventShareBody(
          link: 'https://example.test/e/1?invite=CODE',
          inviteOnly: true,
          onCopy: () {},
          onShare: () {},
          inviteLinks: const [],
          onCreate: () => created++,
        ),
      );

      expect(find.text('No invite links yet.'), findsOneWidget);
      await tester.tap(find.text('Make and copy the link'));
      expect(created, 0);
    });
  });

  testWidgets('reviews open to reply, newest first, with replies', (
    tester,
  ) async {
    final opened = <String>[];
    await _pump(
      tester,
      HostEventReviewsBody(
        reviews: [
          Review(
            id: 'old',
            organizerId: 'organizer-1',
            reviewerName: 'Sameer Shah',
            rating: 4,
            comment: 'Loud by round two.',
            createdAt: _made,
          ),
          Review(
            id: 'new',
            organizerId: 'organizer-1',
            reviewerName: 'Rhea Kapoor',
            rating: 5,
            comment: 'Came alone, left with a team.',
            createdAt: _made.add(const Duration(days: 1)),
            ownerResponse: ReviewOwnerResponse(
              hostUserId: 'host-1',
              hostName: 'Meher',
              message: 'See you Tuesday.',
              createdAt: _made,
              updatedAt: _made,
            ),
          ),
        ],
        onReview: (review) => opened.add(review.id),
      ),
    );

    expect(
      tester.getTopLeft(find.text('Rhea Kapoor')).dy,
      lessThan(tester.getTopLeft(find.text('Sameer Shah')).dy),
    );
    expect(find.textContaining('Your reply: See you Tuesday.'), findsOneWidget);
    await tester.tap(find.text('Sameer Shah'));
    expect(opened, ['old']);
  });

  testWidgets('a running reveal countdown can be stopped', (tester) async {
    var stopped = 0;
    await _pump(
      tester,
      HostLiveScoresBody(
        state: const HostLiveScoresState(
          status: HostLiveScoresStatus.ready,
          units: [
            HostLiveScoreUnit(id: 'qr', label: 'Quizzy Rascals', total: 41),
          ],
          roundIndex: 1,
          revealRoundIndex: 0,
          countingDown: true,
          countdownSeconds: 10,
        ),
        points: const {},
        onPoints: (_, _) {},
        onSave: () {},
        onReveal: () {},
        onStopCountdown: () => stopped++,
        onView: (_) {},
        onRetry: () {},
      ),
      theme: CatchThemeMode.night,
    );

    await tester.tap(find.text('Stop the countdown'));
    expect(stopped, 1);
  });
}
