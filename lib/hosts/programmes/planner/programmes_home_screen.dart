import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programmes_home_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The planner home (RbProgHome) for one organiser, from
/// `listOrganizerPrograms` with its overview numbers. A row opens the
/// programme; New programme opens create.
class HostProgrammesHomeScreen extends ConsumerWidget {
  const HostProgrammesHomeScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final page = ref.watch(programmesOverviewProvider(organizerId));
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
          back: CatchTopBarBack(label: l10n.hostProgrammeBack),
          title: l10n.hostProgrammesHomeTitle,
          actions: [
            CatchButton(
              label: l10n.hostProgrammesHomeNew,
              size: CatchButtonSize.sm,
              leading: CatchIcon(CatchIcons.add),
              onPressed: create,
            ),
          ],
        ),
        body: HostProgrammesHomeBody(
          status: page.hasError
              ? HostProgrammesHomeStatus.error
              : page.hasValue
              ? HostProgrammesHomeStatus.ready
              : HostProgrammesHomeStatus.loading,
          programmes: page.value?.programs ?? const [],
          now: ref.watch(appClockProvider).now(),
          onOpen: (row) => context.pushNamed(
            Routes.hostProgramWorkspaceScreen.name,
            pathParameters: {'programId': row.programId},
          ),
          onNew: create,
          onRetry: () =>
              ref.invalidate(programmesOverviewProvider(organizerId)),
        ),
      ),
    );
  }
}
