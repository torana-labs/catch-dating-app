// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_eligibility.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$EventEligibility {





@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventEligibility);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility()';
}


}

/// @nodoc
class $EventEligibilityCopyWith<$Res>  {
$EventEligibilityCopyWith(EventEligibility _, $Res Function(EventEligibility) __);
}


/// Adds pattern-matching-related methods to [EventEligibility].
extension EventEligibilityPatterns on EventEligibility {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( ProfileDetailsRequired value)?  profileDetailsRequired,TResult Function( Eligible value)?  eligible,TResult Function( AlreadySignedUp value)?  alreadySignedUp,TResult Function( OnWaitlist value)?  onWaitlist,TResult Function( Attended value)?  attended,TResult Function( EventPast value)?  eventPast,TResult Function( EventFull value)?  eventFull,TResult Function( EventInviteRequired value)?  inviteRequired,TResult Function( GenderCapacityReached value)?  genderCapacityReached,TResult Function( AgeTooYoung value)?  ageTooYoung,TResult Function( AgeTooOld value)?  ageTooOld,required TResult orElse(),}){
final _that = this;
switch (_that) {
case ProfileDetailsRequired() when profileDetailsRequired != null:
return profileDetailsRequired(_that);case Eligible() when eligible != null:
return eligible(_that);case AlreadySignedUp() when alreadySignedUp != null:
return alreadySignedUp(_that);case OnWaitlist() when onWaitlist != null:
return onWaitlist(_that);case Attended() when attended != null:
return attended(_that);case EventPast() when eventPast != null:
return eventPast(_that);case EventFull() when eventFull != null:
return eventFull(_that);case EventInviteRequired() when inviteRequired != null:
return inviteRequired(_that);case GenderCapacityReached() when genderCapacityReached != null:
return genderCapacityReached(_that);case AgeTooYoung() when ageTooYoung != null:
return ageTooYoung(_that);case AgeTooOld() when ageTooOld != null:
return ageTooOld(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( ProfileDetailsRequired value)  profileDetailsRequired,required TResult Function( Eligible value)  eligible,required TResult Function( AlreadySignedUp value)  alreadySignedUp,required TResult Function( OnWaitlist value)  onWaitlist,required TResult Function( Attended value)  attended,required TResult Function( EventPast value)  eventPast,required TResult Function( EventFull value)  eventFull,required TResult Function( EventInviteRequired value)  inviteRequired,required TResult Function( GenderCapacityReached value)  genderCapacityReached,required TResult Function( AgeTooYoung value)  ageTooYoung,required TResult Function( AgeTooOld value)  ageTooOld,}){
final _that = this;
switch (_that) {
case ProfileDetailsRequired():
return profileDetailsRequired(_that);case Eligible():
return eligible(_that);case AlreadySignedUp():
return alreadySignedUp(_that);case OnWaitlist():
return onWaitlist(_that);case Attended():
return attended(_that);case EventPast():
return eventPast(_that);case EventFull():
return eventFull(_that);case EventInviteRequired():
return inviteRequired(_that);case GenderCapacityReached():
return genderCapacityReached(_that);case AgeTooYoung():
return ageTooYoung(_that);case AgeTooOld():
return ageTooOld(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( ProfileDetailsRequired value)?  profileDetailsRequired,TResult? Function( Eligible value)?  eligible,TResult? Function( AlreadySignedUp value)?  alreadySignedUp,TResult? Function( OnWaitlist value)?  onWaitlist,TResult? Function( Attended value)?  attended,TResult? Function( EventPast value)?  eventPast,TResult? Function( EventFull value)?  eventFull,TResult? Function( EventInviteRequired value)?  inviteRequired,TResult? Function( GenderCapacityReached value)?  genderCapacityReached,TResult? Function( AgeTooYoung value)?  ageTooYoung,TResult? Function( AgeTooOld value)?  ageTooOld,}){
final _that = this;
switch (_that) {
case ProfileDetailsRequired() when profileDetailsRequired != null:
return profileDetailsRequired(_that);case Eligible() when eligible != null:
return eligible(_that);case AlreadySignedUp() when alreadySignedUp != null:
return alreadySignedUp(_that);case OnWaitlist() when onWaitlist != null:
return onWaitlist(_that);case Attended() when attended != null:
return attended(_that);case EventPast() when eventPast != null:
return eventPast(_that);case EventFull() when eventFull != null:
return eventFull(_that);case EventInviteRequired() when inviteRequired != null:
return inviteRequired(_that);case GenderCapacityReached() when genderCapacityReached != null:
return genderCapacityReached(_that);case AgeTooYoung() when ageTooYoung != null:
return ageTooYoung(_that);case AgeTooOld() when ageTooOld != null:
return ageTooOld(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function()?  profileDetailsRequired,TResult Function()?  eligible,TResult Function()?  alreadySignedUp,TResult Function()?  onWaitlist,TResult Function()?  attended,TResult Function()?  eventPast,TResult Function()?  eventFull,TResult Function()?  inviteRequired,TResult Function()?  genderCapacityReached,TResult Function( int minAge)?  ageTooYoung,TResult Function( int maxAge)?  ageTooOld,required TResult orElse(),}) {final _that = this;
switch (_that) {
case ProfileDetailsRequired() when profileDetailsRequired != null:
return profileDetailsRequired();case Eligible() when eligible != null:
return eligible();case AlreadySignedUp() when alreadySignedUp != null:
return alreadySignedUp();case OnWaitlist() when onWaitlist != null:
return onWaitlist();case Attended() when attended != null:
return attended();case EventPast() when eventPast != null:
return eventPast();case EventFull() when eventFull != null:
return eventFull();case EventInviteRequired() when inviteRequired != null:
return inviteRequired();case GenderCapacityReached() when genderCapacityReached != null:
return genderCapacityReached();case AgeTooYoung() when ageTooYoung != null:
return ageTooYoung(_that.minAge);case AgeTooOld() when ageTooOld != null:
return ageTooOld(_that.maxAge);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function()  profileDetailsRequired,required TResult Function()  eligible,required TResult Function()  alreadySignedUp,required TResult Function()  onWaitlist,required TResult Function()  attended,required TResult Function()  eventPast,required TResult Function()  eventFull,required TResult Function()  inviteRequired,required TResult Function()  genderCapacityReached,required TResult Function( int minAge)  ageTooYoung,required TResult Function( int maxAge)  ageTooOld,}) {final _that = this;
switch (_that) {
case ProfileDetailsRequired():
return profileDetailsRequired();case Eligible():
return eligible();case AlreadySignedUp():
return alreadySignedUp();case OnWaitlist():
return onWaitlist();case Attended():
return attended();case EventPast():
return eventPast();case EventFull():
return eventFull();case EventInviteRequired():
return inviteRequired();case GenderCapacityReached():
return genderCapacityReached();case AgeTooYoung():
return ageTooYoung(_that.minAge);case AgeTooOld():
return ageTooOld(_that.maxAge);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function()?  profileDetailsRequired,TResult? Function()?  eligible,TResult? Function()?  alreadySignedUp,TResult? Function()?  onWaitlist,TResult? Function()?  attended,TResult? Function()?  eventPast,TResult? Function()?  eventFull,TResult? Function()?  inviteRequired,TResult? Function()?  genderCapacityReached,TResult? Function( int minAge)?  ageTooYoung,TResult? Function( int maxAge)?  ageTooOld,}) {final _that = this;
switch (_that) {
case ProfileDetailsRequired() when profileDetailsRequired != null:
return profileDetailsRequired();case Eligible() when eligible != null:
return eligible();case AlreadySignedUp() when alreadySignedUp != null:
return alreadySignedUp();case OnWaitlist() when onWaitlist != null:
return onWaitlist();case Attended() when attended != null:
return attended();case EventPast() when eventPast != null:
return eventPast();case EventFull() when eventFull != null:
return eventFull();case EventInviteRequired() when inviteRequired != null:
return inviteRequired();case GenderCapacityReached() when genderCapacityReached != null:
return genderCapacityReached();case AgeTooYoung() when ageTooYoung != null:
return ageTooYoung(_that.minAge);case AgeTooOld() when ageTooOld != null:
return ageTooOld(_that.maxAge);case _:
  return null;

}
}

}

/// @nodoc


class ProfileDetailsRequired implements EventEligibility {
  const ProfileDetailsRequired();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ProfileDetailsRequired);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.profileDetailsRequired()';
}


}




/// @nodoc


class Eligible implements EventEligibility {
  const Eligible();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Eligible);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.eligible()';
}


}




/// @nodoc


class AlreadySignedUp implements EventEligibility {
  const AlreadySignedUp();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AlreadySignedUp);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.alreadySignedUp()';
}


}




/// @nodoc


class OnWaitlist implements EventEligibility {
  const OnWaitlist();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnWaitlist);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.onWaitlist()';
}


}




/// @nodoc


class Attended implements EventEligibility {
  const Attended();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Attended);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.attended()';
}


}




/// @nodoc


class EventPast implements EventEligibility {
  const EventPast();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventPast);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.eventPast()';
}


}




/// @nodoc


class EventFull implements EventEligibility {
  const EventFull();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventFull);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.eventFull()';
}


}




/// @nodoc


class EventInviteRequired implements EventEligibility {
  const EventInviteRequired();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventInviteRequired);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.inviteRequired()';
}


}




/// @nodoc


class GenderCapacityReached implements EventEligibility {
  const GenderCapacityReached();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GenderCapacityReached);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'EventEligibility.genderCapacityReached()';
}


}




/// @nodoc


class AgeTooYoung implements EventEligibility {
  const AgeTooYoung(this.minAge);
  

 final  int minAge;

/// Create a copy of EventEligibility
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AgeTooYoungCopyWith<AgeTooYoung> get copyWith => _$AgeTooYoungCopyWithImpl<AgeTooYoung>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AgeTooYoung&&(identical(other.minAge, minAge) || other.minAge == minAge));
}


@override
int get hashCode => Object.hash(runtimeType,minAge);

@override
String toString() {
  return 'EventEligibility.ageTooYoung(minAge: $minAge)';
}


}

/// @nodoc
abstract mixin class $AgeTooYoungCopyWith<$Res> implements $EventEligibilityCopyWith<$Res> {
  factory $AgeTooYoungCopyWith(AgeTooYoung value, $Res Function(AgeTooYoung) _then) = _$AgeTooYoungCopyWithImpl;
@useResult
$Res call({
 int minAge
});




}
/// @nodoc
class _$AgeTooYoungCopyWithImpl<$Res>
    implements $AgeTooYoungCopyWith<$Res> {
  _$AgeTooYoungCopyWithImpl(this._self, this._then);

  final AgeTooYoung _self;
  final $Res Function(AgeTooYoung) _then;

/// Create a copy of EventEligibility
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? minAge = null,}) {
  return _then(AgeTooYoung(
null == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class AgeTooOld implements EventEligibility {
  const AgeTooOld(this.maxAge);
  

 final  int maxAge;

/// Create a copy of EventEligibility
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AgeTooOldCopyWith<AgeTooOld> get copyWith => _$AgeTooOldCopyWithImpl<AgeTooOld>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AgeTooOld&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge));
}


@override
int get hashCode => Object.hash(runtimeType,maxAge);

@override
String toString() {
  return 'EventEligibility.ageTooOld(maxAge: $maxAge)';
}


}

/// @nodoc
abstract mixin class $AgeTooOldCopyWith<$Res> implements $EventEligibilityCopyWith<$Res> {
  factory $AgeTooOldCopyWith(AgeTooOld value, $Res Function(AgeTooOld) _then) = _$AgeTooOldCopyWithImpl;
@useResult
$Res call({
 int maxAge
});




}
/// @nodoc
class _$AgeTooOldCopyWithImpl<$Res>
    implements $AgeTooOldCopyWith<$Res> {
  _$AgeTooOldCopyWithImpl(this._self, this._then);

  final AgeTooOld _self;
  final $Res Function(AgeTooOld) _then;

/// Create a copy of EventEligibility
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? maxAge = null,}) {
  return _then(AgeTooOld(
null == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
