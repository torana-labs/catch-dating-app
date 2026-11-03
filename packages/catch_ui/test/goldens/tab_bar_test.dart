import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

/// Locks the platform-adaptive bottom tab chrome: floating/glass on iOS and
/// anchored/material on Android. Regenerate intentionally with:
///   flutter test --update-goldens test/goldens/tab_bar_test.dart
void main() {
  testWidgets('adaptive tab bar iOS chrome (light + dark)', (tester) async {
    await _withTargetPlatform(
      TargetPlatform.iOS,
      () => matchCatchGolden(
        tester,
        'adaptive_tab_bar_ios_chrome',
        size: const Size(430, 240),
        builder: _tabBarScene,
      ),
    );
  }, tags: const ['golden']);

  testWidgets('adaptive tab bar Android chrome (light + dark)', (tester) async {
    await _withTargetPlatform(
      TargetPlatform.android,
      () => matchCatchGolden(
        tester,
        'adaptive_tab_bar_android_chrome',
        size: const Size(430, 240),
        builder: _tabBarScene,
      ),
    );
  }, tags: const ['golden']);
}

Future<void> _withTargetPlatform(
  TargetPlatform platform,
  Future<void> Function() run,
) async {
  final previous = debugDefaultTargetPlatformOverride;
  debugDefaultTargetPlatformOverride = platform;
  try {
    await run();
  } finally {
    debugDefaultTargetPlatformOverride = previous;
  }
}

Widget _tabBarScene(BuildContext context) {
  final baseMedia = MediaQuery.of(context);

  return MediaQuery(
    data: baseMedia.copyWith(
      padding: const EdgeInsets.only(bottom: 34),
      viewPadding: const EdgeInsets.only(bottom: 34),
    ),
    child: Builder(
      builder: (context) {
        final t = CatchTokens.of(context);

        return DecoratedBox(
          decoration: BoxDecoration(color: t.bg),
          child: Stack(
            children: [
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.all(CatchSpacing.s5),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Tonight', style: CatchTextStyles.titleL(context)),
                      const SizedBox(height: CatchSpacing.s3),
                      Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: t.raised,
                          border: Border.all(color: t.line),
                          borderRadius: BorderRadius.circular(CatchRadius.md),
                        ),
                      ),
                      const SizedBox(height: CatchSpacing.s3),
                      Expanded(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: t.surface,
                            border: Border.all(color: t.line),
                            borderRadius: BorderRadius.circular(CatchRadius.lg),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: CatchTabBar<String>(
                  active: 'explore',
                  onChanged: (_) {},
                  items: [
                    CatchTabBarItem<String>(
                      id: 'home',
                      icon: CatchIcons.home,
                      activeIcon: CatchIcons.home,
                      label: 'Home',
                    ),
                    CatchTabBarItem<String>(
                      id: 'explore',
                      icon: CatchIcons.explore,
                      activeIcon: CatchIcons.explore,
                      label: 'Explore',
                    ),
                    CatchTabBarItem<String>(
                      id: 'chats',
                      icon: CatchIcons.chat,
                      activeIcon: CatchIcons.chat,
                      label: 'Chats',
                      badgeCount: 7,
                    ),
                    CatchTabBarItem<String>(
                      id: 'you',
                      icon: CatchIcons.person,
                      activeIcon: CatchIcons.person,
                      label: 'You',
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}
