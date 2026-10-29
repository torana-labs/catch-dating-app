import 'package:catch_dating_app/event_success/presentation/companion/event_success_companion_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Loading body',
  type: EventSuccessCompanionLoadingPageBody,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessCompanionLoadingBodyState(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventSuccessCompanionLoadingPageBody',
    contractId: 'state.event_success.companion.loading',
    children: [
      WidgetbookPageStateCard(
        label: 'unresolved plan',
        child: WidgetbookCompanionDeviceFrame(
          child: Builder(
            builder: (context) {
              final t = CatchTokens.of(context);
              return Scaffold(
                backgroundColor: t.bg,
                body: const EventSuccessCompanionLoadingPageBody(),
              );
            },
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route skeleton',
  type: CompanionSkeleton,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget companionSkeletonState(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CompanionSkeleton',
    contractId: 'state.event_success.companion.route_loading',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookCompanionDeviceFrame(child: CompanionSkeleton()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route error',
  type: CompanionErrorState,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget companionErrorStateStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CompanionErrorState',
    contractId: 'state.event_success.companion.route_error',
    children: [
      WidgetbookPageStateCard(
        label: 'event load error',
        child: WidgetbookCompanionDeviceFrame(
          child: CompanionErrorState(
            error: Exception('offline'),
            errorContext: AppErrorContext.event,
            onRetry: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route message',
  type: CompanionEmptyState,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget companionEmptyStateStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CompanionEmptyState',
    contractId: 'state.event_success.companion.route_message',
    children: [
      WidgetbookPageStateCard(
        label: 'no booking',
        child: WidgetbookCompanionDeviceFrame(
          child: CompanionEmptyState(
            title: 'No booking for this event',
            message: 'Book a spot to open the live guide.',
          ),
        ),
      ),
    ],
  );
}
