import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_desktop_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The guest list (RbHostProgramGuests on a phone, RbHostProgramDesktop on
/// an expanded window): every household with its answer for each function.
///
/// It watches [hostProgrammeControllerProvider], keeps the filter, opens a
/// household, Import a list and the share view.
class HostProgrammeGuestsScreen extends ConsumerStatefulWidget {
  const HostProgrammeGuestsScreen({
    super.key,
    required this.programId,
    this.initialFilter = HostProgrammeGuestFilter.all,
  });

  final String programId;
  final HostProgrammeGuestFilter initialFilter;

  @override
  ConsumerState<HostProgrammeGuestsScreen> createState() =>
      _HostProgrammeGuestsScreenState();
}

class _HostProgrammeGuestsScreenState
    extends ConsumerState<HostProgrammeGuestsScreen> {
  late HostProgrammeGuestFilter _filter = widget.initialFilter;

  @override
  Widget build(BuildContext context) {
    final programId = widget.programId;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: Builder(
        builder: (context) {
          final l10n = context.l10n;
          final expanded =
              CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
          final state = ref.watch(hostProgrammeControllerProvider(programId));
          final program = state.program;
          void openHousehold(HostProgrammeHousehold household) =>
              openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.household,
                id: household.id,
              );
          void import() => context.pushNamed(
            Routes.hostProgramImportScreen.name,
            pathParameters: {'programId': programId},
          );
          void retry() => refreshHostProgramme(ref, programId);
          void view(view) => openHostProgrammeView(context, programId, view);
          if (expanded) {
            final days = state.daysToGo(ref.watch(appClockProvider).now());
            return CatchScreen(
              key: const ValueKey<String>('host-programme-guests-screen'),
              bodyScrolls: false,
              topBar: CatchTopBar(
                variant: CatchTopBarVariant.tabHome,
                kicker: program == null
                    ? null
                    : [
                        hostProgrammeDates(l10n, program),
                        if (days != null && days >= 0)
                          l10n.hostProgrammeDaysToGo(count: days),
                      ].join(' · '),
                title: program?.title,
                actions: [
                  CatchButton(
                    label: l10n.hostProgrammeShareFamily,
                    variant: CatchButtonVariant.secondary,
                    onPressed: () => context.pushNamed(
                      Routes.hostWorkCountsScreen.name,
                      pathParameters: {'programId': programId},
                    ),
                  ),
                  CatchButton(
                    label: l10n.hostProgrammeAddGuests,
                    leading: CatchIcon(CatchIcons.add),
                    onPressed: import,
                  ),
                ],
              ),
              body: HostProgrammeGuestsDesktopBody(
                state: state,
                filter: _filter,
                onView: view,
                onFilter: (filter) => setState(() => _filter = filter),
                onOpenHousehold: openHousehold,
                onRetry: retry,
              ),
            );
          }
          return CatchScreen(
            key: const ValueKey<String>('host-programme-guests-screen'),
            topBar: CatchTopBar(
              variant: CatchTopBarVariant.tool,
              back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
              title: program?.title,
            ),
            body: HostProgrammeGuestsBody(
              state: state,
              filter: _filter,
              onView: view,
              onFilter: (filter) => setState(() => _filter = filter),
              onImport: import,
              onOpenHousehold: openHousehold,
              onRetry: retry,
            ),
          );
        },
      ),
    );
  }
}
