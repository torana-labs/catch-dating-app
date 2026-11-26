import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

import 'staff_captures.dart';
import 'staff_fixtures.dart';

ProgramLodgingHotelGuest _guest(String id, String name, {int arrive = 11}) =>
    ProgramLodgingHotelGuest(
      guestId: id,
      displayName: name,
      arrival: DateTime(2026, 12, arrive),
      departure: DateTime(2026, 12, 14),
    );

ProgramLodgingHotelRoom _room(
  String id,
  String? label,
  List<ProgramLodgingHotelGuest> guests,
) => ProgramLodgingHotelRoom(
  partyId: 'party-$id',
  inventoryId: id,
  roomType: 'Deluxe twin',
  roomLabel: label,
  guests: guests,
);

/// Four rooms in allocation order: 110, an unreleased twin, 9 and 101.
final _board = ProgramLodgingHotelBoard(
  hotelLabel: 'Lakeview Haveli',
  rooms: [
    _room('u110', '110', [_guest('neha', 'Neha Iyer')]),
    _room('ux', null, [_guest('rohan', 'Rohan Das')]),
    _room('u9', '9', [
      _guest('asha', 'Asha Verma', arrive: 12),
      _guest('kabir', 'Kabir Verma'),
    ]),
    _room('u101', '101', [_guest('meera', 'Meera Pillai')]),
  ],
);

Widget _app(Widget child, {List<Override> overrides = const []}) =>
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: child,
      ),
    );

Future<void> _pumpBody(
  WidgetTester tester,
  StaffHotelRoomListState state, {
  ValueChanged<String>? onSearch,
  VoidCallback? onRetry,
}) async {
  tester.view.physicalSize = const Size(390, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    _app(
      CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(
          bodyScrolls: false,
          body: StaffHotelRoomListBody(
            state: state,
            onSearch: onSearch ?? (_) {},
            onRetry: onRetry ?? () {},
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

List<String> _rowTitles(WidgetTester tester) => [
  for (final row in tester.widgetList<CatchIndexRow>(
    find.byType(CatchIndexRow),
  ))
    row.title,
];

void main() {
  setUpAll(loadCatchTestFonts);

  group('state', () {
    test('sorts rooms by number, unreleased rooms last', () {
      final state = StaffHotelRoomListState.fromBoard(_board);
      expect(state.rooms.map((room) => room.roomLabel), [
        '9',
        '101',
        '110',
        null,
      ]);
    });

    test('searches guest names by every word, any case', () {
      List<String> shown(String query) => [
        for (final room in StaffHotelRoomListState.fromBoard(
          _board,
          query: query,
        ).shown)
          room.inventoryId,
      ];
      expect(shown(''), ['u9', 'u101', 'u110', 'ux']);
      expect(shown('verma'), ['u9']);
      expect(shown('  KABIR verma '), ['u9']);
      expect(shown('meera iyer'), isEmpty);
    });

    test('a party reads from its first arrival to its last departure', () {
      final stay = staffHotelRoomStay(_board.rooms[2]);
      expect(stay.arrival, DateTime(2026, 12, 11));
      expect(stay.departure, DateTime(2026, 12, 14));
    });
  });

  group('body', () {
    testWidgets('rooms with their guests, dates and room, and no actions', (
      tester,
    ) async {
      await _pumpBody(tester, StaffHotelRoomListState.fromBoard(_board));
      expect(_rowTitles(tester), [
        'Asha Verma, Kabir Verma',
        'Meera Pillai',
        'Neha Iyer',
        'Rohan Das',
      ]);
      expect(find.text('Room 9'), findsOneWidget);
      expect(find.text('Room 101'), findsOneWidget);
      expect(find.text('Exact room pending'), findsOneWidget);
      expect(find.textContaining('Deluxe twin'), findsOneWidget);
      expect(find.textContaining('Dec 11 to Dec 14'), findsNWidgets(4));
      expect(find.byType(CatchButton), findsNothing);
      for (final row in tester.widgetList<CatchIndexRow>(
        find.byType(CatchIndexRow),
      )) {
        expect(row.onTap, isNull);
        expect(row.action, isNull);
      }
    });

    testWidgets('search reports each change and says when nobody matches', (
      tester,
    ) async {
      final queries = <String>[];
      await _pumpBody(
        tester,
        StaffHotelRoomListState.fromBoard(_board),
        onSearch: queries.add,
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('staff-hotel-rooms-search')),
          matching: find.byType(EditableText),
        ),
        'verma',
      );
      expect(queries.last, 'verma');
      await _pumpBody(
        tester,
        StaffHotelRoomListState.fromBoard(_board, query: 'nobody'),
      );
      expect(find.byType(CatchIndexRow), findsNothing);
      expect(find.text('Nobody matches that name.'), findsOneWidget);
    });

    testWidgets('an empty board says so, with no search', (tester) async {
      await _pumpBody(
        tester,
        StaffHotelRoomListState.fromBoard(
          const ProgramLodgingHotelBoard(
            hotelLabel: 'Lakeview Haveli',
            rooms: [],
          ),
        ),
      );
      expect(
        find.text('No rooms are allocated at this hotel yet.'),
        findsOneWidget,
      );
      expect(find.byType(CatchSearchField), findsNothing);
    });

    testWidgets('loading spins; an error offers Try again', (tester) async {
      await _pumpBody(tester, const StaffHotelRoomListState.loading());
      expect(find.byType(CatchLoadingIndicator), findsOneWidget);
      var retried = 0;
      await _pumpBody(
        tester,
        const StaffHotelRoomListState.error(),
        onRetry: () => retried++,
      );
      expect(find.text('The room list did not load'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      expect(retried, 1);
    });
  });

  group('screen', () {
    testWidgets('reads the board, titles it with the hotel and retries', (
      tester,
    ) async {
      var reads = 0;
      await tester.pumpWidget(
        _app(
          const StaffHotelRoomListScreen(
            programId: staffProgramId,
            hotelId: staffHotelId,
          ),
          overrides: [
            programLodgingHotelBoardProvider(
              staffProgramId,
              staffHotelId,
            ).overrideWith((ref) async {
              reads++;
              if (reads == 1) throw StateError('offline');
              return _board;
            }),
          ],
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('The room list did not load'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(reads, 2);
      expect(find.text('Lakeview Haveli'), findsOneWidget);
      expect(find.text('Room list'), findsOneWidget);
      expect(find.byType(CatchIndexRow), findsNWidgets(4));
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('staff-hotel-rooms-search')),
          matching: find.byType(EditableText),
        ),
        'neha',
      );
      await tester.pump();
      expect(_rowTitles(tester), ['Neha Iyer']);
    });

    testWidgets('fits a phone at text scale 2', (tester) async {
      tester.view.physicalSize = const Size(390, 1240);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          MediaQuery(
            data: const MediaQueryData(
              size: Size(390, 1240),
              textScaler: TextScaler.linear(2),
            ),
            child: hostStaffHotelRoomsCapture(),
          ),
          overrides: hostStaffCaptureOverrides(),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Exact room pending'), findsOneWidget);
    });

    test('the hotel route opens the room list for view=rooms', () {
      final screen = staffHotelScreenForUri(
        staffProgramId,
        staffHotelId,
        Uri.parse('/host/work/p/hotel/h?view=rooms'),
      );
      expect(screen, isA<StaffHotelRoomListScreen>());
      expect(
        staffHotelScreenForUri(
          staffProgramId,
          staffHotelId,
          Uri.parse('/host/work/p/hotel/h'),
        ),
        isA<StaffHotelDeskScreen>(),
      );
    });

    testWidgets('the desk offers the room list', (tester) async {
      tester.view.physicalSize = const Size(390, 1240);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          hostStaffHotelDeskCapture(),
          overrides: hostStaffCaptureOverrides(),
        ),
      );
      await tester.pump();
      expect(
        find.byKey(const ValueKey('staff-hotel-room-list')),
        findsOneWidget,
      );
    });
  });
}
