import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The programme workspace (RbHostProgram): the spotlight, the views, the
/// households still to reply and the schedule.
///
/// It watches [hostProgrammeControllerProvider], opens a function, the
/// guest list filtered to no reply, and the other views, and adds a
/// function through `upsertProgramFunction`.
class HostProgrammeScreen extends ConsumerWidget {
  const HostProgrammeScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeControllerProvider(programId));
    final program = state.program;
    final days = state.daysToGo(ref.watch(appClockProvider).now());
    final messages = ref.watch(programPlannedMessagesProvider(programId));
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(
            label: l10n.hostProgrammeBack,
            onPressed: () => context.canPop()
                ? context.pop()
                : context.goNamed(Routes.hostEventsScreen.name),
          ),
          actions: [
            CatchIconAction(
              key: const ValueKey<String>('host-programme-open-branding'),
              tooltip: l10n.hostProgrammeBrandingTitle,
              variant: CatchIconActionVariant.plain,
              child: CatchIcon(CatchIcons.brand),
              onPressed: () => openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.branding,
              ),
            ),
            CatchIconAction(
              key: const ValueKey<String>('host-programme-open-photos'),
              tooltip: l10n.hostProgrammePhotosTitle,
              variant: CatchIconActionVariant.plain,
              child: CatchIcon(CatchIcons.photos),
              onPressed: () => openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.photos,
              ),
            ),
            CatchIconAction(
              key: const ValueKey<String>('host-programme-open-ids'),
              tooltip: l10n.hostProgrammeIdsTitle,
              variant: CatchIconActionVariant.plain,
              child: CatchIcon(CatchIcons.protected),
              onPressed: () => openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.idTracker,
              ),
            ),
            if (days != null && days >= 0)
              CatchBadge(label: l10n.hostProgrammeDaysToGo(count: days)),
          ],
        ),
        body: HostProgrammeBody(
          state: state,
          onView: (view) => openHostProgrammeView(context, programId, view),
          onOpenFunction: (function) => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.function,
            id: function.functionId,
          ),
          onAddFunction: program == null
              ? null
              : () => unawaited(
                  editHostProgrammeFunction(context, ref, program: program),
                ),
          onWaiting: () => context.goNamed(
            Routes.hostProgramGuestsScreen.name,
            pathParameters: {'programId': programId},
            queryParameters: {'filter': 'noReply'},
          ),
          onRetry: () => refreshHostProgramme(ref, programId),
          messages: messages.value,
          onLiveBoard: days == null || days > 0
              ? null
              : () => openHostProgrammePage(
                  context,
                  programId,
                  HostProgrammePage.liveBoard,
                ),
          onMessages: () => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.messages,
          ),
        ),
      ),
    );
  }
}
