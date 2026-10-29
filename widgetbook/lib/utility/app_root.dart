import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Root shell',
  type: MyApp,
  path: '[P3 utility surfaces]/App root',
)
Widget myAppRootState(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'MyApp',
    contractId: 'app.root',
    children: [
      WidgetbookPageStateCard(
        label: 'router shell with force-update pass-through',
        child: WidgetbookUtilityDeviceFrame(child: _MyAppScope()),
      ),
    ],
  );
}

class _MyAppScope extends StatefulWidget {
  const _MyAppScope();

  @override
  State<_MyAppScope> createState() => _MyAppScopeState();
}

class _MyAppScopeState extends State<_MyAppScope> {
  late final GoRouter _router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => Scaffold(
          body: Center(
            child: Text(
              'Widgetbook app root',
              style: CatchTextStyles.titleL(context),
            ),
          ),
        ),
      ),
    ],
  );

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        goRouterProvider.overrideWithValue(_router),
        forceUpdateRequiredProvider.overrideWithValue(
          const AsyncData<bool>(false),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(null),
        ),
      ],
      child: MyApp(routerProvider: goRouterProvider),
    );
  }
}
