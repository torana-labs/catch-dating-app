import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_setup_section.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'preview.dart';

@widgetbook.UseCase(
  name: "EventSuccessRoomSetupSection",
  type: EventSuccessRoomSetupSection,
  path:
      "[P1 product surfaces]/Event Success strict coverage/Host folded states",
)
Widget eventSuccessStrictEventSuccessRoomSetupSection(BuildContext context) {
  return const StrictCoverageScaffold(
    componentName: "EventSuccessRoomSetupSection",
    child: _RoomSetupCoverageState(),
  );
}

class _RoomSetupCoverageState extends StatefulWidget {
  const _RoomSetupCoverageState();

  @override
  State<_RoomSetupCoverageState> createState() =>
      _RoomSetupCoverageStateState();
}

class _RoomSetupCoverageStateState extends State<_RoomSetupCoverageState> {
  static final _layout = EventSuccessLayout.parametric(
    layoutId: "six-rounds",
    label: "Six round tables",
    shape: EventSuccessLayoutShape.round,
    unitCount: 6,
    unitCapacity: 4,
    columnCount: 2,
  );
  String? _selectedLayoutId = _layout.layoutId;

  @override
  Widget build(BuildContext context) {
    return EventSuccessRoomSetupSection(
      layoutsState: CatchAsyncState.data([_layout]),
      selectedLayoutId: _selectedLayoutId,
      usesWholeGroup: false,
      enabled: true,
      isSavingLayout: false,
      onSelected: (layoutId) => setState(() => _selectedLayoutId = layoutId),
      onSaveLayout: (layout) async => layout,
    );
  }
}
