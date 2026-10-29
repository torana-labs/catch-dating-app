import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/inline_editor_save.dart';
import 'package:catch_tokens/catch_tokens.dart' show CatchFieldTokens;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileInlineHeightEditor extends ConsumerStatefulWidget {
  const ProfileInlineHeightEditor({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.currentValue,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    required this.patchForValue,
    this.contract = CatchContractConstraints.updateUserProfilePatchHeight,
    this.savePatch,
    this.isAddAffordance = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final int? currentValue;
  final bool isExpanded;
  final VoidCallback onTap;
  final InlineSaveCallback onSaved;
  final VoidCallback onCancel;
  final UpdateUserProfilePatch Function(int? value) patchForValue;
  final CatchContractFieldConstraints contract;
  final Future<bool> Function(UpdateUserProfilePatch patch)? savePatch;
  final bool isAddAffordance;

  @override
  ConsumerState<ProfileInlineHeightEditor> createState() =>
      _ProfileInlineHeightEditorState();
}

class _ProfileInlineHeightEditorState
    extends ConsumerState<ProfileInlineHeightEditor>
    with InlineSaveState<ProfileInlineHeightEditor> {
  late int? _heightCm = widget.currentValue;
  int? _committedHeight;
  bool _hasCommittedHeight = false;

  int? get _savedHeight =>
      _hasCommittedHeight ? _committedHeight : widget.currentValue;
  CatchFieldStatus _status = CatchFieldStatus.idle;
  Timer? _savedStatusTimer;

  @override
  void didUpdateWidget(covariant ProfileInlineHeightEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentValue != widget.currentValue) {
      _hasCommittedHeight = false;
      _heightCm = widget.currentValue;
    }
  }

  @override
  void dispose() {
    _savedStatusTimer?.cancel();
    super.dispose();
  }

  void _cancel() {
    _savedStatusTimer?.cancel();
    clearSaveError();
    setState(() {
      _heightCm = _savedHeight;
      _status = CatchFieldStatus.idle;
    });
    widget.onCancel();
  }

  Future<void> _submit() async {
    if (isSaving) return;
    if (_heightCm == _savedHeight) {
      _cancel();
      return;
    }
    final submittedHeight = _heightCm;
    final patch = widget.patchForValue(submittedHeight);
    final savePatch = widget.savePatch;
    final saved = savePatch == null
        ? await saveFields(patch)
        : await saveWith(() async {
            if (!await savePatch(patch)) {
              throw StateError('Profile field save was not accepted.');
            }
          });
    if (saved && mounted) {
      _committedHeight = submittedHeight;
      _hasCommittedHeight = true;
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
    final copy = catchFieldCopy(context.l10n);
    final displayedHeight = widget.isExpanded ? _heightCm : _savedHeight;
    final addable = displayedHeight == null;
    final body = displayedHeight == null
        ? null
        : context.l10n.userProfileInlineEditorHeightBodyHeightcmCm(
            heightCm: displayedHeight,
          );
    return CatchFieldLanes.single(
      child: CatchField.stepper(
        copy: _heightCm == null && _savedHeight != null
            ? copy.copyWith(doneLabel: copy.clearLabel)
            : copy,
        icon: widget.icon,
        title: widget.label,
        contract: widget.contract,
        body: body,
        addable: addable,
        labelMode: CatchFieldLabelTextMode.optional,
        tone: addable ? CatchFieldTone.primary : CatchFieldTone.normal,
        disclosureMode: widget.isExpanded
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        onOpenChanged: (expanded) {
          if (isSaving || expanded == widget.isExpanded) return;
          widget.onTap();
        },

        status: isSaving ? CatchFieldStatus.saving : _status,
        error: _errorMessage(),
        value: _heightCm ?? normalizeHeightCm(null),
        onClear: _heightCm == null
            ? null
            : () {
                _savedStatusTimer?.cancel();
                clearSaveError();
                setState(() {
                  _heightCm = null;
                  _status = CatchFieldStatus.idle;
                });
              },
        min: minimumHeightCm,
        max: maximumHeightCm,
        valueLabelBuilder: (value) => _heightCm == null
            ? '—'
            : context.l10n.userProfileInlineEditorHeightBodyHeightcmCm(
                heightCm: value.toInt(),
              ),
        decreaseSemanticLabel:
            context.l10n.userProfileInlineEditorHeightTooltipDecreaseHeight,
        increaseSemanticLabel:
            context.l10n.userProfileInlineEditorHeightTooltipIncreaseHeight,
        onChanged: (value) {
          _savedStatusTimer?.cancel();
          clearSaveError();
          setState(() {
            _heightCm = value.toInt();
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
