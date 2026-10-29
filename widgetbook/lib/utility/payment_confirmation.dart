import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import 'fixtures.dart';
import 'payment_fixture.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: PaymentConfirmationScreen,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentConfirmationScreenStates(BuildContext context) {
  final paidPayment = widgetbookUtilityPayments.first;
  final pendingPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.pending,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PaymentConfirmationScreen',
    contractId: 'screen.payments.confirmation',
    children: [
      WidgetbookPageStateCard(
        label: 'event loading',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsById: const {},
            child: PaymentConfirmationScreen(
              data: _confirmationData(paidPayment),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'joined celebration',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsById: {widgetbookUtilityEvent.id: widgetbookUtilityEvent},
            child: IgnorePointer(
              child: PaymentConfirmationScreen(
                data: _confirmationData(paidPayment),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'external checkout pending',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsById: {widgetbookUtilityEvent.id: widgetbookUtilityEvent},
            paymentsByPaymentId: {pendingPayment.paymentId: pendingPayment},
            child: IgnorePointer(
              child: PaymentConfirmationScreen(
                data: _confirmationData(
                  pendingPayment,
                  checkoutUrl: Uri.parse('https://checkout.example/pay'),
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Loading state',
  type: PaymentConfirmationLoadingScreen,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentConfirmationLoadingScreenStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'PaymentConfirmationLoadingScreen',
    contractId: 'screen.payments.confirmation.loading',
    children: [
      WidgetbookPageStateCard(
        label: 'event loading',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentConfirmationLoadingScreen(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Backdrop states',
  type: PaymentCheckoutHeader,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentCheckoutEventBackdropStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PaymentCheckoutHeader',
    contractId: 'screen.payments.confirmation.checkout_backdrop',
    children: [
      WidgetbookPageStateCard(
        label: 'event summary',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentCheckoutHeader(event: widgetbookUtilityEvent),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Provider states',
  type: PaymentPendingBody,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentPendingCheckoutControllerStates(BuildContext context) {
  final pendingPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.pending,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PaymentPendingBody',
    contractId: 'screen.payments.confirmation.pending_controller',
    children: [
      WidgetbookPageStateCard(
        label: 'checkout pending',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsById: {widgetbookUtilityEvent.id: widgetbookUtilityEvent},
            paymentsByPaymentId: {pendingPayment.paymentId: pendingPayment},
            child: IgnorePointer(
              child: PaymentPendingBody(
                data: _confirmationData(
                  pendingPayment,
                  checkoutUrl: Uri.parse('https://checkout.example/pay'),
                ),
                event: widgetbookUtilityEvent,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: PaymentPendingCheckoutBody,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentPendingCheckoutBodyStates(BuildContext context) {
  final pendingPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.pending,
  );
  final failedPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.refundFailed,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PaymentPendingCheckoutBody',
    contractId: 'screen.payments.confirmation.pending_body',
    children: [
      WidgetbookPageStateCard(
        label: 'pending checkout',
        child: WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: PaymentPendingCheckoutBody(
              data: _confirmationData(
                pendingPayment,
                checkoutUrl: Uri.parse('https://checkout.example/pay'),
              ),
              event: widgetbookUtilityEvent,
              failed: false,
              providerLabel: 'Stripe',
              onOpenCheckout: widgetbookNoop,
              onViewPaymentHistory: widgetbookNoop,
              onBackToEvent: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed checkout',
        child: WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: PaymentPendingCheckoutBody(
              data: _confirmationData(
                failedPayment,
                checkoutUrl: Uri.parse('https://checkout.example/retry'),
              ),
              event: widgetbookUtilityEvent,
              failed: true,
              providerLabel: 'Stripe',
              onOpenCheckout: widgetbookNoop,
              onViewPaymentHistory: widgetbookNoop,
              onBackToEvent: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Provider states',
  type: PaymentConfirmedBody,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentConfirmationBodyControllerStates(BuildContext context) {
  final paidPayment = widgetbookUtilityPayments.first;
  return WidgetbookPageCatalogFrame(
    title: 'PaymentConfirmedBody',
    contractId: 'screen.payments.confirmation.body_controller',
    children: [
      WidgetbookPageStateCard(
        label: 'joined celebration',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsById: {widgetbookUtilityEvent.id: widgetbookUtilityEvent},
            child: IgnorePointer(
              child: PaymentConfirmedBody(
                data: _confirmationData(paidPayment),
                event: widgetbookUtilityEvent,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: PaymentConfirmationBody,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentConfirmationBodyStates(BuildContext context) {
  final paidPayment = widgetbookUtilityPayments.first;
  return WidgetbookPageCatalogFrame(
    title: 'PaymentConfirmationBody',
    contractId: 'screen.payments.confirmation.body',
    children: [
      WidgetbookPageStateCard(
        label: 'joined celebration',
        child: WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: PaymentConfirmationBody(
              data: _confirmationData(paidPayment),
              event: widgetbookUtilityEvent,
              clubName: 'Bandra Breakers',
              onAddToCalendar: widgetbookNoop,
              onOpenDirections: widgetbookNoop,
              onInviteFriend: widgetbookNoop,
              onReferralShare: widgetbookNoop,
              onViewEvent: widgetbookNoop,
              onBackHome: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Checkout sheet states',
  type: PaymentCheckoutSheet,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentCheckoutSheetStates(BuildContext context) {
  final pendingPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.pending,
  );
  final failedPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.refundFailed,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PaymentCheckoutSheet',
    contractId: 'screen.payments.confirmation.checkout_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'pending checkout',
        child: WidgetbookUtilitySheetFrame(
          child: PaymentCheckoutSheet(
            data: _confirmationData(
              pendingPayment,
              checkoutUrl: Uri.parse('https://checkout.example/pay'),
            ),
            event: widgetbookUtilityEvent,
            failed: false,
            providerLabel: 'Stripe',
            onViewPaymentHistory: widgetbookNoop,
            onBackToEvent: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed checkout',
        child: WidgetbookUtilitySheetFrame(
          child: PaymentCheckoutSheet(
            data: _confirmationData(
              failedPayment,
              checkoutUrl: Uri.parse('https://checkout.example/retry'),
            ),
            event: widgetbookUtilityEvent,
            failed: true,
            providerLabel: 'Stripe',
            onOpenCheckout: widgetbookNoop,
            onViewPaymentHistory: widgetbookNoop,
            onBackToEvent: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Info surfaces',
  type: PaymentConfirmationNotice,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentConfirmationInfoStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'Payment confirmation info',
    contractId: 'screen.payments.confirmation.info',
    children: [
      const WidgetbookPageStateCard(
        label: 'heads up',
        child: PaymentConfirmationNotice(),
      ),
      WidgetbookPageStateCard(
        label: 'referral banner',
        child: IgnorePointer(
          child: PaymentReferralBanner(onShare: widgetbookNoop),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Referral banner',
  type: PaymentReferralBanner,
  path: '[P3 utility surfaces]/Payment confirmation',
)
Widget paymentReferralBannerStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PaymentReferralBanner',
    contractId: 'component.payments.referral_banner',
    children: [
      WidgetbookPageStateCard(
        label: 'event referral prompt',
        child: IgnorePointer(
          child: PaymentReferralBanner(onShare: widgetbookNoop),
        ),
      ),
    ],
  );
}

PaymentConfirmationData _confirmationData(Payment payment, {Uri? checkoutUrl}) {
  return PaymentConfirmationData(
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amountInPaise: payment.amount,
    currency: payment.currency,
    eventId: widgetbookUtilityEvent.id,
    provider: checkoutUrl == null ? 'razorpay' : 'stripe',
    status: payment.status,
    checkoutUrl: checkoutUrl,
  );
}
