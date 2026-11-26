import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_state.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../programs/program_lodging_test_fixtures.dart';
import '../planner_test_pump.dart';

/// Two hotels: `unit` (party) and an empty `unit3` on the first hotel's
/// floor, `unit2` (party2, checked in) at the second hotel.
ProgramLodgingReview _review({String? proposalId, bool unplaced = false}) {
  final json =
      jsonDecode(jsonEncode(lodgingTwoHotelReviewJson()))
          as Map<String, Object?>;
  final proposal = json['proposal']! as Map<String, Object?>;
  if (proposalId != null) proposal['id'] = proposalId;
  if (unplaced) proposal['unplacedPartyIds'] = ['party'];
  final context = json['context']! as Map<String, Object?>;
  final snapshot = context['snapshot']! as Map<String, Object?>;
  final rooms = snapshot['rooms']! as List<Object?>;
  rooms.add({
    ...rooms.first! as Map<String, Object?>,
    'id': 'room3',
    'resourceIds': ['room3'],
    'position': {'x': 0.9, 'y': 0.5},
  });
  (snapshot['inventory']! as List<Object?>).add({
    'id': 'unit3',
    'physicalRoomId': 'room3',
    'provisional': null,
    'contractId': 'block',
    'availability': <Object?>[],
  });
  (snapshot['published']! as List<Object?>).add({
    'partyId': 'party2',
    'inventoryId': 'unit2',
    'locked': false,
    'checkedIn': true,
  });
  final configuration = context['configuration']! as Map<String, Object?>;
  (configuration['labels']! as List<Object?>).add({
    'inventoryId': 'unit3',
    'roomLabel': '103',
  });
  return ProgramLodgingReview.fromCallableData(json);
}

const _options = [
  ProgramLodgingDestination(
    inventoryId: 'unit',
    allowed: false,
    explanation: 'Room already occupied',
  ),
  ProgramLodgingDestination(
    inventoryId: 'unit3',
    allowed: true,
    explanation: 'Empty room; enough beds',
  ),
  ProgramLodgingDestination(
    inventoryId: 'unit2',
    allowed: true,
    explanation: 'Friends at this hotel',
  ),
];

Widget _body(
  ProgramLodgingReview review, {
  HostProgrammeLodgingPreview? onPreview,
  HostProgrammeLodgingMove? onMove,
  void Function(ProgramLodgingAction, String?)? onDecide,
  HostProgrammeLodgingState? state,
}) => HostProgrammeLodgingBody(
  state:
      state ??
      HostProgrammeLodgingState(
        setup: ProgramLodgingSetup(
          configuration: review.configuration,
          accessExpiresAt: null,
        ),
        review: review,
      ),
  review: review,
  onBack: () {},
  onPreview: onPreview ?? (_, _) async => _options,
  onMove: onMove ?? (_, _, _) async {},
  onDecide: (action, {hotelId}) => onDecide?.call(action, hotelId),
  onMembership: () {},
  onEditSetup: () {},
  onRegenerate: () {},
  onRefresh: () {},
);

Finder _key(String value) => find.byKey(ValueKey<String>(value));

CatchChoiceTile _room(WidgetTester tester, String id) =>
    tester.widget<CatchChoiceTile>(_key('host-programme-lodging-room-$id'));

CatchIndexRow _party(WidgetTester tester, String id) =>
    tester.widget<CatchIndexRow>(_key('host-programme-lodging-party-$id'));

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await pumpFeatureUi(tester);
}

Future<void> _secondFloor(WidgetTester tester) async {
  await _tap(tester, find.text('Floor'));
  await _tap(
    tester,
    find.descendant(
      of: _key('host-programme-lodging-floor'),
      matching: find.textContaining('Hotel Two'),
    ),
  );
}

void main() {
  testWidgets('a move uses the reviewed proposal and the picked room', (
    tester,
  ) async {
    final moves = <List<String>>[];
    final review = _review();
    await pumpPlannerBody(
      tester,
      _body(
        review,
        onMove: (proposal, party, unit) async =>
            moves.add([proposal, party, unit]),
      ),
      size: plannerDesktop,
    );
    await _tap(tester, _key('host-programme-lodging-party-party'));
    await _tap(tester, _key('host-programme-lodging-room-unit3'));
    expect(find.text('Empty room; enough beds'), findsOneWidget);
    await _tap(tester, _key('host-programme-lodging-move'));
    expect(moves, [
      [review.proposal.id, 'party', 'unit3'],
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('checked-in parties stay locked and blocked rooms say why', (
    tester,
  ) async {
    var previews = 0;
    await pumpPlannerBody(
      tester,
      _body(
        _review(),
        onPreview: (_, _) async {
          previews++;
          return _options;
        },
      ),
      size: plannerDesktop,
    );
    expect(_party(tester, 'party2').onTap, isNull);
    expect(find.text('Locked'), findsOneWidget);
    expect(previews, 0);
    await _tap(tester, _key('host-programme-lodging-party-party'));
    expect(previews, 1);
    expect(_room(tester, 'unit3').emphasis, CatchChoiceTileEmphasis.attention);
    await _tap(tester, _key('host-programme-lodging-room-unit'));
    expect(find.text('Room already occupied'), findsOneWidget);
    expect(
      tester.widget<CatchButton>(_key('host-programme-lodging-move')).onPressed,
      isNull,
    );
  });

  testWidgets('tapping a room chooses the movable party in it', (tester) async {
    final previews = <String>[];
    await pumpPlannerBody(
      tester,
      _body(
        _review(),
        onPreview: (_, party) async {
          previews.add(party);
          return _options;
        },
      ),
      size: plannerDesktop,
    );
    await _tap(tester, _key('host-programme-lodging-room-unit'));
    expect(previews, ['party']);
    expect(_party(tester, 'party').selected, isTrue);
    await _secondFloor(tester);
    expect(_room(tester, 'unit2').onTap, isNotNull);
  });

  testWidgets('the list and the floor map show the same rooms per floor', (
    tester,
  ) async {
    await pumpPlannerBody(tester, _body(_review()), size: plannerDesktop);
    expect(_key('host-programme-lodging-rooms-list'), findsOneWidget);
    await _tap(tester, find.text('Floor map'));
    expect(_key('host-programme-lodging-rooms-floorMap'), findsOneWidget);
    expect(_key('host-programme-lodging-room-unit'), findsOneWidget);
    expect(_key('host-programme-lodging-room-unit3'), findsOneWidget);
    await _secondFloor(tester);
    expect(_key('host-programme-lodging-room-unit2'), findsOneWidget);
    expect(_key('host-programme-lodging-room-unit'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a late preview for an older proposal cannot enable a move', (
    tester,
  ) async {
    final pending = Completer<List<ProgramLodgingDestination>>();
    Future<List<ProgramLodgingDestination>> preview(String _, String _) =>
        pending.future;
    Future<void> move(String _, String _, String _) async {}
    await pumpPlannerBody(
      tester,
      _body(_review(), onPreview: preview, onMove: move),
      size: plannerDesktop,
    );
    await _tap(tester, _key('host-programme-lodging-party-party'));
    await pumpPlannerBody(
      tester,
      _body(
        _review(proposalId: List.filled(64, 'c').join()),
        onPreview: preview,
        onMove: move,
      ),
      size: plannerDesktop,
    );
    pending.complete(_options);
    await pumpFeatureUi(tester);
    expect(_key('host-programme-lodging-move'), findsNothing);
    expect(_room(tester, 'unit3').onTap, isNull);
  });

  testWidgets('a rebuild cannot overlap an unfinished move', (tester) async {
    final pending = Completer<void>();
    var moves = 0;
    final review = _review();
    Widget body() => _body(
      review,
      onMove: (_, _, _) async {
        moves++;
        await pending.future;
      },
    );
    await pumpPlannerBody(tester, body(), size: plannerDesktop);
    await _tap(tester, _key('host-programme-lodging-party-party'));
    await _tap(tester, _key('host-programme-lodging-room-unit3'));
    await tester.tap(_key('host-programme-lodging-move'));
    await tester.pump();
    expect(moves, 1);
    await pumpPlannerBody(tester, body(), size: plannerDesktop);
    expect(_party(tester, 'party').onTap, isNull);
    expect(_room(tester, 'unit3').onTap, isNull);
    pending.complete();
    await pumpFeatureUi(tester);
    expect(_party(tester, 'party').onTap, isNotNull);
    await _tap(tester, _key('host-programme-lodging-party-party'));
    await _tap(tester, _key('host-programme-lodging-room-unit3'));
    await _tap(tester, _key('host-programme-lodging-move'));
    expect(moves, 2);
  });

  testWidgets('changing floor drops the hidden room choice', (tester) async {
    final moves = <String>[];
    await pumpPlannerBody(
      tester,
      _body(_review(), onMove: (_, _, room) async => moves.add(room)),
      size: plannerDesktop,
    );
    await _tap(tester, _key('host-programme-lodging-party-party'));
    await _tap(tester, _key('host-programme-lodging-room-unit3'));
    expect(_party(tester, 'party').selected, isTrue);
    expect(_room(tester, 'unit3').selected, isTrue);
    expect(_key('host-programme-lodging-move'), findsOneWidget);
    await _secondFloor(tester);
    expect(_key('host-programme-lodging-room-unit3'), findsNothing);
    expect(_key('host-programme-lodging-move'), findsNothing);
    await _tap(tester, _key('host-programme-lodging-room-unit2'));
    await _tap(tester, _key('host-programme-lodging-move'));
    expect(moves, ['unit2']);
  });

  testWidgets('decisions follow the proposal and name the hotel confirmed', (
    tester,
  ) async {
    final decisions = <(ProgramLodgingAction, String?)>[];
    await pumpPlannerBody(
      tester,
      _body(
        _review(unplaced: true),
        onDecide: (action, hotelId) => decisions.add((action, hotelId)),
      ),
      size: plannerDesktop,
    );
    expect(find.text('One party still needs a room.'), findsOneWidget);
    expect(
      tester
          .widget<CatchButton>(_key('host-programme-lodging-approve'))
          .onPressed,
      isNull,
    );
    await _tap(tester, _key('host-programme-lodging-confirm-hotel2'));
    await _tap(tester, _key('host-programme-lodging-publish'));
    expect(decisions, [
      (ProgramLodgingAction.confirmHotel, 'hotel2'),
      (ProgramLodgingAction.publishGuests, null),
    ]);
  });

  testWidgets('on a phone the board opens from the list and closes again', (
    tester,
  ) async {
    await pumpPlannerBody(tester, _body(_review()));
    expect(_key('host-programme-lodging-room-unit'), findsNothing);
    await _tap(tester, _key('host-programme-lodging-board'));
    expect(_key('host-programme-lodging-room-unit'), findsOneWidget);
    await _tap(tester, find.byTooltip('Stay planner'));
    expect(_key('host-programme-lodging-approve'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
