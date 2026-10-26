import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/presentation/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/core/presentation/app_shell_active_tab.dart';
import 'package:catch_dating_app/core/presentation/app_shell_keys.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  group('connectivityResultsAreOffline', () {
    test('treats empty and none-only results as offline', () {
      expect(connectivityResultsAreOffline(const []), isTrue);
      expect(
        connectivityResultsAreOffline(const [ConnectivityResult.none]),
        isTrue,
      );
    });

    test('treats any real transport as online', () {
      expect(
        connectivityResultsAreOffline(const [
          ConnectivityResult.none,
          ConnectivityResult.wifi,
        ]),
        isFalse,
      );
    });
  });

  group('AdaptiveTabScaffold', () {
    testWidgets('floats navigation and publishes raw obstruction on iOS', (
      tester,
    ) async {
      const navigationKey = Key('adaptive-navigation');

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
          home: const MediaQuery(
            data: MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: 34),
              viewPadding: EdgeInsets.only(bottom: 34),
            ),
            child: AdaptiveTabScaffold(
              activeIndex: appShellClubsTabIndex,
              body: SizedBox.expand(),
              navigationBar: SizedBox(key: navigationKey, height: 56),
            ),
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );

      expect(scaffold.extendBody, isTrue);
      expect(
        find.descendant(
          of: find.byWidget(scaffold.body!),
          matching: find.byType(CatchTabViewportScope),
          matchRoot: true,
        ),
        findsOneWidget,
      );
      expect(scaffold.bottomNavigationBar, isNull);
      expect(find.byKey(navigationKey), findsOneWidget);
      expect(
        activeTab.bottomBarPlacement,
        CatchTabViewportScopePlacement.floating,
      );
      expect(
        activeTab.bottomOverlayInset,
        CatchLayout.tabBarReservedBottomInset(34),
      );
    });

    testWidgets(
      'suppresses floating navigation without reparenting a focused editor',
      (tester) async {
        const navigationKey = Key('adaptive-navigation');
        const editorKey = Key('adaptive-editor');
        final controller = TextEditingController(text: 'Draft reply');
        final focusNode = FocusNode();
        addTearDown(controller.dispose);
        addTearDown(focusNode.dispose);
        addTearDown(tester.view.resetViewInsets);

        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
            home: AdaptiveTabScaffold(
              activeIndex: appShellChatsTabIndex,
              body: TextField(
                key: editorKey,
                controller: controller,
                focusNode: focusNode,
              ),
              navigationBar: const SizedBox(key: navigationKey, height: 56),
            ),
          ),
        );

        await tester.tap(find.byKey(editorKey));
        await tester.pump();
        controller.selection = const TextSelection.collapsed(offset: 5);
        final editorElement = tester.element(find.byKey(editorKey));

        // Focus with zero viewInsets models a hardware keyboard. Chrome stays.
        expect(tester.view.viewInsets.bottom, 0);
        expect(focusNode.hasFocus, isTrue);
        expect(find.byKey(navigationKey), findsOneWidget);
        expect(
          tester
              .widget<CatchTabViewportScope>(find.byType(CatchTabViewportScope))
              .bottomBarPlacement,
          CatchTabViewportScopePlacement.floating,
        );

        tester.view.viewInsets = const FakeViewPadding(bottom: 318);
        await tester.pump();

        final keyboardScaffold = tester.widget<Scaffold>(
          find.byKey(AppShellKeys.scaffold),
        );
        final keyboardActiveTab = tester.widget<CatchTabViewportScope>(
          find.byType(CatchTabViewportScope),
        );
        expect(keyboardScaffold.extendBody, isFalse);
        expect(
          find.descendant(
            of: find.byWidget(keyboardScaffold.body!),
            matching: find.byType(CatchTabViewportScope),
            matchRoot: true,
          ),
          findsOneWidget,
        );
        expect(keyboardScaffold.bottomNavigationBar, isNull);
        expect(find.byKey(navigationKey), findsNothing);
        expect(
          keyboardActiveTab.bottomBarPlacement,
          CatchTabViewportScopePlacement.none,
        );
        expect(keyboardActiveTab.bottomOverlayInset, 0);
        expect(tester.element(find.byKey(editorKey)), same(editorElement));
        expect(focusNode.hasFocus, isTrue);
        expect(controller.text, 'Draft reply');
        expect(controller.selection, const TextSelection.collapsed(offset: 5));

        tester.view.resetViewInsets();
        await tester.pump();
        expect(find.byKey(navigationKey), findsOneWidget);
        expect(
          tester
              .widget<CatchTabViewportScope>(find.byType(CatchTabViewportScope))
              .bottomBarPlacement,
          CatchTabViewportScopePlacement.floating,
        );
      },
    );

    testWidgets('anchors navigation through Scaffold on Android', (
      tester,
    ) async {
      const navigationKey = Key('adaptive-navigation');

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.android),
          home: const MediaQuery(
            data: MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: 34),
              viewPadding: EdgeInsets.only(bottom: 34),
            ),
            child: AdaptiveTabScaffold(
              activeIndex: appShellClubsTabIndex,
              body: SizedBox.expand(),
              navigationBar: SizedBox(key: navigationKey, height: 56),
            ),
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );

      expect(scaffold.extendBody, isFalse);
      expect(
        find.descendant(
          of: find.byWidget(scaffold.body!),
          matching: find.byType(CatchTabViewportScope),
          matchRoot: true,
        ),
        findsOneWidget,
      );
      expect(scaffold.bottomNavigationBar, isNotNull);
      expect(find.byKey(navigationKey), findsOneWidget);
      expect(
        activeTab.bottomBarPlacement,
        CatchTabViewportScopePlacement.anchored,
      );
      expect(activeTab.bottomOverlayInset, 0);
    });

    testWidgets('anchors fallback chrome even on iOS', (tester) async {
      const fallbackKey = Key('adaptive-fallback');
      addTearDown(tester.view.resetViewInsets);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
          home: const AdaptiveTabScaffold(
            activeIndex: appShellHomeTabIndex,
            body: SizedBox.expand(),
            anchoredFallback: SizedBox(key: fallbackKey, height: 56),
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );

      expect(scaffold.extendBody, isFalse);
      expect(scaffold.bottomNavigationBar, isNotNull);
      expect(find.byKey(fallbackKey), findsOneWidget);
      expect(
        activeTab.bottomBarPlacement,
        CatchTabViewportScopePlacement.anchored,
      );

      tester.view.viewInsets = const FakeViewPadding(bottom: 318);
      await tester.pump();

      final keyboardScaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final keyboardActiveTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(keyboardScaffold.extendBody, isFalse);
      expect(keyboardScaffold.bottomNavigationBar, isNull);
      expect(find.byKey(fallbackKey), findsNothing);
      expect(
        keyboardActiveTab.bottomBarPlacement,
        CatchTabViewportScopePlacement.none,
      );
      expect(keyboardActiveTab.bottomOverlayInset, 0);
    });

    testWidgets('preserves safe-area terminal clearance with no bottom bar', (
      tester,
    ) async {
      const terminalKey = Key('adaptive-terminal');

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
          home: const MediaQuery(
            data: MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: 12),
              viewPadding: EdgeInsets.only(bottom: 34),
            ),
            child: AdaptiveTabScaffold(
              activeIndex: appShellHomeTabIndex,
              body: CatchScrollTerminalGap(key: terminalKey, extra: 10),
            ),
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      final terminal = tester.widget<SizedBox>(
        find.descendant(
          of: find.byKey(terminalKey),
          matching: find.byType(SizedBox),
        ),
      );

      expect(scaffold.extendBody, isFalse);
      expect(scaffold.bottomNavigationBar, isNull);
      expect(activeTab.bottomBarPlacement, CatchTabViewportScopePlacement.none);
      expect(terminal.height, 44);
    });
  });

  testWidgets('chat navigation badge stays inside its icon box', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Center(
          child: SizedBox(
            width: CatchLayout.appShellNavigationBadgeWidth,
            height: CatchLayout.appShellNavigationBadgeHeight,
            child: CatchCountBadge(
              count: 3,
              offset: const Offset(-1, 2),
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Icon(CatchIcons.chat),
              ),
            ),
          ),
        ),
      ),
    );

    final badgeBox = find.byWidgetPredicate(
      (widget) =>
          widget is SizedBox &&
          widget.width == CatchLayout.appShellNavigationBadgeWidth &&
          widget.height == CatchLayout.appShellNavigationBadgeHeight,
    );
    final boxRect = tester.getRect(badgeBox);
    final labelRect = tester.getRect(find.text('3'));

    expect(labelRect.top, greaterThanOrEqualTo(boxRect.top));
    expect(labelRect.right, lessThanOrEqualTo(boxRect.right));
  });

  testWidgets('iOS navigation bar uses floating adaptive chrome', (
    tester,
  ) async {
    final previousPlatformOverride = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

    try {
      int? tappedIndex;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: 34),
              viewPadding: EdgeInsets.only(bottom: 34),
              textScaler: TextScaler.linear(1.6),
            ),
            child: Scaffold(
              body: const SizedBox.expand(),
              bottomNavigationBar: AppShellNavigationBar(
                currentIndex: 0,
                unreadCount: 3,
                onDestinationSelected: (index) => tappedIndex = index,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CatchTabBar<int>), findsOneWidget);
      expect(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
        findsOneWidget,
      );
      final floatingChrome = tester.widget<ClipRRect>(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
      );
      expect(
        floatingChrome.borderRadius,
        BorderRadius.circular(CatchRadius.pill),
      );
      expect(find.byType(CupertinoTabBar), findsNothing);
      expect(find.text('Home'), findsNothing);
      expect(find.text('Explore'), findsNothing);
      expect(find.bySemanticsLabel('Home'), findsOneWidget);
      expect(find.bySemanticsLabel('Explore'), findsOneWidget);
      expect(find.bySemanticsLabel('Catches'), findsNothing);
      expect(find.bySemanticsLabel(RegExp('Chats')), findsOneWidget);
      expect(find.bySemanticsLabel('You'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Explore'));
      expect(tappedIndex, 1);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatformOverride;
    }
  });

  testWidgets('large-text navigation stays icon-only inside floating chrome', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
        home: const MediaQuery(
          data: MediaQueryData(
            size: Size(393, 852),
            padding: EdgeInsets.only(bottom: 34),
            viewPadding: EdgeInsets.only(bottom: 34),
            textScaler: TextScaler.linear(1.6),
          ),
          child: Scaffold(
            body: SizedBox.expand(),
            bottomNavigationBar: CatchTabBar<int>(
              active: 1,
              items: [
                CatchTabBarItem(
                  id: 0,
                  icon: Icons.confirmation_num,
                  label: 'Events',
                ),
                CatchTabBarItem(id: 1, icon: Icons.people, label: 'Customers'),
                CatchTabBarItem(
                  id: 2,
                  icon: Icons.chat_bubble,
                  label: 'Messaging',
                ),
                CatchTabBarItem(id: 3, icon: Icons.person, label: 'Organizer'),
              ],
            ),
          ),
        ),
      ),
    );

    for (final label in const [
      'Events',
      'Customers',
      'Messaging',
      'Organizer',
    ]) {
      expect(find.text(label), findsNothing);
      expect(find.bySemanticsLabel(label), findsOneWidget);
    }

    final indicatorRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.indicator')),
    );
    final chromeRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
    );
    expect(indicatorRect.left, greaterThanOrEqualTo(chromeRect.left));
    expect(indicatorRect.right, lessThanOrEqualTo(chromeRect.right));
  });

  testWidgets('iOS floating navigation keeps selected end tab close to edge', (
    tester,
  ) async {
    final previousPlatformOverride = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
          home: const MediaQuery(
            data: MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: 34),
              viewPadding: EdgeInsets.only(bottom: 34),
            ),
            child: Scaffold(
              body: SizedBox.expand(),
              bottomNavigationBar: AppShellNavigationBar(
                currentIndex: 3,
                unreadCount: 0,
                onDestinationSelected: _noopTabSelection,
              ),
            ),
          ),
        ),
      );

      final chromeRect = tester.getRect(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
      );
      final selectedRect = tester.getRect(find.bySemanticsLabel('You'));

      expect(
        chromeRect.right - selectedRect.right,
        closeTo(CatchLayout.tabBarFloatingContentHorizontalPadding, 0.5),
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatformOverride;
    }
  });

  testWidgets('navigation bar accepts host destination sets', (tester) async {
    int? tappedIndex;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: const SizedBox.expand(),
          bottomNavigationBar: AppShellNavigationBar(
            currentIndex: 1,
            unreadCount: 4,
            items: [
              AppShellNavigationItem(
                destination: AppShellNavigationDestination.hostEvents,
                materialIcon: CatchIcons.ticket,
                materialSelectedIcon: CatchIcons.ticket,
                cupertinoIcon: CatchIcons.ticket,
                cupertinoSelectedIcon: CatchIcons.ticket,
              ),
              AppShellNavigationItem(
                destination: AppShellNavigationDestination.hostInbox,
                materialIcon: CatchIcons.chat,
                materialSelectedIcon: CatchIcons.chat,
                cupertinoIcon: CupertinoIcons.chat_bubble_2,
                cupertinoSelectedIcon: CupertinoIcons.chat_bubble_2_fill,
                showsUnreadBadge: true,
              ),
              AppShellNavigationItem(
                destination: AppShellNavigationDestination.hostOrganizer,
                materialIcon: CatchIcons.organizer,
                materialSelectedIcon: CatchIcons.organizer,
                cupertinoIcon: CatchIcons.organizer,
                cupertinoSelectedIcon: CatchIcons.organizer,
              ),
            ],
            onDestinationSelected: (index) => tappedIndex = index,
          ),
        ),
      ),
    );

    expect(find.byType(CatchTabBar<int>), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.text('HOME'), findsNothing);
    expect(find.text('Today'), findsNothing);
    expect(find.text('Events'), findsNothing);
    expect(find.text('Inbox'), findsOneWidget);
    expect(find.text('Organizer'), findsNothing);
    expect(find.text('4'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Organizer'));
    expect(tappedIndex, 2);
  });

  testWidgets('navigation bar selection fires haptic feedback', (tester) async {
    final calls = <MethodCall>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        calls.add(call);
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: const SizedBox.expand(),
          bottomNavigationBar: AppShellNavigationBar(
            currentIndex: 0,
            unreadCount: 0,
            onDestinationSelected: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.bySemanticsLabel('Explore'));

    expect(
      calls,
      contains(
        isA<MethodCall>()
            .having((call) => call.method, 'method', 'HapticFeedback.vibrate')
            .having(
              (call) => call.arguments,
              'arguments',
              'HapticFeedbackType.selectionClick',
            ),
      ),
    );
  });

  test('app notice controller dedupes notices by key', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final controller = container.read(catchNoticeControllerProvider.notifier);
    controller.show(
      const CatchNoticeData(
        id: 'match.first',
        title: 'First match',
        dedupeKey: 'match',
      ),
    );
    controller.show(
      const CatchNoticeData(
        id: 'match.second',
        title: 'Second match',
        dedupeKey: 'match',
      ),
    );

    final notices = container.read(catchNoticeControllerProvider).notices;
    expect(notices, hasLength(1));
    expect(notices.single.title, 'Second match');
  });

  testWidgets('queued app notices render below the safe area', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 59),
            ),
            child: Builder(
              builder: (context) => const Scaffold(
                body: CatchNoticeOverlay(child: SizedBox.expand()),
              ),
            ),
          ),
        ),
      ),
    );

    ProviderScope.containerOf(tester.element(find.byType(CatchNoticeOverlay)))
        .read(catchNoticeControllerProvider.notifier)
        .show(const CatchNoticeData(id: 'message', title: 'New message'));
    await pumpFeatureUi(tester);

    final notice = find.byKey(const ValueKey('app_notice.message'));
    expect(notice, findsOneWidget);
    expect(tester.getTopLeft(notice).dy, greaterThanOrEqualTo(59 + 12));
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('ephemeral app notices dismiss after their duration', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: CatchNoticeOverlay(child: SizedBox.expand()),
          ),
        ),
      ),
    );

    final context = tester.element(find.byType(CatchNoticeOverlay));
    ProviderScope.containerOf(context)
        .read(catchNoticeControllerProvider.notifier)
        .show(
          const CatchNoticeData(
            id: 'match.created',
            title: 'New match',
            message: 'You matched with Ananya.',
            tone: CatchNoticeTone.event,
            duration: Duration(milliseconds: 20),
          ),
        );

    await tester.pump();
    expect(find.text('New match'), findsOneWidget);

    final autoDismissDelay = const Duration(milliseconds: 25);
    await tester.pump(autoDismissDelay);
    await tester.pump();
    expect(find.text('New match'), findsNothing);
  });
}

void _noopTabSelection(int _) {}
