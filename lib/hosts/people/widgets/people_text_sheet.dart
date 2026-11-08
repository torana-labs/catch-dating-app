import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A sheet that asks for one piece of text (a note or a tag) and pops it,
/// trimmed, when the host saves; null when they close it.
class HostPeopleTextSheet extends StatefulWidget {
  const HostPeopleTextSheet({
    super.key,
    required this.title,
    required this.fieldTitle,
    required this.saveLabel,
    this.placeholder,
    this.maxLength,
    this.lines = 1,
  });

  final String title;
  final String fieldTitle;
  final String saveLabel;
  final String? placeholder;
  final int? maxLength;

  /// The field grows to this many lines; one is a single-line field.
  final int lines;

  @override
  State<HostPeopleTextSheet> createState() => _HostPeopleTextSheetState();
}

class _HostPeopleTextSheetState extends State<HostPeopleTextSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save() {
    final value = _controller.text.trim();
    if (value.isEmpty) return;
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: widget.title,
      footer: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) => CatchButton.sheet(
          label: widget.saveLabel,
          role: CatchButtonEmphasis.commit,
          onPressed: _controller.text.trim().isEmpty ? null : _save,
        ),
      ),
      child: CatchFieldLanes.single(
        child: CatchField.input(
          copy: catchFieldCopy(l10n),
          title: widget.fieldTitle,
          contractExemption: 'Free text the host types for a People record.',
          controller: _controller,
          placeholder: widget.placeholder,
          autofocus: true,
          maxLength: widget.maxLength,
          minLines: widget.lines,
          maxLines: widget.lines,
          textCapitalization: TextCapitalization.sentences,
          onSubmitted: widget.lines == 1 ? (_) => _save() : null,
        ),
      ),
    );
  }
}
