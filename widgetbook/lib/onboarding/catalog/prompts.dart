import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_profile_prompts_step.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/phone_preview.dart';
import 'scope.dart';

final _profileNoPrompts = ProfileSurfaceFixtures.viewer.copyWith(
  profileComplete: false,
  profilePrompts: const [],
);

final _profilePartialPrompts = ProfileSurfaceFixtures.viewer.copyWith(
  profileComplete: false,
  profilePrompts: _promptAnswers(
    'A low-pressure loop that ends with a table everyone can hear.',
  ),
);

final _profileCompletePrompts = ProfileSurfaceFixtures.viewer.copyWith(
  profileComplete: false,
  profilePrompts: _promptAnswers(
    'A golden-hour 5K, filter coffee, and no rushed exits.',
    'Saturday starts outside, detours through a bookshop, and ends with chaat.',
    'Tell me your favourite route and I will remember the coffee stop.',
  ),
);

final _profileLongPrompts = ProfileSurfaceFixtures.viewer.copyWith(
  profileComplete: false,
  profilePrompts: _promptAnswers(
    'A small group run where everyone knows the route, nobody sprints the '
        'first kilometer, and the table afterward has enough time for real '
        'conversation.',
    'I am happiest when Saturday starts outside, detours through a bookshop, '
        'and ends with friends arguing over where the best chaat actually is.',
    'The green flag is someone who can make an ordinary weekday plan feel '
        'specific, calm, and worth showing up for.',
  ),
);

List<ProfilePromptAnswer> _promptAnswers(
  String first, [
  String? second,
  String? third,
]) {
  final answers = <String>[first, ?second, ?third];
  return [
    for (final entry in answers.indexed)
      profilePromptAnswerFor(
        definition: profilePromptDefinition(defaultProfilePromptIds[entry.$1]),
        answer: entry.$2,
      ),
  ];
}

@widgetbook.UseCase(
  name: 'Prompt form',
  type: OnboardingProfilePromptsBody,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget profilePromptsPageStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingProfilePromptsBody',
    children: [
      WidgetbookPhoneStateCard(
        label: 'empty prompts',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: _profileNoPrompts,
            child: OnboardingProfilePromptsBody(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'partial prompts',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: _profilePartialPrompts,
            child: OnboardingProfilePromptsBody(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'complete prompts',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: _profileCompletePrompts,
            child: OnboardingProfilePromptsBody(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'long answers',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: _profileLongPrompts,
            child: OnboardingProfilePromptsBody(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'profile completion copy',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: _profileCompletePrompts,
            child: OnboardingProfilePromptsBody(profileCompletionOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'complete pending',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.completePending,
            profile: _profileCompletePrompts,
            child: OnboardingProfilePromptsBody(profileCompletionOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'complete error',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.completeError,
            profile: _profileCompletePrompts,
            child: OnboardingProfilePromptsBody(profileCompletionOnly: true),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Prompt field states',
  type: PromptField,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget promptFieldStates(BuildContext context) {
  final answeredController = TextEditingController(
    text: 'A walk where phones disappear and the coffee after runs long.',
  );
  final emptyController = TextEditingController();
  final promptIds = defaultProfilePromptIds.take(3).toList(growable: false);

  return WidgetbookWrapCatalogFrame(
    title: 'PromptField',
    children: [
      WidgetbookPhoneStateCard(
        label: 'answered',
        child: PromptField(
          index: 0,
          definition: profilePromptDefinition(promptIds[0]),
          controller: answeredController,
          availablePromptIds: promptIds,
          selectedPromptId: promptIds[0],
          onPromptChanged: (_) {},
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'empty',
        child: PromptField(
          index: 1,
          definition: profilePromptDefinition(promptIds[1]),
          controller: emptyController,
          availablePromptIds: promptIds,
          selectedPromptId: promptIds[1],
          onPromptChanged: (_) {},
        ),
      ),
    ],
  );
}
