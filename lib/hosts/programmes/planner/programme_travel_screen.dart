import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Travel (RbProgTravel), composed from the arrivals roster, the transport
/// plan and the trips.
///
/// It reads only; its rows open the pickup point, hotel and vendor setup
/// pages, Rooms, the trip ledger and the live airport desk.
class HostProgrammeTravelScreen extends ConsumerWidget {
  const HostProgrammeTravelScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeTravelControllerProvider(programId));
    final program = state.programme.program;
    final pickup = state.programme.detail?.pickupPoints.firstOrNull;
    final path = {'programId': programId};
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-travel-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: l10n.hostProgrammeViewTravel,
        ),
        body: HostProgrammeTravelBody(
          state: state,
          onView: (view) => openHostProgrammeView(context, programId, view),
          onLink: (link) => switch (link) {
            HostProgrammeTravelLink.trips => context.pushNamed(
              Routes.hostWorkTripsScreen.name,
              pathParameters: path,
            ),
            HostProgrammeTravelLink.rooms => context.pushNamed(
              Routes.hostProgramLodgingScreen.name,
              pathParameters: path,
            ),
            HostProgrammeTravelLink.addPickup => openHostProgrammePage(
              context,
              programId,
              HostProgrammePage.pickup,
            ),
            HostProgrammeTravelLink.addHotel => openHostProgrammePage(
              context,
              programId,
              HostProgrammePage.hotel,
            ),
            HostProgrammeTravelLink.addVendor => openHostProgrammePage(
              context,
              programId,
              HostProgrammePage.vendor,
            ),
          },
          onOpenPickup: (point) => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.pickup,
            id: point.pickupPointId,
          ),
          onOpenHotel: (hotel) => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.hotel,
            id: hotel.hotelId,
          ),
          onOpenDesk: pickup == null
              ? null
              : () => context.pushNamed(
                  Routes.hostWorkArrivalsScreen.name,
                  pathParameters: {
                    'programId': programId,
                    'pickupPointId': pickup.pickupPointId,
                  },
                  queryParameters: {'station': pickup.label},
                ),
          onRetry: () => refreshHostProgrammeTravel(ref, programId),
        ),
      ),
    );
  }
}
