import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_bills_controller.g.dart';

@riverpod
HostOrganizerBillsController hostOrganizerBillsController(Ref ref) =>
    HostOrganizerBillsController(ref);

class HostOrganizerBillsController {
  const HostOrganizerBillsController(this._ref);

  static final payMutation = Mutation<void>();

  final Ref _ref;

  /// Opens a bill's Razorpay payment page outside the app.
  Future<void> openPaymentLink(String paymentUrl) async {
    final opened = await _ref
        .read(externalLinkControllerProvider)
        .openExternal(Uri.parse(paymentUrl));
    if (!opened) {
      throw const ExternalActionException(
        'Could not open the bill payment page.',
      );
    }
  }
}
