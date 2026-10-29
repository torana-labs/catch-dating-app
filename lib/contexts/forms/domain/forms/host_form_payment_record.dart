import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:meta/meta.dart';

enum HostFormPaymentStatus {
  creatingOrder,
  orderUnknown,
  checkoutReady,
  verifying,
  captured,
  submitted,
  failed,
  expired,
  refundPending,
  refunded,
  reviewRequired,
}

enum HostFormPaymentFilter {
  all,
  pending,
  submitted,
  refunds,
  attention;

  List<HostFormPaymentStatus> get statuses => switch (this) {
    all => const [],
    pending => const [
      HostFormPaymentStatus.creatingOrder,
      HostFormPaymentStatus.orderUnknown,
      HostFormPaymentStatus.checkoutReady,
      HostFormPaymentStatus.verifying,
      HostFormPaymentStatus.captured,
    ],
    submitted => const [HostFormPaymentStatus.submitted],
    refunds => const [
      HostFormPaymentStatus.refundPending,
      HostFormPaymentStatus.refunded,
    ],
    attention => const [
      HostFormPaymentStatus.failed,
      HostFormPaymentStatus.expired,
      HostFormPaymentStatus.reviewRequired,
    ],
  };
}

/// Minimal financial projection; unfinished answers and identity stay private.
@immutable
class HostFormPaymentRecord {
  const HostFormPaymentRecord({
    required this.paymentId,
    required this.status,
    required this.mode,
    required this.amountPaise,
    required this.refundedAmountPaise,
    required this.createdAt,
    required this.updatedAt,
    required this.receipt,
    this.capturedAt,
    this.submittedAt,
    this.responseId,
    this.providerOrderId,
    this.providerPaymentId,
    this.providerRefundId,
  });

  factory HostFormPaymentRecord.fromMap(Map<Object?, Object?> map) {
    final amount = map['amountPaise'];
    final refunded = map['refundedAmountPaise'];
    if (map['currency'] != 'INR' ||
        amount is! int ||
        amount < 100 ||
        amount > 10000000 ||
        refunded is! int ||
        refunded < 0 ||
        refunded > amount) {
      throw const FormatException('Invalid form payment amounts.');
    }
    return HostFormPaymentRecord(
      paymentId: formDefinitionRequiredString(map, 'paymentId'),
      status: formDefinitionEnumByName(
        HostFormPaymentStatus.values,
        formDefinitionRequiredString(map, 'status'),
        'payment status',
      ),
      mode: formDefinitionEnumByName(
        HostFormPaymentMode.values,
        formDefinitionRequiredString(map, 'mode'),
        'payment mode',
      ),
      amountPaise: amount,
      refundedAmountPaise: refunded,
      createdAt: formDefinitionDateTimeFromMillis(map, 'createdAtMillis'),
      updatedAt: formDefinitionDateTimeFromMillis(map, 'updatedAtMillis'),
      capturedAt: formDefinitionNullableDateTimeFromMillis(
        map['capturedAtMillis'],
      ),
      submittedAt: formDefinitionNullableDateTimeFromMillis(
        map['submittedAtMillis'],
      ),
      receipt: formDefinitionRequiredString(map, 'receipt'),
      responseId: formDefinitionNullableString(map['responseId']),
      providerOrderId: formDefinitionNullableString(map['providerOrderId']),
      providerPaymentId: formDefinitionNullableString(map['providerPaymentId']),
      providerRefundId: formDefinitionNullableString(map['providerRefundId']),
    );
  }
  final String paymentId;
  final HostFormPaymentStatus status;
  final HostFormPaymentMode mode;
  final int amountPaise;
  final int refundedAmountPaise;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? capturedAt;
  final DateTime? submittedAt;
  final String receipt;
  final String? responseId;
  final String? providerOrderId;
  final String? providerPaymentId;
  final String? providerRefundId;
}

@immutable
class HostFormPaymentPage {
  const HostFormPaymentPage({required this.items, required this.nextCursor});
  factory HostFormPaymentPage.fromCallableData(Object? data) {
    final map = formDefinitionRequiredMap(data, 'form payments');
    return HostFormPaymentPage(
      items: List.unmodifiable(
        formDefinitionMapList(
          map['items'],
          'payments',
        ).map(HostFormPaymentRecord.fromMap),
      ),
      nextCursor: formDefinitionNullableString(map['nextCursor']),
    );
  }
  final List<HostFormPaymentRecord> items;
  final String? nextCursor;
}
