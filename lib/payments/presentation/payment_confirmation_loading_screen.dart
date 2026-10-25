import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class PaymentConfirmationLoadingScreen extends StatelessWidget {
  const PaymentConfirmationLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchScaffold.standalone(
      backgroundColor: t.bg,
      body: CatchPageBody.screen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: CatchSkeleton.circle(size: CatchIcon.forceUpdate)),
            gapH24,
            Center(
              child: CatchSkeleton.text(
                width: CatchLayout.skeletonTextTitleWidth,
              ),
            ),
            gapH12,
            CatchSkeleton.textBlock(lines: 2),
            gapH24,
            CatchSurface(
              padding: CatchInsets.content,
              borderRole: CatchBorderRole.separator,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
                  gapH8,
                  CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
                  gapH16,
                  CatchSkeleton.card(
                    height: CatchLayout.skeletonCardCompactHeight,
                  ),
                ],
              ),
            ),
            gapH20,
            Row(
              children: [
                for (var index = 0; index < 3; index++) ...[
                  Expanded(
                    child: CatchSkeleton.card(
                      height: CatchLayout.skeletonCardCompactHeight,
                    ),
                  ),
                  if (index < 2) gapW8,
                ],
              ],
            ),
            gapH20,
            CatchSkeleton.card(height: CatchButtonTokens.largeHeight),
          ],
        ),
      ),
    );
  }
}
