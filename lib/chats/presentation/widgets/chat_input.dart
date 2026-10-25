import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Canonical chat composer.
///
/// The component owns draft-derived sendability, focus chrome, action geometry,
/// multiline motion, and independent text/image pending states. Call sites
/// provide capabilities and mutations; they cannot accidentally enable an
/// empty send or disable the editor while an attachment is uploading.
class ChatInput extends StatefulWidget {
  const ChatInput({
    super.key,
    required this.controller,
    required this.sending,
    required this.onSend,
    this.onSendImage,
    this.sendingImage = false,
    this.disabledReason,
    this.showImageButton = true,
    this.autofocus = false,
    this.contract =
        CatchContractConstraints.createChatMessageClientWriteDataText,
  });

  static const Key pillKey = ValueKey('chat_input_bar.floating_pill');
  static const Key fieldLaneKey = ValueKey('chat_input_bar.field_lane');
  static const Key imageButtonKey = ValueKey('chat_input_bar.image_button');
  static const Key sendButtonKey = ValueKey('chat_input_bar.send_button');

  final TextEditingController controller;
  final bool sending;
  final VoidCallback? onSend;
  final VoidCallback? onSendImage;
  final bool sendingImage;
  final String? disabledReason;
  final bool showImageButton;
  final bool autofocus;
  final CatchContractFieldConstraints contract;

  @override
  State<ChatInput> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInput> {
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode(debugLabel: 'ChatInput.message')
      ..addListener(_handleFocusChanged);
  }

  @override
  void dispose() {
    _focusNode
      ..removeListener(_handleFocusChanged)
      ..dispose();
    super.dispose();
  }

  void _handleFocusChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: widget.controller,
      builder: (context, value, _) {
        final contract = widget.contract;
        final controller = widget.controller;
        final focusNode = _focusNode;
        final sending = widget.sending;
        final sendingImage = widget.sendingImage;
        final disabledReason = widget.disabledReason;
        final showImageButton = widget.showImageButton;
        final autofocus = widget.autofocus;
        final onSend = widget.onSend;
        final onSendImage = widget.onSendImage;
        final t = CatchTokens.of(context);
        final hardDisabled = disabledReason != null || onSend == null;
        final hasMessage = value.text.trim().isNotEmpty;
        final imageActionEnabled =
            !hardDisabled && !sendingImage && onSendImage != null;
        final sendActionEnabled = !hardDisabled && !sending && hasMessage;

        return TextFieldTapRegion(
          child: SafeArea(
            top: false,
            child: Padding(
              padding: CatchInsets.chatComposerDock,
              child: AnimatedSize(
                duration: CatchMotion.fast,
                curve: CatchMotion.standardCurve,
                alignment: Alignment.bottomCenter,
                child: CatchSurface(
                  tone: CatchSurfaceTone.transparent,
                  radius: CatchRadius.pill,
                  boxShadow: CatchElevation.raised,
                  padding: EdgeInsets.zero,
                  child: CatchControlSurface(
                    status: !hardDisabled && focusNode.hasFocus
                        ? CatchControlSurfaceStatus.focused
                        : CatchControlSurfaceStatus.resting,

                    key: ChatInput.pillKey,
                    size: CatchControlSurfaceSize.floating,
                    variant: CatchControlSurfaceVariant.pill,
                    enabled: !hardDisabled,

                    // CatchControlSurface reserves the emphasis-stroke footprint.
                    // Subtract that reserve so the visible outer inset stays s2.
                    padding: const EdgeInsets.all(
                      CatchLayout.chatInputInnerPadding,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (showImageButton)
                          CatchIconAction(
                            key: ChatInput.imageButtonKey,
                            backgroundColor: t.surface,
                            borderColor: t.line2,
                            status: (!sendingImage && !imageActionEnabled)
                                ? CatchIconActionStatus.disabled
                                : CatchIconActionStatus.enabled,
                            onPressed: imageActionEnabled ? onSendImage : null,
                            tooltip: sendingImage
                                ? context
                                      .l10n
                                      .chatsChatInputBarLabelUploadingImage
                                : context
                                      .l10n
                                      .chatsChatInputBarMessageSendAnImage,
                            liveRegion: sendingImage,
                            child: sendingImage
                                ? SizedBox.square(
                                    dimension: CatchIconSize.control,
                                    child: CatchLoadingIndicator(color: t.ink2),
                                  )
                                : Icon(
                                    CatchIcons.photo,
                                    size: CatchIconSize.md,
                                    color: t.ink2,
                                  ),
                          ),
                        if (showImageButton) gapW8,
                        Expanded(
                          child: CatchFieldLanes.single(
                            child: CatchField.input(
                              key: ChatInput.fieldLaneKey,
                              copy: catchFieldCopy(context.l10n),
                              title: context.l10n.chatsChatInputBarTitleMessage,
                              contract: contract,
                              labelMode: CatchFieldLabelTextMode.hidden,
                              controller: controller,
                              focusNode: focusNode,
                              // Sending keeps the native editor focused.
                              onEditingComplete: () {},
                              textCapitalization: TextCapitalization.sentences,
                              textInputAction: TextInputAction.send,
                              minLines: 1,
                              maxLines: 4,
                              inputHint:
                                  disabledReason ??
                                  context
                                      .l10n
                                      .chatsChatInputBarPlaceholderMessage,
                              size: CatchFieldSize.floating,
                              variant: CatchFieldVariant.bare,
                              states: <WidgetState>{
                                if (hardDisabled) WidgetState.disabled,
                              },
                              autofocus: autofocus,
                              onSubmitted: (_) {
                                if (sendActionEnabled) onSend();
                              },
                            ),
                          ),
                        ),
                        gapW8,
                        CatchIconAction(
                          key: ChatInput.sendButtonKey,
                          variant: CatchIconActionVariant.plain,
                          backgroundColor: t.ink,
                          status: (!sending && !sendActionEnabled)
                              ? CatchIconActionStatus.disabled
                              : CatchIconActionStatus.enabled,
                          onPressed: sendActionEnabled ? onSend : null,
                          tooltip: sending
                              ? context
                                    .l10n
                                    .chatsChatInputBarLabelSendingMessage
                              : context
                                    .l10n
                                    .chatsChatInputBarMessageSendMessage,
                          liveRegion: sending,
                          child: sending
                              ? SizedBox.square(
                                  dimension: CatchIconSize.control,
                                  child: CatchLoadingIndicator(
                                    color: t.primaryInk,
                                  ),
                                )
                              : Icon(
                                  CatchIcons.send,
                                  size: CatchIconSize.md,
                                  color: t.primaryInk,
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
