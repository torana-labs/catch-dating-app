import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/pages/startup/splash_screen.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/startup/startup_animation_scope.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchLoadingIndicator,
  path: '[Core catalog]/Loading',
)
Widget catchLoadingIndicatorCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchLoadingIndicator',
    catalogId: 'core.widgets.catch_loading_indicator',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default / small / tinted',
        child: WidgetbookContractWrap(
          children: [
            const SizedBox.square(
              dimension: WidgetbookPreviewLayout.loadingIndicatorExtent,
              child: CatchLoadingIndicator(),
            ),
            const SizedBox.square(
              dimension: WidgetbookPreviewLayout.loadingIndicatorSmallExtent,
              child: CatchLoadingIndicator(strokeWidth: 2),
            ),
            SizedBox.square(
              dimension: WidgetbookPreviewLayout.loadingIndicatorExtent,
              child: CatchLoadingIndicator(color: t.primary),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: SplashScreen,
  path: '[Core catalog]/Loading',
)
Widget catchStartupLoadingScreenCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'SplashScreen',
    catalogId: 'core.widgets.catch_startup_loading_screen',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'boot surface before delayed spinner',
        child: WidgetbookCatalogPhoneFrame(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: SplashScreen(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchAsyncBoundary,
  path: '[Core catalog]/Loading',
)
Widget catchAsyncValueViewCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Async state boundary',
    catalogId: 'catch.async_value',
    children: [
      WidgetbookCatalogStateCard(
        label: 'data / loading / error',
        child: Column(
          children: [
            CatchAsyncBoundary<String>(
              value: const AsyncValue.data('3 events ready'),
              builder: (context, value) =>
                  CatchSurface.card(child: Text(value)),
            ),
            gapH12,
            SizedBox(
              height: WidgetbookPreviewLayout.loadingSlotHeight,
              child: CatchAsyncBoundary<String>(
                value: AsyncValue.loading(),
                builder: (context, value) => widgetbookCatalogTextData(value),
              ),
            ),
            gapH12,
            SizedBox(
              height: WidgetbookPreviewLayout.stateViewportHeight,
              child: CatchAsyncBoundary<String>(
                value: AsyncValue.error(
                  Exception('Could not load events'),
                  StackTrace.current,
                ),
                builder: (context, value) => widgetbookCatalogTextData(value),
                onRetry: widgetbookNoop,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sliver states',
  type: CatchAsyncBoundary,
  path: '[Core catalog]/Loading',
)
Widget catchAsyncValueSliverCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Sliver async boundary',
    catalogId: 'catch.async_value',
    children: [
      WidgetbookCatalogStateCard(
        label: 'inline states',
        child: SizedBox(
          height: MediaQuery.textScalerOf(
            context,
          ).scale(WidgetbookPreviewLayout.startupViewportHeight),
          child: CustomScrollView(
            slivers: [
              CatchAsyncBoundary<String>.sliver(
                value: const AsyncValue.data('Sliver data loaded'),
                builder: (context, value) => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(CatchSpacing.s4),
                    child: CatchSurface.card(child: Text(value)),
                  ),
                ),
              ),
              CatchAsyncBoundary<String>.sliver(
                value: AsyncValue.loading(),
                fillRemaining: false,
                builder: (context, value) =>
                    widgetbookCatalogSliverTextData(value),
              ),
              CatchAsyncBoundary<String>.sliver(
                value: AsyncValue.error(
                  Exception('Could not load sliver list'),
                  StackTrace.current,
                ),
                builder: (context, value) =>
                    widgetbookCatalogSliverTextData(value),
                onRetry: widgetbookNoop,
                fillRemaining: false,
              ),
            ],
          ),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'viewport loading',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: CustomScrollView(
            slivers: [
              CatchAsyncBoundary<String>.sliver(
                value: const AsyncValue.loading(),
                builder: (context, value) =>
                    widgetbookCatalogSliverTextData(value),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchErrorScaffold,
  path: '[Core catalog]/Feedback',
)
Widget catchErrorScaffoldCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchErrorScaffold',
    catalogId: 'core.widgets.catch_error_scaffold',
    children: [
      WidgetbookCatalogStateCard(
        label: 'root-level failure',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: CatchErrorScaffold(
            retryLabel: context.l10n.sharedActionTryAgain,
            title: 'Profile unavailable',
            message: 'We could not load this profile right now.',
            onRetry: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSliverErrorState,
  path: '[Core catalog]/Feedback',
)
Widget catchSliverErrorStateCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchSliverErrorState',
    catalogId: 'core.widgets.catch_sliver_error_state',
    children: [
      WidgetbookCatalogStateCard(
        label: 'fill remaining / inline sliver',
        child: SizedBox(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: CustomScrollView(
            slivers: [
              CatchSliverErrorState(
                retryLabel: context.l10n.sharedActionTryAgain,
                title: 'Feed unavailable',
                message: 'Try refreshing the feed.',
                onRetry: widgetbookNoop,
                fillRemaining: false,
              ),
              const SliverToBoxAdapter(
                child: SizedBox(height: CatchSpacing.s4),
              ),
              const CatchSliverErrorState(
                title: 'No connection',
                message: 'Reconnect to keep browsing.',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Box optical center',
  type: CatchStateViewport,
  path: '[Core catalog]/Feedback',
)
Widget catchStateViewportCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Box state viewport',
    catalogId: 'catch.empty_state.state_viewport',
    children: [
      WidgetbookCatalogStateCard(
        label: 'box body / floating-shell optical center',
        child: SizedBox(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: CatchTabViewportScope(
            index: appShellHomeTabIndex,
            bottomOverlayInset: 88,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            child: CatchStateViewport(
              child: CatchEmptyState(
                icon: CatchIcons.date,
                title: 'No upcoming events',
                message: 'The optical center excludes floating chrome.',
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sliver optical center',
  type: CatchStateViewport,
  path: '[Core catalog]/Feedback',
)
Widget catchStateViewportSliverCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Sliver state viewport',
    catalogId: 'catch.empty_state.state_viewport',
    children: [
      WidgetbookCatalogStateCard(
        label: 'floating-shell optical center',
        child: SizedBox(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: CatchTabViewportScope(
            index: appShellHomeTabIndex,
            bottomOverlayInset: 88,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            child: CustomScrollView(
              slivers: [
                CatchStateViewport.sliver(
                  child: CatchEmptyState(
                    icon: CatchIcons.date,
                    title: 'No upcoming events',
                    message: 'The optical center excludes floating chrome.',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSliverEmptyState,
  path: '[Core catalog]/Feedback',
)
Widget catchSliverEmptyStateCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchSliverEmptyState',
    catalogId: 'core.widgets.catch_sliver_empty_state',
    children: [
      WidgetbookCatalogStateCard(
        label: 'cardless terminal empty state',
        child: SizedBox(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: CustomScrollView(
            slivers: [
              CatchSliverEmptyState(
                icon: CatchIcons.eventUnavailable,
                title: 'Nothing scheduled',
                message: 'Create an event to start filling this list.',
                actions: [
                  CatchButton(label: 'New event', onPressed: widgetbookNoop),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchErrorState,
  path: '[Core catalog]/Feedback',
)
Widget catchInlineErrorStateCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchErrorState',
    catalogId: 'core.widgets.catch_error_state.inline',
    children: [
      WidgetbookCatalogStateCard(
        label: 'regular / compact',
        child: Column(
          children: [
            CatchErrorState(
              retryLabel: context.l10n.sharedActionTryAgain,
              title: 'Could not save',
              message: 'Your changes are still local.',
              onRetry: widgetbookNoop,
              mode: CatchErrorStateMode.inline,
            ),
            gapH12,
            const CatchErrorState(
              title: 'Unavailable',
              message: 'Try again later.',
              mode: CatchErrorStateMode.compact,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: StartupBrandHeader,
  path: '[Core catalog]/Loading',
)
Widget startupBrandHeaderCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'StartupBrandHeader',
    catalogId: 'core.widgets.splash_screen.brand_header',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'consumer mark',
        child: StartupBrandHeader(appRole: AppRole.consumer),
      ),
      WidgetbookCatalogStateCard(
        label: 'host mark',
        child: StartupBrandHeader(appRole: AppRole.host),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: StartupAnimationScope,
  path: '[Core catalog]/Loading',
)
Widget startupAnimationScopeCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'StartupAnimationScope',
    catalogId: 'core.startup.startup_animation_scope',
    children: [
      for (final played in const [false, true])
        WidgetbookCatalogStateCard(
          label: played ? 'welcome reel played' : 'welcome reel pending',
          child: StartupAnimationScope(
            consumerWelcomeReelPlayed: played,
            child: Builder(
              builder: (context) => CatchMetadataText(
                'Reel played: ${StartupAnimationScope.maybeOf(context)}',
                color: CatchTokens.of(context).ink2,
              ),
            ),
          ),
        ),
    ],
  );
}
