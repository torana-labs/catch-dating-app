import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_share_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The in-app view the family and other stakeholders see
/// (RbHostProgramShare): counts only, from `getProgramStakeholderCounts`.
/// It reads only.
class HostProgrammeShareScreen extends ConsumerWidget {
  const HostProgrammeShareScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeShareControllerProvider(programId));
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-share-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          title: state.access?.title,
        ),
        body: HostProgrammeShareBody(
          state: state,
          onRetry: () => refreshHostProgrammeShare(ref, programId),
        ),
      ),
    );
  }
}
