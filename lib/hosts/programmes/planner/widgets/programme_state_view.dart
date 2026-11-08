import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The programme while it loads, or when its read failed, with Try again.
class HostProgrammeStateView extends StatelessWidget {
  const HostProgrammeStateView({
    super.key,
    required this.status,
    required this.onRetry,
  });

  final HostProgrammeStatus status;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (status == HostProgrammeStatus.error) {
      return CatchPageBody.screen(
        child: CatchErrorState(
          title: l10n.hostProgrammeErrorTitle,
          message: l10n.hostProgrammeErrorBody,
          retryLabel: l10n.hostProgrammeRetry,
          onRetry: onRetry,
        ),
      );
    }
    return const CatchPageBody.screen(child: CatchLoadingIndicator());
  }
}
