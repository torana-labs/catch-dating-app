import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchControlSurface,
  path: '[Core primitives]/Inputs',
)
Widget catchControlShellContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  Widget shell({
    required String label,
    CatchControlSurfaceSize size = CatchControlSurfaceSize.md,
    CatchControlSurfaceVariant shape = CatchControlSurfaceVariant.rounded,
    CatchControlSurfaceTone tone = CatchControlSurfaceTone.surface,
    bool enabled = true,
    bool hasError = false,
    bool focused = false,
    VoidCallback? onTap,
    bool semanticButton = false,
  }) {
    return SizedBox(
      width: WidgetbookPreviewLayout.controlShellWidth,
      child: CatchControlSurface(
        status: hasError
            ? CatchControlSurfaceStatus.error
            : focused
            ? CatchControlSurfaceStatus.focused
            : CatchControlSurfaceStatus.resting,

        size: size,
        variant: shape,
        tone: tone,
        enabled: enabled,

        onTap: onTap,
        semanticButton: semanticButton,
        child: Text(
          label,
          style: CatchTextStyles.fieldLabel(context, color: t.ink),
        ),
      ),
    );
  }

  return WidgetbookContractFrame(
    title: 'CatchControlSurface',
    contractId: 'catch.control_shell',
    states: const [
      'surface-md',
      'raised-compact',
      'pill',
      'focused',
      'error',
      'disabled',
      'semantic-button',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'surface-md',
        child: shell(label: 'Regular field'),
      ),
      WidgetbookContractStateCard(
        label: 'raised-compact',
        child: shell(
          label: 'Compact raised',
          size: CatchControlSurfaceSize.compact,
          tone: CatchControlSurfaceTone.raised,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'pill',
        child: shell(
          label: 'Pill trigger',
          size: CatchControlSurfaceSize.compact,
          shape: CatchControlSurfaceVariant.pill,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        child: shell(label: 'Focused', focused: true),
      ),
      WidgetbookContractStateCard(
        label: 'error',
        child: shell(label: 'Error', hasError: true),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: shell(label: 'Disabled', enabled: false),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-button',
        child: shell(
          label: 'Open picker',
          onTap: widgetbookNoop,
          semanticButton: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStepper,
  path: '[Core primitives]/Inputs',
)
Widget catchNumberStepperContractStates(BuildContext context) {
  String whole(num value) => value.toStringAsFixed(0);

  return WidgetbookContractFrame(
    title: 'CatchStepper',
    contractId: 'catch.number_stepper',
    states: const [
      'interactive',
      'min-bound',
      'max-bound',
      'disabled',
      'custom-step',
      'custom-format',
      'repeating',
      'keyboard-focused',
      'explicit-actions',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'interactive',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 2,
          min: 1,
          max: 5,
          valueLabelBuilder: whole,
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'min-bound',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 1,
          min: 1,
          max: 5,
          valueLabelBuilder: whole,
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'max-bound',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 5,
          min: 1,
          max: 5,
          valueLabelBuilder: whole,
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 2,
          valueLabelBuilder: whole,
          enabled: false,
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-step',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 30,
          min: 0,
          max: 90,
          step: 15,
          valueLabelBuilder: (value) => '${value.toStringAsFixed(0)} min',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-format',
        child: CatchStepper(
          decreaseSemanticLabel: 'Decrease',
          increaseSemanticLabel: 'Increase',
          value: 1499,
          step: 100,
          valueLabelBuilder: (value) => 'Rs ${value.toStringAsFixed(0)}',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'repeating · press and hold',
        child: CatchStepper(
          value: 168,
          min: 120,
          max: 220,
          unit: 'cm',
          decreaseSemanticLabel: 'Decrease height',
          increaseSemanticLabel: 'Increase height',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'keyboard-focused · use Tab',
        child: CatchStepper(
          value: 168,
          min: 120,
          max: 220,
          unit: 'cm',
          decreaseSemanticLabel: 'Decrease height',
          increaseSemanticLabel: 'Increase height',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'explicit-actions',
        child: CatchStepper.actions(
          value: 75,
          unit: 'min',
          decreaseSemanticLabel: 'Decrease duration',
          increaseSemanticLabel: 'Increase duration',
          onDecrease: widgetbookNoop,
          onIncrease: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSearchField,
  path: '[Core primitives]/Inputs',
)
Widget catchSearchFieldContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSearchField',
    contractId: 'catch.search_field',
    states: const [
      'field-empty',
      'field-filled',
      'focused',
      'disabled',
      'clearable',
      'expanding-collapsed',
      'expanding-expanded',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'field-empty',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField(copy: catchSearchFieldCopy(context.l10n)),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'field-filled',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField(
            copy: catchSearchFieldCopy(context.l10n),
            value: 'pickleball',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField(
            copy: catchSearchFieldCopy(context.l10n),
            autofocus: true,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField(
            copy: catchSearchFieldCopy(context.l10n),
            enabled: false,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'clearable',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField(
            copy: catchSearchFieldCopy(context.l10n),
            value: 'dinner',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'expanding-collapsed',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField.expanding(
            copy: catchSearchFieldCopy(context.l10n),
            status: CatchSearchFieldStatus.collapsed,
            maxWidth: 420,
            onOpenSearch: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'expanding-expanded',
        child: WidgetbookContractFieldWidth(
          child: CatchSearchField.expanded(
            copy: catchSearchFieldCopy(context.l10n),
            value: 'run club',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchRangeInput,
  path: '[Core primitives]/Inputs',
)
Widget catchRangeInputContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchRangeInput',
    contractId: 'catch.range_slider',
    states: const [
      'default',
      'with-endpoint-labels',
      'disabled',
      'divided-tickless',
      'semantic-values',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchRangeInput(
            values: const RangeValues(20, 80),
            onChanged: (_) {},
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-endpoint-labels',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchRangeInput(
            min: 1,
            max: 10,
            values: const RangeValues(2, 6),
            minLabel: '1 km',
            maxLabel: '10 km',
            onChanged: (_) {},
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'disabled',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchRangeInput(values: RangeValues(25, 75), onChanged: null),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-tickless',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchRangeInput(
            values: const RangeValues(3, 7),
            min: 0,
            max: 10,
            divisions: 10,
            onChanged: (_) {},
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-values',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchRangeInput(
            values: const RangeValues(18, 30),
            min: 18,
            max: 60,
            semanticValueBuilder: (value) => '${value.round()} years',
            onChanged: (_) {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchToggleInput,
  path: '[Core primitives]/Inputs',
)
Widget catchToggleInputContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchToggleInput',
    contractId: 'catch.toggle',
    states: const [
      'off',
      'on',
      'disabled',
      'semantic-labelled',
      'keyboard-focused',
      'field-recipe',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'field-recipe',
        child: WidgetbookContractWrap(
          children: [
            CatchToggleInput.field(value: false, onChanged: (_) {}),
            CatchToggleInput.field(value: true, onChanged: (_) {}),
            const CatchToggleInput.field(value: true, onChanged: null),
            const CatchToggleInput.field(value: false, onChanged: null),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'off',
        child: CatchToggleInput(value: false, onChanged: (_) {}),
      ),
      WidgetbookContractStateCard(
        label: 'on',
        child: CatchToggleInput(value: true, onChanged: (_) {}),
      ),
      const WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchToggleInput(value: true, onChanged: null),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-labelled',
        child: CatchToggleInput(
          value: true,
          semanticLabel: 'Allow reminders',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'keyboard-focused · use Tab',
        child: CatchToggleInput(value: true, onChanged: (_) {}),
      ),
    ],
  );
}
