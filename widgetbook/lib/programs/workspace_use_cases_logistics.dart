import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/fixtures.dart';

/// Logistics editor fixtures and cases for the program workspace. Split out
/// of `workspace_use_cases.dart` to keep both files under the source-size
/// budget; scoped and self-contained like `use_cases_attendance.dart`.
final _stations = [
  const ProgramStation(
    pickupPointId: 'pp_del_t3',
    label: 'Delhi IGI Terminal 3',
    kind: 'airport',
    iataCode: 'DEL',
    terminal: 'T3',
    meetingZone: 'Pillar 12 arrivals forecourt',
    instructions: 'Greeter holds a "Kapoor–Shah" placard.',
    active: true,
    revision: 4,
  ),
  const ProgramStation(
    pickupPointId: 'pp_ndls',
    label: 'New Delhi Railway Exit 4',
    kind: 'railway',
    active: false,
    revision: 1,
  ),
];

final _hotels = [
  const ProgramHotel(
    hotelId: 'hotel_taj',
    name: 'Taj Palace',
    address: '2 Sardar Patel Marg, Chanakyapuri',
    receptionContact: '+91 11 2611 0202',
    active: true,
    revision: 6,
  ),
];

class _DialogFrame extends StatelessWidget {
  const _DialogFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ColoredBox(
      color: t.ink.withValues(alpha: CatchOpacity.confirmDialogScrim),
      child: SizedBox(
        height: widgetbookUtilityDialogFrameHeight,
        child: Center(child: child),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Station tile',
  type: ProgramWorkspaceStationTile,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programWorkspaceStationTileStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramWorkspaceStationTile',
    catalogId: 'screen.programs.workspace',
    children: [
      ProgramWorkspaceStationTile(station: _stations[0], onEdit: () {}),
      ProgramWorkspaceStationTile(station: _stations[1], onEdit: () {}),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hotel tile',
  type: ProgramWorkspaceHotelTile,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programWorkspaceHotelTileStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramWorkspaceHotelTile',
    catalogId: 'screen.programs.workspace',
    children: [ProgramWorkspaceHotelTile(hotel: _hotels[0], onEdit: () {})],
  );
}

@widgetbook.UseCase(
  name: 'Pickup point edit dialog',
  type: ProgramPickupPointEditDialog,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programPickupPointEditDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramPickupPointEditDialog',
    contractId: 'screen.programs.workspace',
    children: [
      WidgetbookPageStateCard(
        label: 'new point',
        child: _DialogFrame(child: const ProgramPickupPointEditDialog()),
      ),
      WidgetbookPageStateCard(
        label: 'edit airport',
        child: _DialogFrame(
          child: ProgramPickupPointEditDialog(existing: _stations[0]),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hotel edit dialog',
  type: ProgramHotelEditDialog,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programHotelEditDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramHotelEditDialog',
    contractId: 'screen.programs.workspace',
    children: [
      WidgetbookPageStateCard(
        label: 'new hotel',
        child: _DialogFrame(child: const ProgramHotelEditDialog()),
      ),
      WidgetbookPageStateCard(
        label: 'edit hotel',
        child: _DialogFrame(
          child: ProgramHotelEditDialog(existing: _hotels[0]),
        ),
      ),
    ],
  );
}
