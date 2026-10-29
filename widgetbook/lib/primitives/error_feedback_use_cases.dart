import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Mapped failures and retry policy',
  type: CatchLocalizedErrorBanner,
  path: '[Core adapters]/Feedback',
)
Widget localizedErrorBannerStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Localized error banner',
      catalogId: 'catch.banner.localized',
      children: [
        CatchLocalizedErrorBanner(
          const NetworkException('timeout', 'Request timed out.'),
          onRetry: () {},
        ),
        const CatchLocalizedErrorBanner(
          NetworkException('timeout', 'Request timed out.'),
        ),
        CatchLocalizedErrorBanner(
          const PermissionException('Access denied.'),
          onRetry: () {},
        ),
      ],
    );
