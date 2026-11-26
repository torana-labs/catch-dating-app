import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// How one event's future offers are paid for and held: the collection
/// mode, the amount, how long an offer lasts, the page link, instructions
/// and the offer message. Offers already made keep their terms.
///
/// Mounts the event's offer-settings editor for the signed-in manager and
/// loads it once per account and event. Save asks the server to review the
/// change, shows that review, and applies it only on Apply; back returns to
/// the offer it came from.
class HostOfferSettingsScreen extends ConsumerStatefulWidget {
  const HostOfferSettingsScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    required this.onBack,
    this.eventName,
  });

  final String organizerId;
  final String eventId;
  final String? eventName;
  final VoidCallback onBack;

  @override
  ConsumerState<HostOfferSettingsScreen> createState() =>
      _HostOfferSettingsScreenState();
}

class _HostOfferSettingsScreenState
    extends ConsumerState<HostOfferSettingsScreen> {
  EventEditorScope? _loaded;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final auth = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = auth.isSettledData ? auth.value : null;
    if (!auth.hasError && uid != null && uid.isNotEmpty) {
      final scope = (
        userId: uid,
        organizerId: widget.organizerId,
        eventId: widget.eventId,
      );
      // Keep the scoped editor while the page is up; load after this frame,
      // so a changed account never loads an old scope.
      ref.watch(eventOfferPreferencesControllerProvider(scope));
      if (_loaded != scope) {
        _loaded = scope;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _loaded == scope) {
            unawaited(
              ref
                  .read(eventOfferPreferencesControllerProvider(scope).notifier)
                  .load(),
            );
          }
        });
      }
      return HostOfferSettingsBody(
        key: ValueKey(scope),
        scope: scope,
        eventName: widget.eventName,
        onBack: widget.onBack,
      );
    }
    _loaded = null;
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOfferPaymentTitle,
          back: CatchTopBarBack(
            label: l10n.hostFormsBack,
            onPressed: widget.onBack,
          ),
        ),
        body: CatchPageBody.screen(
          child: auth.isLoading
              ? const CatchLoadingIndicator()
              : CatchErrorState(
                  title: l10n.hostsEventPreferenceError,
                  message: appErrorMessage(
                    auth.error ??
                        const SignInRequiredException(
                          'edit event offer settings',
                        ),
                    l10n: l10n,
                    context: AppErrorContext.event,
                  ),
                  retryLabel: l10n.hostsPrivateEventRetryDefaultsRead,
                  onRetry: () => ref.invalidate(uidProvider),
                ),
        ),
      ),
    );
  }
}
