// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_detail_view_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$EventDetailViewModel {

 Event get event; UserProfile? get userProfile; List<Review> get reviews; bool get isAuthenticated; bool get isHost; bool get isSaved; bool get isOrganizerMember; EventParticipation? get participation;
/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventDetailViewModelCopyWith<EventDetailViewModel> get copyWith => _$EventDetailViewModelCopyWithImpl<EventDetailViewModel>(this as EventDetailViewModel, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventDetailViewModel&&(identical(other.event, event) || other.event == event)&&(identical(other.userProfile, userProfile) || other.userProfile == userProfile)&&const DeepCollectionEquality().equals(other.reviews, reviews)&&(identical(other.isAuthenticated, isAuthenticated) || other.isAuthenticated == isAuthenticated)&&(identical(other.isHost, isHost) || other.isHost == isHost)&&(identical(other.isSaved, isSaved) || other.isSaved == isSaved)&&(identical(other.isOrganizerMember, isOrganizerMember) || other.isOrganizerMember == isOrganizerMember)&&(identical(other.participation, participation) || other.participation == participation));
}


@override
int get hashCode => Object.hash(runtimeType,event,userProfile,const DeepCollectionEquality().hash(reviews),isAuthenticated,isHost,isSaved,isOrganizerMember,participation);

@override
String toString() {
  return 'EventDetailViewModel(event: $event, userProfile: $userProfile, reviews: $reviews, isAuthenticated: $isAuthenticated, isHost: $isHost, isSaved: $isSaved, isOrganizerMember: $isOrganizerMember, participation: $participation)';
}


}

/// @nodoc
abstract mixin class $EventDetailViewModelCopyWith<$Res>  {
  factory $EventDetailViewModelCopyWith(EventDetailViewModel value, $Res Function(EventDetailViewModel) _then) = _$EventDetailViewModelCopyWithImpl;
@useResult
$Res call({
 Event event, UserProfile? userProfile, List<Review> reviews, bool isAuthenticated, bool isHost, bool isSaved, bool isOrganizerMember, EventParticipation? participation
});


$EventCopyWith<$Res> get event;$UserProfileCopyWith<$Res>? get userProfile;$EventParticipationCopyWith<$Res>? get participation;

}
/// @nodoc
class _$EventDetailViewModelCopyWithImpl<$Res>
    implements $EventDetailViewModelCopyWith<$Res> {
  _$EventDetailViewModelCopyWithImpl(this._self, this._then);

  final EventDetailViewModel _self;
  final $Res Function(EventDetailViewModel) _then;

/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? event = null,Object? userProfile = freezed,Object? reviews = null,Object? isAuthenticated = null,Object? isHost = null,Object? isSaved = null,Object? isOrganizerMember = null,Object? participation = freezed,}) {
  return _then(_self.copyWith(
event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as Event,userProfile: freezed == userProfile ? _self.userProfile : userProfile // ignore: cast_nullable_to_non_nullable
as UserProfile?,reviews: null == reviews ? _self.reviews : reviews // ignore: cast_nullable_to_non_nullable
as List<Review>,isAuthenticated: null == isAuthenticated ? _self.isAuthenticated : isAuthenticated // ignore: cast_nullable_to_non_nullable
as bool,isHost: null == isHost ? _self.isHost : isHost // ignore: cast_nullable_to_non_nullable
as bool,isSaved: null == isSaved ? _self.isSaved : isSaved // ignore: cast_nullable_to_non_nullable
as bool,isOrganizerMember: null == isOrganizerMember ? _self.isOrganizerMember : isOrganizerMember // ignore: cast_nullable_to_non_nullable
as bool,participation: freezed == participation ? _self.participation : participation // ignore: cast_nullable_to_non_nullable
as EventParticipation?,
  ));
}
/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventCopyWith<$Res> get event {
  
  return $EventCopyWith<$Res>(_self.event, (value) {
    return _then(_self.copyWith(event: value));
  });
}/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserProfileCopyWith<$Res>? get userProfile {
    if (_self.userProfile == null) {
    return null;
  }

  return $UserProfileCopyWith<$Res>(_self.userProfile!, (value) {
    return _then(_self.copyWith(userProfile: value));
  });
}/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventParticipationCopyWith<$Res>? get participation {
    if (_self.participation == null) {
    return null;
  }

  return $EventParticipationCopyWith<$Res>(_self.participation!, (value) {
    return _then(_self.copyWith(participation: value));
  });
}
}


/// Adds pattern-matching-related methods to [EventDetailViewModel].
extension EventDetailViewModelPatterns on EventDetailViewModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventDetailViewModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventDetailViewModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventDetailViewModel value)  $default,){
final _that = this;
switch (_that) {
case _EventDetailViewModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventDetailViewModel value)?  $default,){
final _that = this;
switch (_that) {
case _EventDetailViewModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Event event,  UserProfile? userProfile,  List<Review> reviews,  bool isAuthenticated,  bool isHost,  bool isSaved,  bool isOrganizerMember,  EventParticipation? participation)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventDetailViewModel() when $default != null:
return $default(_that.event,_that.userProfile,_that.reviews,_that.isAuthenticated,_that.isHost,_that.isSaved,_that.isOrganizerMember,_that.participation);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Event event,  UserProfile? userProfile,  List<Review> reviews,  bool isAuthenticated,  bool isHost,  bool isSaved,  bool isOrganizerMember,  EventParticipation? participation)  $default,) {final _that = this;
switch (_that) {
case _EventDetailViewModel():
return $default(_that.event,_that.userProfile,_that.reviews,_that.isAuthenticated,_that.isHost,_that.isSaved,_that.isOrganizerMember,_that.participation);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Event event,  UserProfile? userProfile,  List<Review> reviews,  bool isAuthenticated,  bool isHost,  bool isSaved,  bool isOrganizerMember,  EventParticipation? participation)?  $default,) {final _that = this;
switch (_that) {
case _EventDetailViewModel() when $default != null:
return $default(_that.event,_that.userProfile,_that.reviews,_that.isAuthenticated,_that.isHost,_that.isSaved,_that.isOrganizerMember,_that.participation);case _:
  return null;

}
}

}

/// @nodoc


class _EventDetailViewModel implements EventDetailViewModel {
  const _EventDetailViewModel({required this.event, required this.userProfile, required final  List<Review> reviews, required this.isAuthenticated, required this.isHost, required this.isSaved, this.isOrganizerMember = false, required this.participation}): _reviews = reviews;
  

@override final  Event event;
@override final  UserProfile? userProfile;
 final  List<Review> _reviews;
@override List<Review> get reviews {
  if (_reviews is EqualUnmodifiableListView) return _reviews;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_reviews);
}

@override final  bool isAuthenticated;
@override final  bool isHost;
@override final  bool isSaved;
@override@JsonKey() final  bool isOrganizerMember;
@override final  EventParticipation? participation;

/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventDetailViewModelCopyWith<_EventDetailViewModel> get copyWith => __$EventDetailViewModelCopyWithImpl<_EventDetailViewModel>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventDetailViewModel&&(identical(other.event, event) || other.event == event)&&(identical(other.userProfile, userProfile) || other.userProfile == userProfile)&&const DeepCollectionEquality().equals(other._reviews, _reviews)&&(identical(other.isAuthenticated, isAuthenticated) || other.isAuthenticated == isAuthenticated)&&(identical(other.isHost, isHost) || other.isHost == isHost)&&(identical(other.isSaved, isSaved) || other.isSaved == isSaved)&&(identical(other.isOrganizerMember, isOrganizerMember) || other.isOrganizerMember == isOrganizerMember)&&(identical(other.participation, participation) || other.participation == participation));
}


@override
int get hashCode => Object.hash(runtimeType,event,userProfile,const DeepCollectionEquality().hash(_reviews),isAuthenticated,isHost,isSaved,isOrganizerMember,participation);

@override
String toString() {
  return 'EventDetailViewModel(event: $event, userProfile: $userProfile, reviews: $reviews, isAuthenticated: $isAuthenticated, isHost: $isHost, isSaved: $isSaved, isOrganizerMember: $isOrganizerMember, participation: $participation)';
}


}

/// @nodoc
abstract mixin class _$EventDetailViewModelCopyWith<$Res> implements $EventDetailViewModelCopyWith<$Res> {
  factory _$EventDetailViewModelCopyWith(_EventDetailViewModel value, $Res Function(_EventDetailViewModel) _then) = __$EventDetailViewModelCopyWithImpl;
@override @useResult
$Res call({
 Event event, UserProfile? userProfile, List<Review> reviews, bool isAuthenticated, bool isHost, bool isSaved, bool isOrganizerMember, EventParticipation? participation
});


@override $EventCopyWith<$Res> get event;@override $UserProfileCopyWith<$Res>? get userProfile;@override $EventParticipationCopyWith<$Res>? get participation;

}
/// @nodoc
class __$EventDetailViewModelCopyWithImpl<$Res>
    implements _$EventDetailViewModelCopyWith<$Res> {
  __$EventDetailViewModelCopyWithImpl(this._self, this._then);

  final _EventDetailViewModel _self;
  final $Res Function(_EventDetailViewModel) _then;

/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? event = null,Object? userProfile = freezed,Object? reviews = null,Object? isAuthenticated = null,Object? isHost = null,Object? isSaved = null,Object? isOrganizerMember = null,Object? participation = freezed,}) {
  return _then(_EventDetailViewModel(
event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as Event,userProfile: freezed == userProfile ? _self.userProfile : userProfile // ignore: cast_nullable_to_non_nullable
as UserProfile?,reviews: null == reviews ? _self._reviews : reviews // ignore: cast_nullable_to_non_nullable
as List<Review>,isAuthenticated: null == isAuthenticated ? _self.isAuthenticated : isAuthenticated // ignore: cast_nullable_to_non_nullable
as bool,isHost: null == isHost ? _self.isHost : isHost // ignore: cast_nullable_to_non_nullable
as bool,isSaved: null == isSaved ? _self.isSaved : isSaved // ignore: cast_nullable_to_non_nullable
as bool,isOrganizerMember: null == isOrganizerMember ? _self.isOrganizerMember : isOrganizerMember // ignore: cast_nullable_to_non_nullable
as bool,participation: freezed == participation ? _self.participation : participation // ignore: cast_nullable_to_non_nullable
as EventParticipation?,
  ));
}

/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventCopyWith<$Res> get event {
  
  return $EventCopyWith<$Res>(_self.event, (value) {
    return _then(_self.copyWith(event: value));
  });
}/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserProfileCopyWith<$Res>? get userProfile {
    if (_self.userProfile == null) {
    return null;
  }

  return $UserProfileCopyWith<$Res>(_self.userProfile!, (value) {
    return _then(_self.copyWith(userProfile: value));
  });
}/// Create a copy of EventDetailViewModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventParticipationCopyWith<$Res>? get participation {
    if (_self.participation == null) {
    return null;
  }

  return $EventParticipationCopyWith<$Res>(_self.participation!, (value) {
    return _then(_self.copyWith(participation: value));
  });
}
}

// dart format on
