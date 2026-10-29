import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Manager settings for future offers; existing offers retain recorded terms.
class HostEventOfferPreferencesScreen extends ConsumerStatefulWidget {
  const HostEventOfferPreferencesScreen({
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
  ConsumerState<HostEventOfferPreferencesScreen> createState() =>
      _HostEventOfferPreferencesScreenState();
}

class _HostEventOfferPreferencesScreenState
    extends ConsumerState<HostEventOfferPreferencesScreen> {
  EventEditorScope? _loadedScope;
  @override
  Widget build(BuildContext context) {
    final auth = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    if (auth.isLoading) {
      _loadedScope = null;
      return const CatchScaffold.stepFlow(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    final uid = auth.isSettledData ? auth.value : null;
    if (!auth.hasError && uid != null && uid.isNotEmpty) {
      final scope = (
        userId: uid,
        organizerId: widget.organizerId,
        eventId: widget.eventId,
      );
      // Retain the scoped editor while its page is mounted. Initial loading is
      // scheduled after build; identity changes cannot load an obsolete scope.
      ref.watch(eventOfferPreferencesControllerProvider(scope));
      if (_loadedScope != scope) {
        _loadedScope = scope;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _loadedScope == scope) {
            unawaited(
              ref
                  .read(eventOfferPreferencesControllerProvider(scope).notifier)
                  .load(),
            );
          }
        });
      }
      return HostOfferPaymentSetupPageBody(
        key: ValueKey(scope),
        scope: scope,
        eventName: widget.eventName,
        onBack: widget.onBack,
      );
    }
    _loadedScope = null;
    return CatchScaffold.stepFlow(
      body: CatchErrorState(
        title: context.l10n.hostsEventPreferenceError,
        message: appErrorMessage(
          auth.error ??
              const SignInRequiredException('edit event offer settings'),
          l10n: context.l10n,
          context: AppErrorContext.event,
        ),
        retryLabel: context.l10n.hostsPrivateEventRetryDefaultsRead,
        onRetry: () => ref.invalidate(uidProvider),
        actions: [CatchErrorBackButton(onPressed: widget.onBack)],
      ),
    );
  }
}
