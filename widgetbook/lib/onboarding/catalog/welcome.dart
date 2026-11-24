import 'package:catch_dating_app/pages/start/onboarding_welcome_body.dart';
import 'package:catch_dating_app/pages/start/start_welcome_route_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/phone_preview.dart';

@widgetbook.UseCase(
  name: 'Splash states',
  type: OnboardingWelcomeBody,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget welcomePageStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingWelcomeBody',
    children: const [
      WidgetbookPhoneStateCard(
        label: 'animated reel',
        child: WidgetbookMaterialPhoneFrame(child: OnboardingWelcomeBody()),
      ),
      WidgetbookPhoneStateCard(
        label: 'landed',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingWelcomeBody(playIntro: false),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'reduced motion',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookPhoneMediaOverride(
            disableAnimations: true,
            child: OnboardingWelcomeBody(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'text scale 2',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookPhoneMediaOverride(
            textScale: 2,
            child: OnboardingWelcomeBody(playIntro: false),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route surface',
  type: StartWelcomeRouteScreen,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget startWelcomeRouteScreen(BuildContext context) {
  return const WidgetbookMaterialPhoneFrame(
    child: StartWelcomeRouteScreen(playIntro: false),
  );
}
