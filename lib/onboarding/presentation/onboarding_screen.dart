import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_flow_state.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_gender_interest_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_instagram_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_photos_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_profile_prompts_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_running_prefs_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({
    super.key,
    this.profileCompletionOnly = false,
    this.runPreferencesOnly = false,
    this.eventRequirements,
  });

  final bool profileCompletionOnly;
  final bool runPreferencesOnly;
  final List<String>? eventRequirements;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(
        ref
            .read(onboardingControllerProvider.notifier)
            .initStep(
              profileCompletionOnly: widget.profileCompletionOnly,
              runPreferencesOnly: widget.runPreferencesOnly,
              eventRequirements: widget.eventRequirements,
            ),
      );
    });
  }

  @override
  void didUpdateWidget(covariant OnboardingScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profileCompletionOnly == widget.profileCompletionOnly &&
        oldWidget.runPreferencesOnly == widget.runPreferencesOnly &&
        listEquals(oldWidget.eventRequirements, widget.eventRequirements)) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(
        ref
            .read(onboardingControllerProvider.notifier)
            .initStep(
              profileCompletionOnly: widget.profileCompletionOnly,
              runPreferencesOnly: widget.runPreferencesOnly,
              eventRequirements: widget.eventRequirements,
            ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(onboardingControllerProvider);
    final flowState = OnboardingFlowState.from(
      l10n: context.l10n,
      data: data,
      profileCompletionOnly: widget.profileCompletionOnly,
      runPreferencesOnly: widget.runPreferencesOnly,
      eventRequirements: widget.eventRequirements,
    );
    final currentStep = KeyedSubtree(
      key: ValueKey(flowState.step),
      child: OnboardingStepBody(
        step: flowState.step,
        profileCompletionOnly: widget.profileCompletionOnly,
        runPreferencesOnly: widget.runPreferencesOnly,
        eventRequirements: widget.eventRequirements,
      ),
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (_, _) {
        if (flowState.operationPending) return;
        final previousStep = flowState.previousStep;
        if (previousStep != null) {
          ref
              .read(onboardingControllerProvider.notifier)
              .goToStep(previousStep);
        }
      },
      child: CatchScaffold.stepFlow(
        safeArea: flowState.showsWelcome
            ? CatchScaffoldPlacement.none
            : CatchScaffoldPlacement.all,
        body: flowState.showsWelcome
            ? currentStep
            : Column(
                children: [
                  if (flowState.topBar case final topBarState?) ...[
                    OnboardingTopBar(
                      state: topBarState,
                      onBack:
                          flowState.operationPending ||
                              flowState.previousStep == null
                          ? null
                          : () => ref
                                .read(onboardingControllerProvider.notifier)
                                .goToStep(flowState.previousStep!),
                    ),
                    gapH8,
                  ],
                  Expanded(child: currentStep),
                ],
              ),
      ),
    );
  }
}

class OnboardingStepBody extends StatelessWidget {
  const OnboardingStepBody({
    super.key,
    required this.step,
    required this.profileCompletionOnly,
    required this.runPreferencesOnly,
    this.eventRequirements,
  });

  final OnboardingStep step;
  final bool profileCompletionOnly;
  final bool runPreferencesOnly;
  final List<String>? eventRequirements;

  @override
  Widget build(BuildContext context) {
    return switch (step) {
      OnboardingStep.welcome => const OnboardingWelcomeBody(),
      OnboardingStep.nameDob => OnboardingNameDobBody(
        profileCompletionOnly: profileCompletionOnly,
        eventRequirements: eventRequirements,
      ),
      OnboardingStep.genderInterest => OnboardingGenderInterestBody(
        eventRequirements: eventRequirements,
      ),
      OnboardingStep.instagram => const OnboardingInstagramBody(),
      OnboardingStep.photos => OnboardingPhotosBody(
        profileCompletionOnly: profileCompletionOnly,
      ),
      OnboardingStep.prompts => OnboardingProfilePromptsBody(
        profileCompletionOnly: profileCompletionOnly,
      ),
      OnboardingStep.runningPrefs => OnboardingRunningPrefsBody(
        profileCompletionOnly: profileCompletionOnly,
        runPreferencesOnly: runPreferencesOnly,
      ),
    };
  }
}

class OnboardingTopBar extends StatelessWidget {
  const OnboardingTopBar({
    super.key,
    required this.state,
    required this.onBack,
  });

  final OnboardingTopBarState state;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return CatchStepHeader(
      stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
      compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(context.l10n),
      title: state.title,
      subtitle: state.subtitle,
      step: state.stepNumber,
      total: state.stepTotal,
      onBack: state.canGoBack ? onBack : null,
    );
  }
}
