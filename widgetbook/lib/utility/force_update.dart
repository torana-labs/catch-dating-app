import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/contexts/account/data/app_version_config_provider.dart';
import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_screen.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

const _forceUpdateConfig = AppVersionConfig(
  minVersion: '4.2.0',
  minBuildAndroid: 420,
  minBuildIos: 420,
  storeUrlAndroid: 'https://play.google.com/store/apps/details?id=catch.app',
  storeUrlIos: 'https://apps.apple.com/app/catch/id000000000',
);

@widgetbook.UseCase(
  name: 'Gate states',
  type: ForceUpdateGate,
  path: '[P3 utility surfaces]/Force update',
)
Widget forceUpdateGateStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ForceUpdateGate',
    contractId: 'app.force_update.gate',
    children: [
      WidgetbookPageStateCard(
        label: 'remote config loading',
        child: const WidgetbookUtilityDeviceFrame(
          child: ForceUpdateGate(
            forceUpdate: AsyncLoading<bool>(),
            onRetry: widgetbookNoop,
            refreshOnResume: false,
            child: _ForceUpdatePassThrough(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'remote config error',
        child: WidgetbookUtilityDeviceFrame(
          child: ForceUpdateGate(
            forceUpdate: AsyncError<bool>(
              StateError('Remote Config fetch failed'),
              StackTrace.empty,
            ),
            onRetry: widgetbookNoop,
            refreshOnResume: false,
            child: const _ForceUpdatePassThrough(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'update required',
        child: const WidgetbookUtilityDeviceFrame(
          child: _ForceUpdateStoreScope(
            child: ForceUpdateGate(
              forceUpdate: AsyncData<bool>(true),
              onRetry: widgetbookNoop,
              refreshOnResume: false,
              child: _ForceUpdatePassThrough(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'app content allowed',
        child: const WidgetbookUtilityDeviceFrame(
          child: ForceUpdateGate(
            forceUpdate: AsyncData<bool>(false),
            onRetry: widgetbookNoop,
            refreshOnResume: false,
            child: _ForceUpdatePassThrough(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Error state',
  type: ForceUpdateCheckErrorScreen,
  path: '[P3 utility surfaces]/Force update',
)
Widget forceUpdateCheckErrorScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ForceUpdateCheckErrorScreen',
    contractId: 'screen.force_update.check_error',
    children: [
      WidgetbookPageStateCard(
        label: 'remote config check failed',
        child: WidgetbookUtilityDeviceFrame(
          child: ForceUpdateCheckErrorScreen(
            error: StateError('Remote Config fetch failed'),
            onRetry: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: UpdateRequiredBody,
  path: '[P3 utility surfaces]/Force update',
)
Widget updateRequiredScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'UpdateRequiredBody',
    contractId: 'screen.force_update.required',
    children: [
      WidgetbookPageStateCard(
        label: 'store link configured',
        child: const WidgetbookUtilityDeviceFrame(
          child: UpdateRequiredBody(onUpdateNow: widgetbookNoop),
        ),
      ),
    ],
  );
}

class _ForceUpdateStoreScope extends StatelessWidget {
  const _ForceUpdateStoreScope({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        appVersionConfigProvider.overrideWithValue(_forceUpdateConfig),
        externalUrlLauncherProvider.overrideWithValue(
          widgetbookUtilityNoopLauncher,
        ),
      ],
      child: child,
    );
  }
}

class _ForceUpdatePassThrough extends StatelessWidget {
  const _ForceUpdatePassThrough();

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: CatchInsets.contentSpacious,
            child: Text(
              'App content',
              style: CatchTextStyles.titleL(context, color: t.ink),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
