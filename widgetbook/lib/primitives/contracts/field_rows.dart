import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldContentRow,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldContentRowContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'Field content',
    contractId: 'catch.field.content_row',
    states: const [
      'title-body',
      'optional',
      'empty-body',
      'two-three-clamp',
      'value',
      'placeholder',
      'active',
      'error',
      'optional-badge',
      'custom-value',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'title-body',
        child: CatchFieldContentRow(
          labelCopy: catchFieldLabelTextCopy(context.l10n),

          title: 'Weekend route update',
          body: 'The start point moved closer to the east gate.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'optional',
        child: CatchFieldContentRow(
          labelCopy: catchFieldLabelTextCopy(context.l10n),

          title: 'Race notes',
          body: 'Shared with runners before the event.',
          isOptional: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'empty-body',
        child: CatchFieldContentRow(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          title: 'Registration confirmed',
          body: '',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'two-three-clamp',
        child: SizedBox(
          width: WidgetbookPreviewLayout.fieldContentClampWidth,
          child: CatchFieldContentRow(
            labelCopy: catchFieldLabelTextCopy(context.l10n),

            title: 'A deliberately long title that reaches the second line',
            body:
                'Supporting copy may use three complete lines before the field truncates the remainder.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'value',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          label: 'Location',
          value: 'City centre',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'placeholder / optional-badge',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          label: 'Display name',
          value: 'Add your name',
          mode: CatchFieldContentRowMode.placeholder,
          isOptional: true,
          badgeLabel: 'Private',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'error',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          label: 'Short introduction',
          value: 'Tell us about yourself',
          supportText: 'Use at least 20 characters.',
          counterText: '12 / 140',
          status: CatchFieldContentRowStatus.error,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'active / custom-value',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          label: 'Availability',
          status: CatchFieldContentRowStatus.active,
          headerTrailingReserve:
              CatchFieldTokens.trailingGap +
              CatchFieldTokens.disclosureGlyphExtent,
          body: CatchChip.selectable(
            label: 'Evenings',
            selected: true,
            onChanged: (_) {},
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'label emphasis / support tone',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
          label: 'All set',
          emphasis: CatchFieldEmphasis.title,
          supportText: 'Your preferences are saved.',
          helperTone: CatchFieldSupportRowTone.success,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'empty value content',
        child: CatchFieldContentRow.value(
          labelCopy: catchFieldLabelTextCopy(context.l10n),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldSupportRow,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldSupportRowContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookContractFrame(
    title: 'CatchFieldSupportRow',
    contractId: 'catch.field.support_row',
    states: const ['helper', 'counter', 'error'],
    children: [
      WidgetbookContractStateCard(
        label: 'helper',
        child: CatchFieldSupportRow(
          text: 'Shown on your public profile.',
          color: t.ink3,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'counter',
        child: CatchFieldSupportRow(
          text: 'Keep it concise.',
          counter: '19 / 300',
          color: t.ink3,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'error',
        child: CatchFieldSupportRow(
          text: 'Choose at least one option.',
          color: t.danger,
          showErrorIcon: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldActionRow,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldActionBarContractStates(BuildContext context) {
  final textScale = MediaQuery.textScalerOf(context).scale(1);

  return WidgetbookContractFrame(
    title: 'CatchFieldActionRow',
    contractId: 'catch.field.action_bar',
    states: const ['ready', 'saving', 'leading', 'compact'],
    children: [
      WidgetbookContractStateCard(
        label: 'ready',
        child: CatchFieldActionRow(
          cancelLabel: context.l10n.coreCatchFieldLabelCancel,
          doneLabel: context.l10n.coreCatchFieldLabelDone,
          savingLabel: context.l10n.coreCatchFieldLabelSaving,
          onCancel: widgetbookNoop,
          onSubmit: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'saving',
        child: CatchFieldActionRow(
          cancelLabel: context.l10n.coreCatchFieldLabelCancel,
          doneLabel: context.l10n.coreCatchFieldLabelDone,
          savingLabel: context.l10n.coreCatchFieldLabelSaving,

          loading: true,
          onCancel: widgetbookNoop,
          onSubmit: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'leading',
        child: CatchFieldActionRow(
          cancelLabel: context.l10n.coreCatchFieldLabelCancel,
          doneLabel: context.l10n.coreCatchFieldLabelDone,
          savingLabel: context.l10n.coreCatchFieldLabelSaving,

          leading: Text('19 / 300', style: CatchTextStyles.bodyM(context)),
          onCancel: widgetbookNoop,
          onSubmit: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'compact',
        child: SizedBox(
          width: textScale >= 2
              ? WidgetbookPreviewLayout.standardContractWidth
              : WidgetbookPreviewLayout.fieldActionBarWrapWidth,
          child: CatchFieldActionRow(
            cancelLabel: context.l10n.coreCatchFieldLabelCancel,
            doneLabel: context.l10n.coreCatchFieldLabelDone,
            savingLabel: context.l10n.coreCatchFieldLabelSaving,

            leading: const Text('19 / 300'),
            onCancel: widgetbookNoop,
            onSubmit: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldDrawer,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldDisclosureDrawerContractStates(BuildContext context) {
  CatchFieldDrawer drawer({
    required bool open,
    Widget? body,
    Widget? meta,
    Widget? actions,
    Widget? footer,
  }) {
    return CatchFieldDrawer(
      open: open,
      offstage: !open,
      body: body,
      meta: meta,
      actions: actions,
      footer: footer,
      startPadding: CatchSpacing.s4,
      endPadding: CatchSpacing.s4,
      bottomPadding: CatchFieldTokens.rowVerticalPadding,
      revealDuration: Duration.zero,
      opacityDuration: Duration.zero,
      onRevealEnd: widgetbookNoop,
    );
  }

  return WidgetbookContractFrame(
    title: 'CatchFieldDrawer',
    contractId: 'catch.field.disclosure_drawer',
    states: const [
      'closed',
      'open',
      'meta',
      'feedback',
      'secondary-action',
      'combined',
    ],
    children: [
      WidgetbookContractStateCard(label: 'closed', child: drawer(open: false)),
      WidgetbookContractStateCard(
        label: 'open',
        child: drawer(
          open: true,
          body: Text(
            'Disclosure control',
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'meta',
        child: drawer(
          open: true,
          meta: Text('19 / 300', style: CatchTextStyles.bodyM(context)),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'feedback',
        child: drawer(
          open: true,
          body: Text('Draft restored.', style: CatchTextStyles.bodyM(context)),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'secondary-action',
        child: drawer(
          open: true,
          actions: CatchButton.text(
            label: 'Change prompt',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'combined',
        child: drawer(
          open: true,
          meta: Text('19 / 300', style: CatchTextStyles.bodyM(context)),
          body: Text('Draft restored.', style: CatchTextStyles.bodyM(context)),
          actions: CatchButton.text(
            label: 'Change prompt',
            onPressed: widgetbookNoop,
          ),
          footer: CatchFieldActionRow(
            cancelLabel: 'Cancel',
            doneLabel: 'Done',
            savingLabel: 'Saving',
            onCancel: widgetbookNoop,
            onSubmit: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldCommitButton,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldCommitButtonContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchFieldCommitButton',
    contractId: 'catch.field.commit_button',
    states: const ['cancel', 'done', 'saving', 'disabled', 'keyboard-focused'],
    children: [
      WidgetbookContractStateCard(
        label: 'cancel / done / saving / disabled',
        child: WidgetbookContractWrap(
          children: [
            CatchFieldCommitButton(label: 'Cancel', onPressed: widgetbookNoop),
            CatchFieldCommitButton(
              label: 'Done',
              primary: true,
              onPressed: widgetbookNoop,
            ),
            const CatchFieldCommitButton(
              label: 'Saving…',
              primary: true,
              loading: true,
              onPressed: null,
            ),
            const CatchFieldCommitButton(
              label: 'Done',
              primary: true,
              onPressed: null,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'keyboard-focused · use Tab',
        child: CatchFieldCommitButton(
          label: 'Done',
          primary: true,
          onPressed: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStepperRepeatButton,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldRepeatButtonContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchStepperRepeatButton',
    contractId: 'catch.number_stepper.repeat_button',
    states: const [
      'enabled',
      'disabled',
      'pressed',
      'repeating',
      'keyboard-focused',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'enabled / disabled / press / hold to repeat',
        child: WidgetbookContractWrap(
          children: [
            CatchStepperRepeatButton(
              icon: CatchIcons.remove,
              semanticLabel: 'Decrease',
              enabled: true,
              onStep: widgetbookNoop,
            ),
            CatchStepperRepeatButton(
              icon: CatchIcons.add,
              semanticLabel: 'Increase',
              enabled: true,
              onStep: widgetbookNoop,
            ),
            CatchStepperRepeatButton(
              icon: CatchIcons.add,
              semanticLabel: 'Increase disabled',
              enabled: false,
              onStep: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'keyboard-focused · use Tab',
        child: CatchStepperRepeatButton(
          icon: CatchIcons.add,
          semanticLabel: 'Increase from keyboard',
          enabled: true,
          onStep: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldRow,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldRowContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final textStyle = CatchTextStyles.bodyLead(context, color: t.ink);

  return WidgetbookContractFrame(
    title: 'CatchFieldRow',
    contractId: 'catch.field.row',
    states: const [
      'standard',
      'with-leading',
      'with-trailing',
      'add',
      'tappable',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'standard',
        child: WidgetbookContractFieldWidth(
          child: CatchFieldRow.standard(
            body: Text('Plain row content', style: textStyle),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-leading',
        child: WidgetbookContractFieldWidth(
          child: CatchFieldRow.standard(
            leading: Icon(CatchIcons.host, color: t.ink2),
            body: Text('Leading icon row', style: textStyle),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-trailing',
        child: WidgetbookContractFieldWidth(
          child: CatchFieldRow.standard(
            body: Text('Trailing value row', style: textStyle),
            trailing: CatchFieldTrailingRow.valueText(text: 'Private'),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'add',
        child: WidgetbookContractFieldWidth(
          child: CatchField.add(
            copy: catchFieldCopy(context.l10n),
            title: 'Add another time',
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tappable',
        child: WidgetbookContractFieldWidth(
          child: CatchFieldRow.standard(
            body: Text('Tap target row', style: textStyle),
            trailing: CatchFieldTrailingRow.fixedChevron(),
            onTap: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFieldTrailingRow,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldTrailingContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'Field trailing row',
    contractId: 'catch.field.trailing',
    states: const [
      'value-text',
      'fixed-chevron',
      'rotating-chevron',
      'toggle',
      'status',
      'clear',
      'valid',
      'custom',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'value-text',
        child: CatchFieldTrailingRow.valueText(text: 'Private'),
      ),
      WidgetbookContractStateCard(
        label: 'fixed-chevron',
        child: CatchFieldTrailingRow.fixedChevron(),
      ),
      WidgetbookContractStateCard(
        label: 'rotating-chevron',
        child: WidgetbookContractWrap(
          children: [
            CatchFieldTrailingRow.rotatingChevron(open: false),
            CatchFieldTrailingRow.rotatingChevron(open: true),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'toggle',
        child: CatchFieldTrailingRow.toggle(
          copy: catchFieldCopy(context.l10n),
          value: true,
          onChanged: (_) {},
          semanticLabel: 'Allow reminders',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'status',
        child: CatchFieldTrailingRow.status(
          copy: catchFieldCopy(context.l10n),
          status: CatchFieldStatus.saved,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'clear',
        child: CatchFieldTrailingRow.clear(
          tooltip: 'Clear field',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'valid',
        child: CatchFieldTrailingRow.valid(),
      ),
      WidgetbookContractStateCard(
        label: 'custom',
        child: CatchFieldTrailingRow.custom(
          color: t.primary,
          child: const Text('Edit'),
        ),
      ),
    ],
  );
}
