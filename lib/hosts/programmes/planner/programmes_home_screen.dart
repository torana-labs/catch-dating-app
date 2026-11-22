import 'package:catch_dating_app/contexts/organizers/data/organizer_entitlement_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programmes_home_body.dart';
import 'package:catch_dating_app/routing/shell/host_shell_navigation.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The planner home (RbProgHome) for one organiser, live from
/// `organizerProgramViews` with its overview numbers. A row opens the
/// programme; New programme opens create.
class HostProgrammesHomeScreen extends ConsumerWidget {
  const HostProgrammesHomeScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    // Inside the weddings navigation this is the root: it reads Weddings
    // and has no way back.
    final plannerRoot = hostShowsPlannerNavigation(
      size: CatchWindowSize.fromWidth(MediaQuery.sizeOf(context).width),
      hasWeddingsPlan:
          catchAsyncStateFromAsyncValue(
            ref.watch(organizerEntitlementProvider(organizerId)),
          ).value?.hasWeddingsPlan ??
          false,
    );
    final page = catchAsyncStateFromAsyncValue(
      ref.watch(organizerProgramRowsStreamProvider(organizerId)),
    );
    void create() => context.pushNamed(
      Routes.hostCreateProgramScreen.name,
      pathParameters: {'organizerId': organizerId},
    );
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programmes-home-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: plannerRoot
              ? null
              : CatchTopBarBack(label: l10n.hostProgrammeBack),
          title: plannerRoot
              ? l10n.hostPlannerNavigationWeddings
              : l10n.hostProgrammesHomeTitle,
          actions: [
            CatchButton(
              label: plannerRoot
                  ? l10n.hostPlannerNavigationNewWedding
                  : l10n.hostProgrammesHomeNew,
              size: CatchButtonSize.sm,
              leading: CatchIcon(CatchIcons.add),
              onPressed: create,
            ),
          ],
        ),
        body: HostProgrammesHomeBody(
          status: page.error != null
              ? HostProgrammesHomeStatus.error
              : page.hasData
              ? HostProgrammesHomeStatus.ready
              : HostProgrammesHomeStatus.loading,
          programmes: page.value ?? const [],
          now: ref.watch(appClockProvider).now(),
          onOpen: (row) => context.pushNamed(
            Routes.hostProgramWorkspaceScreen.name,
            pathParameters: {'programId': row.programId},
          ),
          onNew: create,
          onRetry: () =>
              ref.invalidate(organizerProgramRowsStreamProvider(organizerId)),
        ),
      ),
    );
  }
}
