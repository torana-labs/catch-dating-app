import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/kernel/labelled.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/inline_editor_save.dart';
import 'package:catch_tokens/catch_tokens.dart' show CatchFieldTokens;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart' show setEquals;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ── Single-choice editor ──────────────────────────────────────────────────────

class ProfileInlineSingleChoiceEntryEditor<T extends Labelled>
    extends ConsumerStatefulWidget {
  const ProfileInlineSingleChoiceEntryEditor({
    super.key,
    required this.icon,
    required this.label,
    required this.values,
    required this.currentValue,
    required this.fieldName,
    required this.contract,
    required this.contractValue,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    required this.patchForValue,
    this.emptyValueText,
    this.isAddAffordance = false,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
  });

  final IconData icon;
  final String label;
  final List<T> values;
  final T? currentValue;
  final String fieldName;
  final CatchContractFieldConstraints contract;
  final String Function(T value) contractValue;
  final bool isExpanded;
  final bool isAddAffordance;
  final bool allowEmptySelection;
  final bool showOptionalLabel;
  final String? emptyValueText;
  final VoidCallback onTap;
  final InlineSaveCallback onSaved;
  final VoidCallback onCancel;
  final UpdateUserProfilePatch Function(T? value) patchForValue;

  @override
  ConsumerState<ProfileInlineSingleChoiceEntryEditor<T>> createState() =>
      _ProfileInlineSingleChoiceEntryEditorState<T>();
}

class _ProfileInlineSingleChoiceEntryEditorState<T extends Labelled>
    extends ConsumerState<ProfileInlineSingleChoiceEntryEditor<T>>
    with InlineSaveState<ProfileInlineSingleChoiceEntryEditor<T>> {
  late T? _selected = widget.currentValue;
  CatchFieldStatus _status = CatchFieldStatus.idle;
  Timer? _savedStatusTimer;

  @override
  void didUpdateWidget(
    covariant ProfileInlineSingleChoiceEntryEditor<T> oldWidget,
  ) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fieldName != widget.fieldName ||
        oldWidget.currentValue != widget.currentValue) {
      _selected = widget.currentValue;
    }
  }

  @override
  void dispose() {
    _savedStatusTimer?.cancel();
    super.dispose();
  }

  void _cancel() {
    _savedStatusTimer?.cancel();
    setState(() {
      _selected = widget.currentValue;
      _status = CatchFieldStatus.idle;
    });
    widget.onCancel();
  }

  Future<void> _submit() async {
    if (isSaving) return;
    if (_selected == widget.currentValue) {
      _cancel();
      return;
    }
    final saved = await saveFields(widget.patchForValue(_selected));
    if (saved && mounted) {
      _showSaved();
      widget.onSaved();
    }
  }

  void _showSaved() {
    _savedStatusTimer?.cancel();
    setState(() => _status = CatchFieldStatus.saved);
    _savedStatusTimer = Timer(CatchFieldTokens.savedStatusHold, () {
      if (mounted) setState(() => _status = CatchFieldStatus.idle);
    });
  }

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField<T>.choices(
        copy: catchFieldCopy(context.l10n),
        icon: widget.icon,
        title: widget.label,
        contract: widget.contract,
        contractValueBuilder: widget.contractValue,
        emptyValueText: widget.emptyValueText,
        addable: widget.isAddAffordance,
        labelMode: widget.showOptionalLabel
            ? CatchFieldLabelTextMode.optional
            : CatchFieldLabelTextMode.visible,
        tone: widget.isAddAffordance || _selected == null
            ? CatchFieldTone.primary
            : CatchFieldTone.normal,
        disclosureMode: widget.isExpanded
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        onOpenChanged: (expanded) {
          if (isSaving || expanded == widget.isExpanded) return;
          widget.onTap();
        },

        status: isSaving ? CatchFieldStatus.saving : _status,
        error: _errorMessage(),
        values: widget.values,
        itemLabelBuilder: (value) => value.label,
        selected: {?_selected},
        allowEmptySelection: widget.allowEmptySelection,
        onSelectionChanged: (selection) {
          _savedStatusTimer?.cancel();
          setState(() {
            _selected = selection.isEmpty ? null : selection.first;
            _status = CatchFieldStatus.idle;
          });
        },
        onCancel: _cancel,
        onSubmit: _submit,
      ),
    );
  }

  String? _errorMessage() {
    final error = saveError;
    if (error == null) return null;
    return appErrorMessage(
      error,
      l10n: context.l10n,
      context: AppErrorContext.profile,
    );
  }
}

// ── Multi-choice editor ───────────────────────────────────────────────────────

class ProfileInlineMultiChoiceEntryEditor<T extends Labelled>
    extends ConsumerStatefulWidget {
  const ProfileInlineMultiChoiceEntryEditor({
    super.key,
    required this.icon,
    required this.label,
    required this.values,
    required this.currentValues,
    required this.fieldName,
    required this.contract,
    required this.contractValue,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    required this.patchForValues,
    this.patchForLatestProfile,
    this.isAddAffordance = false,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
    this.emptyValueText,
  });

  final IconData icon;
  final String label;
  final List<T> values;
  final List<T> currentValues;
  final String fieldName;
  final CatchContractFieldConstraints contract;
  final String Function(T value) contractValue;
  final bool isExpanded;
  final bool isAddAffordance;
  final bool allowEmptySelection;
  final bool showOptionalLabel;
  final String? emptyValueText;
  final VoidCallback onTap;
  final InlineSaveCallback onSaved;
  final VoidCallback onCancel;
  final UpdateUserProfilePatch Function(List<T> values) patchForValues;
  final UpdateUserProfilePatch Function(UserProfile user, List<T> values)?
  patchForLatestProfile;

  @override
  ConsumerState<ProfileInlineMultiChoiceEntryEditor<T>> createState() =>
      _ProfileInlineMultiChoiceEntryEditorState<T>();
}

class _ProfileInlineMultiChoiceEntryEditorState<T extends Labelled>
    extends ConsumerState<ProfileInlineMultiChoiceEntryEditor<T>>
    with InlineSaveState<ProfileInlineMultiChoiceEntryEditor<T>> {
  late Set<T> _selected = widget.currentValues.toSet();
  CatchFieldStatus _status = CatchFieldStatus.idle;
  Timer? _savedStatusTimer;

  @override
  void didUpdateWidget(
    covariant ProfileInlineMultiChoiceEntryEditor<T> oldWidget,
  ) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fieldName != widget.fieldName ||
        !setEquals(
          oldWidget.currentValues.toSet(),
          widget.currentValues.toSet(),
        )) {
      _selected = widget.currentValues.toSet();
    }
  }

  @override
  void dispose() {
    _savedStatusTimer?.cancel();
    super.dispose();
  }

  void _cancel() {
    _savedStatusTimer?.cancel();
    setState(() {
      _selected = widget.currentValues.toSet();
      _status = CatchFieldStatus.idle;
    });
    widget.onCancel();
  }

  Future<void> _submit() async {
    if (isSaving) return;
    if (_selected.length == widget.currentValues.length &&
        _selected.containsAll(widget.currentValues)) {
      _cancel();
      return;
    }
    final selectedValues = _selected.toList(growable: false);
    final patchForLatestProfile = widget.patchForLatestProfile;
    final saved = patchForLatestProfile == null
        ? await saveFields(widget.patchForValues(selectedValues))
        : await saveFieldsFromLatest(
            (latest) => patchForLatestProfile(latest, selectedValues),
          );
    if (saved && mounted) {
      _showSaved();
      widget.onSaved();
    }
  }

  void _showSaved() {
    _savedStatusTimer?.cancel();
    setState(() => _status = CatchFieldStatus.saved);
    _savedStatusTimer = Timer(CatchFieldTokens.savedStatusHold, () {
      if (mounted) setState(() => _status = CatchFieldStatus.idle);
    });
  }

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField<T>.choices(
        copy: catchFieldCopy(context.l10n),
        icon: widget.icon,
        title: widget.label,
        contract: widget.contract,
        contractValueBuilder: widget.contractValue,
        emptyValueText: widget.emptyValueText,
        addable: widget.isAddAffordance,
        labelMode: widget.showOptionalLabel
            ? CatchFieldLabelTextMode.optional
            : CatchFieldLabelTextMode.visible,
        tone: widget.isAddAffordance || _selected.isEmpty
            ? CatchFieldTone.primary
            : CatchFieldTone.normal,
        disclosureMode: widget.isExpanded
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        onOpenChanged: (expanded) {
          if (isSaving || expanded == widget.isExpanded) return;
          widget.onTap();
        },

        status: isSaving ? CatchFieldStatus.saving : _status,
        error: _errorMessage(),
        values: widget.values,
        itemLabelBuilder: (value) => value.label,
        selected: _selected,
        mode: CatchChipMode.multiple,
        allowEmptySelection: widget.allowEmptySelection,
        onSelectionChanged: (selection) {
          _savedStatusTimer?.cancel();
          setState(() {
            _selected = selection;
            _status = CatchFieldStatus.idle;
          });
        },
        onCancel: _cancel,
        onSubmit: _submit,
      ),
    );
  }

  String? _errorMessage() {
    final error = saveError;
    if (error == null) return null;
    return appErrorMessage(
      error,
      l10n: context.l10n,
      context: AppErrorContext.profile,
    );
  }
}
