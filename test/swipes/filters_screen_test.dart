import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/swipes/presentation/filters_controller.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  test('controller deduplicates an active filter save', () async {
    final repository = _GatedFiltersUserProfileRepository();
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    addTearDown(container.dispose);
    final notifier = container.read(filtersControllerProvider.notifier);

    final firstRequest = notifier.saveFilters(
      uid: 'runner-1',
      minAgePreference: 20,
      maxAgePreference: 30,
      interestedInGenders: const ['woman'],
    );
    await flushTestEventQueue();
    final duplicateRequest = notifier.saveFilters(
      uid: 'runner-1',
      minAgePreference: 40,
      maxAgePreference: 50,
      interestedInGenders: const ['man'],
    );

    expect(identical(firstRequest, duplicateRequest), isTrue);
    expect(repository.updateCallCount, 1);

    repository.gate.complete();
    await Future.wait([firstRequest, duplicateRequest]);
    expect(repository.updateCallCount, 1);
    expect(repository.updatedFields?['minAgePreference'], 20);
  });

  testWidgets('skeletonizes the real filter controls while profile loads', (
    tester,
  ) async {
    final profileController = StreamController<UserProfile?>();
    addTearDown(profileController.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => profileController.stream,
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const FiltersScreen()),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.text('Filters'), findsOneWidget);
    expect(find.byType(FiltersBody), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byKey(SwipeKeys.ageRangeSlider), findsOneWidget);
    expect(find.byType(CatchChip), findsNWidgets(Gender.values.length));
  });

  testWidgets('shows a retryable profile state instead of a blank body', (
    tester,
  ) async {
    var watchCount = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith((ref) {
            watchCount += 1;
            return Stream.value(null);
          }),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const FiltersScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Profile not available'), findsOneWidget);
    expect(
      find.text(
        'You can review submitted details in Forms & cards before setting up '
        'the rest of your profile.',
      ),
      findsOneWidget,
    );
    expect(find.text('Try again'), findsOneWidget);
    expect(find.byKey(SwipeKeys.ageRangeSlider), findsNothing);

    await tester.tap(find.text('Try again'));
    await pumpFeatureUi(tester);
    expect(watchCount, greaterThanOrEqualTo(2));
  });

  testWidgets('saves filters through the controller mutation and pops', (
    tester,
  ) async {
    final repository = _FakeFiltersUserProfileRepository();
    final user = buildUser().copyWith(
      interestedInGenders: const [Gender.woman],
      minAgePreference: 18,
      maxAgePreference: 99,
    );

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: TextButton(
              onPressed: () => context.push('/filters'),
              child: const Text('Open filters'),
            ),
          ),
        ),
        GoRoute(
          path: '/filters',
          builder: (context, state) => const FiltersScreen(),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(user.uid)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
          userProfileRepositoryProvider.overrideWith((ref) => repository),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );

    await tester.tap(find.text('Open filters'));
    await pumpFeatureUi(tester);
    expect(find.text('Pace range'), findsNothing);
    expect(find.text('Event type'), findsNothing);
    expect(find.text('18 – 60+'), findsOneWidget);
    expect(find.byKey(SwipeKeys.ageRangeSlider), findsOneWidget);
    expect(find.byType(CatchRangeInput), findsOneWidget);
    expect(find.byType(CatchChip), findsNWidgets(Gender.values.length));
    expect(
      _chipSelected(
        tester,
        find.byKey(SwipeKeys.genderFilterChip(Gender.woman.name)),
      ),
      isTrue,
    );

    await tester.tap(find.byKey(SwipeKeys.genderFilterChip(Gender.man.name)));
    tester
        .widget<CatchRangeInput>(find.byKey(SwipeKeys.ageRangeSlider))
        .onChanged!(const RangeValues(20, 60));
    await tester.pump();
    expect(find.text('20 – 60+'), findsOneWidget);
    expect(
      _chipSelected(
        tester,
        find.byKey(SwipeKeys.genderFilterChip(Gender.man.name)),
      ),
      isTrue,
    );

    final applyButton = tester.widget<CatchButton>(
      find.byKey(SwipeKeys.applyFiltersButton),
    );
    expect(applyButton.variant, CatchButtonVariant.primary);

    await tester.tap(find.byKey(SwipeKeys.applyFiltersButton));
    await pumpFeatureUi(tester);

    expect(find.text('Open filters'), findsOneWidget);
    expect(repository.updatedUid, 'runner-1');
    expect(repository.updatedFields, {
      'minAgePreference': 20,
      'maxAgePreference': 99,
      'interestedInGenders': ['woman', 'man'],
    });
  });

  testWidgets('pending save freezes route exit, reset, age, and gender', (
    tester,
  ) async {
    final repository = _GatedFiltersUserProfileRepository();
    final user = buildUser().copyWith(
      interestedInGenders: const [Gender.woman],
      minAgePreference: 18,
      maxAgePreference: 99,
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: TextButton(
              onPressed: () => context.push('/filters'),
              child: const Text('Open filters'),
            ),
          ),
        ),
        GoRoute(
          path: '/filters',
          builder: (context, state) => const FiltersScreen(),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(user.uid)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
          userProfileRepositoryProvider.overrideWith((ref) => repository),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await tester.tap(find.text('Open filters'));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(SwipeKeys.genderFilterChip(Gender.man.name)));
    await tester.tap(find.byKey(SwipeKeys.applyFiltersButton));
    await tester.pump();

    expect(repository.updateCallCount, 1);
    expect(
      tester.widget<PopScope<dynamic>>(find.byType(PopScope)).canPop,
      isFalse,
    );
    expect(
      tester.widget<CatchIconAction>(find.byType(CatchIconAction)).onPressed,
      isNull,
    );
    expect(
      tester
          .widget<CatchButton>(find.byKey(SwipeKeys.resetFiltersButton))
          .onPressed,
      isNull,
    );
    expect(
      tester
          .widget<CatchRangeInput>(find.byKey(SwipeKeys.ageRangeSlider))
          .onChanged,
      isNull,
    );
    expect(
      tester
          .widget<CatchChip>(
            find.byKey(SwipeKeys.genderFilterChip(Gender.man.name)),
          )
          .enabled,
      isFalse,
    );

    await tester.tap(find.byKey(SwipeKeys.applyFiltersButton));
    await tester.pump();
    expect(repository.updateCallCount, 1);

    repository.gate.complete();
    await pumpFeatureUi(tester);
    expect(find.text('Open filters'), findsOneWidget);
  });
}

bool _chipSelected(WidgetTester tester, Finder chip) {
  final semantics = tester.widget<Semantics>(
    find
        .descendant(
          of: chip,
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is Semantics && widget.properties.selected != null,
          ),
        )
        .first,
  );
  return semantics.properties.selected!;
}

class _FakeFiltersUserProfileRepository extends Fake
    implements UserProfileRepository {
  String? updatedUid;
  Map<String, dynamic>? updatedFields;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update_profile',
  }) async {
    updatedUid = uid;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
  }
}

class _GatedFiltersUserProfileRepository extends Fake
    implements UserProfileRepository {
  final gate = Completer<void>();
  int updateCallCount = 0;
  Map<String, dynamic>? updatedFields;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update_profile',
  }) async {
    updateCallCount += 1;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
    await gate.future;
  }
}
