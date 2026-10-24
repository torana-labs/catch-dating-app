import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/phone_preview.dart';

@widgetbook.UseCase(
  name: 'Welcome scene states',
  type: WelcomeSceneLayout,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomeSceneStates(BuildContext context) {
  return const WidgetbookWrapCatalogFrame(
    title: 'WelcomeSceneLayout',
    children: [
      WidgetbookPhoneStateCard(
        label: 'spinning',
        child: WidgetbookMaterialPhoneFrame(
          child: WelcomeSceneLayout(
            viewportWidth: 320,
            viewportHeight: 760,
            mediaPadding: EdgeInsets.only(
              top: WidgetbookPreviewLayout.onboardingWelcomeMediaTop,
              bottom: WidgetbookPreviewLayout.onboardingWelcomeMediaBottom,
            ),
            spinValue: 0.42,
            landingValue: 0,
            landed: false,
            onContinue: widgetbookNoop,
            onExplore: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'landed',
        child: WidgetbookMaterialPhoneFrame(
          child: WelcomeSceneLayout(
            viewportWidth: 320,
            viewportHeight: 760,
            mediaPadding: EdgeInsets.only(
              top: WidgetbookPreviewLayout.onboardingWelcomeMediaTop,
              bottom: WidgetbookPreviewLayout.onboardingWelcomeMediaBottom,
            ),
            spinValue: 1,
            landingValue: 1,
            landed: true,
            onContinue: widgetbookNoop,
            onExplore: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Welcome focus lockup states',
  type: WelcomeFocusText,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomeFocusLockupStates(BuildContext context) {
  final socialRun =
      ActivityPalette.pigments[ActivityKind.socialRun] ??
      ActivityPalette.pigments[ActivityKind.openActivity]!;
  const maxWidth = WidgetbookPreviewLayout.onboardingWelcomeFocusWidth;

  return WidgetbookWrapCatalogFrame(
    title: 'WelcomeFocusText',
    children: [
      WidgetbookPhoneStateCard(
        label: 'static Catch_ handoff',
        child: ColoredBox(
          color: CatchTokens.light.bg,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s4),
            child: WelcomeFocusText(
              catchColor: CatchTokens.light.ink,
              maxWidth: maxWidth,
              showBrandUnderscore: true,
            ),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'fixed the sunset 5K focus',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s4),
            child: WelcomeFocusText(
              phrase: 'the sunset 5K',
              catchColor: CatchTokens.editorialDark.ink,
              maxWidth: maxWidth,
              phraseColor: socialRun,
              underlineColor: socialRun,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Welcome reel band states',
  type: WelcomeReelList,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomeReelBandStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'WelcomeReelList',
    children: [
      WidgetbookPhoneStateCard(
        label: 'spinning band',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: const SizedBox(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: WelcomeReelList(
              viewportWidth: 320,
              spinValue: 0.5,
              landingValue: 0,
              landed: false,
            ),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'landed focus',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: const SizedBox(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: WelcomeReelList(
              viewportWidth: 320,
              spinValue: 1,
              landingValue: 1,
              landed: true,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Welcome reel row states',
  type: WelcomeReelRow,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomeReelRowStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'WelcomeReelRow',
    children: [
      WidgetbookPhoneStateCard(
        label: 'activity phrase',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: const SizedBox(
            height: WidgetbookPreviewLayout.onboardingReelRowPreviewHeight,
            child: WelcomeReelRow(
              viewportWidth: 320,
              phrase: WelcomePhrase('the long table', ActivityKind.dinner),
              phraseIndex: 2,
              rowIndex: 2,
              trackOffset: 0,
              landingValue: 0,
              landed: false,
            ),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'landing phrase',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: const SizedBox(
            height: WidgetbookPreviewLayout.onboardingReelRowPreviewHeight,
            child: WelcomeReelRow(
              viewportWidth: 320,
              phrase: WelcomePhrase('the sunset 5K', ActivityKind.socialRun),
              phraseIndex: welcomeLandingIndex,
              rowIndex: 2,
              trackOffset: 0,
              landingValue: 1,
              landed: true,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Welcome reveal states',
  type: WelcomeRevealTransition,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomeRevealEntranceStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'WelcomeRevealTransition',
    children: [
      WidgetbookPhoneStateCard(
        label: 'settling',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s6),
            child: WelcomeRevealTransition(
              landingValue: 0.62,
              order: 0,
              child: Text(
                'Show up to something you would do anyway.',
                style: CatchTextStyles.bodyM(
                  context,
                  color: CatchTokens.editorialWhite,
                ),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'visible',
        child: ColoredBox(
          color: CatchTokens.editorialDark.bg,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s6),
            child: WelcomeRevealTransition(
              landingValue: 1,
              order: 1,
              child: Text(
                'Continue with phone',
                style: CatchTextStyles.labelL(
                  context,
                  color: CatchTokens.editorialWhite,
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}
