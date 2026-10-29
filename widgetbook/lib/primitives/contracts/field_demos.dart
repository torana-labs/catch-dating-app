import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

class WidgetbookToggleFieldDemo extends StatefulWidget {
  const WidgetbookToggleFieldDemo({super.key, this.initialValue = true});

  final bool initialValue;

  @override
  State<WidgetbookToggleFieldDemo> createState() => _ToggleFieldDemoState();
}

class _ToggleFieldDemoState extends State<WidgetbookToggleFieldDemo> {
  late bool _enabled;

  @override
  void initState() {
    super.initState();
    _enabled = widget.initialValue;
  }

  @override
  Widget build(BuildContext context) {
    return CatchField.toggle(
      copy: catchFieldCopy(context.l10n),
      title: 'Allow requests',
      body: _enabled ? 'Open' : 'Closed',
      icon: CatchIcons.notifications,
      value: _enabled,
      onChanged: (enabled) => setState(() => _enabled = enabled),
    );
  }
}

class WidgetbookTextEntryFieldDemo extends StatefulWidget {
  const WidgetbookTextEntryFieldDemo({super.key, this.autofocus = false});

  final bool autofocus;

  @override
  State<WidgetbookTextEntryFieldDemo> createState() =>
      _TextEntryFieldDemoState();
}

class _TextEntryFieldDemoState extends State<WidgetbookTextEntryFieldDemo> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CatchField.input(
      copy: catchFieldCopy(context.l10n),
      title: 'Public name',
      controller: _controller,
      icon: CatchIcons.person,
      emptyValueText: 'Add a public name',
      inputHint: 'e.g. Aanya',
      autofocus: widget.autofocus,
      showClearButton: true,
      onChanged: (_) => setState(() {}),
    );
  }
}

class WidgetbookChoiceFieldDemo extends StatefulWidget {
  const WidgetbookChoiceFieldDemo({
    super.key,
    this.initiallyOpen = false,
    this.allowEmptySelection = false,
    this.initialSelection = const {'English', 'Hindi', 'Marathi'},
    this.body,
    this.isOptional = false,
  });

  final bool initiallyOpen;
  final bool allowEmptySelection;
  final Set<String> initialSelection;
  final String? body;
  final bool isOptional;

  @override
  State<WidgetbookChoiceFieldDemo> createState() => _ChoiceFieldDemoState();
}

class _ChoiceFieldDemoState extends State<WidgetbookChoiceFieldDemo> {
  static const _values = ['English', 'Hindi', 'Marathi', 'Tamil', 'Gujarati'];
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = Set<String>.of(widget.initialSelection);
  }

  @override
  void didUpdateWidget(covariant WidgetbookChoiceFieldDemo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!setEquals(oldWidget.initialSelection, widget.initialSelection)) {
      _selected = Set<String>.of(widget.initialSelection);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CatchField<String>.choices(
      copy: catchFieldCopy(context.l10n),
      title: 'Languages',
      body: widget.body,
      icon: CatchIcons.web,
      values: _values,
      itemLabelBuilder: (value) => value,
      selected: _selected,
      mode: CatchChipMode.multiple,
      allowEmptySelection: widget.allowEmptySelection,
      labelMode: widget.isOptional
          ? CatchFieldLabelTextMode.optional
          : CatchFieldLabelTextMode.visible,
      disclosureMode: widget.initiallyOpen
          ? CatchFieldMode.localExpanded
          : CatchFieldMode.localCollapsed,
      onSelectionChanged: (selection) {
        setState(() => _selected = selection);
      },
      onCancel: widgetbookNoop,
      onSubmit: widgetbookNoop,
    );
  }
}

class WidgetbookStepperFieldDemo extends StatefulWidget {
  const WidgetbookStepperFieldDemo({super.key});

  @override
  State<WidgetbookStepperFieldDemo> createState() => _StepperFieldDemoState();
}

class _StepperFieldDemoState extends State<WidgetbookStepperFieldDemo> {
  num _value = 168;

  @override
  Widget build(BuildContext context) {
    return CatchField.stepper(
      copy: catchFieldCopy(context.l10n),
      title: 'Height',
      body: '${_value.toInt()} cm',
      icon: CatchIcons.height,
      value: _value,
      min: 120,
      max: 220,
      unit: 'cm',
      disclosureMode: CatchFieldMode.localExpanded,
      decreaseSemanticLabel: 'Decrease height',
      increaseSemanticLabel: 'Increase height',
      onChanged: (value) => setState(() => _value = value),
      onCancel: widgetbookNoop,
      onSubmit: widgetbookNoop,
    );
  }
}

class WidgetbookExplicitSaveFieldDemo extends StatefulWidget {
  const WidgetbookExplicitSaveFieldDemo({
    super.key,
    this.initiallyExpanded = false,
    this.isLoading = false,
    this.error,
  });

  final bool initiallyExpanded;
  final bool isLoading;
  final String? error;

  @override
  State<WidgetbookExplicitSaveFieldDemo> createState() =>
      _ExplicitSaveFieldDemoState();
}

class _ExplicitSaveFieldDemoState
    extends State<WidgetbookExplicitSaveFieldDemo> {
  late final TextEditingController _controller;
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: 'Catch me if you can');
    _expanded = widget.initiallyExpanded;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CatchField.inputActions(
      copy: catchFieldCopy(context.l10n),
      title: 'A perfect event with me looks like...',
      controller: _controller,
      icon: CatchIcons.quote,
      open: _expanded,
      onOpenChanged: (expanded) => setState(() => _expanded = expanded),
      meta: const Text('19 / 300'),
      actions: CatchButton.text(
        label: 'Change prompt',
        onPressed: widgetbookNoop,
        padding: EdgeInsets.zero,
      ),
      error: widget.error,
      status: widget.isLoading
          ? CatchFieldStatus.saving
          : CatchFieldStatus.idle,
      onCancel: () => setState(() => _expanded = false),
      onSubmit: widgetbookNoop,
      maxLines: null,
      textInputAction: TextInputAction.newline,
    );
  }
}

class WidgetbookSelectErrorFieldDemo extends StatefulWidget {
  const WidgetbookSelectErrorFieldDemo({super.key});

  @override
  State<WidgetbookSelectErrorFieldDemo> createState() =>
      _SelectErrorFieldDemoState();
}

class _SelectErrorFieldDemoState extends State<WidgetbookSelectErrorFieldDemo> {
  final _formKey = GlobalKey<FormState>();
  bool _validated = false;

  @override
  Widget build(BuildContext context) {
    if (!_validated) {
      _validated = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _formKey.currentState?.validate();
      });
    }

    return Form(
      key: _formKey,
      child: CatchField<String>.select(
        copy: catchFieldCopy(context.l10n),
        title: 'Activity',
        values: const ['Run', 'Dinner', 'Pickleball'],
        itemLabelBuilder: (value) => value,
        leading: Icon(CatchIcons.event),
        onValidate: (value) => value == null ? 'Choose an activity.' : null,
        onChanged: (_) {},
      ),
    );
  }
}
