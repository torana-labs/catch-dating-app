import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/onboarding/catalog/identity.dart';
import 'package:widgetbook_workspace/onboarding/catalog/photos.dart';
import 'package:widgetbook_workspace/onboarding/catalog/preferences.dart';
import 'package:widgetbook_workspace/onboarding/catalog/prompts.dart';
import 'package:widgetbook_workspace/onboarding/catalog/scope.dart';

void main() {
  for (final (name, builder) in <(String, WidgetBuilder)>[
    ('identity', nameDobPageStates),
    ('gender', genderInterestPageStates),
    ('instagram', instagramPageStates),
    ('photos', photosPageStates),
    ('prompts', profilePromptsPageStates),
    ('preferences', runningPrefsPageStates),
  ]) {
    testWidgets(
      '$name preview mounts every state without provider build writes',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(1000, 1400);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            ProviderScope(
              key: UniqueKey(),
              child: MaterialApp(
                theme: theme,
                home: MediaQuery(
                  data: const MediaQueryData(disableAnimations: true),
                  child: TickerMode(
                    enabled: false,
                    child: Scaffold(body: Builder(builder: builder)),
                  ),
                ),
              ),
            ),
          );
          for (var frame = 0; frame < 5; frame++) {
            await tester.pump(const Duration(milliseconds: 16));
          }
          expect(tester.takeException(), isNull);
          expect(find.byType(WidgetbookOnboardingScope), findsWidgets);
        }
      },
    );
  }

  testWidgets('onboarding specimens have independent prepared initial states', (
    tester,
  ) async {
    final firstReads = <WidgetbookOnboardingMode, OnboardingData>{};
    final containers = <WidgetbookOnboardingMode, ProviderContainer>{};
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Column(
            children: [
              for (final mode in WidgetbookOnboardingMode.values)
                WidgetbookOnboardingScope(
                  mode: mode,
                  child: Consumer(
                    builder: (context, ref, _) {
                      final state = ref.watch(onboardingControllerProvider);
                      firstReads.putIfAbsent(mode, () => state);
                      containers[mode] = ProviderScope.containerOf(context);
                      ref.watch(OnboardingController.saveProfileMutation);
                      ref.watch(OnboardingController.completeMutation);
                      return const SizedBox.shrink();
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(
      containers.values.toSet(),
      hasLength(WidgetbookOnboardingMode.values.length),
    );
    expect(firstReads[WidgetbookOnboardingMode.idle], const OnboardingData());
    final identity = firstReads[WidgetbookOnboardingMode.nameDobPrefilled]!;
    expect(identity.firstName, 'Neha');
    expect(identity.step, OnboardingStep.nameDob);
    expect(
      firstReads[WidgetbookOnboardingMode.instagramFilled]!.instagramHandle,
      'neharuns',
    );
    expect(
      firstReads[WidgetbookOnboardingMode.instagramSkipped]!.instagramHandle,
      isNull,
    );
    for (final entry in containers.entries) {
      final save = entry.value.read(OnboardingController.saveProfileMutation);
      final complete = entry.value.read(OnboardingController.completeMutation);
      expect(
        save.isPending,
        entry.key == WidgetbookOnboardingMode.saveProfilePending,
      );
      expect(
        save.hasError,
        entry.key == WidgetbookOnboardingMode.saveProfileError,
      );
      expect(
        complete.isPending,
        entry.key == WidgetbookOnboardingMode.completePending,
      );
      expect(
        complete.hasError,
        entry.key == WidgetbookOnboardingMode.completeError,
      );
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'changing a preview mode replaces pending state before mounting',
    (tester) async {
      ProviderContainer? previous;
      final mode = ValueNotifier(WidgetbookOnboardingMode.completePending);
      addTearDown(mode.dispose);
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ValueListenableBuilder(
              valueListenable: mode,
              builder: (context, value, _) => WidgetbookOnboardingScope(
                mode: value,
                child: Consumer(
                  builder: (context, ref, _) {
                    previous = ProviderScope.containerOf(context);
                    final completion = ref.watch(
                      OnboardingController.completeMutation,
                    );
                    final state = ref.watch(onboardingControllerProvider);
                    return Text('${state.firstName}:${completion.isPending}');
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text(':true'), findsOneWidget);
      final pendingContainer = previous;
      mode.value = WidgetbookOnboardingMode.nameDobPrefilled;
      await tester.pump();
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Neha:false'), findsOneWidget);
      expect(previous, isNot(same(pendingContainer)));
      mode.value = WidgetbookOnboardingMode.idle;
      await tester.pump();
      await tester.pump();
      expect(find.text(':false'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
