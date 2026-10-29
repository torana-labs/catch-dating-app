import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Opens a deep-link [route] through go_router, catching navigation failures
/// and surfacing them as branded Catch error snackbars.
///
/// Extracted from [ActivityScreen] and [ActivitySection]/[NotificationDayList]
/// to avoid duplicating the error-handling boilerplate.
void openNotificationRoute(BuildContext context, String route) {
  try {
    unawaited(
      context.push(route).catchError((Object error, StackTrace stackTrace) {
        if (!context.mounted) return null;
        showNotificationRouteError(context, error, stackTrace);
        return null;
      }),
    );
  } on Object catch (error, stackTrace) {
    showNotificationRouteError(context, error, stackTrace);
  }
}

/// Displays a branded Catch snackbar for notification navigation failures.
void showNotificationRouteError(
  BuildContext context,
  Object error,
  StackTrace stackTrace,
) {
  showCatchNoticeError(
    context,
    ExternalActionException(
      context.l10n.dashboardNotificationRouteUtilVisiblecopyCouldNotOpenThis,
      cause: error,
      stackTrace: stackTrace,
    ),
  );
}
