import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/form_new_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Step 1 of a new form: what happens after someone answers, one choice
/// row per kind, or every template when the host asks for them.
class HostFormNewBody extends StatelessWidget {
  const HostFormNewBody({
    super.key,
    required this.state,
    required this.onSelect,
  });

  final HostFormNewState state;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status == HostFormNewStatus.loading) {
      final tile = CatchChoiceTile(
        title: l10n.hostFormsKindApplication,
        subtitle: l10n.hostFormsKindApplicationNote,
        variant: CatchChoiceTileVariant.row,
      );
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        gap: CatchPageBodyGap.tight,
        children: [
          CatchText(
            l10n.hostFormsNewQuestion,
            variant: CatchTextVariant.pageTitle,
          ),
          CatchSkeleton.content(
            child: CatchStack(
              gap: CatchStackGap.g8,
              children: [tile, tile, tile],
            ),
          ),
        ],
      );
    }
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          state.templates
              ? l10n.hostFormsNewTemplatesTitle
              : l10n.hostFormsNewQuestion,
          variant: CatchTextVariant.pageTitle,
        ),
        if (state.failed)
          CatchNotice.inline(
            body: l10n.hostFormsNewFailed,
            tone: CatchNoticeTone.danger,
          ),
        if (state.choices.isEmpty)
          CatchText(l10n.hostFormsNewNoTemplates, tone: CatchTextTone.secondary)
        else
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              for (final choice in state.choices)
                CatchChoiceTile(
                  key: ValueKey<String>('host-form-new-${choice.templateId}'),
                  variant: CatchChoiceTileVariant.row,
                  title:
                      choice.title ?? hostFormKindLabel(l10n, choice.purpose),
                  subtitle: choice.title == null
                      ? hostFormKindNote(l10n, choice.purpose)
                      : choice.description,
                  meta: choice.title == null
                      ? null
                      : hostFormKindLabel(l10n, choice.purpose),
                  selected: choice.templateId == state.selectedTemplateId,
                  onTap: state.creating
                      ? null
                      : () => onSelect(choice.templateId),
                ),
            ],
          ),
      ],
    );
  }
}
