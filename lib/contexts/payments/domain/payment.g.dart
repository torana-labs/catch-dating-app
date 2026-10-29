// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Payment _$PaymentFromJson(Map<String, dynamic> json) => _Payment(
  id: json['id'] as String,
  userId: json['userId'] as String,
  orderId: json['orderId'] as String,
  paymentId: json['paymentId'] as String,
  eventId: json['eventId'] as String,
  amount: (json['amount'] as num).toInt(),
  currency: json['currency'] as String? ?? defaultCurrencyCode,
  status: $enumDecode(
    _$PaymentStatusEnumMap,
    json['status'],
    unknownValue: PaymentStatus.failed,
  ),
  signUpFailed: json['signUpFailed'] as bool? ?? false,
  cancellationRefund: json['cancellationRefund'] == null
      ? null
      : PaymentCancellationRefund.fromJson(
          json['cancellationRefund'] as Map<String, dynamic>,
        ),
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
);

Map<String, dynamic> _$PaymentToJson(_Payment instance) => <String, dynamic>{
  'userId': instance.userId,
  'orderId': instance.orderId,
  'paymentId': instance.paymentId,
  'eventId': instance.eventId,
  'amount': instance.amount,
  'currency': instance.currency,
  'status': _$PaymentStatusEnumMap[instance.status]!,
  'signUpFailed': instance.signUpFailed,
  'cancellationRefund': instance.cancellationRefund?.toJson(),
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
};

const _$PaymentStatusEnumMap = {
  PaymentStatus.pending: 'pending',
  PaymentStatus.completed: 'completed',
  PaymentStatus.failed: 'failed',
  PaymentStatus.refunded: 'refunded',
  PaymentStatus.refundFailed: 'refundFailed',
};

_PaymentCancellationRefund _$PaymentCancellationRefundFromJson(
  Map<String, dynamic> json,
) => _PaymentCancellationRefund(
  state: $enumDecode(
    _$PaymentCancellationRefundStateEnumMap,
    json['state'],
    unknownValue: PaymentCancellationRefundState.reviewRequired,
  ),
  targetAmountMinor: (json['targetAmountMinor'] as num).toInt(),
  confirmedAmountMinor: (json['confirmedAmountMinor'] as num).toInt(),
);

Map<String, dynamic> _$PaymentCancellationRefundToJson(
  _PaymentCancellationRefund instance,
) => <String, dynamic>{
  'state': _$PaymentCancellationRefundStateEnumMap[instance.state]!,
  'targetAmountMinor': instance.targetAmountMinor,
  'confirmedAmountMinor': instance.confirmedAmountMinor,
};

const _$PaymentCancellationRefundStateEnumMap = {
  PaymentCancellationRefundState.pending: 'pending',
  PaymentCancellationRefundState.complete: 'complete',
  PaymentCancellationRefundState.reviewRequired: 'reviewRequired',
};
