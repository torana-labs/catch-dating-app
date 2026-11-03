import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormEditorNotice extends StatelessWidget {
  const HostFormEditorNotice({
    super.key,
    required this.state,
    required this.notifier,
    this.padded = false,
  });

  final HostFormEditorState state;
  final HostFormEditorController notifier;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    final notices = <Widget>[
      if (state.saveState == HostFormSaveState.conflict) ...[
        CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'form-save-conflict',
            title: context.l10n.hostFormConflictTitle,
            message: context.l10n.hostFormConflictBody,
            tone: CatchNoticeTone.warning,
            actionLabel: context.l10n.hostFormReload,
            onAction: notifier.reload,
            duration: null,
          ),
        ),
        gapH12,
      ] else if (state.saveState == HostFormSaveState.failed) ...[
        CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'form-save-failed',
            title: context.l10n.hostFormSaveFailed,
            message: state.error?.toString(),
            tone: CatchNoticeTone.danger,
            actionLabel: context.l10n.hostFormRetrySave,
            onAction: () => notifier.saveNow(),
            duration: null,
          ),
        ),
        gapH12,
      ],
      if (state.editor.validationIssues.isNotEmpty) ...[
        CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'form-validation',
            title: context.l10n.hostFormValidationTitle(
              count: state.editor.validationIssues.length,
            ),
            message: state.editor.validationIssues.first.message,
            tone: state.hasBlockingValidationErrors
                ? CatchNoticeTone.danger
                : CatchNoticeTone.warning,
            duration: null,
            dismissible: false,
          ),
        ),
        gapH12,
      ],
    ];
    if (notices.isEmpty) return const SizedBox.shrink();
    final content = Column(children: notices);
    return padded
        ? Padding(padding: CatchInsets.formBuilderNotices, child: content)
        : content;
  }
}
