import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchWelcomeText,
  path: '[Product materials]/Onboarding',
)
Widget catchWelcomeTextContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  const width = WidgetbookPreviewLayout.onboardingWelcomeFocusWidth;
  return WidgetbookContractFrame(
    title: 'CatchWelcomeText',
    contractId: 'catch.welcome_text',
    states: const ['brand', 'focus', 'reel', 'focused-reel', 'large-text'],
    children: [
      WidgetbookContractStateCard(
        label: 'brand',
        child: CatchWelcomeText.focus(
          brandLabel: 'Catch',
          catchColor: t.ink,
          maxWidth: width,
          showBrandUnderscore: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focus',
        child: CatchWelcomeText.focus(
          brandLabel: 'Catch',
          catchColor: t.ink,
          phrase: 'the sunset 5K',
          phraseColor: t.primary,
          underlineColor: t.primary,
          maxWidth: width,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'reel',
        child: CatchWelcomeText.reel(
          phrase: 'the long table',
          phraseColor: t.ink2,
          periodColor: t.ink2.withValues(alpha: 0),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused-reel',
        child: CatchWelcomeText.reel(
          phrase: 'the sunset 5K',
          phraseColor: t.primary,
          periodColor: t.primary,
          underlineColor: t.primary,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'large-text',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: CatchWelcomeText.focus(
            brandLabel: 'Catch',
            catchColor: t.ink,
            phrase: 'a long localized welcome phrase',
            phraseColor: t.primary,
            underlineColor: t.primary,
            maxWidth: width,
          ),
        ),
      ),
    ],
  );
}
