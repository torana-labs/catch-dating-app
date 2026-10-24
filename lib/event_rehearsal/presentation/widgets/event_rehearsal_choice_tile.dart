import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A destination with its explanation attached, rather than a field value
/// squeezed into a trailing lane. All copy wraps at its natural height.
class EventRehearsalChoiceTile extends StatelessWidget {
  const EventRehearsalChoiceTile({
    super.key,
    required this.title,
    required this.description,
    required this.onTap,
    this.expanded,
    this.icon,
  });

  final String title;
  final String description;
  final VoidCallback? onTap;
  final bool? expanded;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Semantics(
    expanded: expanded,
    child: CatchSurface(
      tone: CatchSurfaceTone.transparent,
      onTap: onTap,
      child: Padding(
        padding: CatchInsets.tileVertical,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (icon != null) ...[
              CatchIconTile(
                icon: icon!,
                iconColor: CatchTokens.of(context).ink,
                size: CatchSpacing.s10,
                iconSize: CatchIcon.sm,
              ),
              gapW16,
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchText(title, variant: CatchTextVariant.sectionTitle),
                  gapH8,
                  CatchText(description, variant: CatchTextVariant.supporting),
                ],
              ),
            ),
            gapW16,
            ExcludeSemantics(
              child: Icon(
                expanded == null
                    ? CatchIcons.arrowForwardRounded
                    : expanded!
                    ? CatchIcons.expandLessRounded
                    : CatchIcons.expandMoreRounded,
                size: CatchIcon.md,
                color: CatchTokens.of(context).ink2,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
