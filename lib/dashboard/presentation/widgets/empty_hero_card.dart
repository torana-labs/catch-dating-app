import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EmptyHeroCard extends StatelessWidget {
  const EmptyHeroCard({super.key, this.fullBleed = false, this.onFindEvent});

  final bool fullBleed;
  final VoidCallback? onFindEvent;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final content = EmptyHeroBody(
      onFindEvent: onFindEvent ?? () => context.go(Routes.exploreScreen.path),
      showWelcomeEyebrow: fullBleed,
    );

    if (fullBleed) {
      return CatchSurface(
        width: double.infinity,
        height: CatchLayout.dashboardEmptyHeroHeight,
        radius: 0,
        gradient: t.heroGrad,
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            const Positioned.fill(child: CustomPaint(painter: _HeroLineWash())),
            Padding(
              padding: CatchInsets.pageBody.copyWith(
                top: CatchSpacing.s12,
                bottom: CatchSpacing.s5,
              ),
              child: content,
            ),
          ],
        ),
      );
    }

    return CatchSurface(
      padding: CatchInsets.contentRelaxed,
      radius: CatchRadius.heroCard,
      gradient: t.heroGrad,
      clipBehavior: Clip.antiAlias,
      child: content,
    );
  }
}

class EmptyHeroBody extends StatelessWidget {
  const EmptyHeroBody({
    super.key,
    required this.onFindEvent,
    this.showWelcomeEyebrow = false,
  });

  final VoidCallback onFindEvent;
  final bool showWelcomeEyebrow;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showWelcomeEyebrow) ...[
          Text(
            context.l10n.dashboardEmptyHeroCardTextWelcomeToCatch,
            style: CatchTextStyles.kicker(
              context,
              color: CatchTokens.editorialWhite,
            ),
          ),
          gapH28,
        ],
        Text(
          context.l10n.dashboardEmptyHeroCardTextNoEventsBooked,
          style: CatchTextStyles.kicker(
            context,
            color: CatchTokens.editorialWhite,
          ),
        ),
        gapH10,
        CatchText(
          context.l10n.dashboardEmptyHeroCardTextYourCatchesUnlockAfter,
          variant: CatchTextVariant.headline,
          color: CatchTokens.editorialWhite,
        ),
        gapH8,
        CatchText(
          context.l10n.dashboardEmptyHeroCardTextTheDatingAppWhere,
          variant: CatchTextVariant.supporting,
          color: CatchTokens.editorialWhite,
        ),
        gapH16,
        Semantics(
          hint:
              context.l10n.dashboardEmptyHeroCardVisiblecopyOpensTheExplorePage,
          child: CatchButton(
            label: context.l10n.dashboardEmptyHeroCardLabelFindAnEventNear,
            onPressed: onFindEvent,
            variant: CatchButtonVariant.light,
            size: CatchButtonSize.lg,
            fullWidth: true,
          ),
        ),
      ],
    );
  }
}

class _HeroLineWash extends CustomPainter {
  const _HeroLineWash();

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = CatchTokens.editorialWhite.withValues(
        alpha: CatchOpacity.editorialGridLine,
      )
      ..strokeWidth = CatchStroke.hairline;
    for (var x = -size.height; x < size.width + size.height; x += 22) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        linePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _HeroLineWash oldDelegate) => false;
}
