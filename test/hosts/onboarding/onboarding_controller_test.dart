import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'onboarding_fixtures.dart';

ProviderContainer _container() {
  final container = ProviderContainer(
    overrides: [
      appClockProvider.overrideWithValue(AppClock.custom(() => onboardingNow)),
    ],
  );
  addTearDown(container.dispose);
  // Keep the auto-dispose controller alive between reads.
  container.listen(hostSetupControllerProvider, (_, _) {});
  return container;
}

void main() {
  test('starts on Start your page with an empty draft', () {
    final container = _container();
    final state = container.read(hostSetupControllerProvider);

    expect(state.step, HostSetupStep.start);
    expect(state.draft.isEmpty, isTrue);
    expect(state.startComplete, isFalse);
    expect(state.stepNumber, 1);
  });

  test('Next waits for the name, the city and the neighbourhood', () {
    final container = _container();
    final setup = container.read(hostSetupControllerProvider.notifier);

    setup
      ..setName('Lantern Lane Social')
      ..next();
    expect(
      container.read(hostSetupControllerProvider).step,
      HostSetupStep.start,
    );

    setup
      ..setCity('in-mh-mumbai')
      ..setArea('Bandra West')
      ..next();
    final state = container.read(hostSetupControllerProvider);
    expect(state.step, HostSetupStep.details);
    expect(state.stepNumber, 2);
    expect(state.draft.location, 'in-mh-mumbai');
    expect(state.draft.savedAt, onboardingNow);
  });

  test('formats save as host defaults with the first as primary', () {
    final container = _container();
    final setup = container.read(hostSetupControllerProvider.notifier);

    setup
      ..toggleFormat(HostSetupFormat.dinner)
      ..toggleFormat(HostSetupFormat.games);
    var state = container.read(hostSetupControllerProvider);
    expect(state.formats, {HostSetupFormat.games, HostSetupFormat.dinner});
    expect(state.draft.hostDefaults.primaryActivityKind, ActivityKind.pubQuiz);
    expect(state.draft.hostDefaults.supportedActivityKinds, [
      ActivityKind.pubQuiz,
      ActivityKind.dinner,
    ]);

    setup
      ..toggleFormat(HostSetupFormat.games)
      ..toggleFormat(HostSetupFormat.dinner);
    state = container.read(hostSetupControllerProvider);
    expect(state.formats, isEmpty);
    expect(state.draft.isEmpty, isTrue);
  });

  test(
    'a saved draft fills an untouched setup but never overwrites typing',
    () {
      final container = _container();
      final setup = container.read(hostSetupControllerProvider.notifier);
      final saved = onboardingState().draft;

      setup.restore(saved);
      expect(
        container.read(hostSetupControllerProvider).name,
        'Lantern Lane Social',
      );

      final other = _container();
      other.read(hostSetupControllerProvider.notifier)
        ..setName('Typed first')
        ..restore(saved);
      expect(other.read(hostSetupControllerProvider).name, 'Typed first');
    },
  );

  test('created moves to payouts, finish to Done, and the draft freezes', () {
    final container = _container();
    final setup = container.read(hostSetupControllerProvider.notifier)
      ..restore(onboardingState().draft)
      ..next();

    setup.created('org-1');
    var state = container.read(hostSetupControllerProvider);
    expect(state.step, HostSetupStep.payments);
    expect(state.organizerId, 'org-1');
    expect(state.stepNumber, 3);

    setup
      ..setName('Changed after create')
      ..back();
    state = container.read(hostSetupControllerProvider);
    expect(state.name, 'Lantern Lane Social');
    expect(state.step, HostSetupStep.payments);

    setup.finish();
    expect(
      container.read(hostSetupControllerProvider).step,
      HostSetupStep.done,
    );
  });

  test('finish does nothing before the page exists', () {
    final container = _container();
    container.read(hostSetupControllerProvider.notifier).finish();
    expect(
      container.read(hostSetupControllerProvider).step,
      HostSetupStep.start,
    );
  });

  test('details are complete once the nights have a line', () {
    expect(onboardingState(withDetails: false).detailsComplete, isFalse);
    expect(onboardingState().detailsComplete, isTrue);
    expect(OrganizerDraft(savedAt: onboardingNow, name: 'x').isEmpty, isFalse);
  });
}
