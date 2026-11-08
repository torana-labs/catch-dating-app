import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/hosts/create/create_basics_body.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_settings_copy.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/create_share_body.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_editor_rail.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../organizers/organizers_test_helpers.dart';

final _today = DateTime(2026, 10, 27);
final l10n = AppLocalizationsEn();

CreateFlowState _state({
  EventDraft? draft,
  Set<CreateProblem> problems = const {},
  String? eventId,
  bool canAddPhotos = false,
  bool published = false,
  CreateStep step = CreateStep.basics,
}) => CreateFlowState(
  organizer: buildOrganizer(name: 'Lantern Lane Social'),
  draft:
      draft ??
      EventDraft(id: 'draft-1', organizerId: 'club-1', savedAt: _today),
  problems: problems,
  eventId: eventId,
  canAddPhotos: canAddPhotos,
  published: published,
  step: step,
);

final _trivia = EventDraft(
  id: 'draft-1',
  organizerId: 'club-1',
  savedAt: _today,
  name: 'Tuesday Trivia Night',
  activityKind: 'pubQuiz',
  description: 'Six rounds, teams of four made up on the night.',
  eventLocalDate: '2026-10-27',
  eventLocalStartTime: '19:30',
  durationMinutes: 150,
  meetingPoint: 'Harbour Room',
  meetingLocationAddress: 'Chimbai Road, Bandra West',
  startingPointLat: 19.06,
  startingPointLng: 72.83,
  price: '499',
  capacity: '30',
);

Future<void> _pump(WidgetTester tester, Widget body, {Size? size}) async {
  tester.view.physicalSize = size ?? const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(body: CatchPageBody(child: body)),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  group('the basics', () {
    Widget body(CreateFlowState state, {List<Object>? calls}) =>
        CreateBasicsBody(
          state: state,
          onName: (value) => calls?.add('name:$value'),
          onFormat: (value) => calls?.add(value),
          onDescription: (_) {},
          onDistance: (value) => calls?.add('distance:$value'),
          onPace: (value) => calls?.add('pace:$value'),
          onAddPhoto: () => calls?.add('photo'),
        );

    testWidgets('offers the six formats and the chosen one note', (
      tester,
    ) async {
      final calls = <Object>[];
      await _pump(tester, body(_state(draft: _trivia), calls: calls));

      for (final format in CreateFormat.values) {
        expect(
          find.text(l10n.hostCreateFormatLabel(format: format.name)),
          findsOneWidget,
        );
      }
      expect(
        find.text(l10n.hostCreateFormatNote(format: CreateFormat.quiz.name)),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('create-distance')), findsNothing);
      await tester.tap(
        find.text(l10n.hostCreateFormatLabel(format: CreateFormat.run.name)),
      );
      expect(calls, [CreateFormat.run]);
    });

    testWidgets('a social run adds distance and pace', (tester) async {
      await _pump(
        tester,
        body(_state(draft: _trivia.copyWith(activityKind: 'socialRun'))),
      );
      expect(find.byKey(const ValueKey('create-distance')), findsOneWidget);
      expect(find.text(l10n.hostCreatePace), findsOneWidget);
    });

    testWidgets('names what is missing on its fields', (tester) async {
      await _pump(
        tester,
        body(_state(problems: {CreateProblem.name, CreateProblem.format})),
      );
      expect(find.text(l10n.hostCreateNameNeeded), findsOneWidget);
      expect(find.text(l10n.hostCreateFormatNeeded), findsOneWidget);
    });

    testWidgets('photos wait for the event, then add', (tester) async {
      final calls = <Object>[];
      await _pump(tester, body(_state(), calls: calls));
      expect(find.text(l10n.hostCreateAddPhotoLater), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('create-add-photo-0')));
      expect(calls, isEmpty);

      await _pump(
        tester,
        body(_state(eventId: 'event-1', canAddPhotos: true), calls: calls),
      );
      expect(find.text(l10n.hostCreateAddPhotoLater), findsNothing);
      await tester.tap(find.byKey(const ValueKey('create-add-photo-0')));
      expect(calls, ['photo']);
    });
  });

  group('when and where', () {
    Widget body(CreateFlowState state, {List<Object>? calls}) => CreateWhenBody(
      state: state,
      today: _today,
      onDate: (day) => calls?.add(day),
      onPickDate: () => calls?.add('calendar'),
      onStart: () => calls?.add('start'),
      onEnd: () => calls?.add('end'),
      onPlace: () => calls?.add('place'),
      onDirections: (_) {},
    );

    testWidgets('shows three weeks, the times and the place', (tester) async {
      final calls = <Object>[];
      await _pump(tester, body(_state(draft: _trivia), calls: calls));

      expect(
        find.text(l10n.hostCreateDateRange(from: 'Oct', to: 'Nov')),
        findsOneWidget,
      );
      expect(find.textContaining('7:30'), findsOneWidget);
      expect(find.textContaining('10:00'), findsOneWidget);
      expect(find.text('Harbour Room'), findsOneWidget);
      expect(find.text(l10n.hostCreateChange), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('create-pick-date')));
      await tester.tap(find.byKey(const ValueKey('create-day-28')));
      expect(calls, ['calendar', DateTime(2026, 10, 28)]);
    });

    testWidgets('asks for a date and a start, and a place to pick', (
      tester,
    ) async {
      await _pump(
        tester,
        body(_state(problems: {CreateProblem.date, CreateProblem.start})),
      );
      expect(find.text(l10n.hostCreateDateNeeded), findsNWidgets(2));
      expect(find.text(l10n.hostCreateStartNeeded), findsOneWidget);
      expect(find.text(l10n.hostCreatePickPlace), findsOneWidget);
    });
  });

  group('tickets', () {
    Widget body(CreateFlowState state) => CreateTicketsBody(
      state: state,
      onSellElsewhere: (_) {},
      onPrice: (_) {},
      onPlaces: (_) {},
      onAdmission: (_) {},
    );

    testWidgets('selling on Catch shows price, places and payouts', (
      tester,
    ) async {
      await _pump(tester, body(_state(draft: _trivia)));
      expect(find.text(l10n.hostCreatePricePerPlace), findsOneWidget);
      expect(find.text(l10n.hostCreatePlaces), findsOneWidget);
      expect(find.text(l10n.hostCreatePayoutNotice), findsOneWidget);
      for (final admission in CreateAdmission.values) {
        expect(
          find.text(l10n.hostCreateAdmissionTitle(admission: admission.name)),
          findsOneWidget,
        );
      }
    });

    testWidgets('the waitlist and approval switches report their change', (
      tester,
    ) async {
      final waitlist = <bool>[];
      final approve = <bool>[];
      await _pump(
        tester,
        CreateTicketsBody(
          state: _state(draft: _trivia),
          onSellElsewhere: (_) {},
          onPrice: (_) {},
          onPlaces: (_) {},
          onAdmission: (_) {},
          onWaitlist: waitlist.add,
          onApproveEach: approve.add,
        ),
      );
      expect(find.text(CreateSettingsCopy.waitlist), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey<String>('create-waitlist')));
      await tester.tap(
        find.byKey(const ValueKey<String>('create-approve-each')),
      );
      expect(waitlist, [false]);
      expect(approve, [true]);
    });

    testWidgets('selling elsewhere keeps price and places off', (tester) async {
      await _pump(
        tester,
        body(_state(draft: _trivia.copyWith(externalBookingMode: true))),
      );
      expect(find.text(l10n.hostCreatePricePerPlace), findsNothing);
      expect(find.text(l10n.hostCreatePayoutNotice), findsNothing);
      expect(find.text(l10n.hostCreateWhoCanCome), findsOneWidget);
    });
  });

  group('the plan', () {
    testWidgets('lists the steps with their clock times', (tester) async {
      final edits = <EventItineraryItem>[];
      final plan = createPlanTemplate(l10n, CreateFormat.quiz, 150);
      await _pump(
        tester,
        CreatePlanBody(
          state: _state(draft: _trivia.copyWith(itinerary: plan)),
          onTemplate: () {},
          onBlank: () {},
          onEdit: edits.add,
          onAdd: () {},
        ),
      );
      expect(find.text(l10n.hostCreateDoorsAndHellos), findsOneWidget);
      expect(find.text('7:30'), findsOneWidget);
      expect(find.text('8:00'), findsOneWidget);
      expect(find.text(l10n.hostCreateAddStep), findsOneWidget);
      await tester.tap(find.text(l10n.hostCreateGoodbyes));
      expect(edits.single.id, 'goodbyes');
    });
  });

  group('share', () {
    testWidgets('shows the badge, the poster and the link', (tester) async {
      var copied = 0;
      await _pump(
        tester,
        CreateShareBody(
          state: _state(draft: _trivia, eventId: 'event-1', published: true),
          link: 'https://catchdates.com/e/event-1',
          onCopyLink: () => copied++,
          onPrint: () {},
          onShareStory: () {},
          onShareWhatsApp: () {},
        ),
      );
      expect(find.text(l10n.hostCreatePublished), findsOneWidget);
      expect(find.text('Tuesday Trivia Night'), findsOneWidget);
      expect(find.text('https://catchdates.com/e/event-1'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('create-copy-link')));
      expect(copied, 1);
    });
  });

  group('the desktop panes', () {
    testWidgets('the rail selects the step and the preview names what is '
        'still to set', (tester) async {
      final steps = <CreateStep>[];
      await _pump(
        tester,
        Column(
          children: [
            CreateStepRail(
              state: _state(step: CreateStep.when),
              onStep: steps.add,
            ),
            CreateEditorPreview(
              state: _state(),
              stillToSet: const ['When and where', 'Tickets'],
            ),
          ],
        ),
        size: const Size(1440, 2000),
      );
      expect(find.text(l10n.hostCreateDateToCome), findsOneWidget);
      expect(find.text('When and where · Tickets'), findsOneWidget);
      await tester.tap(
        find.text(l10n.hostCreateRailTitle(step: CreateStep.tickets.name)),
      );
      expect(steps, [CreateStep.tickets]);
    });
  });
}
