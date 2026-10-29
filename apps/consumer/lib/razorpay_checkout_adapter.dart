import 'dart:async';

import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:flutter/services.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

abstract interface class RazorpayGateway {
  void onSuccess(void Function(PaymentSuccessResponse response) handler);

  void onFailure(void Function(PaymentFailureResponse response) handler);

  void open(Map<String, dynamic> options);

  void clear();
}

/// One native checkout may own the plugin channel for the app's lifetime.
/// Auth-scoped repositories may end sooner; clearing Dart listeners cannot
/// cancel a native checkout or prove that no charge occurred.
final class RazorpayNativeCheckoutCoordinator {
  RazorpayNativeCheckoutCoordinator({
    MethodChannel channel = const MethodChannel('razorpay_flutter'),
  }) : _channel = channel;

  final MethodChannel _channel;
  _NativeCheckoutLease? _active;

  _NativeCheckoutLease _reserve() {
    if (_active != null) {
      throw const PaymentFailedException(
        'A previous checkout is still open or its result is unknown. '
        'Please check its status before trying again.',
      );
    }
    return _active = _NativeCheckoutLease();
  }

  void _clear(_NativeCheckoutLease lease) {
    if (!lease.opened && identical(_active, lease)) _active = null;
  }

  Future<Map<dynamic, dynamic>> _open(
    _NativeCheckoutLease lease,
    Map<String, dynamic> options,
  ) async {
    if (!identical(_active, lease) || lease.opened) {
      throw const PaymentFailedException('This checkout attempt has ended.');
    }
    final expectedOrderId = options['order_id'];
    if (expectedOrderId is! String || expectedOrderId.isEmpty) {
      _clear(lease);
      throw const PaymentVerificationFailedException();
    }
    lease.opened = true;
    try {
      // The SDK's Dart on() registration runs an unrelated async resync.
      // Await the native invocation itself so an unkeyed failure can only
      // belong to this exclusive open, never to an earlier resync callback.
      final result = await _channel.invokeMapMethod<dynamic, dynamic>(
        'open',
        options,
      );
      final data = result?['data'];
      final validSuccess =
          result?['type'] is int &&
          result?['type'] == 0 &&
          data is Map &&
          data['razorpay_order_id'] == expectedOrderId &&
          data['razorpay_payment_id'] is String &&
          (data['razorpay_payment_id'] as String).isNotEmpty &&
          data['razorpay_signature'] is String &&
          (data['razorpay_signature'] as String).isNotEmpty;
      final validFailure =
          result?['type'] is int &&
          result?['type'] == 1 &&
          data is Map &&
          data['code'] is int &&
          const {
            Razorpay.NETWORK_ERROR,
            Razorpay.INVALID_OPTIONS,
            Razorpay.PAYMENT_CANCELLED,
            Razorpay.TLS_ERROR,
            Razorpay.INCOMPATIBLE_PLUGIN,
            Razorpay.UNKNOWN_ERROR,
          }.contains(data['code']) &&
          (data['message'] == null || data['message'] is String);
      if (!validSuccess && !validFailure) {
        // A malformed/mismatched response does not prove that this checkout
        // ended. Keep the lease instead of admitting another native open.
        throw const PaymentVerificationFailedException();
      }
      if (identical(_active, lease)) _active = null;
      return result!;
    } on MissingPluginException {
      // No native handler existed, so no checkout could have opened.
      if (identical(_active, lease)) _active = null;
      rethrow;
    }
    // Other platform/transport errors retain ownership: whether native work
    // happened is unknown. clear() intentionally cannot discharge this lease.
  }
}

final class _NativeCheckoutLease {
  bool opened = false;
}

final class PluginRazorpayGateway implements RazorpayGateway {
  PluginRazorpayGateway({
    required RazorpayNativeCheckoutCoordinator coordinator,
  }) : _coordinator = coordinator,
       _lease = coordinator._reserve();

  final RazorpayNativeCheckoutCoordinator _coordinator;
  final _NativeCheckoutLease _lease;
  void Function(PaymentSuccessResponse response)? _onSuccess;
  void Function(PaymentFailureResponse response)? _onFailure;
  bool _cleared = false;

  @override
  void onSuccess(void Function(PaymentSuccessResponse response) handler) {
    _onSuccess = handler;
  }

  @override
  void onFailure(void Function(PaymentFailureResponse response) handler) {
    _onFailure = handler;
  }

  @override
  void open(Map<String, dynamic> options) {
    final onSuccess = _onSuccess;
    final onFailure = _onFailure;
    unawaited(_open(options, onSuccess, onFailure));
  }

  Future<void> _open(
    Map<String, dynamic> options,
    void Function(PaymentSuccessResponse response)? onSuccess,
    void Function(PaymentFailureResponse response)? onFailure,
  ) async {
    Map<dynamic, dynamic> result;
    try {
      result = await _coordinator._open(_lease, options);
    } catch (_) {
      if (!_cleared) {
        onFailure?.call(
          PaymentFailureResponse(
            Razorpay.UNKNOWN_ERROR,
            'The checkout result could not be confirmed. '
            'Please check its status before trying again.',
            null,
          ),
        );
      }
      return;
    }
    if (_cleared) return;
    final data = result['data'] as Map<dynamic, dynamic>;
    if (result['type'] == 0) {
      onSuccess?.call(PaymentSuccessResponse.fromMap(data));
    } else {
      onFailure?.call(PaymentFailureResponse.fromMap(data));
    }
  }

  @override
  void clear() {
    _cleared = true;
    _onSuccess = null;
    _onFailure = null;
    _coordinator._clear(_lease);
  }
}

class PluginRazorpayCheckout implements RazorpayCheckout {
  PluginRazorpayCheckout({required RazorpayGateway gateway})
    : _gateway = gateway;

  final RazorpayGateway _gateway;

  @override
  void configure({
    required RazorpaySuccessHandler onSuccess,
    required RazorpayFailureHandler onFailure,
  }) {
    _gateway.onSuccess((response) {
      onSuccess(
        RazorpaySuccessResponse(
          paymentId: response.paymentId,
          orderId: response.orderId,
          signature: response.signature,
        ),
      );
    });
    _gateway.onFailure((response) {
      onFailure(
        RazorpayFailureResponse(
          isCancelled: response.code == Razorpay.PAYMENT_CANCELLED,
          message: response.message,
        ),
      );
    });
  }

  @override
  void open(Map<String, dynamic> options) => _gateway.open(options);

  @override
  void clear() => _gateway.clear();
}
