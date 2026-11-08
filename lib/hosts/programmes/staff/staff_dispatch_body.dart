import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_dispatch_car.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_dispatch_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The dispatcher's desk in board order: the line on how cars are
/// suggested, the parties the plan could not place, then each suggested car
/// with its parties and Dispatch.
class StaffDispatchBody extends StatelessWidget {
  const StaffDispatchBody({
    super.key,
    required this.state,
    required this.busy,
    required this.onDispatch,
    required this.onRetry,
    this.notices,
  });

  final StaffDispatchState state;

  /// A command is on its way; Dispatch waits.
  final bool busy;
  final ValueChanged<TransportGroupSuggestion> onDispatch;
  final VoidCallback onRetry;
  final Widget? notices;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffDispatchStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffDispatchStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffDispatchErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffDispatchStatus.content:
        break;
    }
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(l10n.hostStaffDispatchIntro, tone: CatchTextTone.secondary),
        ?notices,
        if (state.unplaced.isNotEmpty)
          CatchNotice.inline(
            key: const ValueKey<String>('staff-dispatch-unplaced'),
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.warning,
            title: l10n.hostStaffDispatchUnplacedTitle(
              count: state.unplaced.length,
            ),
            body: {
              for (final reason in state.unplaced)
                switch (reason) {
                  TransportUnassignedReason.missingTime =>
                    l10n.hostStaffDispatchReasonTime,
                  TransportUnassignedReason.noSuitableVehicle =>
                    l10n.hostStaffDispatchReasonVehicle,
                  TransportUnassignedReason.missingScope =>
                    l10n.hostStaffDispatchReasonScope,
                },
            }.join(' '),
          ),
        if (state.cars.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.taxi,
            title: l10n.hostStaffDispatchEmptyTitle,
            message: l10n.hostStaffDispatchEmptyBody,
          ),
        for (final car in state.cars)
          StaffDispatchCar(
            group: car.group,
            parties: car.parties,
            seats: car.seats,
            onDispatch: busy || car.sent ? null : () => onDispatch(car.group),
          ),
      ],
    );
  }
}
