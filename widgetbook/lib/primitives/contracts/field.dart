import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import 'field_demos.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchField,
  path: '[Core primitives]/Inputs',
)
Widget catchFieldContractStates(BuildContext context) {
  final resolved = catchFieldCopy(context.l10n);
  final copy = CatchFieldCopy(
    label: resolved.label,
    validation: resolved.validation,
    cancelLabel: resolved.cancelLabel,
    doneLabel: resolved.doneLabel,
    savingLabel: resolved.savingLabel,
    savingSemanticLabel: resolved.savingSemanticLabel,
    savedSemanticLabel: resolved.savedSemanticLabel,
    emptyValueText: resolved.emptyValueText,
    selectPlaceholder: resolved.selectPlaceholder,
    clearTooltip: resolved.clearTooltip,
  );
  Widget fieldState({
    required String label,
    required Widget child,
    String? description,
  }) {
    return _CatchFieldStatePreview(
      label: label,
      description: description,
      child: child,
    );
  }

  return WidgetbookContractFrame(
    title: 'CatchField',
    contractId: 'catch.field',
    states: const [
      'row-value',
      'row-title',
      'custom-leading',
      'sortable-inline-metadata',
      'content-row-2-3-clamp',
      'value-line',
      'chevron',
      'toggle-on',
      'toggle-off',
      'toggle-helper-badge',
      'control-collapsed',
      'control-open',
      'disclosure-active-pressed',
      'choices-wrapped',
      'choices-clearable',
      'choices-retain-final-selection',
      'choices-derived-summary',
      'choices-explicit-summary',
      'choices-helper-accent',
      'option-cards-explanatory',
      'stepper-open',
      'direct-input-one-tap',
      'direct-input-focused-cursor',
      'read-only-row',
      'editable-row',
      'saving',
      'saved',
      'explicit-save-collapsed',
      'explicit-save-focused',
      'explicit-save-saving',
      'explicit-save-error',
      'editable-empty-at-rest',
      'editable-empty-focused',
      'empty-add-capability-matrix',
      'edit-empty',
      'edit-filled',
      'edit-focused',
      'edit-disabled',
      'edit-read-only',
      'edit-helper',
      'edit-success-helper',
      'edit-multiline',
      'edit-clearable',
      'valid',
      'error',
      'focused',
      'select',
      'select-disabled',
      'select-error',
      'add',
    ],
    children: [
      fieldState(
        label: 'row-value',
        description: 'Default row: label above, value emphasized.',
        child: CatchField.read(
          copy: copy,
          title: 'Host',
          body: 'Catch Hosts',
          icon: CatchIcons.host,
        ),
      ),
      fieldState(
        label: 'custom-leading',
        description:
            'Caller-owned semantic leading content stays inside canonical field geometry.',
        child: CatchField.nav(
          copy: copy,
          leading: Semantics(
            label: '27 May',
            excludeSemantics: true,
            child: const SizedBox(
              width: WidgetbookPreviewLayout.fieldLeadingWidth,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [Text('27'), Text('MAY')],
              ),
            ),
          ),
          leadingExtent: 48,
          title: 'Wednesday Evening Run',
          body: '2 attended · 20% full · free',
          emphasis: CatchFieldEmphasis.title,
          onTap: widgetbookNoop,
        ),
      ),
      fieldState(
        label: 'row-title',
        description: 'Title-emphasis row: title primary, value supporting.',
        child: CatchField.read(
          copy: copy,
          title: 'Visibility',
          body: 'Private to attendees',
          icon: CatchIcons.locked,
          emphasis: CatchFieldEmphasis.title,
        ),
      ),
      fieldState(
        label: 'sortable-inline-metadata',
        description:
            'A drag target sits beside a wrapping title with metadata on its own line.',
        child: CatchField.sortable(
          copy: copy,
          title: 'Why do you want to join?',
          metadata: 'Long text · Required',
          leading: SizedBox.square(
            dimension: CatchSpacing.s11,
            child: Icon(CatchIcons.dragHandle),
          ),
          onTap: widgetbookNoop,
        ),
      ),
      fieldState(
        label: 'content-row-2-3-clamp',
        description:
            'Dedicated content semantics: 14/600 title (two lines), 13/400 supporting body (three lines), and a 3px gap without changing legacy value rows.',
        child: CatchField.content(
          copy: copy,
          title: 'Event starts tomorrow near Carter Road Jetty',
          body:
              'Sundowner 5K meets by the promenade before the group heads out together.',
          icon: CatchIcons.notifications,
        ),
      ),
      fieldState(
        label: 'value-line',
        child: CatchField.read(
          copy: copy,
          title: 'Phone',
          valueText: '+91 98765 43210',
          icon: CatchIcons.phone,
        ),
      ),
      fieldState(
        label: 'chevron',
        description:
            'The trailing affordance uses one caption reserve and stays centered on the value line.',
        child: CatchField.nav(
          copy: copy,
          title: 'Location',
          body: 'Fort Greene Park',
          icon: CatchIcons.location,
          onTap: widgetbookNoop,
        ),
      ),
      fieldState(label: 'toggle-on', child: const WidgetbookToggleFieldDemo()),
      fieldState(
        label: 'toggle-off',
        child: const WidgetbookToggleFieldDemo(initialValue: false),
      ),
      fieldState(
        label: 'toggle-helper-badge',
        description:
            'Recommendation metadata stays in the title row while guidance uses the canonical support lane.',
        child: CatchField.toggle(
          copy: copy,
          title: 'Live guide',
          body: 'Enable the run-of-show companion.',
          helperText: 'You can change this before the event.',
          badgeLabel: 'Recommended',
          badgeTone: CatchBadgeTone.success,
          value: true,
          onChanged: (_) {},
        ),
      ),
      fieldState(
        label: 'control-collapsed',
        description:
            'At rest, the caption uses semantic ink3 and the caret stays centered on the value line with canonical divider clearance.',
        child: const WidgetbookChoiceFieldDemo(),
      ),
      fieldState(
        label: 'control-open',
        description:
            'Opening promotes the field-name caption to semantic ink while Optional copy stays ink3; the caret keeps the same value-line center and only rotates.',
        child: const WidgetbookChoiceFieldDemo(
          initiallyOpen: true,
          isOptional: true,
        ),
      ),
      fieldState(
        label: 'disclosure-active-pressed',
        description:
            'The standalone open field holds rounded active chrome. Press and hold its row to verify that pointer-down retains one rounded outline before release.',
        child: const WidgetbookChoiceFieldDemo(initiallyOpen: true),
      ),
      fieldState(
        label: 'choices-wrapped',
        description:
            'Selected and unselected chips share the canonical 8px wrap gap.',
        child: const WidgetbookChoiceFieldDemo(initiallyOpen: true),
      ),
      fieldState(
        label: 'choices-clearable',
        description:
            'Selection policy allows the final selected value to be removed independently from Optional presentation copy.',
        child: const WidgetbookChoiceFieldDemo(
          initiallyOpen: true,
          allowEmptySelection: true,
          initialSelection: {'English'},
        ),
      ),
      fieldState(
        label: 'choices-retain-final-selection',
        description:
            'Required selection policy keeps the final selected value active.',
        child: const WidgetbookChoiceFieldDemo(
          initiallyOpen: true,
          initialSelection: {'English'},
        ),
      ),
      fieldState(
        label: 'choices-derived-summary',
        description:
            'Without an explicit body, the primitive derives its summary in source-option order.',
        child: const WidgetbookChoiceFieldDemo(
          initialSelection: {'Marathi', 'English'},
        ),
      ),
      fieldState(
        label: 'choices-explicit-summary',
        description:
            'An explicit body remains available when product copy should override the derived selection summary.',
        child: const WidgetbookChoiceFieldDemo(
          body: 'Three languages selected',
        ),
      ),
      fieldState(
        label: 'choices-helper-accent',
        description:
            'Choice guidance uses the support lane and product-owned option color is forwarded to the canonical selectable chip.',
        child: CatchField<String>.choices(
          copy: copy,
          title: 'Run format',
          helperText: 'Pick the format guests will see.',
          values: const ['Social', 'Competitive'],
          itemLabelBuilder: (value) => value,
          itemAccentBuilder: (value) =>
              value == 'Social' ? CatchTokens.of(context).primary : null,
          selected: const {'Social'},
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (_) {},
        ),
      ),
      fieldState(
        label: 'option-cards-explanatory',
        description:
            'Policies with per-option guidance use one full-width title-and-description target per choice instead of chips plus detached selected copy.',
        child: CatchField<String>.optionCards(
          copy: copy,
          title: 'Admission format',
          values: const ['open', 'request'],
          itemTitleBuilder: (value) =>
              value == 'open' ? 'Open capacity' : 'Request to join',
          itemDescriptionBuilder: (value) => value == 'open'
              ? 'Anyone eligible can book until the event reaches capacity.'
              : 'People request a spot and a host approves each booking.',
          selected: 'open',
          disclosureMode: CatchFieldMode.localExpanded,
          onChanged: (_) {},
          icon: CatchIcons.checkIn,
        ),
      ),
      fieldState(
        label: 'stepper-open',
        description:
            'The 44px repeat targets flank one centered value without a nested tile; the shared open state promotes its caption to semantic ink while its caret remains in the value-line trailing lane.',
        child: const WidgetbookStepperFieldDemo(),
      ),
      fieldState(
        label: 'direct-input-one-tap',
        description:
            'Tap anywhere in the row once: the native input receives focus and positions its cursor. No edit caret is synthesized.',
        child: const WidgetbookTextEntryFieldDemo(),
      ),
      fieldState(
        label: 'direct-input-focused-cursor',
        description:
            'Autofocus makes the native insertion cursor deterministic for visual review.',
        child: const WidgetbookTextEntryFieldDemo(autofocus: true),
      ),
      fieldState(
        label: 'read-only-row',
        description: 'Static profile data never receives an edit chevron.',
        child: CatchField.read(
          copy: copy,
          title: 'Date of birth',
          body: '16/07/1994 (31 years)',
          icon: CatchIcons.birthday,
        ),
      ),
      fieldState(
        label: 'editable-row',
        description:
            'Editable rows expose the native text cursor on tap, not a synthesized trailing chevron.',
        child: CatchField.input(
          copy: copy,
          title: 'Display name',
          initialValue: 'Suvrat',
          icon: CatchIcons.person,
        ),
      ),
      fieldState(
        label: 'saving',
        description:
            'Auto-save fields without a visible commit bar use one 16px in-flight indicator in the value-line trailing lane.',
        child: CatchField.read(
          copy: copy,
          title: 'Display name',
          body: 'Suvrat',
          icon: CatchIcons.person,
          status: CatchFieldStatus.saving,
        ),
      ),
      fieldState(
        label: 'saved',
        description:
            'The value-line trailing lane owns and centers the transient saved tick.',
        child: CatchField.read(
          copy: copy,
          title: 'Display name',
          body: 'Suvrat',
          icon: CatchIcons.person,
          status: CatchFieldStatus.saved,
        ),
      ),
      fieldState(
        label: 'explicit-save-collapsed',
        child: const WidgetbookExplicitSaveFieldDemo(),
      ),
      fieldState(
        label: 'explicit-save-focused',
        description:
            'The root active label uses semantic ink while answer, counter, secondary action, and commit footer keep one order.',
        child: const WidgetbookExplicitSaveFieldDemo(initiallyExpanded: true),
      ),
      fieldState(
        label: 'explicit-save-saving',
        description:
            'The visible commit bar owns the sole 13px saving indicator inside Done; the header keeps its disclosure caret.',
        child: const WidgetbookExplicitSaveFieldDemo(
          initiallyExpanded: true,
          isLoading: true,
        ),
      ),
      fieldState(
        label: 'explicit-save-error',
        child: const WidgetbookExplicitSaveFieldDemo(
          initiallyExpanded: true,
          error: 'Keep the answer under 300 characters.',
        ),
      ),
      fieldState(
        label: 'editable-empty-at-rest',
        description:
            'One localized Add line replaces the inactive caption while the same native TextField stays mounted.',
        child: CatchField.input(
          copy: copy,
          title: 'Public name',
          inputHint: 'e.g. Aanya',
        ),
      ),
      fieldState(
        label: 'editable-empty-focused',
        description:
            'The initiating tap expands the same input, restores its caption, and gives the Add line to the input-only hint.',
        child: CatchField.input(
          copy: copy,
          title: 'Public name',
          inputHint: 'e.g. Aanya',
          states: const <WidgetState>{WidgetState.focused},
        ),
      ),
      fieldState(
        label: 'empty-add-capability-matrix',
        description:
            'Empty direct inputs and addable disclosures share one-line Add typography, Optional composition, row height, and leading-slot centering.',
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchField.input(
              copy: copy,
              title: 'Job title',
              icon: CatchIcons.work,
              labelMode: CatchFieldLabelTextMode.optional,
            ),
            CatchField<String>.choices(
              copy: copy,
              title: 'Workout',
              values: const ['Never', 'Often'],
              itemLabelBuilder: (value) => value,
              selected: const {},
              onSelectionChanged: (_) {},
              addable: true,
              labelMode: CatchFieldLabelTextMode.optional,
              icon: CatchIcons.fitness,
            ),
          ],
        ),
      ),
      fieldState(
        label: 'edit-empty',
        child: CatchField.input(
          copy: copy,
          title: 'Name',
          emptyValueText: 'Add a public name',
          inputHint: 'e.g. Aanya',
        ),
      ),
      fieldState(
        label: 'edit-filled',
        child: CatchField.input(
          copy: copy,
          title: 'Club',
          initialValue: 'Fort Greene Run Club',
        ),
      ),
      fieldState(
        label: 'edit-focused',
        description:
            'Native text focus uses the same root semantic-ink label state as an open disclosure.',
        child: CatchField.input(
          copy: copy,
          title: 'Search',
          initialValue: 'social run',
          states: const <WidgetState>{WidgetState.focused},
          leading: Icon(CatchIcons.search),
        ),
      ),
      fieldState(
        label: 'edit-disabled',
        child: CatchField.input(
          copy: copy,
          title: 'Email',
          initialValue: 'team@catch.events',
          states: const <WidgetState>{WidgetState.disabled},
        ),
      ),
      fieldState(
        label: 'edit-read-only',
        child: CatchField.input(
          copy: copy,
          title: 'Handle',
          initialValue: '@catch-hosts',
          inputMode: CatchTextInputMode.inactiveWithoutSelection,
        ),
      ),
      fieldState(
        label: 'edit-helper',
        description: 'Expanded helper/info state.',
        child: CatchField.input(
          copy: copy,
          title: 'Invite note',
          placeholder: 'Add an invite note',
          helperText: 'Shown before guests request a spot.',
          helperTone: CatchFieldSupportRowTone.brand,
          states: const <WidgetState>{WidgetState.focused},
        ),
      ),
      fieldState(
        label: 'edit-success-helper',
        description: 'Success helper state.',
        child: CatchField.input(
          copy: copy,
          title: 'Invite code',
          initialValue: 'RUNCLUB',
          helperText: 'Invite code is available.',
          helperTone: CatchFieldSupportRowTone.success,
          states: const <WidgetState>{WidgetState.focused},
        ),
      ),
      fieldState(
        label: 'edit-multiline',
        child: CatchField.input(
          copy: copy,
          title: 'Description',
          initialValue: 'Meet by the fountain, then we will head out together.',
          maxLines: 4,
          minLines: 3,
        ),
      ),
      fieldState(
        label: 'edit-clearable',
        child: CatchField.input(
          copy: copy,
          title: 'Search hosts',
          initialValue: 'Run',
          showClearButton: true,
          trailing: Icon(CatchIcons.search),
        ),
      ),
      fieldState(
        label: 'valid',
        child: CatchField.read(
          copy: copy,
          title: 'Invite code',
          body: 'RUNCLUB',
          icon: CatchIcons.key,
          valid: true,
        ),
      ),
      fieldState(
        label: 'error',
        child: CatchField.input(
          copy: copy,
          title: 'Invite code',
          initialValue: 'ABC',
          icon: CatchIcons.key,
          error: 'Use a six character invite code.',
        ),
      ),
      fieldState(
        label: 'focused',
        child: CatchField.input(
          copy: copy,
          title: 'Handle',
          initialValue: 'catch-hosts',
          leadingUnit: '@',
          states: const <WidgetState>{WidgetState.focused},
        ),
      ),
      fieldState(
        label: 'select',
        description:
            'The menu trigger shares the same caption reserve and value-line-centered caret geometry.',
        child: CatchField<String>.select(
          copy: copy,
          title: 'Activity',
          values: const ['Run', 'Dinner', 'Pickleball'],
          value: 'Run',
          itemLabelBuilder: (value) => value,
          leading: Icon(CatchIcons.event),
          onChanged: (_) {},
        ),
      ),
      fieldState(
        label: 'select-disabled',
        child: CatchField<String>.select(
          copy: copy,
          title: 'Activity',
          values: const ['Run', 'Dinner', 'Pickleball'],
          value: 'Run',
          itemLabelBuilder: (value) => value,
          leading: Icon(CatchIcons.event),
          states: const <WidgetState>{WidgetState.disabled},
          onChanged: (_) {},
        ),
      ),
      fieldState(
        label: 'select-error',
        child: const WidgetbookSelectErrorFieldDemo(),
      ),
      fieldState(
        label: 'add',
        child: CatchField.add(
          copy: copy,
          title: 'Add another time',
          icon: CatchIcons.add,
          onTap: widgetbookNoop,
        ),
      ),
    ],
  );
}

class _CatchFieldStatePreview extends StatelessWidget {
  const _CatchFieldStatePreview({
    required this.label,
    required this.child,
    this.description,
  });

  final String label;
  final Widget child;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchBadge.functional(label: label),
            if (description != null) ...[
              const SizedBox(width: CatchSpacing.s3),
              Expanded(
                child: Text(
                  description!,
                  style: CatchTextStyles.supporting(context, color: t.ink2),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: CatchSpacing.s3),
        WidgetbookContractFieldWidth(child: child),
      ],
    );
  }
}
