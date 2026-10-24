import 'dart:async';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/domain/swipe.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_style.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

typedef ProfileReactionCallback =
    FutureOr<void> Function(ProfileReactionTarget target, String? comment);

enum ProfileReactionActionVariant { surface, overlay }

class ProfileReactionAction extends StatelessWidget {
  const ProfileReactionAction({
    super.key,
    required this.target,
    required this.onReact,
    this.style = ProfileReactionActionVariant.surface,
    this.axis = Axis.horizontal,
    this.enabled = true,
    this.isPending = false,
  });

  final ProfileReactionTarget target;
  final ProfileReactionCallback onReact;
  final ProfileReactionActionVariant style;
  final Axis axis;
  final bool enabled;
  final bool isPending;

  @override
  Widget build(BuildContext context) {
    final actionsEnabled = enabled && !isPending;
    final children = [
      ProfileReactionButton(
        tooltip: context.l10n.swipesProfileReactionControlsTooltipLikeLabel(
          label: target.label,
        ),
        icon: CatchIcons.favoriteBorderRounded,
        onPressed: actionsEnabled
            ? () => unawaited(Future.sync(() => onReact(target, null)))
            : null,
        style: style,
        isPending: isPending,
      ),
      ProfileReactionButton(
        tooltip: context.l10n
            .swipesProfileReactionControlsTooltipCommentOnLabel(
              label: target.label,
            ),
        icon: CatchIcons.chatBubbleOutlineRounded,
        onPressed: actionsEnabled
            ? () => unawaited(_commentThenReact(context))
            : null,
        style: style,
        isPending: isPending,
      ),
    ];

    return axis == Axis.horizontal
        ? Row(mainAxisSize: MainAxisSize.min, children: _withSpacing(children))
        : Column(
            mainAxisSize: MainAxisSize.min,
            children: _withSpacing(children),
          );
  }

  List<Widget> _withSpacing(List<Widget> children) {
    if (children.length < 2) return children;
    final gap = axis == Axis.horizontal ? gapW8 : gapH8;
    return [children.first, gap, ...children.skip(1)];
  }

  Future<void> _commentThenReact(BuildContext context) async {
    final comment = await showProfileReactionCommentSheet(
      context: context,
      target: target,
    );
    if (comment == null) return;
    await onReact(target, comment);
  }
}

Future<String?> showProfileReactionCommentSheet({
  required BuildContext context,
  required ProfileReactionTarget target,
}) {
  return showCatchBottomSheet<String>(
    context: context,
    builder: (_) => ProfileReactionCommentSheet(target: target),
  );
}

class ProfileReactionCommentSheet extends StatefulWidget {
  const ProfileReactionCommentSheet({
    super.key,
    required this.target,
    this.initialComment,
  });

  final ProfileReactionTarget target;
  final String? initialComment;

  @override
  State<ProfileReactionCommentSheet> createState() =>
      _ProfileReactionCommentSheetState();
}

class _ProfileReactionCommentSheetState
    extends State<ProfileReactionCommentSheet> {
  late final TextEditingController _controller;

  String get _comment => _controller.text.trim();
  bool get _canSend => _comment.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialComment)
      ..addListener(_handleChanged);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_handleChanged)
      ..dispose();
    super.dispose();
  }

  void _handleChanged() => setState(() {});

  void _submit() {
    if (!_canSend) return;
    Navigator.of(context).pop(_comment);
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSheet(
      title: context.l10n.swipesProfileReactionControlsTitleStartWithLabel(
        label: widget.target.label,
      ),
      subtitle:
          context.l10n.swipesProfileReactionControlsSubtitleSendACommentWith,
      keyboardSafe: true,
      footer: Row(
        children: [
          CatchButton.text(
            label: context.l10n.swipesProfileReactionControlsLabelCancel,
            tone: CatchButtonTone.neutral,
            onPressed: () => Navigator.of(context).pop(),
          ),
          const Spacer(),
          CatchButton(
            label: context.l10n.swipesProfileReactionControlsLabelSendLike,
            leading: Icon(CatchIcons.favoriteBorderRounded, size: CatchIcon.md),
            onPressed: _canSend ? _submit : null,
            size: CatchButtonSize.sm,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSurface(
            radius: CatchRadius.md,
            backgroundColor: t.raised,
            borderRole: CatchBorderRole.separator,
            padding: CatchInsets.contentDense,
            child: CatchText(
              widget.target.preview,
              variant: CatchTextVariant.bodyLead,
              color: t.ink2,
              maxLines: 3,
            ),
          ),
          gapH14,
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.swipesProfileReactionControlsTitleComment,
            contract: CatchContractConstraints
                .createProfileDecisionClientWriteDataComment,
            labelMode: CatchFieldLabelTextMode.hidden,
            controller: _controller,
            placeholder: context
                .l10n
                .swipesProfileReactionControlsPlaceholderWriteSomethingSpecific,
            helperText: context.l10n
                .swipesProfileReactionControlsHelpertextLengthMaxswipereactioncommentlengthCharacters(
                  length: _comment.length,
                  maxSwipeReactionCommentLength: maxSwipeReactionCommentLength,
                ),
            maxLines: 4,
            minLines: 3,
            autofocus: true,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.newline,
            inputFormatters: [
              LengthLimitingTextInputFormatter(maxSwipeReactionCommentLength),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileReactionButton extends StatelessWidget {
  const ProfileReactionButton({
    super.key,
    required this.tooltip,
    required this.icon,
    required this.onPressed,
    required this.style,
    this.isPending = false,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback? onPressed;
  final ProfileReactionActionVariant style;
  final bool isPending;

  @override
  Widget build(BuildContext context) {
    final palette = ProfileCardPalette.of(context);
    final isOverlay = style == ProfileReactionActionVariant.overlay;
    final background = isOverlay
        ? CatchTokens.editorialWhite.withValues(
            alpha: CatchOpacity.reactionOverlayFill,
          )
        : palette.chipFill;
    final foreground = isOverlay ? palette.accent : palette.textSecondary;
    final border = isOverlay
        ? CatchTokens.editorialWhite.withValues(
            alpha: CatchOpacity.reactionOverlayBorder,
          )
        : palette.chipBorder;
    final isEnabled = onPressed != null && !isPending;

    return Semantics(
      label: tooltip,
      button: true,
      enabled: isEnabled,
      child: Tooltip(
        message: tooltip,
        child: AnimatedOpacity(
          opacity: isEnabled || isPending ? 1 : CatchOpacity.disabledControl,
          duration: const Duration(milliseconds: 120),
          child: CatchIconAction(
            onPressed: isEnabled ? onPressed : null,
            backgroundColor: background,
            borderColor: border,
            child: isPending
                ? SizedBox.square(
                    dimension: CatchLayout.reactionControlIconSize,
                    child: CircularProgressIndicator(
                      strokeWidth: CatchStroke.progressIndicator,
                      valueColor: AlwaysStoppedAnimation<Color>(foreground),
                    ),
                  )
                : Icon(
                    icon,
                    color: foreground,
                    size: CatchLayout.reactionControlIconSize,
                  ),
          ),
        ),
      ),
    );
  }
}
