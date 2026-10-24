import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

class CatchErrorDetailsAccordion extends StatefulWidget {
  const CatchErrorDetailsAccordion({
    super.key,
    required this.details,
    required this.label,
    this.initiallyExpanded = false,
  });

  final String details;
  final String label;
  final bool initiallyExpanded;

  @override
  State<CatchErrorDetailsAccordion> createState() =>
      _CatchErrorDetailsAccordionState();
}

class _CatchErrorDetailsAccordionState
    extends State<CatchErrorDetailsAccordion> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
  }

  @override
  void didUpdateWidget(CatchErrorDetailsAccordion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initiallyExpanded != oldWidget.initiallyExpanded) {
      _expanded = widget.initiallyExpanded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens =
        Theme.of(context).extension<CatchTokens>() ??
        CatchTokens.editorialLight;

    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations == true;
    final duration = reduceMotion ? Duration.zero : CatchMotion.fast;

    final details = _expanded
        ? Container(
            width: double.infinity,
            padding: const EdgeInsets.all(CatchSpacing.s3),
            decoration: BoxDecoration(
              color: tokens.raised,
              borderRadius: BorderRadius.circular(CatchRadius.md),
              border: Border.all(color: tokens.line),
            ),
            child: Text(
              widget.details,
              style: CatchTextStyles.debugDetails(context, color: tokens.ink2),
            ),
          )
        : const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: _expanded,
          child: CatchSurface(
            tone: CatchSurfaceTone.transparent,
            radius: 0,
            padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s2),
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.label,
                    style: CatchTextStyles.statusLabel(
                      context,
                      color: tokens.danger,
                    ),
                  ),
                ),
                gapW12,
                AnimatedRotation(
                  turns: _expanded ? 0.25 : 0,
                  duration: duration,
                  curve: CatchMotion.standardCurve,
                  child: Icon(
                    CatchIcons.chevronRightRounded,
                    color: tokens.danger,
                    size: CatchIcon.sm,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (reduceMotion)
          details
        else
          AnimatedSize(
            duration: duration,
            curve: CatchMotion.standardCurve,
            alignment: Alignment.topCenter,
            child: details,
          ),
      ],
    );
  }
}
