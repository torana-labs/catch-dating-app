import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/payments_body.dart';
import 'package:catch_dating_app/hosts/organizer/payments_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_organizer_bills_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Payments and billing for one organizer. It reads the Razorpay connection
/// and the Catch bills, owners only, and runs the existing connection
/// commands (the OAuth flow stays as it is) and the bill payment link.
class OrganizerPaymentsScreen extends ConsumerWidget {
  const OrganizerPaymentsScreen({
    super.key,
    required this.organizerId,
    this.now,
  });

  final String organizerId;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostOrganizerBillsController.payMutation],
      errorContext: AppErrorContext.payments,
    );
    final Widget body;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeFallback(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final isOwner = scope.isOwner;
      final connection = isOwner
          ? catchAsyncStateFromAsyncValue(
              ref.watch(hostFormPaymentControllerProvider(organizer.id)),
            )
          : null;
      final bills = isOwner
          ? catchAsyncStateFromAsyncValue(
              ref.watch(hostOrganizerBillsProvider(organizer.id)),
            )
          : null;
      final setupState = connection?.value;
      final state = OrganizerPaymentsState(
        isOwner: isOwner,
        currencyCode: currencyCodeForCityName(organizer.location),
        now: now ?? DateTime.now(),
        setup: setupState?.setup,
        connectionPending: setupState?.pending ?? false,
        connectionError: setupState?.error ?? connection?.error,
        bills: bills?.value,
        billsError: bills?.error,
      );
      body = OrganizerPaymentsBody(
        state: state,
        footer: setupState?.setup.collection?.throughCatch == true
            ? HostPaymentAccountControllerCard(organizer: organizer)
            : null,
        onAction: (action) =>
            unawaited(_act(context, ref, organizer, state, action)),
        onPay: (bill) => unawaited(_pay(ref, bill)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-payments-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOrganizerPaymentsTitle,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: body,
      ),
    );
  }

  Future<void> _act(
    BuildContext context,
    WidgetRef ref,
    Organizer organizer,
    OrganizerPaymentsState state,
    OrganizerPaymentsAction action,
  ) async {
    final connection = hostFormPaymentControllerProvider(organizer.id);
    switch (action) {
      case OrganizerPaymentsAction.connect:
        await ref.read(connection.notifier).connect();
      case OrganizerPaymentsAction.reconnect:
        await ref.read(connection.notifier).reconnect();
      case OrganizerPaymentsAction.refresh:
        await ref.read(connection.notifier).refresh();
      case OrganizerPaymentsAction.retryConnection:
        ref.invalidate(connection);
      case OrganizerPaymentsAction.retryBills:
        ref.invalidate(hostOrganizerBillsProvider(organizer.id));
      case OrganizerPaymentsAction.disconnect:
        final ready = state.readyConnection;
        if (ready == null) return;
        final l10n = context.l10n;
        final confirmed = await showCatchAdaptiveDialog<bool>(
          context: context,
          title: l10n.hostOrganizerRazorpayDisconnectTitle,
          message: l10n.hostOrganizerRazorpayDisconnectBody,
          actions: [
            CatchDialogAction(label: l10n.hostOrganizerCancel, value: false),
            CatchDialogAction(
              label: l10n.hostOrganizerRazorpayDisconnect,
              value: true,
              isDestructive: true,
            ),
          ],
        );
        if (confirmed != true) return;
        await ref.read(connection.notifier).disconnect(ready.connectionId);
      case OrganizerPaymentsAction.comparePlans:
        final opened = await ref
            .read(externalLinkControllerProvider)
            .openExternal(AppConfig.publicSiteUrl.resolve('/host/#pricing'))
            .catchError((Object _) => false);
        if (!opened && context.mounted) {
          showCatchNotice(
            context,
            context.l10n.safetySettingsScreenExternalLinkOpenFailed,
          );
        }
      case OrganizerPaymentsAction.refunds:
        await context.pushNamed<void>(
          Routes.hostOrganizerEventDefaultsScreen.name,
          queryParameters: {'organizerId': organizer.id},
        );
    }
  }

  Future<void> _pay(WidgetRef ref, HostOrganizerBill bill) async {
    final url = bill.paymentUrl;
    if (url == null) return;
    try {
      await HostOrganizerBillsController.payMutation.run(
        ref,
        (tx) =>
            tx.get(hostOrganizerBillsControllerProvider).openPaymentLink(url),
      );
    } on Object {
      // The mutation listener shows the error.
    }
  }
}
