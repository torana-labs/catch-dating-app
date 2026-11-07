import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:flutter/foundation.dart';

/// What a control on Payments and billing asks for.
enum PaymentsAction {
  connect,
  reconnect,
  refresh,
  disconnect,
  comparePlans,
  refunds,
  retryBills,
  retryConnection,
}

/// Payments and billing as plain values: the Razorpay connection, the
/// Catch bills, and whether the viewer may see money at all.
@immutable
class PaymentsState {
  const PaymentsState({
    required this.isOwner,
    required this.currencyCode,
    required this.now,
    this.setup,
    this.connectionPending = false,
    this.connectionError,
    this.bills,
    this.billsError,
  });

  /// Only the owner sees money; everyone else sees why not.
  final bool isOwner;
  final String currencyCode;

  /// The clock that decides whether a sent bill is overdue.
  final DateTime now;

  /// The organizer's Razorpay setup; null while it is first read.
  final HostFormPaymentSetup? setup;

  /// A connect, reconnect, refresh or disconnect is running.
  final bool connectionPending;

  /// The last connection read or command failed.
  final Object? connectionError;

  /// Newest first; null while they are first read.
  final List<HostOrganizerBill>? bills;
  final Object? billsError;

  HostRazorpayConnectionState? get connection => setup?.razorpayConnectionState;

  /// The live connection that takes payments, for Disconnect.
  HostFormPaymentConnection? get readyConnection =>
      setup?.liveConnections.where((item) => item.ready).firstOrNull;

  /// The bill the spotlight shows: the newest one.
  HostOrganizerBill? get currentBill => bills?.firstOrNull;
}
