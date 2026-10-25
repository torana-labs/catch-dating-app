import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// One mutually exclusive choice with optional explanatory copy.
///
/// The whole tile is one checked target, including its subtitle. The owning
/// ChoiceInput supplies group selection; a null action disables this item.
class CatchChoiceTile extends StatefulWidget {
  const CatchChoiceTile({
    super.key,
    required this.title,
    this.contract,
    this.contractValue,
    this.contractExemption,
    this.subtitle,
    this.selected = false,
    this.onTap,
  });

  final String title;
  final CatchContractFieldConstraints? contract;
  final String? contractValue;
  final String? contractExemption;
  final String? subtitle;
  final bool selected;
  final VoidCallback? onTap;

  @override
  State<CatchChoiceTile> createState() => _CatchChoiceTileState();
}

class _CatchChoiceTileState extends State<CatchChoiceTile> {
  bool _focused = false;

  @override
  void didUpdateWidget(CatchChoiceTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.onTap == null) _focused = false;
  }

  @override
  Widget build(BuildContext context) {
    final allowedContractValues = widget.contract?.enumValues;
    assert(
      widget.contract == null ||
          widget.contractValue == null ||
          allowedContractValues == null ||
          allowedContractValues.contains(widget.contractValue),
      'CatchChoiceTile value must be allowed by its contract.',
    );
    final t = CatchTokens.of(context);

    final surface = CatchSurface(
      onTap: widget.onTap,
      onFocusChange: (focused) {
        if (_focused != focused) setState(() => _focused = focused);
      },
      tone: CatchSurfaceTone.transparent,
      backgroundColor: widget.selected
          ? Color.alphaBlend(
              t.ink.withValues(alpha: CatchOpacity.controlOverlayHover),
              t.surface,
            )
          : t.surface,
      borderSpec: _focused
          ? CatchBorder.resolve(t, CatchBorderRole.focus)
          : widget.selected
          ? CatchBorder.resolve(t, CatchBorderRole.selected)
          : CatchBorder.interactive(t, CatchInteractiveBorderState.resting),
      radius: CatchRadius.md,
      padding: CatchInsets.tileContentCompact,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: CatchStroke.hairline),
            child: Icon(
              widget.selected ? CatchIcons.checkCircle : CatchIcons.circle,
              size: CatchIcon.lg,
              color: widget.selected ? t.ink : t.ink3,
            ),
          ),
          const SizedBox(width: CatchSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: CatchTextStyles.titleS(
                    context,
                    color: CatchTokens.of(context).ink,
                  ),
                ),
                if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                  const SizedBox(height: CatchSpacing.micro3),
                  Text(
                    widget.subtitle!,
                    style: CatchTextStyles.supporting(context),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
    return Semantics(
      container: true,
      excludeSemantics: true,
      button: true,
      checked: widget.selected,
      inMutuallyExclusiveGroup: true,
      enabled: widget.onTap != null,
      label: [
        widget.title,
        if (widget.subtitle?.isNotEmpty == true) widget.subtitle!,
      ].join('\n'),
      onTap: widget.onTap,
      child: surface,
    );
  }
}
