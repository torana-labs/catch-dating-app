import 'dart:async';

import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/profiles/data/profile_location_initializer.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets(
    'shared app publishes offline once across root and pushed routes, then removes it on reconnect',
    (tester) async {
      final connectivity = StreamController<List<ConnectivityResult>>();
      addTearDown(connectivity.close);
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => CatchRootScreenScaffold.standard(
              title: const CatchTopBar.primaryRail(title: 'Today'),
              children: const [SliverToBoxAdapter(child: Text('Root content'))],
            ),
          ),
          GoRoute(
            path: '/detail',
            builder: (context, state) => CatchRouteScaffold(
              topBarBuilder: (context, scrolled) => CatchTopBar.route(
                title: 'Detail',
                emphasis: (scrolled)
                    ? CatchTopBarEmphasis.divided
                    : CatchTopBarEmphasis.plain,
              ),
              body: const CatchRouteBody.standard(
                child: Text('Detail content'),
              ),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      final routerProvider = Provider<GoRouter>((ref) => router);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            appConnectivityProvider.overrideWith((ref) => connectivity.stream),
            forceUpdateRequiredProvider.overrideWith(
              (ref) => const AsyncData(false),
            ),
            profileLocationInitializerProvider.overrideWith(
              _NoLocationInitializer.new,
            ),
          ],
          child: MyApp(routerProvider: routerProvider),
        ),
      );
      await tester.pump();
      connectivity.add([ConnectivityResult.none]);
      await tester.pump();
      await tester.pump();
      final offline = find.byKey(
        const ValueKey('status_strip.connectivity.offline'),
      );
      expect(offline, findsOneWidget);
      expect(find.byType(CatchNotice), findsNothing);
      expect(find.text("YOU'RE OFFLINE"), findsOneWidget);
      expect(
        tester
            .widget<CatchBanner>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchBanner &&
                    widget.variant == CatchBannerVariant.statuses,
              ),
            )
            .statuses
            .single
            .actions,
        isEmpty,
      );

      unawaited(router.push<void>('/detail'));
      await pumpFeatureUi(tester);
      expect(offline, findsOneWidget);
      expect(
        tester.getTopLeft(offline).dy,
        tester.getBottomLeft(find.byType(CatchTopBar)).dy,
      );
      connectivity.add([ConnectivityResult.wifi]);
      await tester.pump();
      await tester.pump();
      expect(offline, findsNothing);
      expect(find.text('Detail content'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

class _NoLocationInitializer extends ProfileLocationInitializer {
  @override
  Future<void> build() async {}
}
