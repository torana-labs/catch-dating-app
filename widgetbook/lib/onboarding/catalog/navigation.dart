import 'package:catch_dating_app/onboarding/presentation/onboarding_flow_state.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/phone_preview.dart';

@widgetbook.UseCase(
  name: 'Top bar',
  type: OnboardingTopBar,
  path: '[P1 product surfaces]/Onboarding',
)
Widget onboardingTopBarState(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingTopBar',
    children: [
      WidgetbookPhoneStateCard(
        label: 'profile completion photos',
        child: OnboardingTopBar(
          state: OnboardingTopBarState.from(
            l10n: context.l10n,
            step: OnboardingStep.photos,
            entryMode: OnboardingEntryMode.profileCompletion,
            canGoBack: false,
          ),
          onBack: null,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step layout states',
  type: OnboardingStepLayout,
  path: '[P1 product surfaces]/Onboarding',
)
Widget onboardingStepLayoutStates(BuildContext context) {
  return const WidgetbookWrapCatalogFrame(
    title: 'OnboardingStepLayout',
    children: [
      WidgetbookPhoneStateCard(
        label: 'body only',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingStepLayout(
            children: [
              Text('Tell us enough to make your first plan feel natural.'),
              SizedBox(height: CatchSpacing.s4),
              Text('Use the shared onboarding body rhythm and max width.'),
            ],
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'sticky footer',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingStepLayout(
            footer: Row(
              children: [
                Expanded(child: Text('2 / 3 prompts answered')),
                SizedBox(width: CatchSpacing.s3),
                CatchButton(label: 'Continue', onPressed: null),
              ],
            ),
            children: [
              Text('Complete the visible fields before continuing.'),
              SizedBox(height: CatchSpacing.s4),
              Text('The bottom dock stays outside the scroll owner.'),
            ],
          ),
        ),
      ),
    ],
  );
}
