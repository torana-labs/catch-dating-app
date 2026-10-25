import 'package:catch_dating_app/core/labelled.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';
import '../code_input_demo.dart';

const _choices = <_Choice>[
  _Choice('Social run'),
  _Choice('Dinner'),
  _Choice('Rooftop mixer'),
];

Widget catchSearchFieldCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchSearchField',
    catalogId: 'core.widgets.catch_search_field',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'empty / value / disabled',
        child: _SearchFieldDemo(),
      ),
      WidgetbookCatalogStateCard(
        label: 'expanding header mode',
        child: _SearchFieldExpansionDemo(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchCodeInput,
  path: '[Core catalog]/Inputs',
)
Widget catchCodeInputCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchCodeInput',
    catalogId: 'core.widgets.catch_code_input',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'editable platform input',
        child: WidgetbookCodeInputDemo(value: '48'),
      ),
    ],
  );
}

Widget catchRangeInputCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchRangeInput',
    catalogId: 'core.widgets.catch_range_slider',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'interactive',
        child: _RangeSliderDemo(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchFieldLabelText,
  path: '[Core catalog]/Inputs',
)
Widget catchFieldLabelTextCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Field labels',
    catalogId: 'catch.field.form_field_label',
    children: [
      WidgetbookCatalogStateCard(
        label: 'required / optional / error / large',
        child: WidgetbookContractWrap(
          children: [
            CatchFieldLabelText(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: 'Name',
            ),
            CatchFieldLabelText(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: 'Note',
              mode: CatchFieldLabelTextMode.optional,
            ),
            CatchFieldLabelText(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: 'Activity',
              hasError: true,
            ),
            CatchFieldLabelText(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: 'Host copy',
              size: CatchFieldLabelTextSize.lg,
            ),
          ],
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'field inline optional suffix',
        child: CatchFieldLabelText.inline(
          copy: catchFieldLabelTextCopy(context.l10n),
          label: 'Religion',
          mode: CatchFieldLabelTextMode.optional,
          style: CatchTextStyles.bodyLead(
            context,
            color: CatchTokens.of(context).ink,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchControlSurface,
  path: '[Core catalog]/Inputs',
)
Widget catchControlShellCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  Widget shell({
    required String label,
    CatchControlSurfaceSize size = CatchControlSurfaceSize.md,
    CatchControlSurfaceVariant shape = CatchControlSurfaceVariant.rounded,
    CatchControlSurfaceTone tone = CatchControlSurfaceTone.surface,
    bool enabled = true,
    bool hasError = false,
    bool focused = false,
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

        child: Text(
          label,
          style: CatchTextStyles.fieldLabel(context, color: t.ink),
        ),
      ),
    );
  }

  return WidgetbookCatalogFrame(
    title: 'CatchControlSurface',
    catalogId: 'core.widgets.catch_control_shell',
    children: [
      WidgetbookCatalogStateCard(
        label: 'size / shape / tone / error / disabled',
        child: WidgetbookContractWrap(
          children: [
            shell(label: 'Regular field'),
            shell(
              label: 'Compact pill',
              size: CatchControlSurfaceSize.compact,
              shape: CatchControlSurfaceVariant.pill,
              tone: CatchControlSurfaceTone.raised,
            ),
            shell(label: 'Focused', focused: true),
            shell(label: 'Error', hasError: true),
            shell(label: 'Disabled', enabled: false),
          ],
        ),
      ),
    ],
  );
}

Widget catchOptionGroupCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchChoiceInput',
    catalogId: 'core.widgets.catch_option_group',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'label / mono / trailing',
        child: _OptionGroupDemo(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchChoiceInput,
  path: '[Core catalog]/Selection',
)
Widget catchChoiceInputFormCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchChoiceInput',
    catalogId: 'core.widgets.catch_choice_input_form',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'multi-select / single-select',
        child: _ChoiceInputFormDemo(),
      ),
    ],
  );
}

Widget catchToggleInputCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchToggleInput',
    catalogId: 'core.widgets.catch_toggle_input',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'on / off / disabled',
        child: _ToggleDemo(),
      ),
    ],
  );
}

class _SearchFieldDemo extends StatefulWidget {
  const _SearchFieldDemo();

  @override
  State<_SearchFieldDemo> createState() => _SearchFieldDemoState();
}

class _SearchFieldDemoState extends State<_SearchFieldDemo> {
  var _value = '';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CatchSearchField(
          copy: catchSearchFieldCopy(context.l10n),
          value: _value,
          placeholder: 'Search events',
          onChanged: (value) => setState(() => _value = value),
        ),
        gapH12,
        CatchSearchField(
          copy: catchSearchFieldCopy(context.l10n),
          value: 'Dinner',
          placeholder: 'Search hosts',
          onChanged: (_) {},
        ),
        gapH12,
        CatchSearchField(
          copy: catchSearchFieldCopy(context.l10n),
          value: 'Disabled',
          placeholder: 'Search',
          enabled: false,
        ),
      ],
    );
  }
}

class _SearchFieldExpansionDemo extends StatefulWidget {
  const _SearchFieldExpansionDemo();

  @override
  State<_SearchFieldExpansionDemo> createState() =>
      _SearchFieldExpansionDemoState();
}

class _SearchFieldExpansionDemoState extends State<_SearchFieldExpansionDemo> {
  var _open = false;
  var _value = '';

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: WidgetbookPreviewLayout.navigationBarHeight,
      child: CatchSearchField.expanding(
        copy: catchSearchFieldCopy(context.l10n),
        progress: _open ? 1 : 0,
        maxWidth: 420,
        value: _value,
        placeholder: 'Search clubs',
        onChanged: (value) => setState(() => _value = value),
        onOpenSearch: () => setState(() => _open = true),
        onCloseSearch: () => setState(() => _open = false),
      ),
    );
  }
}

class _RangeSliderDemo extends StatefulWidget {
  const _RangeSliderDemo();

  @override
  State<_RangeSliderDemo> createState() => _RangeSliderDemoState();
}

class _RangeSliderDemoState extends State<_RangeSliderDemo> {
  var _values = const RangeValues(24, 36);

  @override
  Widget build(BuildContext context) {
    return CatchRangeInput(
      values: _values,
      min: 18,
      max: 60,
      divisions: 42,
      minLabel: '18',
      maxLabel: '60',
      onChanged: (values) => setState(() => _values = values),
      semanticValueBuilder: (value) => '${value.round()} years',
    );
  }
}

class _OptionGroupDemo extends StatefulWidget {
  const _OptionGroupDemo();

  @override
  State<_OptionGroupDemo> createState() => _OptionGroupDemoState();
}

class _OptionGroupDemoState extends State<_OptionGroupDemo> {
  var _selected = 'tonight';
  var _mono = 'all';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CatchChoiceInput<String>.segmented(
          options: const [
            CatchOption(value: 'tonight', label: 'Tonight'),
            CatchOption(value: 'week', label: 'This week'),
            CatchOption(value: 'saved', label: 'Saved'),
          ],
          selected: _selected,
          onChanged: (value) => setState(() => _selected = value),
          trailing: CatchBadge(label: '12'),
        ),
        gapH16,
        CatchChoiceInput<String>.segmented(
          options: const [
            CatchOption(value: 'all', label: 'All'),
            CatchOption(value: 'hosts', label: 'Hosts'),
            CatchOption(value: 'clubs', label: 'Clubs'),
          ],
          selected: _mono,
          variant: CatchChoiceInputVariant.mono,
          onChanged: (value) => setState(() => _mono = value),
        ),
      ],
    );
  }
}

class _ChoiceInputFormDemo extends StatefulWidget {
  const _ChoiceInputFormDemo();

  @override
  State<_ChoiceInputFormDemo> createState() => _ChoiceInputFormDemoState();
}

class _ChoiceInputFormDemoState extends State<_ChoiceInputFormDemo> {
  var _multi = <_Choice>{_choices.first};
  var _single = <_Choice>{_choices[1]};

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchChoiceInput<_Choice>.form(
          copy: catchFieldLabelTextCopy(context.l10n),
          label: 'Activities',
          values: _choices,
          selected: _multi,
          onChanged: (next) => setState(() => _multi = next),
          mode: CatchChipMode.multiple,
          itemLabelBuilder: (value) => value.label,
        ),
        gapH16,
        CatchChoiceInput<_Choice>.form(
          copy: catchFieldLabelTextCopy(context.l10n),
          label: 'One vibe',
          values: _choices,
          selected: _single,
          isOptional: true,
          onChanged: (next) => setState(() => _single = next),
          mode: CatchChipMode.single,
          itemLabelBuilder: (value) => value.label,
          allowEmptySelection: true,
        ),
      ],
    );
  }
}

class _ToggleDemo extends StatefulWidget {
  const _ToggleDemo();

  @override
  State<_ToggleDemo> createState() => _ToggleDemoState();
}

class _ToggleDemoState extends State<_ToggleDemo> {
  var _on = true;
  var _off = false;

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractWrap(
      children: [
        CatchToggleInput(
          value: _on,
          onChanged: (value) => setState(() => _on = value),
        ),
        CatchToggleInput(
          value: _off,
          onChanged: (value) => setState(() => _off = value),
        ),
        const CatchToggleInput(value: true, onChanged: null),
      ],
    );
  }
}

class _Choice implements Labelled {
  const _Choice(this.label);

  @override
  final String label;
}
