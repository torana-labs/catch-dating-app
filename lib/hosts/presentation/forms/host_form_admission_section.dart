import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Review and confirm are distinct actions; preview never admits a guest.
class HostFormAdmissionSection extends ConsumerStatefulWidget {
  const HostFormAdmissionSection({
    super.key,
    required this.session,
    required this.onAdmitted,
  });
  final HostFormAdmissionSession session;
  final Future<void> Function() onAdmitted;

  @override
  ConsumerState<HostFormAdmissionSection> createState() =>
      _HostFormAdmissionSectionState();
}

class _HostFormAdmissionSectionState
    extends ConsumerState<HostFormAdmissionSection> {
  HostFormAdmissionController get _controller =>
      ref.read(hostFormAdmissionControllerProvider(widget.session).notifier);
  HostFormAdmissionState get _snapshot =>
      ref.read(hostFormAdmissionControllerProvider(widget.session));
  bool _notifiedAdmission = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _controller.review();
    });
  }

  @override
  void didUpdateWidget(covariant HostFormAdmissionSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session == widget.session) return;
    _notifiedAdmission = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _controller.review();
    });
  }

  Future<void> _confirm() async {
    final session = widget.session;
    await _controller.confirm();
    if (mounted &&
        widget.session == session &&
        !_notifiedAdmission &&
        _snapshot.receipt != null) {
      _notifiedAdmission = true;
      await widget.onAdmitted();
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(hostFormAdmissionControllerProvider(widget.session));
    final l10n = context.l10n;
    final preview = _snapshot.preview;
    final pending = _snapshot.pending;
    final done = _snapshot.receipt != null;
    return CatchSection.content(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            l10n.hostFormAdmissionTitle,
            variant: CatchTextVariant.sectionTitle,
          ),
          gapH8,
          CatchText(
            done
                ? l10n.hostFormAdmissionComplete
                : pending != null
                ? l10n.hostFormAdmissionSaved
                : preview?.canCommit == true
                ? (preview!.seatAlreadyOccupied == true
                      ? l10n.hostFormAdmissionRetain
                      : l10n.hostFormAdmissionReady)
                : l10n.hostFormAdmissionReview,
            variant: CatchTextVariant.supporting,
          ),
          if (preview?.blocker case final blocker?) ...[
            gapH8,
            CatchBanner.error(message: blocker),
          ],
          if (_snapshot.error case final error?) ...[
            gapH8,
            CatchBanner.error(
              message: appErrorMessage(
                error,
                l10n: l10n,
                context: AppErrorContext.forms,
              ),
            ),
          ],
          if (!done) ...[
            gapH16,
            CatchButton(
              label: pending?.needsReview == true
                  ? l10n.hostFormAdmissionReviewAgain
                  : pending != null
                  ? l10n.hostFormAdmissionRetry
                  : preview?.canCommit == true
                  ? l10n.hostFormAdmissionConfirm
                  : l10n.hostFormAdmissionCheck,
              status: _snapshot.busy
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: _snapshot.busy
                  ? null
                  : pending?.needsReview == true
                  ? _controller.reviewAgain
                  : pending != null || preview?.canCommit == true
                  ? _confirm
                  : _controller.review,
            ),
          ],
        ],
      ),
    );
  }
}
