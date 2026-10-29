import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Mapped failures and explicit recovery',
  type: CatchLocalizedErrorState,
  path: '[Core adapters]/Feedback',
)
Widget localizedErrorStateCases(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Localized error state',
  catalogId: 'catch.error_state.localized_error_state',
  children: [
    CatchLocalizedErrorState(
      const NetworkException('timeout', 'Request timed out.'),
      mode: CatchErrorStateMode.inline,
      onRetry: () {},
    ),
    CatchLocalizedErrorState(
      const ValidationException('Invalid details.'),
      mode: CatchErrorStateMode.compact,
      onRetry: () {},
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Mapped route failure',
  type: CatchLocalizedErrorScaffold,
  path: '[Core adapters]/Feedback',
)
Widget localizedErrorScaffoldCases(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Localized error scaffold',
      catalogId: 'catch.error_state.localized_error_scaffold',
      children: [
        SizedBox(
          height: 480,
          child: CatchLocalizedErrorScaffold(
            const PermissionException('Access denied.'),
            actions: [CatchErrorBackButton(onPressed: () {})],
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Mapped sliver placements',
  type: CatchLocalizedSliverErrorState,
  path: '[Core adapters]/Feedback',
)
Widget localizedSliverErrorStateCases(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Localized sliver error',
      catalogId: 'catch.error_state.localized_sliver_error_state',
      children: [
        for (final fillRemaining in [true, false])
          SizedBox(
            height: 420,
            child: CustomScrollView(
              slivers: [
                CatchLocalizedSliverErrorState(
                  const NetworkException('timeout', 'Request timed out.'),
                  fillRemaining: fillRemaining,
                  onRetry: () {},
                ),
              ],
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Mapped inline and compact failures',
  type: CatchLocalizedErrorState,
  path: '[Core adapters]/Feedback',
)
Widget localizedInlineErrorStateCases(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Localized inline error',
      catalogId: 'catch.error_state.localized_error_state.modes',
      children: [
        for (final compact in [false, true])
          CatchLocalizedErrorState(
            const ValidationException('Invalid details.'),
            mode: (compact)
                ? CatchErrorStateMode.compact
                : CatchErrorStateMode.inline,
            onRetry: () {},
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Default and caller-owned recovery',
  type: CatchErrorBackButton,
  path: '[Core primitives]/Feedback',
)
Widget errorBackActionCases(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Error back action',
  catalogId: 'catch.error_state.error_back_action',
  children: [
    Align(
      alignment: Alignment.centerLeft,
      child: CatchErrorBackButton(onPressed: () {}),
    ),
    Align(
      alignment: Alignment.centerLeft,
      child: CatchErrorBackButton(label: 'Return to list', onPressed: () {}),
    ),
  ],
);
