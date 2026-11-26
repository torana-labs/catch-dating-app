import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What the host chose in the publish review.
enum HostFormPublishReviewChoice { preview, publish }

/// Shows what will go live before the form is published: its questions,
/// who can answer, what happens after someone answers, the WhatsApp
/// permission it does not ask for, its fee and when it is open.
///
/// Returns Preview or Publish, or null when the host closes the sheet. It
/// runs nothing itself.
Future<HostFormPublishReviewChoice?> showHostFormPublishReview(
  BuildContext context, {
  required HostFormEditorState state,
}) => showCatchBottomSheet<HostFormPublishReviewChoice>(
  context: context,
  builder: (sheetContext) => HostFormPublishReviewSheet(
    state: state,
    onChoose: (choice) => Navigator.of(sheetContext).pop(choice),
  ),
);

/// The publish review, as a sheet.
class HostFormPublishReviewSheet extends StatelessWidget {
  const HostFormPublishReviewSheet({
    super.key,
    required this.state,
    required this.onChoose,
  });

  final HostFormEditorState state;
  final ValueChanged<HostFormPublishReviewChoice> onChoose;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final definition = state.editor.definition;
    final live = state.editor.form.status == HostFormLifecycleStatus.published;
    final questionCount = definition.sections.fold<int>(
      0,
      (count, section) => count + section.questions.length,
    );
    final payment = definition.payment;
    return CatchSheet.standard(
      title: live
          ? l10n.hostFormReviewChangesTitle
          : l10n.hostFormReviewPublishTitle,
      subtitle: l10n.hostFormReviewPublishSubtitle,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('host-form-review-preview'),
            label: l10n.hostFormPreview,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => onChoose(HostFormPublishReviewChoice.preview),
          ),
          CatchButton(
            key: const ValueKey<String>('host-form-review-publish'),
            label: live ? l10n.hostFormPublishChanges : l10n.hostFormPublish,
            fullWidth: true,
            onPressed: () => onChoose(HostFormPublishReviewChoice.publish),
          ),
        ],
      ),
      child: CatchSection(
        children: [
          CatchField.read(
            copy: copy,
            title: l10n.hostFormQuestionsTitle,
            body: l10n.hostFormQuestionCount(count: questionCount),
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostFormIdentityLabel,
            body: hostFormIdentityLabel(context, definition.identityPolicy),
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostFormConsequencesTitle,
            body: hostFormBuilderConsequenceSummary(
              context,
              purpose: definition.purpose,
              identityPolicy: definition.identityPolicy,
              consequences: state.editor.form.consequences,
            ),
            bodyMaxLines: 8,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostFormMessagingPermissionTitle,
            body: l10n.hostFormConsequenceNoMessagingPermission,
            bodyMaxLines: 4,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostFormPaymentTitle,
            body: payment == null
                ? l10n.hostFormPaymentFree
                : '₹${payment.rupees} · ${payment.description}\n'
                      '${payment.refundPolicy}\n'
                      '${l10n.hostFormPaymentPublishHelp}',
            bodyMaxLines: 12,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostFormAvailability,
            body: hostFormAvailabilitySummary(context, definition),
          ),
        ],
      ),
    );
  }
}
