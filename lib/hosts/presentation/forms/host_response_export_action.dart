import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_export_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Inline action for the applied manager query; it shares the response
/// workspace instead of starting a second, unrelated export screen.
class HostResponseExportAction extends ConsumerStatefulWidget {
  const HostResponseExportAction({
    super.key,
    required this.accountId,
    required this.organizerId,
    required this.formId,
    required this.queryController,
    required this.gateway,
    this.openDownload,
    this.currentAccountId,
  });

  final String accountId;
  final String organizerId;
  final String formId;
  final HostResponseQueryController queryController;
  final HostResponseExportGateway gateway;
  final Future<bool> Function(Uri)? openDownload;
  final String? Function()? currentAccountId;

  @override
  ConsumerState<HostResponseExportAction> createState() =>
      _HostResponseExportActionState();
}

class _HostResponseExportActionState
    extends ConsumerState<HostResponseExportAction> {
  late HostResponseExportController _controller;

  void _createController() {
    _controller = HostResponseExportController(
      accountId: widget.accountId,
      organizerId: widget.organizerId,
      formId: widget.formId,
      queryController: widget.queryController,
      gateway: widget.gateway,
      currentAccountId:
          widget.currentAccountId ??
          () => ref.read(firebaseAuthProvider).currentUser?.uid,
      openDownload:
          widget.openDownload ?? ref.read(externalLinkControllerProvider).open,
      now: DateTime.now,
      wait: Future<void>.delayed,
    )..addListener(_changed);
    _controller.recover();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _createController();
  }

  @override
  void didUpdateWidget(covariant HostResponseExportAction oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.accountId != widget.accountId ||
        oldWidget.organizerId != widget.organizerId ||
        oldWidget.formId != widget.formId ||
        oldWidget.queryController != widget.queryController ||
        oldWidget.gateway != widget.gateway ||
        oldWidget.currentAccountId != widget.currentAccountId) {
      _controller.removeListener(_changed);
      _controller.dispose();
      _createController();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final view = _controller.view;
    final query = widget.queryController.view;
    final enabled =
        query.status == HostResponseQueryStatus.ready ||
        query.status == HostResponseQueryStatus.empty;
    final busy =
        view.status == HostResponseExportStatus.recovering ||
        view.status == HostResponseExportStatus.preparing;
    return CatchSection.content(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final format in HostFormExportFormat.values)
                CatchButton.command(
                  label: busy && view.command?.format == format
                      ? context.l10n.hostAudiencePreparingExport
                      : format == HostFormExportFormat.csv
                      ? context.l10n.hostFormExportCsv
                      : context.l10n.hostFormExportXlsx,
                  leading: Icon(CatchIcons.downloadRounded),
                  onPressed:
                      !enabled ||
                          busy ||
                          view.status == HostResponseExportStatus.pending ||
                          view.status == HostResponseExportStatus.stale
                      ? null
                      : () => _controller.start(format),
                ),
              if (view.command != null &&
                  (view.status == HostResponseExportStatus.pending ||
                      view.status == HostResponseExportStatus.stale))
                CatchButton.command(
                  label: context.l10n.hostFormExportStillPreparing,
                  onPressed: _controller.retryPending,
                ),
              if (view.status == HostResponseExportStatus.ready &&
                  view.receipt?.downloadUrl != null)
                CatchButton.command(
                  label: context.l10n.hostFormExportReady,
                  onPressed: _controller.openReady,
                ),
            ],
          ),
          if (view.status == HostResponseExportStatus.stale)
            CatchText(
              context.l10n.hostsHostAudienceRefresh,
              variant: CatchTextVariant.supporting,
            ),
          if (view.status == HostResponseExportStatus.pending)
            CatchText(
              context.l10n.hostFormExportStillPreparing,
              variant: CatchTextVariant.supporting,
            ),
          if (view.status == HostResponseExportStatus.failure)
            CatchText(
              context.l10n.hostFormExportFailed,
              variant: CatchTextVariant.supporting,
            ),
        ],
      ),
    );
  }
}
