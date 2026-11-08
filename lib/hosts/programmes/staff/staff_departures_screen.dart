import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_departures_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_screen.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The hotel desk's departures (RbProgDepartures), always night, from
/// `getProgramDeparturesRoster`. Read only.
class StaffDeparturesScreen extends ConsumerWidget {
  const StaffDeparturesScreen({
    super.key,
    required this.programId,
    required this.hotelId,
    this.now,
  });

  final String programId;
  final String hotelId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final roster = catchAsyncStateFromAsyncValue(
      ref.watch(programDeparturesRosterViewProvider(programId, hotelId)),
    );
    final value = roster.value?.value;
    final at = now?.call() ?? DateTime.now();
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-departures-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: value?.hotelName ?? l10n.hostStaffDutyHotel,
          kicker: l10n.hostStaffDeparturesKicker(
            day: AppTimeFormatters.weekdayDayMonth(at),
            time: AppTimeFormatters.time(at),
          ),
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffHotelLive,
        ),
        body: StaffDeparturesBody(
          status: switch (roster) {
            CatchAsyncState(hasData: true) => StaffDeparturesStatus.content,
            CatchAsyncState(hasError: true) => StaffDeparturesStatus.error,
            _ => StaffDeparturesStatus.loading,
          },
          roster: value,
          now: at,
          onRetry: () => ref.invalidate(
            programDeparturesRosterViewProvider(programId, hotelId),
          ),
        ),
      ),
    );
  }
}

/// The hotel route's screen for [uri]: the desk, or its departures when
/// `view=departures`.
Widget staffHotelScreenForUri(String programId, String hotelId, Uri uri) =>
    uri.queryParameters['view'] == 'departures'
    ? StaffDeparturesScreen(programId: programId, hotelId: hotelId)
    : StaffHotelDeskScreen(programId: programId, hotelId: hotelId);
