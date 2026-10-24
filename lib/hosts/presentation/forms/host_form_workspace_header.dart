import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormWorkspaceHeader extends StatelessWidget {
  const HostFormWorkspaceHeader({
    super.key,
    required this.state,
    required this.selected,
    required this.onChanged,
  });
  final HostFormEditorState state;
  final HostFormWorkspaceView selected;
  final ValueChanged<HostFormWorkspaceView> onChanged;

  @override
  Widget build(BuildContext context) {
    final form = state.editor.form;
    if (selected == HostFormWorkspaceView.settings) {
      return CatchText(
        state.editor.definition.title,
        variant: CatchTextVariant.supporting,
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          state.editor.definition.title,
          key: const ValueKey('host-form-command-center-title'),
          variant: CatchTextVariant.titleL,
        ),
        gapH8,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CatchBadge.status(
              label: hostFormStatusLabel(context, form.status),
              tone: form.status == HostFormLifecycleStatus.published
                  ? CatchBadgeTone.success
                  : CatchBadgeTone.neutral,
            ),
            CatchText(
              form.activeVersionId == null
                  ? hostFormSaveLabel(context, state)
                  : context.l10n.hostAudienceFormVersionContext(
                      purpose: hostFormPurposeLabel(context, form.purpose),
                      version: form.publishedVersion,
                    ),
              variant: CatchTextVariant.supporting,
            ),
          ],
        ),
        gapH24,
        CatchPageTabBar<HostFormWorkspaceView>(
          groupKey: const ValueKey('host-form-builder-tabs'),
          selected: selected,
          options: [
            CatchOption(
              value: HostFormWorkspaceView.overview,
              label: context.l10n.hostAudienceFormOverview,
            ),
            CatchOption(
              value: HostFormWorkspaceView.questions,
              label: context.l10n.hostFormQuestionsTitle,
            ),
            CatchOption(
              value: HostFormWorkspaceView.responses,
              label: context.l10n.hostFormsViewResponses,
            ),
            CatchOption(
              value: HostFormWorkspaceView.payments,
              label: context.l10n.hostFormPaymentsTitle,
            ),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}
