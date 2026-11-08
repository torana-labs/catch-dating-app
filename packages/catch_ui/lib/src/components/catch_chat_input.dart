import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_input.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system ChatComposer: the message field at the foot of a chat.
///
/// A pill field on the tile with the send button after it, which stays
/// disabled until there is text; [onSend] gets the trimmed text and the
/// field clears. A null [onSend] disables sending. [leading] goes before the
/// field (add a photo). [controller] keeps the draft with the caller; without
/// one the composer owns it. A [closedNote] replaces the field in a chat that
/// no longer takes messages. [placeholder] and [sendLabel] are
/// caller-localized.
class CatchChatInput extends StatefulWidget {
  const CatchChatInput({
    super.key,
    required this.placeholder,
    required this.sendLabel,
    this.onSend,
    this.controller,
    this.leading,
    this.closedNote,
  });

  final String placeholder;

  /// The send button tooltip and screen reader label: "Send".
  final String sendLabel;
  final ValueChanged<String>? onSend;
  final TextEditingController? controller;
  final Widget? leading;

  /// The chat is closed: "This chat closed when the event ended."
  final String? closedNote;

  @override
  State<CatchChatInput> createState() => _CatchChatInputState();
}

class _CatchChatInputState extends State<CatchChatInput> {
  TextEditingController? _owned;

  TextEditingController get _controller =>
      widget.controller ?? (_owned ??= TextEditingController());

  @override
  void dispose() {
    _owned?.dispose();
    super.dispose();
  }

  void _send() {
    final onSend = widget.onSend;
    final text = _controller.text.trim();
    if (onSend == null || text.isEmpty) return;
    onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final gutter = switch (CatchRootScope.sizeClassOf(context)) {
      CatchWindowSize.compact => GeneratedCatchLayoutTokens.gutterCompact,
      CatchWindowSize.medium => GeneratedCatchLayoutTokens.gutterMedium,
      CatchWindowSize.expanded => GeneratedCatchLayoutTokens.gutterExpanded,
    };
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    final closedNote = widget.closedNote;
    final leading = widget.leading;
    final Widget content = closedNote != null
        ? Padding(
            padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s2),
            child: Row(
              spacing: CatchSpacing.s2,
              children: [
                Icon(CatchIcons.info, size: CatchIconSize.sm, color: t.ink2),
                Expanded(
                  child: CatchText(
                    closedNote,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                ),
              ],
            ),
          )
        : ValueListenableBuilder<TextEditingValue>(
            valueListenable: _controller,
            builder: (context, value, _) {
              final canSend =
                  widget.onSend != null && value.text.trim().isNotEmpty;
              const pill = OutlineInputBorder(
                borderRadius: BorderRadius.all(
                  Radius.circular(CatchRadius.pill),
                ),
                borderSide: BorderSide.none,
              );
              return Row(
                spacing: CatchSpacing.s2,
                children: [
                  ?leading,
                  Expanded(
                    child: CatchTextInput(
                      controller: _controller,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: widget.placeholder,
                        isDense: true,
                        filled: true,
                        fillColor: t.tile,
                        constraints: const BoxConstraints(
                          minHeight: GeneratedCatchSizeTokens.controlMd,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: CatchSpacing.s4,
                          vertical: CatchSpacing.micro10,
                        ),
                        border: pill,
                        enabledBorder: pill,
                        focusedBorder: pill.copyWith(
                          borderSide: BorderSide(
                            color: t.focus,
                            width: CatchStroke.focus,
                          ),
                        ),
                      ),
                    ),
                  ),
                  CatchIconAction(
                    variant: CatchIconActionVariant.plain,
                    backgroundColor: t.primary,
                    size: GeneratedCatchSizeTokens.controlMd,
                    status: canSend
                        ? CatchIconActionStatus.enabled
                        : CatchIconActionStatus.disabled,
                    onPressed: canSend ? _send : null,
                    tooltip: widget.sendLabel,
                    child: Icon(
                      CatchIcons.send,
                      size: CatchIconSize.md,
                      color: t.primaryInk,
                    ),
                  ),
                ],
              );
            },
          );
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.ground,
        border: Border(top: BorderSide(color: t.line)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          gutter,
          CatchSpacing.s2,
          gutter,
          safeBottom + CatchSpacing.s2,
        ),
        child: content,
      ),
    );
  }
}
