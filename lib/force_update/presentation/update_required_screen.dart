import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/force_update/data/app_version_config_provider.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_controller.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Blocking screen shown when the running app version is below [minVersion].
///
/// The user cannot dismiss this screen — the only action is to go to the store.
class UpdateRequiredScreen extends ConsumerWidget {
  const UpdateRequiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appVersionConfigProvider);

    return UpdateRequiredBody(
      onUpdateNow: () async {
        final platform = Theme.of(context).platform;
        final controller = ref.read(updateRequiredControllerProvider);

        try {
          final opened = await controller.openStore(
            platform: platform,
            config: config,
          );
          if (!context.mounted) {
            return;
          }
          if (!opened) {
            showCatchNoticeError(
              context,
              const ExternalActionException(
                'Could not open the app store. Please update Catch '
                'from your device\'s app store.',
              ),
            );
          }
        } catch (error) {
          if (context.mounted) {
            showCatchNoticeError(context, error);
          }
        }
      },
    );
  }
}

/// Provider-free full-screen update prompt rendered by [UpdateRequiredScreen].
class UpdateRequiredBody extends StatelessWidget {
  const UpdateRequiredBody({super.key, required this.onUpdateNow});

  final VoidCallback onUpdateNow;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchScaffold.standalone(
      body: Padding(
        padding: CatchInsets.emptyStateContent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(
              CatchIcons.systemUpdateOutlined,
              size: CatchIcon.forceUpdate,
              color: t.primary,
            ),
            gapH32,
            Text(
              context.l10n.forceUpdateUpdateRequiredScreenTextUpdateRequired,
              style: CatchTextStyles.headline(
                context,
              ).copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            gapH12,
            CatchText(
              context.l10n.forceUpdateUpdateRequiredScreenTextANewVersionOf,
              variant: CatchTextVariant.bodyLead,
              color: t.ink2,
              textAlign: TextAlign.center,
            ),
            gapH48,
            CatchButton(
              key: UpdateRequiredKeys.updateNowButton,
              label: context.l10n.forceUpdateUpdateRequiredScreenLabelUpdateNow,
              onPressed: onUpdateNow,
              leading: Icon(CatchIcons.openInNew),
              fullWidth: true,
            ),
          ],
        ),
      ),
    );
  }
}
