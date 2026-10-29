// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'payment.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Payment {

@JsonKey(includeToJson: false) String get id; String get userId; String get orderId; String get paymentId; String get eventId; int get amount; String get currency;@JsonKey(unknownEnumValue: PaymentStatus.failed) PaymentStatus get status; bool get signUpFailed; PaymentCancellationRefund? get cancellationRefund;@TimestampConverter() DateTime get createdAt;
/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PaymentCopyWith<Payment> get copyWith => _$PaymentCopyWithImpl<Payment>(this as Payment, _$identity);

  /// Serializes this Payment to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Payment&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.orderId, orderId) || other.orderId == orderId)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.status, status) || other.status == status)&&(identical(other.signUpFailed, signUpFailed) || other.signUpFailed == signUpFailed)&&(identical(other.cancellationRefund, cancellationRefund) || other.cancellationRefund == cancellationRefund)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,orderId,paymentId,eventId,amount,currency,status,signUpFailed,cancellationRefund,createdAt);

@override
String toString() {
  return 'Payment(id: $id, userId: $userId, orderId: $orderId, paymentId: $paymentId, eventId: $eventId, amount: $amount, currency: $currency, status: $status, signUpFailed: $signUpFailed, cancellationRefund: $cancellationRefund, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $PaymentCopyWith<$Res>  {
  factory $PaymentCopyWith(Payment value, $Res Function(Payment) _then) = _$PaymentCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String userId, String orderId, String paymentId, String eventId, int amount, String currency,@JsonKey(unknownEnumValue: PaymentStatus.failed) PaymentStatus status, bool signUpFailed, PaymentCancellationRefund? cancellationRefund,@TimestampConverter() DateTime createdAt
});


$PaymentCancellationRefundCopyWith<$Res>? get cancellationRefund;

}
/// @nodoc
class _$PaymentCopyWithImpl<$Res>
    implements $PaymentCopyWith<$Res> {
  _$PaymentCopyWithImpl(this._self, this._then);

  final Payment _self;
  final $Res Function(Payment) _then;

/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? orderId = null,Object? paymentId = null,Object? eventId = null,Object? amount = null,Object? currency = null,Object? status = null,Object? signUpFailed = null,Object? cancellationRefund = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,orderId: null == orderId ? _self.orderId : orderId // ignore: cast_nullable_to_non_nullable
as String,paymentId: null == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as PaymentStatus,signUpFailed: null == signUpFailed ? _self.signUpFailed : signUpFailed // ignore: cast_nullable_to_non_nullable
as bool,cancellationRefund: freezed == cancellationRefund ? _self.cancellationRefund : cancellationRefund // ignore: cast_nullable_to_non_nullable
as PaymentCancellationRefund?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}
/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PaymentCancellationRefundCopyWith<$Res>? get cancellationRefund {
    if (_self.cancellationRefund == null) {
    return null;
  }

  return $PaymentCancellationRefundCopyWith<$Res>(_self.cancellationRefund!, (value) {
    return _then(_self.copyWith(cancellationRefund: value));
  });
}
}


/// Adds pattern-matching-related methods to [Payment].
extension PaymentPatterns on Payment {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Payment value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Payment() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Payment value)  $default,){
final _that = this;
switch (_that) {
case _Payment():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Payment value)?  $default,){
final _that = this;
switch (_that) {
case _Payment() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String userId,  String orderId,  String paymentId,  String eventId,  int amount,  String currency, @JsonKey(unknownEnumValue: PaymentStatus.failed)  PaymentStatus status,  bool signUpFailed,  PaymentCancellationRefund? cancellationRefund, @TimestampConverter()  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Payment() when $default != null:
return $default(_that.id,_that.userId,_that.orderId,_that.paymentId,_that.eventId,_that.amount,_that.currency,_that.status,_that.signUpFailed,_that.cancellationRefund,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String userId,  String orderId,  String paymentId,  String eventId,  int amount,  String currency, @JsonKey(unknownEnumValue: PaymentStatus.failed)  PaymentStatus status,  bool signUpFailed,  PaymentCancellationRefund? cancellationRefund, @TimestampConverter()  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _Payment():
return $default(_that.id,_that.userId,_that.orderId,_that.paymentId,_that.eventId,_that.amount,_that.currency,_that.status,_that.signUpFailed,_that.cancellationRefund,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String userId,  String orderId,  String paymentId,  String eventId,  int amount,  String currency, @JsonKey(unknownEnumValue: PaymentStatus.failed)  PaymentStatus status,  bool signUpFailed,  PaymentCancellationRefund? cancellationRefund, @TimestampConverter()  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Payment() when $default != null:
return $default(_that.id,_that.userId,_that.orderId,_that.paymentId,_that.eventId,_that.amount,_that.currency,_that.status,_that.signUpFailed,_that.cancellationRefund,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Payment implements Payment {
  const _Payment({@JsonKey(includeToJson: false) required this.id, required this.userId, required this.orderId, required this.paymentId, required this.eventId, required this.amount, this.currency = defaultCurrencyCode, @JsonKey(unknownEnumValue: PaymentStatus.failed) required this.status, this.signUpFailed = false, this.cancellationRefund, @TimestampConverter() required this.createdAt});
  factory _Payment.fromJson(Map<String, dynamic> json) => _$PaymentFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String userId;
@override final  String orderId;
@override final  String paymentId;
@override final  String eventId;
@override final  int amount;
@override@JsonKey() final  String currency;
@override@JsonKey(unknownEnumValue: PaymentStatus.failed) final  PaymentStatus status;
@override@JsonKey() final  bool signUpFailed;
@override final  PaymentCancellationRefund? cancellationRefund;
@override@TimestampConverter() final  DateTime createdAt;

/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PaymentCopyWith<_Payment> get copyWith => __$PaymentCopyWithImpl<_Payment>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PaymentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Payment&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.orderId, orderId) || other.orderId == orderId)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.status, status) || other.status == status)&&(identical(other.signUpFailed, signUpFailed) || other.signUpFailed == signUpFailed)&&(identical(other.cancellationRefund, cancellationRefund) || other.cancellationRefund == cancellationRefund)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,orderId,paymentId,eventId,amount,currency,status,signUpFailed,cancellationRefund,createdAt);

@override
String toString() {
  return 'Payment(id: $id, userId: $userId, orderId: $orderId, paymentId: $paymentId, eventId: $eventId, amount: $amount, currency: $currency, status: $status, signUpFailed: $signUpFailed, cancellationRefund: $cancellationRefund, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$PaymentCopyWith<$Res> implements $PaymentCopyWith<$Res> {
  factory _$PaymentCopyWith(_Payment value, $Res Function(_Payment) _then) = __$PaymentCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String userId, String orderId, String paymentId, String eventId, int amount, String currency,@JsonKey(unknownEnumValue: PaymentStatus.failed) PaymentStatus status, bool signUpFailed, PaymentCancellationRefund? cancellationRefund,@TimestampConverter() DateTime createdAt
});


@override $PaymentCancellationRefundCopyWith<$Res>? get cancellationRefund;

}
/// @nodoc
class __$PaymentCopyWithImpl<$Res>
    implements _$PaymentCopyWith<$Res> {
  __$PaymentCopyWithImpl(this._self, this._then);

  final _Payment _self;
  final $Res Function(_Payment) _then;

/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? orderId = null,Object? paymentId = null,Object? eventId = null,Object? amount = null,Object? currency = null,Object? status = null,Object? signUpFailed = null,Object? cancellationRefund = freezed,Object? createdAt = null,}) {
  return _then(_Payment(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,orderId: null == orderId ? _self.orderId : orderId // ignore: cast_nullable_to_non_nullable
as String,paymentId: null == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as PaymentStatus,signUpFailed: null == signUpFailed ? _self.signUpFailed : signUpFailed // ignore: cast_nullable_to_non_nullable
as bool,cancellationRefund: freezed == cancellationRefund ? _self.cancellationRefund : cancellationRefund // ignore: cast_nullable_to_non_nullable
as PaymentCancellationRefund?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

/// Create a copy of Payment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PaymentCancellationRefundCopyWith<$Res>? get cancellationRefund {
    if (_self.cancellationRefund == null) {
    return null;
  }

  return $PaymentCancellationRefundCopyWith<$Res>(_self.cancellationRefund!, (value) {
    return _then(_self.copyWith(cancellationRefund: value));
  });
}
}


/// @nodoc
mixin _$PaymentCancellationRefund {

@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired) PaymentCancellationRefundState get state; int get targetAmountMinor; int get confirmedAmountMinor;
/// Create a copy of PaymentCancellationRefund
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PaymentCancellationRefundCopyWith<PaymentCancellationRefund> get copyWith => _$PaymentCancellationRefundCopyWithImpl<PaymentCancellationRefund>(this as PaymentCancellationRefund, _$identity);

  /// Serializes this PaymentCancellationRefund to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PaymentCancellationRefund&&(identical(other.state, state) || other.state == state)&&(identical(other.targetAmountMinor, targetAmountMinor) || other.targetAmountMinor == targetAmountMinor)&&(identical(other.confirmedAmountMinor, confirmedAmountMinor) || other.confirmedAmountMinor == confirmedAmountMinor));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,state,targetAmountMinor,confirmedAmountMinor);

@override
String toString() {
  return 'PaymentCancellationRefund(state: $state, targetAmountMinor: $targetAmountMinor, confirmedAmountMinor: $confirmedAmountMinor)';
}


}

/// @nodoc
abstract mixin class $PaymentCancellationRefundCopyWith<$Res>  {
  factory $PaymentCancellationRefundCopyWith(PaymentCancellationRefund value, $Res Function(PaymentCancellationRefund) _then) = _$PaymentCancellationRefundCopyWithImpl;
@useResult
$Res call({
@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired) PaymentCancellationRefundState state, int targetAmountMinor, int confirmedAmountMinor
});




}
/// @nodoc
class _$PaymentCancellationRefundCopyWithImpl<$Res>
    implements $PaymentCancellationRefundCopyWith<$Res> {
  _$PaymentCancellationRefundCopyWithImpl(this._self, this._then);

  final PaymentCancellationRefund _self;
  final $Res Function(PaymentCancellationRefund) _then;

/// Create a copy of PaymentCancellationRefund
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? state = null,Object? targetAmountMinor = null,Object? confirmedAmountMinor = null,}) {
  return _then(_self.copyWith(
state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as PaymentCancellationRefundState,targetAmountMinor: null == targetAmountMinor ? _self.targetAmountMinor : targetAmountMinor // ignore: cast_nullable_to_non_nullable
as int,confirmedAmountMinor: null == confirmedAmountMinor ? _self.confirmedAmountMinor : confirmedAmountMinor // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [PaymentCancellationRefund].
extension PaymentCancellationRefundPatterns on PaymentCancellationRefund {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PaymentCancellationRefund value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PaymentCancellationRefund() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PaymentCancellationRefund value)  $default,){
final _that = this;
switch (_that) {
case _PaymentCancellationRefund():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PaymentCancellationRefund value)?  $default,){
final _that = this;
switch (_that) {
case _PaymentCancellationRefund() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired)  PaymentCancellationRefundState state,  int targetAmountMinor,  int confirmedAmountMinor)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PaymentCancellationRefund() when $default != null:
return $default(_that.state,_that.targetAmountMinor,_that.confirmedAmountMinor);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired)  PaymentCancellationRefundState state,  int targetAmountMinor,  int confirmedAmountMinor)  $default,) {final _that = this;
switch (_that) {
case _PaymentCancellationRefund():
return $default(_that.state,_that.targetAmountMinor,_that.confirmedAmountMinor);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired)  PaymentCancellationRefundState state,  int targetAmountMinor,  int confirmedAmountMinor)?  $default,) {final _that = this;
switch (_that) {
case _PaymentCancellationRefund() when $default != null:
return $default(_that.state,_that.targetAmountMinor,_that.confirmedAmountMinor);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PaymentCancellationRefund implements PaymentCancellationRefund {
  const _PaymentCancellationRefund({@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired) required this.state, required this.targetAmountMinor, required this.confirmedAmountMinor});
  factory _PaymentCancellationRefund.fromJson(Map<String, dynamic> json) => _$PaymentCancellationRefundFromJson(json);

@override@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired) final  PaymentCancellationRefundState state;
@override final  int targetAmountMinor;
@override final  int confirmedAmountMinor;

/// Create a copy of PaymentCancellationRefund
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PaymentCancellationRefundCopyWith<_PaymentCancellationRefund> get copyWith => __$PaymentCancellationRefundCopyWithImpl<_PaymentCancellationRefund>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PaymentCancellationRefundToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PaymentCancellationRefund&&(identical(other.state, state) || other.state == state)&&(identical(other.targetAmountMinor, targetAmountMinor) || other.targetAmountMinor == targetAmountMinor)&&(identical(other.confirmedAmountMinor, confirmedAmountMinor) || other.confirmedAmountMinor == confirmedAmountMinor));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,state,targetAmountMinor,confirmedAmountMinor);

@override
String toString() {
  return 'PaymentCancellationRefund(state: $state, targetAmountMinor: $targetAmountMinor, confirmedAmountMinor: $confirmedAmountMinor)';
}


}

/// @nodoc
abstract mixin class _$PaymentCancellationRefundCopyWith<$Res> implements $PaymentCancellationRefundCopyWith<$Res> {
  factory _$PaymentCancellationRefundCopyWith(_PaymentCancellationRefund value, $Res Function(_PaymentCancellationRefund) _then) = __$PaymentCancellationRefundCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(unknownEnumValue: PaymentCancellationRefundState.reviewRequired) PaymentCancellationRefundState state, int targetAmountMinor, int confirmedAmountMinor
});




}
/// @nodoc
class __$PaymentCancellationRefundCopyWithImpl<$Res>
    implements _$PaymentCancellationRefundCopyWith<$Res> {
  __$PaymentCancellationRefundCopyWithImpl(this._self, this._then);

  final _PaymentCancellationRefund _self;
  final $Res Function(_PaymentCancellationRefund) _then;

/// Create a copy of PaymentCancellationRefund
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? state = null,Object? targetAmountMinor = null,Object? confirmedAmountMinor = null,}) {
  return _then(_PaymentCancellationRefund(
state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as PaymentCancellationRefundState,targetAmountMinor: null == targetAmountMinor ? _self.targetAmountMinor : targetAmountMinor // ignore: cast_nullable_to_non_nullable
as int,confirmedAmountMinor: null == confirmedAmountMinor ? _self.confirmedAmountMinor : confirmedAmountMinor // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
