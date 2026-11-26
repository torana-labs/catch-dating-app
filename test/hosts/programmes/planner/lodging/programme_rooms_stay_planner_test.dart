import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_body.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../planner_fixtures.dart';
import '../planner_test_pump.dart';

Widget _rooms({VoidCallback? onPlanStays}) => HostProgrammeRoomsBody(
  state: plannerRooms,
  selectedGuestId: null,
  onBack: () {},
  onHotel: (_) {},
  onSelectGuest: (_) {},
  onPlace: (_) {},
  onSuggestAll: () {},
  onHotelDetails: () {},
  onOpenGuest: (_) {},
  onRetry: () {},
  onPlanStays: onPlanStays,
);

const _row = ValueKey<String>('host-programme-rooms-stay-planner');

void main() {
  testWidgets('Rooms opens the stay planner for those who may plan stays', (
    tester,
  ) async {
    var opened = 0;
    await pumpPlannerBody(tester, _rooms(onPlanStays: () => opened++));
    await tester.ensureVisible(find.byKey(_row));
    await tester.tap(find.byKey(_row));
    expect(opened, 1);
    expect(find.text('Stay planner'), findsOneWidget);
  });

  testWidgets('Rooms hides the stay planner from everyone else', (
    tester,
  ) async {
    await pumpPlannerBody(tester, _rooms());
    expect(find.byKey(_row), findsNothing);
  });
}
