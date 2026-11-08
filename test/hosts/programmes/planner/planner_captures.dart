import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_create_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_function_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_household_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_trips_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import 'planner_fixtures.dart';

/// The window the desktop boards are drawn for.
const plannerDesktopSize = Size(1440, 900);

/// A create controller holding the boards' draft, with no backend behind
/// it.
ProgramCreateController plannerCreateController() => ProgramCreateController(
  organizerId: plannerOrganizerId,
  requestId: 'capture',
  create: (_, _) async => throw UnimplementedError(),
  readSaved: (_) async => throw UnimplementedError(),
  refreshPrograms: (_) async => const [],
  isActorCurrent: () => true,
  initialValues: ProgramCreateValues(
    kind: ProgramKind.wedding,
    title: 'Aditi and Kabir’s wedding',
    timezone: 'Asia/Kolkata',
    startsAt: DateTime(2026, 12, 12),
    endsAt: DateTime(2026, 12, 14, 23, 59),
  ),
);

/// Every planner controller answered with the fixture data.
List<Override> plannerCaptureOverrides() => [
  appClockProvider.overrideWithValue(AppClock.custom(() => plannerNow)),
  uidProvider.overrideWith((ref) => Stream.value('meher')),
  hostProgrammeControllerProvider(
    plannerProgramId,
  ).overrideWithValue(plannerState),
  hostProgrammeTravelControllerProvider(
    plannerProgramId,
  ).overrideWithValue(plannerTravel),
  hostProgrammeRoomsControllerProvider(
    plannerProgramId,
    null,
  ).overrideWithValue(plannerRooms),
  hostProgrammeTripsControllerProvider(
    plannerProgramId,
  ).overrideWithValue(plannerTripsReport),
  programCreateControllerProvider((
    accountId: 'meher',
    organizerId: plannerOrganizerId,
  )).overrideWith((ref) async => plannerCreateController()),
];

Widget plannerProgrammeCapture() =>
    const HostProgrammeScreen(programId: plannerProgramId);

Widget plannerFunctionCapture() => const HostProgrammeFunctionScreen(
  programId: plannerProgramId,
  functionId: 'sangeet',
);

Widget plannerGuestsCapture() =>
    const HostProgrammeGuestsScreen(programId: plannerProgramId);

Widget plannerHouseholdCapture() => const HostProgrammeHouseholdScreen(
  programId: plannerProgramId,
  householdId: 'mehra',
);

Widget plannerTravelCapture() =>
    const HostProgrammeTravelScreen(programId: plannerProgramId);

Widget plannerRoomsCapture() =>
    const HostProgrammeRoomsScreen(programId: plannerProgramId);

Widget plannerTripsCapture() =>
    const HostProgrammeTripsScreen(programId: plannerProgramId);

Widget plannerCreateCapture() =>
    const HostProgrammeCreateScreen(organizerId: plannerOrganizerId);
