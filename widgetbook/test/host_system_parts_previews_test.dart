import 'package:catch_dating_app/contexts/audience/parts/host_event_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/parts/host_event_close_out_row.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_court_row.dart';
import 'package:catch_dating_app/contexts/programmes/parts/host_events_programme_tile.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_dispatch_car_card.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_hotel_trip_card.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_tab_bar.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_operations_notice_list.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_system_parts_use_cases.dart';

void main() {
  final cases = <(Type, WidgetBuilder, int)>[
    (FormatsPlayersRow, formatsPlayersRowUseCase, 2),
    (StaffDispatchCarCard, staffDispatchCarCardUseCase, 1),
    (StaffHotelTripCard, staffHotelTripCardUseCase, 1),
    (ProgrammeReplyKeyRow, programmeReplyKeyRowUseCase, 1),
    (ProgrammeGridHeader, programmeGridHeaderUseCase, 1),
    (HostProgrammeSpotlightHeader, hostProgrammeSpotlightHeaderUseCase, 1),
    (HostProgrammeGuestFilterTabBar, hostProgrammeGuestFilterTabBarUseCase, 1),
    (HostProgrammeStateBody, hostProgrammeStateBodyUseCase, 2),
    (HostProgrammeTabBar, hostProgrammeTabBarUseCase, 2),
    (StaffOperationsNoticeList, staffOperationsNoticeListUseCase, 2),
    (HostEventCloseOutRow, hostEventCloseOutRowUseCase, 2),
    (HostEventGuestRow, hostEventGuestRowUseCase, 2),
    (HostEventsProgrammeTile, hostEventsProgrammeTileUseCase, 1),
  ];

  for (final (type, builder, count) in cases) {
    testWidgets('$type use case renders in both themes', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1000, 2000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      for (final theme in [AppTheme.light, AppTheme.dark]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: theme,
            home: Scaffold(
              body: SingleChildScrollView(
                child: TickerMode(
                  enabled: false,
                  child: Builder(builder: builder),
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        expect(tester.takeException(), isNull);
        expect(find.byType(type), findsNWidgets(count));
      }
    });
  }
}
