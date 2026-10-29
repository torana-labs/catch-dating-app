import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Optional public notes shared by creation, editing and private event setup.
class EventGuestDetailsSection extends StatefulWidget {
  const EventGuestDetailsSection({
    super.key,
    this.accessibilityController,
    this.includedController,
    this.accessibility,
    this.included,
    this.enabled = true,
    this.onSave,
  });

  final TextEditingController? accessibilityController;
  final TextEditingController? includedController;
  final String? accessibility;
  final String? included;
  final bool enabled;
  final void Function(String accessibility, String included)? onSave;

  @override
  State<EventGuestDetailsSection> createState() =>
      _EventGuestDetailsSectionState();
}

class _EventGuestDetailsSectionState extends State<EventGuestDetailsSection> {
  final _formKey = GlobalKey<FormState>();
  late final _accessibility =
      widget.accessibilityController ??
      TextEditingController(text: widget.accessibility ?? '');
  late final _included =
      widget.includedController ??
      TextEditingController(text: widget.included ?? '');

  @override
  void initState() {
    super.initState();
    if (widget.onSave != null) {
      _accessibility.addListener(_changed);
      _included.addListener(_changed);
    }
  }

  @override
  void didUpdateWidget(covariant EventGuestDetailsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Other private setup saves also advance the revision. Keep unsaved notes
    // through those refreshes, and adopt the normalized value after our save.
    if (widget.accessibilityController == null) {
      _refreshSavedText(
        _accessibility,
        oldWidget.accessibility,
        widget.accessibility,
      );
    }
    if (widget.includedController == null) {
      _refreshSavedText(_included, oldWidget.included, widget.included);
    }
  }

  void _refreshSavedText(
    TextEditingController controller,
    String? previous,
    String? next,
  ) {
    if (previous == next) return;
    if (controller.text == (previous ?? '') ||
        controller.text.trim() == (next ?? '').trim()) {
      controller.text = next ?? '';
    }
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _accessibility.removeListener(_changed);
    _included.removeListener(_changed);
    if (widget.accessibilityController == null) _accessibility.dispose();
    if (widget.includedController == null) _included.dispose();
    super.dispose();
  }

  bool get _dirty =>
      _accessibility.text != (widget.accessibility ?? '') ||
      _included.text != (widget.included ?? '');

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final section = CatchSection.fieldRows(
      title: l10n.hostsEventGuestDetailsTitle,
      children: [
        CatchField.input(
          copy: copy,
          key: CreateEventFormKeys.included,
          title: l10n.hostsEventIncludedTitle,
          helperText: l10n.hostsEventGuestDetailsVisibility,
          inputHint: l10n.hostsEventIncludedHint,
          contract: CatchContractConstraints
              .createEventCallablePayloadEventFormatActivityDetailsPublicDetailsIncluded,
          labelMode: CatchFieldLabelTextMode.optional,
          controller: _included,
          inputMode: widget.enabled
              ? CatchTextInputMode.editable
              : CatchTextInputMode.inactive,
          maxLines: 4,
          textCapitalization: TextCapitalization.sentences,
          textInputAction: TextInputAction.newline,
        ),
        CatchField.input(
          copy: copy,
          key: CreateEventFormKeys.accessibility,
          title: l10n.hostsEventAccessibilityTitle,
          inputHint: l10n.hostsEventAccessibilityHint,
          contract: CatchContractConstraints
              .createEventCallablePayloadEventFormatActivityDetailsPublicDetailsAccessibility,
          labelMode: CatchFieldLabelTextMode.optional,
          controller: _accessibility,
          inputMode: widget.enabled
              ? CatchTextInputMode.editable
              : CatchTextInputMode.inactive,
          maxLines: 4,
          textCapitalization: TextCapitalization.sentences,
          textInputAction: TextInputAction.newline,
        ),
        if (widget.onSave != null)
          CatchField.action(
            copy: copy,
            title: l10n.hostsEventGuestDetailsSave,
            onTap: widget.enabled && _dirty
                ? () {
                    if (_formKey.currentState!.validate()) {
                      widget.onSave!(_accessibility.text, _included.text);
                    }
                  }
                : null,
          ),
      ],
    );
    return widget.onSave == null
        ? section
        : Form(key: _formKey, child: section);
  }
}
