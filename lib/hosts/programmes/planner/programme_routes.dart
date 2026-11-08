import 'package:catch_dating_app/hosts/programmes/planner/programme_function_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_household_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_setup_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_setup_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_views.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// The planner pages that ride on the programme workspace route as a
/// `view` query, so they need no route of their own.
enum HostProgrammePage { function, household, travel, hotel, pickup, vendor }

/// The workspace route's screen for [uri]: the workspace itself, or the
/// page its `view` query names.
Widget hostProgrammeScreenForUri(String programId, Uri uri) {
  final query = uri.queryParameters;
  final id = query['id'];
  final page = HostProgrammePage.values
      .where((page) => page.name == query['view'])
      .firstOrNull;
  return switch (page) {
    HostProgrammePage.function when id != null => HostProgrammeFunctionScreen(
      programId: programId,
      functionId: id,
    ),
    HostProgrammePage.household when id != null => HostProgrammeHouseholdScreen(
      programId: programId,
      householdId: id,
    ),
    HostProgrammePage.travel => HostProgrammeTravelScreen(programId: programId),
    HostProgrammePage.hotel => HostProgrammeSetupScreen(
      programId: programId,
      kind: HostProgrammeSetupKind.hotel,
      id: id,
    ),
    HostProgrammePage.pickup => HostProgrammeSetupScreen(
      programId: programId,
      kind: HostProgrammeSetupKind.pickup,
      id: id,
    ),
    HostProgrammePage.vendor => HostProgrammeSetupScreen(
      programId: programId,
      kind: HostProgrammeSetupKind.vendor,
      id: id,
    ),
    _ => HostProgrammeScreen(programId: programId),
  };
}

/// Pushes a planner page over the current one.
void openHostProgrammePage(
  BuildContext context,
  String programId,
  HostProgrammePage page, {
  String? id,
}) => context.pushNamed(
  Routes.hostProgramWorkspaceScreen.name,
  pathParameters: {'programId': programId},
  queryParameters: {'view': page.name, 'id': ?id},
);

/// Moves between the programme views: Schedule and Travel on the workspace
/// route, Guests and Team on their own.
void openHostProgrammeView(
  BuildContext context,
  String programId,
  HostProgrammeView view,
) {
  final path = {'programId': programId};
  switch (view) {
    case HostProgrammeView.schedule:
      context.goNamed(
        Routes.hostProgramWorkspaceScreen.name,
        pathParameters: path,
      );
    case HostProgrammeView.travel:
      context.goNamed(
        Routes.hostProgramWorkspaceScreen.name,
        pathParameters: path,
        queryParameters: {'view': HostProgrammePage.travel.name},
      );
    case HostProgrammeView.guests:
      context.goNamed(
        Routes.hostProgramGuestsScreen.name,
        pathParameters: path,
      );
    case HostProgrammeView.team:
      context.goNamed(Routes.hostProgramTeamScreen.name, pathParameters: path);
  }
}

/// The guests route's screen for [uri]: `filter=noReply` opens on the
/// households still to reply.
Widget hostProgrammeGuestsScreenForUri(String programId, Uri uri) =>
    HostProgrammeGuestsScreen(
      programId: programId,
      initialFilter:
          HostProgrammeGuestFilter.values
              .where((filter) => filter.name == uri.queryParameters['filter'])
              .firstOrNull ??
          HostProgrammeGuestFilter.all,
    );
