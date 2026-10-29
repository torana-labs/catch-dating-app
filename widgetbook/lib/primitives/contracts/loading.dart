// ignore_for_file: invalid_use_of_internal_member

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/pages/startup/splash_screen.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSkeleton,
  path: '[Core primitives]/Loading',
)
Widget catchSkeletonContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSkeleton',
    contractId: 'catch.skeleton',
    states: const [
      'card',
      'box',
      'text',
      'text-block',
      'circle',
      'custom',
      'derived-content',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'card',
        child: CatchSkeleton.card(
          height: WidgetbookPreviewLayout.skeletonCardHeight,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'box',
        child: CatchSkeleton.box(
          width: WidgetbookPreviewLayout.skeletonBoxWidth,
          height: CatchSpacing.s5,
          radius: CatchRadius.pill,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text',
        child: CatchSkeleton.text(
          width: WidgetbookPreviewLayout.skeletonTextWidth,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text-block',
        child: CatchSkeleton.textBlock(lines: 3),
      ),
      WidgetbookContractStateCard(
        label: 'circle',
        child: CatchSkeleton.circle(
          size: WidgetbookPreviewLayout.skeletonCircleExtent,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom',
        child: CatchSkeleton.custom(
          child: Container(
            height: WidgetbookPreviewLayout.skeletonCustomHeight,
            decoration: BoxDecoration(
              color: CatchTokens.of(context).surface,
              borderRadius: BorderRadius.circular(CatchRadius.pill),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'derived-content',
        child: CatchSkeleton.content(
          child: CatchSection.containedFieldRows(
            title: 'Customer details',
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Name',
                body: 'Customer name',
              ),
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Mobile number',
                body: '+919876543210',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchLoadingIndicator,
  path: '[Core primitives]/Loading',
)
Widget catchLoadingIndicatorContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchLoadingIndicator',
    contractId: 'catch.loading_indicator',
    states: const [
      'default',
      'small',
      'tinted',
      'dots-primary',
      'dots-light',
      'inline-status',
      'inline-commit',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'default',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.loadingIndicatorExtent,
          child: CatchLoadingIndicator(),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'small',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.loadingIndicatorSmallExtent,
          child: CatchLoadingIndicator(
            strokeWidth: CatchStroke.progressIndicator,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tinted',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.loadingIndicatorExtent,
          child: CatchLoadingIndicator(color: t.primary),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'dots-primary',
        child: CatchLoadingIndicator.dots(color: t.primary),
      ),
      const WidgetbookContractStateCard(
        label: 'dots-light',
        child: CatchLoadingIndicator.dots(color: CatchTokens.editorialWhite),
      ),
      WidgetbookContractStateCard(
        label: 'inline-status',
        child: CatchLoadingIndicator.inline(color: t.ink3),
      ),
      WidgetbookContractStateCard(
        label: 'inline-commit',
        child: CatchLoadingIndicator.inline(
          size: CatchFieldTokens.actionSpinnerExtent,
          color: t.ink,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchAsyncBoundary,
  path: '[Core primitives]/Loading',
)
Widget catchAsyncValueContractStates(BuildContext context) {
  // Riverpod exposes these combined states to consumers but keeps the
  // constructor helper package-internal.
  final retrying = const AsyncLoading<String>().copyWithPrevious(
    AsyncError<String>(Exception('Earlier attempt failed'), StackTrace.empty),
  );
  final refreshing = const AsyncLoading<String>().copyWithPrevious(
    const AsyncData<String>('Existing data remains visible while refreshing'),
  );
  final staleDataWithError =
      AsyncError<String>(
        Exception('Refresh failed'),
        StackTrace.empty,
      ).copyWithPrevious(
        const AsyncData<String>('Credible stale data remains visible'),
      );

  return WidgetbookContractFrame(
    title: 'Async state boundary',
    contractId: 'catch.async_value',
    states: const [
      'data',
      'initial-loading',
      'retrying',
      'refreshing',
      'stale-data-with-error',
      'terminal-error',
      'skip-loading-on-refresh',
      'custom-builders',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'data',
        child: CatchAsyncBoundary<String>(
          value: const AsyncValue.data('3 events ready'),
          builder: (context, value) => CatchSurface.card(child: Text(value)),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'initial-loading',
        child: SizedBox(
          height: WidgetbookPreviewLayout.loadingSlotHeight,
          child: CatchAsyncBoundary<String>(
            value: const AsyncValue.loading(),
            builder: (context, value) => Text(value),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'retrying',
        child: SizedBox(
          height: WidgetbookPreviewLayout.loadingSlotHeight,
          child: CatchAsyncBoundary<String>(
            value: retrying,
            builder: (context, value) => Text(value),
            loadingBuilder: (context) => const CatchStatusRow(
              label: 'Retrying without replaying the previous error',
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'refreshing',
        child: CatchAsyncBoundary<String>(
          value: refreshing,
          builder: (context, value) => CatchSurface.card(child: Text(value)),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'stale-data-with-error',
        child: CatchAsyncBoundary<String>(
          value: staleDataWithError,
          builder: (context, value) => CatchSurface.card(child: Text(value)),
          retainDataOn: const {
            CatchAsyncBoundaryMode.refresh,
            CatchAsyncBoundaryMode.error,
          },
        ),
      ),
      WidgetbookContractStateCard(
        label: 'terminal-error',
        child: SizedBox(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: CatchAsyncBoundary<String>(
            value: AsyncValue.error(
              Exception('Could not load events'),
              StackTrace.current,
            ),
            builder: (context, value) => Text(value),
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'skip-loading-on-refresh',
        child: CatchAsyncBoundary<String>(
          value: const AsyncValue.data('Existing data remains visible'),
          builder: (context, value) => CatchSurface.card(child: Text(value)),
          retainDataOn: const {CatchAsyncBoundaryMode.refresh},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-builders',
        child: CatchAsyncBoundary<String>(
          value: const AsyncValue.loading(),
          builder: (context, value) => Text(value),
          loadingBuilder: (context) =>
              const CatchStatusRow(label: 'Custom loading state'),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: SplashScreen,
  path: '[Core primitives]/Loading',
)
Widget catchStartupLoadingScreenContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'SplashScreen',
    contractId: 'catch.startup_loading_screen',
    states: const ['startup', 'safe-area', 'primary-fill', 'bounded-spinner'],
    children: const [
      WidgetbookContractStateCard(
        label: 'startup',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: SplashScreen(),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'safe-area',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: SplashScreen(),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'primary-fill',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: SplashScreen(),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'bounded-spinner',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: SplashScreen(),
        ),
      ),
    ],
  );
}
