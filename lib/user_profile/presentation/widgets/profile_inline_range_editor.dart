import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/user_profile/presentation/widgets/inline_editor_save.dart';
import 'package:catch_tokens/catch_tokens.dart' show CatchFieldTokens;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileInlineRangeEditor extends ConsumerStatefulWidget {
  const ProfileInlineRangeEditor({
    super.key,
    required this.icon,
    required this.title,
    required this.value,
    required this.currentMin,
    required this.currentMax,
    required this.isExpanded,
    required this.onTap,
    required this.sliderMin,
    required this.sliderMax,
    required this.divisions,
    required this.labelText,
    required this.onSaved,
    required this.onCancel,
    required this.patchForRange,
    required this.minimumContract,
    required this.maximumContract,
    this.patchForLatestProfile,
    this.saveEndValue,
    this.savedCurrentMax,
  });

  final IconData icon;
  final String title;
  final String value;
  final int currentMin;
  final int currentMax;
  final bool isExpanded;
  final VoidCallback onTap;
  final double sliderMin;
  final double sliderMax;
  final int divisions;
  final String Function(double) labelText;
  final int Function(int)? saveEndValue;
  final int? savedCurrentMax;
  final InlineSaveCallback onSaved;
  final VoidCallback onCancel;
  final UpdateUserProfilePatch Function(int min, int max) patchForRange;
  final CatchContractFieldConstraints minimumContract;
  final CatchContractFieldConstraints maximumContract;
  final UpdateUserProfilePatch Function(UserProfile user, int min, int max)?
  patchForLatestProfile;

  @override
  ConsumerState<ProfileInlineRangeEditor> createState() =>
      _ProfileInlineRangeEditorState();
}

class _ProfileInlineRangeEditorState
    extends ConsumerState<ProfileInlineRangeEditor>
    with InlineSaveState<ProfileInlineRangeEditor> {
  late RangeValues _range = RangeValues(
    widget.currentMin.toDouble(),
    widget.currentMax.toDouble(),
  );
  CatchFieldStatus _status = CatchFieldStatus.idle;
  Timer? _savedStatusTimer;

  @override
  void didUpdateWidget(covariant ProfileInlineRangeEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentMin != widget.currentMin ||
        oldWidget.currentMax != widget.currentMax) {
      _range = RangeValues(
        widget.currentMin.toDouble(),
        widget.currentMax.toDouble(),
      );
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
      _range = RangeValues(
        widget.currentMin.toDouble(),
        widget.currentMax.toDouble(),
      );
      _status = CatchFieldStatus.idle;
    });
    widget.onCancel();
  }

  Future<void> _submit() async {
    if (isSaving) return;
    final newMin = _range.start.round();
    final newMax =
        widget.saveEndValue?.call(_range.end.round()) ?? _range.end.round();
    if (newMin == widget.currentMin &&
        newMax == (widget.savedCurrentMax ?? widget.currentMax)) {
      _cancel();
      return;
    }
    final patchForLatestProfile = widget.patchForLatestProfile;
    final saved = patchForLatestProfile == null
        ? await saveFields(widget.patchForRange(newMin, newMax))
        : await saveFieldsFromLatest(
            (latest) => patchForLatestProfile(latest, newMin, newMax),
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
    final body = widget.isExpanded
        ? context.l10n.userProfileInlineEditorRangeBodyLabeltextLabeltext2(
            labelText: widget.labelText(_range.start),
            labelText2: widget.labelText(_range.end),
          )
        : widget.value;
    // Composite exception: a bounded two-handle slider commits one range.
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: catchFieldCopy(context.l10n),
        icon: widget.icon,
        title: widget.title,
        contract: widget.minimumContract,
        body: body,
        disclosureMode: widget.isExpanded
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        onOpenChanged: (expanded) {
          if (isSaving || expanded == widget.isExpanded) return;
          widget.onTap();
        },

        status: isSaving ? CatchFieldStatus.saving : _status,
        error: _errorMessage(),

        onCancel: _cancel,
        onSubmit: _submit,
        child: CatchRangeInput(
          minimumContract: widget.minimumContract,
          maximumContract: widget.maximumContract,
          min: widget.sliderMin,
          max: widget.sliderMax,
          divisions: widget.divisions,
          values: _range,
          onChanged: isSaving
              ? null
              : (values) {
                  _savedStatusTimer?.cancel();
                  setState(() {
                    _range = values;
                    _status = CatchFieldStatus.idle;
                  });
                },
        ),
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
