import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_dating_app/hosts/events/event_guests_body.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_publish_body.dart';
import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_body.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/events_body.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_body.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

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

void main() {
  setUpAll(loadCatchTestFonts);

  group('Events', () {
    Future<List<Object>> pumpEvents(
      WidgetTester tester,
      HostEventsState state, {
      HostEventsTab tab = HostEventsTab.upcoming,
    }) async {
      final calls = <Object>[];
      await _pump(
        tester,
        HostEventsBody(
          state: state,
          now: eventsNow,
          tab: tab,
          onTab: calls.add,
          onOpenEvent: calls.add,
          onOpenDraft: calls.add,
          onOpenProgramme: calls.add,
          onNewProgramme: () => calls.add('new programme'),
          onRetry: () => calls.add('retry'),
        ),
      );
      return calls;
    }

    testWidgets('upcoming shows tonight, the programme, this week and later '
        'months with counts', (tester) async {
      final calls = await pumpEvents(tester, eventsReady());
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Tonight'), findsWidgets);
      expect(find.text('Tuesday Trivia Night'), findsOneWidget);
      expect(
        find.text('7:30 PM · 26 of 30 booked · 4 waiting'),
        findsOneWidget,
      );
      expect(find.text('Programmes'), findsOneWidget);
      expect(find.text("Aditi and Kabir's wedding"), findsOneWidget);
      expect(find.text('5 functions'), findsOneWidget);
      expect(find.text('This week'), findsOneWidget);
      expect(find.text('8 left'), findsOneWidget);
      expect(find.text('Full'), findsOneWidget);
      expect(find.text('Later in November'), findsOneWidget);

      await tester.tap(find.text('Carter Road Social Run'));
      await tester.tap(find.text('New programme'));
      expect(calls.whereType<String>(), contains('new programme'));
      expect(calls.first, comingEvents[1]);
    });

    testWidgets('an organizer with no programme has no Programmes section', (
      tester,
    ) async {
      await pumpEvents(tester, eventsReady(programmes: false));
      expect(find.text('Programmes'), findsNothing);
    });

    testWidgets('drafts and past list their events', (tester) async {
      await pumpEvents(tester, eventsReady(), tab: HostEventsTab.drafts);
      expect(find.text('Diwali Quiz'), findsOneWidget);
      expect(find.text('Draft'), findsOneWidget);
      await pumpEvents(tester, eventsReady(), tab: HostEventsTab.past);
      expect(find.text('Sunday Social Run'), findsOneWidget);
      expect(find.text('26 came'), findsOneWidget);
    });

    testWidgets('loading and error', (tester) async {
      await pumpEvents(tester, const HostEventsState.loading());
      expect(find.byType(CatchSkeleton), findsOneWidget);
      final calls = await pumpEvents(
        tester,
        const HostEventsState(status: HostEventsStatus.error),
      );
      expect(find.text('Your events could not load'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      expect(calls, ['retry']);
    });
  });

  group('Workspace', () {
    Future<List<Object>> pumpWorkspace(
      WidgetTester tester,
      HostEventWorkspaceState state,
    ) async {
      final calls = <Object>[];
      await _pump(
        tester,
        HostEventWorkspaceBody(
          state: state,
          now: eventsNow,
          onView: calls.add,
          onAction: calls.add,
          onRetry: () => calls.add('retry'),
        ),
      );
      return calls;
    }

    testWidgets('the setup view facts add the arrival message and sales', (
      tester,
    ) async {
      final ready = workspaceReady();
      await pumpWorkspace(
        tester,
        HostEventWorkspaceState(
          status: ready.status,
          event: ready.event,
          planSteps: ready.planSteps,
          door: ready.door,
          doorChecked: true,
          ticketSalesMinor: 49900,
          ticketsSold: 1,
          arrivalReady: true,
        ),
      );
      expect(find.text('3 of 4 done'), findsOneWidget);
      expect(find.text('Arrival message is ready'), findsOneWidget);
      expect(find.text('1 ticket sold'), findsOneWidget);
    });

    testWidgets('ready shows the poster, the views, the checklist, the links, '
        'the stats and cancel', (tester) async {
      final calls = await pumpWorkspace(tester, workspaceReady());
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Ready for tonight'), findsOneWidget);
      expect(find.text('2 of 3 done'), findsOneWidget);
      expect(find.text('The plan is set'), findsOneWidget);
      expect(find.text('5 steps, from doors at 7:30 PM'), findsOneWidget);
      expect(find.text('Kabir is on the door'), findsOneWidget);
      expect(find.text('Practise the live screens'), findsOneWidget);
      expect(find.text('Plan for the night'), findsOneWidget);
      expect(find.text('Who can see and book'), findsOneWidget);
      expect(find.text('After the night'), findsOneWidget);
      expect(find.text('26/30'), findsOneWidget);
      expect(find.text('4 on the waitlist'), findsOneWidget);
      expect(find.text('Ticket sales'), findsOneWidget);
      expect(find.text('Cancel this event'), findsOneWidget);

      await tester.tap(find.text('Practise'));
      await tester.tap(find.text('Guests'));
      await tester.tap(find.text('Cancel this event'));
      expect(calls, [
        HostEventWorkspaceAction.practise,
        HostEventView.guests,
        HostEventWorkspaceAction.cancel,
      ]);
    });

    testWidgets('nobody on the door is a step still to do', (tester) async {
      await pumpWorkspace(tester, workspaceReady(door: false));
      expect(find.text('Nobody is on the door yet'), findsOneWidget);
      expect(find.text('1 of 3 done'), findsOneWidget);
    });

    testWidgets('missing and error', (tester) async {
      await pumpWorkspace(
        tester,
        const HostEventWorkspaceState(status: HostEventWorkspaceStatus.missing),
      );
      expect(find.text('This event is not here any more'), findsOneWidget);
      await pumpWorkspace(
        tester,
        const HostEventWorkspaceState(status: HostEventWorkspaceStatus.error),
      );
      expect(find.text('This event could not load'), findsOneWidget);
    });
  });

  group('Guests', () {
    Future<List<Object>> pumpGuests(
      WidgetTester tester,
      HostEventGuestsState state,
      HostEventGuestList list,
    ) async {
      final calls = <Object>[];
      await _pump(
        tester,
        HostEventGuestsBody(
          state: state,
          list: list,
          onView: calls.add,
          onList: calls.add,
          onLetIn: (guest) => calls.add('let in ${guest.id}'),
          onOffer: (guest) => calls.add('offer ${guest.id}'),
          onMessageAll: () => calls.add('message'),
          onDownload: () => calls.add('download'),
          onRetry: () => calls.add('retry'),
        ),
      );
      return calls;
    }

    testWidgets('booked shows the numbers, the lists with counts and the '
        'guests with their history', (tester) async {
      final calls = await pumpGuests(
        tester,
        guestsReady(),
        HostEventGuestList.booked,
      );
      expect(find.text('places left'), findsOneWidget);
      expect(find.text('Aanya Sharma'), findsOneWidget);
      expect(find.text('Night 11 with you'), findsOneWidget);
      expect(find.text('First time'), findsOneWidget);
      expect(find.text('New'), findsOneWidget);
      expect(find.text('Message all 2'), findsOneWidget);
      await tester.tap(find.text('Download the list'));
      await tester.tap(find.text('Asked'));
      expect(calls, ['download', HostEventGuestList.asked]);
    });

    testWidgets('asked lets in and waitlist offers', (tester) async {
      var calls = await pumpGuests(
        tester,
        guestsReady(),
        HostEventGuestList.asked,
      );
      await tester.tap(find.text('Let in'));
      expect(calls, ['let in u-zoya']);
      calls = await pumpGuests(
        tester,
        guestsReady(),
        HostEventGuestList.waitlist,
      );
      await tester.tap(find.text('Offer'));
      expect(calls, ['offer a-nikhil']);
    });

    testWidgets('an empty list says so', (tester) async {
      await pumpGuests(tester, guestsReady(), HostEventGuestList.cancelled);
      expect(find.text('Nobody here yet.'), findsOneWidget);
    });
  });

  group('Close out', () {
    testWidgets('shows who came and marks the unchecked', (tester) async {
      final marks = <String>[];
      await _pump(
        tester,
        HostEventCloseOutBody(
          state: closeOutReady(),
          marks: const {'a-neel': false},
          onMark: (attendee, came) => marks.add('${attendee.id} $came'),
          onRetry: () {},
        ),
      );
      expect(find.text('26 came'), findsOneWidget);
      expect(find.text('of 28 booked'), findsOneWidget);
      expect(find.textContaining('Check the 1 people'), findsOneWidget);
      expect(find.text('Ishaan Bose'), findsOneWidget);
      await tester.tap(
        find.descendant(
          of: find.byKey(
            const ValueKey<String>('host-event-close-out-a-ishaan'),
          ),
          matching: find.text('Came'),
        ),
      );
      expect(marks, ['a-ishaan true']);
    });

    testWidgets('loading', (tester) async {
      await _pump(
        tester,
        HostEventCloseOutBody(
          state: const HostEventCloseOutState.loading(),
          marks: const {},
          onMark: (_, _) {},
          onRetry: () {},
        ),
      );
      expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    });
  });

  group('Publish', () {
    testWidgets('published offers the link and the team, not itself', (
      tester,
    ) async {
      final calls = <HostEventVisibility>[];
      await _pump(
        tester,
        HostEventPublishBody(
          state: publishReady,
          onVisibility: calls.add,
          onRetry: () {},
        ),
      );
      expect(find.text('Everyone'), findsOneWidget);
      expect(find.text('People with the link'), findsOneWidget);
      expect(find.text('Only your team'), findsOneWidget);
      await tester.tap(find.text('Everyone'));
      await tester.tap(find.text('People with the link'));
      await tester.tap(find.text('Only your team'));
      expect(calls, [HostEventVisibility.link, HostEventVisibility.team]);
    });

    testWidgets('who can book saves only while the event is unpublished', (
      tester,
    ) async {
      final modes = <HostEventBookingMode>[];
      final switches = <bool>[];
      await _pump(
        tester,
        HostEventPublishBody(
          state: publishReady,
          onVisibility: (_) {},
          onBookingMode: modes.add,
          onShowGuestList: switches.add,
          onRetry: () {},
        ),
      );
      expect(
        find.text('Unpublish the event to change who can book'),
        findsOneWidget,
      );
      await tester.tap(find.text('Ask first'));
      expect(modes, isEmpty);
      await tester.tap(
        find.byKey(const ValueKey<String>('host-event-publish-guest-list')),
      );
      expect(switches, [false]);

      await _pump(
        tester,
        HostEventPublishBody(
          state: const HostEventPublishState(
            status: HostEventPublishStatus.ready,
            canPublish: true,
            setupRevision: 2,
            canChangeBooking: true,
          ),
          onVisibility: (_) {},
          onBookingMode: modes.add,
          onRetry: () {},
        ),
      );
      await tester.tap(find.text('Ask first'));
      expect(modes, [HostEventBookingMode.askFirst]);
    });

    testWidgets('not written yet', (tester) async {
      await _pump(
        tester,
        HostEventPublishBody(
          state: const HostEventPublishState(
            status: HostEventPublishStatus.missing,
          ),
          onVisibility: (_) {},
          onRetry: () {},
        ),
      );
      expect(find.text('This event is still being prepared'), findsOneWidget);
    });
  });

  group('Plan', () {
    testWidgets('shows the format, the run of show and the options', (
      tester,
    ) async {
      final changed = <Object>[];
      final state = planReady();
      await _pump(
        tester,
        HostEventPlanBody(
          state: state,
          options: state.options,
          onOption: (option, on) => changed.add('${option.name} $on'),
          onRetry: () {},
        ),
      );
      expect(find.text('Trivia · Catch prepares'), findsOneWidget);
      expect(find.text('Run of show'), findsOneWidget);
      expect(find.text(state.steps.first.step.title), findsOneWidget);
      expect(find.text('On the night'), findsOneWidget);
      await tester.tap(
        find.descendant(
          of: find.byKey(
            const ValueKey<String>('host-event-plan-introductions'),
          ),
          matching: find.byType(CatchToggleInput),
        ),
      );
      expect(changed, hasLength(1));
    });

    testWidgets('no plan yet', (tester) async {
      await _pump(
        tester,
        HostEventPlanBody(
          state: const HostEventPlanState(status: HostEventPlanStatus.noPlan),
          options: const {},
          onOption: (_, _) {},
          onRetry: () {},
        ),
      );
      expect(find.text('No plan for this night yet'), findsOneWidget);
    });
  });

  group('Defaults', () {
    testWidgets('pending and error', (tester) async {
      await _pump(
        tester,
        HostEventDefaultsBody(
          state: const HostEventDefaultsState(
            status: HostEventDefaultsStatus.missing,
          ),
          onCollection: (_) {},
          onEdit: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('Your defaults are being prepared'), findsOneWidget);
      await _pump(
        tester,
        HostEventDefaultsBody(
          state: const HostEventDefaultsState(
            status: HostEventDefaultsStatus.error,
          ),
          onCollection: (_) {},
          onEdit: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('Your event defaults could not load'), findsOneWidget);
    });

    testWidgets('tickets, refunds and messages save on change', (tester) async {
      final saved = <ManagerEventSetupPreferences>[];
      await _pump(
        tester,
        HostEventDefaultsBody(
          state: const HostEventDefaultsState(
            status: HostEventDefaultsStatus.ready,
            preferences: ManagerEventSetupPreferences(
              startingPriceMinor: 49900,
              places: 32,
              refundPolicy: 'flexible',
              askedAtBooking: ['food'],
            ),
          ),
          onCollection: (_) {},
          onChange: saved.add,
          onEdit: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('₹499'), findsOneWidget);
      expect(find.text('1 question'), findsOneWidget);
      await tester.tap(find.text('No refunds'));
      await tester.tap(
        find.byKey(const ValueKey<String>('host-event-defaults-ask')),
      );
      expect(saved.map((next) => next.refundPolicy), ['strict', 'flexible']);
      expect(saved.last.bookingMode, 'askFirst');
      expect(saved.last.places, 32);
    });
  });

  group('Rehearsal', () {
    testWidgets('running shows the badge, the steps and the actions', (
      tester,
    ) async {
      final calls = <String>[];
      final state = rehearsalReady();
      await _pump(
        tester,
        HostRehearsalBody(
          state: state,
          onOpenDoor: () => calls.add('door'),
          onEnd: () => calls.add('end'),
          onRetry: () {},
        ),
        theme: CatchThemeMode.night,
      );
      expect(
        find.text('Practice · nothing is sent or charged'),
        findsOneWidget,
      );
      expect(find.text('Run tonight before it happens.'), findsOneWidget);
      expect(find.text(state.steps[1].step.title), findsOneWidget);
      await tester.tap(find.text('Open the practice door'));
      await tester.tap(find.text('End rehearsal'));
      expect(calls, ['door', 'end']);
    });

    testWidgets('ended hides the actions', (tester) async {
      await _pump(
        tester,
        HostRehearsalBody(
          state: const HostRehearsalState(status: HostRehearsalStatus.ended),
          onOpenDoor: () {},
          onEnd: () {},
          onRetry: () {},
        ),
        theme: CatchThemeMode.night,
      );
      expect(find.text('This rehearsal is over.'), findsOneWidget);
      expect(find.text('End rehearsal'), findsNothing);
    });
  });
}
