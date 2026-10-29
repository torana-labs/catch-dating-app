import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_layout.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

const _copy = ProgramLodgingBoardCopy(
  parties: 'Sharing parties',
  rooms: 'Rooms',
  list: 'List',
  map: 'Floor map',
  move: 'Move party',
  locked: 'Locked',
  provisional: 'Type reserved',
  empty: 'No inventory',
);
const _parties = [
  ProgramLodgingBoardParty(id: 'party', label: 'Friends'),
  ProgramLodgingBoardParty(
    id: 'checked',
    label: 'Checked-in guests',
    checkedIn: true,
  ),
];
ProgramLodgingBoardUnit _unit(
  String id,
  String layer,
  int x, {
  List<String> parties = const [],
}) => ProgramLodgingBoardUnit(
  inventoryId: id,
  layerId: layer,
  layerLabel: layer,
  layoutUnit: EventSuccessLayoutUnit(
    id: id,
    label: id,
    shape: EventSuccessLayoutShape.rect,
    capacity: 2,
    gridX: x,
    gridY: 0,
    order: x + 1,
  ),
  partyIds: parties,
);
final _units = [
  _unit('101', 'Floor 1', 0, parties: ['checked']),
  _unit('102', 'Floor 1', 1),
  _unit('201', 'Floor 2', 0),
];
const _options = [
  ProgramLodgingDestination(
    inventoryId: '101',
    allowed: false,
    explanation: 'Room already occupied',
  ),
  ProgramLodgingDestination(
    inventoryId: '102',
    allowed: true,
    explanation: 'Empty room; enough beds',
  ),
  ProgramLodgingDestination(
    inventoryId: '201',
    allowed: true,
    explanation: 'Friends on this floor',
  ),
];

Widget _app(ProgramLodgingLayout board) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: SingleChildScrollView(child: board)),
);
void _size(WidgetTester tester) {
  tester.view.physicalSize = const Size(1000, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Finder _key(String value) => find.byKey(ValueKey(value));

void main() {
  testWidgets('empty-room move uses the reviewed proposal and destination', (
    tester,
  ) async {
    _size(tester);
    final moves = <List<String>>[];
    await tester.pumpWidget(
      _app(
        ProgramLodgingLayout(
          proposalId: 'proposal-1',
          units: _units,
          parties: _parties,
          copy: _copy,
          onPreview: (_, _) async => _options,
          onMove: (proposal, party, unit) async =>
              moves.add([proposal, party, unit]),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(_key('lodging-room-102'), findsOneWidget);
    await tester.tap(_key('lodging-party-party'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-room-102'));
    await pumpFeatureUi(tester);
    expect(find.text('Empty room; enough beds'), findsOneWidget);
    await tester.tap(_key('lodging-move'));
    await pumpFeatureUi(tester);
    expect(moves, [
      ['proposal-1', 'party', '102'],
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('checked-in parties stay locked and invalid rooms explain why', (
    tester,
  ) async {
    _size(tester);
    var previews = 0;
    await tester.pumpWidget(
      _app(
        ProgramLodgingLayout(
          proposalId: 'proposal-1',
          units: _units,
          parties: _parties,
          copy: _copy,
          onPreview: (_, _) async {
            previews++;
            return _options;
          },
          onMove: (_, _, _) async {},
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final locked = tester.widget<CatchButton>(_key('lodging-party-checked'));
    expect(locked.onPressed, isNull);
    expect(previews, 0);
    await tester.tap(_key('lodging-party-party'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-room-101'));
    await pumpFeatureUi(tester);
    expect(find.text('Room already occupied'), findsOneWidget);
    expect(tester.widget<CatchButton>(_key('lodging-move')).onPressed, isNull);
  });

  testWidgets('layered 2D map and list show the same rooms including empties', (
    tester,
  ) async {
    _size(tester);
    await tester.pumpWidget(
      _app(
        ProgramLodgingLayout(
          proposalId: 'proposal-1',
          units: _units,
          parties: _parties,
          copy: _copy,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Floor map'));
    await pumpFeatureUi(tester);
    expect(find.byType(InteractiveViewer), findsOneWidget);
    expect(_key('lodging-room-102'), findsOneWidget);
    await tester.tap(find.text('Floor 2'));
    await pumpFeatureUi(tester);
    expect(_key('lodging-room-201'), findsOneWidget);
    expect(_key('lodging-room-102'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('late preview for an old proposal cannot enable a move', (
    tester,
  ) async {
    _size(tester);
    final pending = Completer<List<ProgramLodgingDestination>>();
    Future<List<ProgramLodgingDestination>> preview(String _, String _) =>
        pending.future;
    Future<void> move(String _, String _, String _) async {}
    ProgramLodgingLayout board(String id) => ProgramLodgingLayout(
      proposalId: id,
      units: _units,
      parties: _parties,
      copy: _copy,
      onPreview: preview,
      onMove: move,
    );
    await tester.pumpWidget(_app(board('proposal-1')));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-party-party'));
    await tester.pumpWidget(_app(board('proposal-2')));
    pending.complete(_options);
    await pumpFeatureUi(tester);
    expect(_key('lodging-move'), findsNothing);
    expect(
      tester.widget<CatchButton>(_key('lodging-room-102')).onPressed,
      isNull,
    );
  });

  testWidgets('callback rebuild cannot overlap an unfinished move', (
    tester,
  ) async {
    _size(tester);
    final pending = Completer<void>();
    var moves = 0;
    ProgramLodgingLayout board() => ProgramLodgingLayout(
      proposalId: 'proposal-1',
      units: _units,
      parties: _parties,
      copy: _copy,
      onPreview: (_, _) async => _options,
      onMove: (_, _, _) async {
        moves++;
        await pending.future;
      },
    );
    await tester.pumpWidget(_app(board()));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-party-party'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-room-102'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-move'));
    await tester.pump();
    expect(moves, 1);
    await tester.pumpWidget(_app(board()));
    await tester.pump();
    expect(
      tester.widget<CatchButton>(_key('lodging-party-party')).onPressed,
      isNull,
    );
    expect(
      tester.widget<CatchButton>(_key('lodging-room-102')).onPressed,
      isNull,
    );
    expect(_key('lodging-move'), findsNothing);
    expect(moves, 1);
    pending.complete();
    await pumpFeatureUi(tester);
    expect(
      tester.widget<CatchButton>(_key('lodging-party-party')).onPressed,
      isNotNull,
    );
    await tester.tap(_key('lodging-party-party'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-room-102'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-move'));
    await pumpFeatureUi(tester);
    expect(moves, 2);
  });

  testWidgets('floor change clears the hidden room confirmation', (
    tester,
  ) async {
    _size(tester);
    final moves = <String>[];
    await tester.pumpWidget(
      _app(
        ProgramLodgingLayout(
          proposalId: 'proposal-1',
          units: _units,
          parties: _parties,
          copy: _copy,
          onPreview: (_, _) async => _options,
          onMove: (_, _, room) async => moves.add(room),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-party-party'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-room-102'));
    await pumpFeatureUi(tester);
    expect(
      tester.widget<CatchButton>(_key('lodging-party-party')).variant,
      CatchButtonVariant.secondary,
    );
    expect(
      tester.widget<CatchButton>(_key('lodging-room-102')).variant,
      CatchButtonVariant.secondary,
    );
    expect(_key('lodging-move'), findsOneWidget);
    await tester.tap(find.text('Floor 2'));
    await pumpFeatureUi(tester);
    expect(_key('lodging-room-102'), findsNothing);
    expect(_key('lodging-move'), findsNothing);
    expect(moves, isEmpty);
    await tester.tap(_key('lodging-room-201'));
    await pumpFeatureUi(tester);
    await tester.tap(_key('lodging-move'));
    await pumpFeatureUi(tester);
    expect(moves, ['201']);
  });
}
