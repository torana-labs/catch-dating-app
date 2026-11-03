import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Shows the device-local Host measurement choice without persisting it.
Future<bool?> showHostAnalyticsConsentDialog(BuildContext context) =>
    showCatchAdaptiveDialog<bool>(
      context: context,
      title: context.l10n.hostAnalyticsPrivacyTitle,
      message: context.l10n.hostAnalyticsPrivacyBody,
      actions: [
        CatchDialogAction(
          label: context.l10n.hostAnalyticsPrivacyDeny,
          value: false,
        ),
        CatchDialogAction(
          label: context.l10n.hostAnalyticsPrivacyAllow,
          value: true,
        ),
      ],
    );
