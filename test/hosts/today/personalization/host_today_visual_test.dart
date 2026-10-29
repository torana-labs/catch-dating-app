import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_screen.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../../clubs/clubs_test_helpers.dart' show buildClub;
import '../../../support/catch_test_fonts.dart';
import '../../../test_pump_helpers.dart';

const _captureKey = ValueKey('host-today-visual-capture');
final _scope = HostTodayPreferenceScope(accountId: 'owner', organizerId: 'org');

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      final variant = '${dark ? 'dark' : 'light'}-${scale}x';
      testWidgets('Focus phone layout and actions $variant', (tester) async {
        _phoneViewport(tester);
        final preferences = _VisualPreferences();
        final root = GlobalKey<NavigatorState>();
        final branch = GlobalKey<NavigatorState>();
        final router = GoRouter(
          navigatorKey: root,
          initialLocation: '/host/today/focus?organizerId=org',
          routes: [
            ShellRoute(
              navigatorKey: branch,
              builder: (_, _, child) => child,
              routes: [
                GoRoute(
                  path: '/host/today',
                  name: Routes.hostTodayScreen.name,
                  builder: (_, _) => _quietPage(),
                  routes: [
                    GoRoute(
                      path: 'focus',
                      name: Routes.hostTodayFocusScreen.name,
                      parentNavigatorKey: root,
                      builder: (_, _) =>
                          const HostTodayFocusScreen(organizerId: 'org'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              hostTodayFeedControllerProvider.overrideWith2(
                (_) => _QuietFeed(),
              ),
              uidProvider.overrideWithValue(const AsyncData('owner')),
              hostOperableClubsProvider('owner').overrideWithValue(
                AsyncData([buildClub(id: 'org', ownerUserId: 'owner')]),
              ),
              hostTodayPreferenceRepositoryProvider.overrideWithValue(
                preferences,
              ),
            ],
            child: RepaintBoundary(
              key: _captureKey,
              child: MaterialApp.router(
                debugShowCheckedModeBanner: false,
                theme: dark ? AppTheme.dark : AppTheme.light,
                routerConfig: router,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                supportedLocales: AppLocalizations.supportedLocales,
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: TextScaler.linear(scale)),
                  child: child!,
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        _expectReadable(tester);
        await _capture(tester, 'focus-$variant-top');
        for (final focus in HostTodayFocus.values) {
          final choice = find.byKey(ValueKey('host-today-focus-${focus.name}'));
          await _tapVisible(tester, choice);
          expect(tester.widget<CatchChoiceTile>(choice).selected, isTrue);
          _expectReadable(tester);
        }
        final continueButton = find.byKey(
          const ValueKey('host-today-focus-continue'),
        );
        await ensureCentered(tester, continueButton);
        await pumpFeatureUi(tester);
        await _capture(tester, 'focus-$variant-actions');
        await _tapVisible(tester, continueButton);
        expect(
          preferences.value,
          const HostTodayPreference.selected(HostTodayFocus.organizerPresence),
        );
        expect(router.state.name, Routes.hostTodayScreen.name);
        unawaited(
          router.pushNamed<void>(
            Routes.hostTodayFocusScreen.name,
            queryParameters: const {'organizerId': 'org'},
          ),
        );
        await pumpFeatureUi(tester);
        await _tapVisible(
          tester,
          find.byKey(const ValueKey('host-today-focus-skip')),
        );
        expect(preferences.value, const HostTodayPreference.skipped());
        expect(preferences.writes, 2);
        expect(router.state.name, Routes.hostTodayScreen.name);
        _expectReadable(tester);
      });

      testWidgets('quiet Today phone layout and actions $variant', (
        tester,
      ) async {
        _phoneViewport(tester);
        final actions = <HostTodaySuggestedAction>[];
        var focusChanges = 0;
        await tester.pumpWidget(
          RepaintBoundary(
            key: _captureKey,
            child: MaterialApp(
              debugShowCheckedModeBanner: false,
              theme: dark ? AppTheme.dark : AppTheme.light,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
              home: _quietPage(
                onAction: actions.add,
                onChangeFocus: () => focusChanges++,
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        _expectReadable(tester);
        // A mono header must not namespace its command's platform font as a
        // catch_ui asset. The real font loader deliberately registers only
        // the production platform family, so capture cannot hide this leak.
        final changeFocus = find.byKey(
          const ValueKey('host-today-change-focus'),
        );
        final commandParagraph = tester.renderObject<RenderParagraph>(
          find.descendant(of: changeFocus, matching: find.byType(RichText)),
        );
        expect(
          commandParagraph.text.style?.fontFamily,
          CatchTextStyles.control(tester.element(changeFocus)).fontFamily,
          reason: 'Header typography must not alter the command font family.',
        );
        await _capture(tester, 'quiet-$variant-top');
        await _tapVisible(
          tester,
          find.byKey(const ValueKey('host-today-change-focus')),
        );
        expect(focusChanges, 1);
        await _tapVisible(
          tester,
          find.byKey(const ValueKey('host-today-suggested-action')),
        );
        expect(actions.single, HostTodaySuggestedAction.addCustomer);
        for (final step in _quietState().roadmap) {
          await _tapVisible(
            tester,
            find.byKey(ValueKey('host-today-milestone-${step.milestone.name}')),
          );
          expect(actions.last, step.action);
          _expectReadable(tester);
        }
        expect(actions.length, 5);
        await _capture(tester, 'quiet-$variant-roadmap');
      });
    }
  }
}

void _phoneViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

HostTodayPersonalizationState _quietState() =>
    buildHostTodayPersonalizationState(
      today: const HostTodayState(status: HostTodayStatus.empty),
      preference: const HostTodayPreference.selected(HostTodayFocus.audience),
      evidence: const HostTodayRoadmapEvidence(
        audience: HostTodayMilestoneProgress.incomplete,
        rehearsal: HostTodayMilestoneProgress.complete,
        payouts: HostTodayMilestoneProgress.incomplete,
        canManagePayouts: true,
      ),
    );

Widget _quietPage({
  ValueChanged<HostTodaySuggestedAction>? onAction,
  VoidCallback? onChangeFocus,
}) => CatchRootScreenScaffold.sections(
  title: const Text('Today'),
  children: [
    SliverToBoxAdapter(
      child: HostTodayPersonalizationSection(
        state: _quietState(),
        onChangeFocus: onChangeFocus ?? () {},
        onAction: onAction ?? (_) {},
      ),
    ),
  ],
);

Future<void> _tapVisible(WidgetTester tester, Finder target) async {
  await ensureCentered(tester, target);
  await pumpFeatureUi(tester);
  expect(target.hitTestable(), findsOneWidget);
  expect(tester.getSize(target).isEmpty, isFalse);
  await tester.tap(target);
  await pumpFeatureUi(tester);
  expect(tester.takeException(), isNull);
}

void _expectReadable(WidgetTester tester) {
  expect(tester.takeException(), isNull);
  for (final paragraph in tester.renderObjectList<RenderParagraph>(
    find.byType(RichText),
  )) {
    expect(
      paragraph.didExceedMaxLines,
      isFalse,
      reason: paragraph.text.toPlainText(),
    );
  }
}

/// Optional review artifacts; ordinary CI remains assertion-only.
Future<void> _capture(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_TODAY_CAPTURE_DIR'];
  if (directory == null || directory.isEmpty) return;
  await tester.runAsync(() async {
    await Directory(directory).create(recursive: true);
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(_captureKey),
    );
    final image = await boundary.toImage();
    try {
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      await File(
        '$directory/$name.png',
      ).writeAsBytes(data!.buffer.asUint8List());
    } finally {
      image.dispose();
    }
  });
}

class _VisualPreferences implements HostTodayPreferenceRepository {
  HostTodayPreference value = const HostTodayPreference.unanswered();
  int writes = 0;

  @override
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope) async {
    expect(scope, _scope);
    return value;
  }

  @override
  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  ) async {
    expect(scope, _scope);
    writes++;
    value = preference;
  }
}

class _QuietFeed extends HostTodayFeedController {
  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) async =>
      const HostTodayFeedData(activeEvents: [], pastEvents: []);
}
