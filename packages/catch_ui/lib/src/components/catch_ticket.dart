import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_ticket_divider.dart';
import 'package:catch_ui/src/components/catch_ticket_shape_clipper.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

typedef CatchTicketSectionBuilder =
    Widget Function(BuildContext context, bool compact);

enum _CatchTicketRecipe { hero, card }

/// Ticket material: media over a perforation over a body.
///
/// The hero recipe fills a bounded, collapsing surface; its builders receive a
/// compact state and callers retain content and outer paint. The card recipe
/// is width-driven: it owns the notched outline, elevation, tap surface,
/// activity-card media ratio and body inset, and its builders always receive
/// `compact == false`.
class CatchTicket extends StatelessWidget {
  const CatchTicket.hero({
    super.key,
    required this.mediaBuilder,
    this.lineColor,
    required this.bodyBuilder,
  }) : onTap = null,
       _recipe = _CatchTicketRecipe.hero;

  const CatchTicket.card({
    super.key,
    required this.mediaBuilder,
    required this.bodyBuilder,
    this.lineColor,
    this.onTap,
  }) : _recipe = _CatchTicketRecipe.card;

  final CatchTicketSectionBuilder mediaBuilder;
  final Color? lineColor;
  final CatchTicketSectionBuilder bodyBuilder;
  final VoidCallback? onTap;
  final _CatchTicketRecipe _recipe;

  @override
  Widget build(BuildContext context) {
    if (_recipe == _CatchTicketRecipe.card) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final t = CatchTokens.of(context);
          final mediaHeight = constraints.hasBoundedWidth
              ? constraints.maxWidth / CatchAspectRatio.activityCard
              : CatchLayout.ticketHeroVisualMinHeight;
          return PhysicalShape(
            clipper: CatchTicketShapeClipper(
              cornerRadius: CatchRadius.lg,
              notchRadius: CatchLayout.ticketNotchRadius,
              notchDepth: CatchLayout.ticketNotchDepth,
              notchCenterY: CatchLayout.ticketNotchCenterY(mediaHeight),
            ),
            clipBehavior: Clip.antiAlias,
            color: t.surface,
            elevation: CatchElevation.physicalTicket,
            child: CatchLegacySurface(
              onTap: onTap,
              padding: EdgeInsets.zero,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AspectRatio(
                    aspectRatio: CatchAspectRatio.activityCard,
                    child: mediaBuilder(context, false),
                  ),
                  CatchTicketDivider(lineColor: lineColor),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      CatchSpacing.s4,
                      CatchSpacing.s3,
                      CatchSpacing.s4,
                      CatchSpacing.s4,
                    ),
                    child: bodyBuilder(context, false),
                  ),
                ],
              ),
            ),
          );
        },
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact =
            constraints.maxHeight <
            CatchLayout.ticketHeroCompactHeightThreshold;
        final visualHeight =
            (constraints.maxHeight *
                    (compact
                        ? CatchLayout.ticketHeroVisualCompactRatio
                        : CatchLayout.ticketHeroVisualExpandedRatio))
                .clamp(
                  CatchLayout.ticketHeroVisualMinHeight,
                  CatchLayout.ticketHeroVisualMaxHeight,
                )
                .toDouble();
        final bodyPadding = compact
            ? const EdgeInsets.fromLTRB(
                CatchSpacing.s4,
                CatchSpacing.s2,
                CatchSpacing.s4,
                CatchSpacing.s3,
              )
            : CatchInsets.pageBody.copyWith(
                top: CatchSpacing.s4,
                bottom: CatchSpacing.s5,
              );
        final bodyWidth = constraints.maxWidth > bodyPadding.horizontal
            ? constraints.maxWidth - bodyPadding.horizontal
            : 0.0;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: visualHeight,
              child: mediaBuilder(context, compact),
            ),
            CatchTicketDivider(lineColor: lineColor),
            Expanded(
              child: Padding(
                padding: bodyPadding,
                child: FittedBox(
                  alignment: Alignment.centerLeft,
                  fit: BoxFit.scaleDown,
                  child: SizedBox(
                    width: bodyWidth,
                    child: bodyBuilder(context, compact),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
