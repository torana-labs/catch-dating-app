import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/pages/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/pages/onboarding/onboarding_step.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import 'onboarding_test_helpers.dart';

void main() {
  testWidgets('welcome and form steps keep the canonical step-flow surface', (
    tester,
  ) async {
    final container = createOnboardingTestContainer();
    addTearDown(container.dispose);

    await pumpOnboardingScreen(
      tester,
      container: container,
      child: const OnboardingScreen(),
    );
    expect(find.byType(CatchScaffold), findsOneWidget);

    container
        .read(onboardingControllerProvider.notifier)
        .goToStep(OnboardingStep.nameDob);
    await pumpOnboardingUi(tester);

    expect(find.byType(CatchScaffold), findsOneWidget);
    expect(find.text("What's your name?"), findsOneWidget);
  });
}
