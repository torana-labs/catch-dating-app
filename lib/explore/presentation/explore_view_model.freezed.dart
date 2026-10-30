// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'explore_view_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ExploreViewModel {

 List<Organizer> get joinedOrganizers; List<Organizer> get allOrganizers; Set<String> get joinedOrganizerIds; Set<String> get followedOrganizerIds;
/// Create a copy of ExploreViewModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExploreViewModelCopyWith<ExploreViewModel> get copyWith => _$ExploreViewModelCopyWithImpl<ExploreViewModel>(this as ExploreViewModel, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExploreViewModel&&const DeepCollectionEquality().equals(other.joinedOrganizers, joinedOrganizers)&&const DeepCollectionEquality().equals(other.allOrganizers, allOrganizers)&&const DeepCollectionEquality().equals(other.joinedOrganizerIds, joinedOrganizerIds)&&const DeepCollectionEquality().equals(other.followedOrganizerIds, followedOrganizerIds));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(joinedOrganizers),const DeepCollectionEquality().hash(allOrganizers),const DeepCollectionEquality().hash(joinedOrganizerIds),const DeepCollectionEquality().hash(followedOrganizerIds));

@override
String toString() {
  return 'ExploreViewModel(joinedClubs: $joinedOrganizers, allClubs: $allOrganizers, joinedClubIds: $joinedOrganizerIds, followedClubIds: $followedOrganizerIds)';
}


}

/// @nodoc
abstract mixin class $ExploreViewModelCopyWith<$Res>  {
  factory $ExploreViewModelCopyWith(ExploreViewModel value, $Res Function(ExploreViewModel) _then) = _$ExploreViewModelCopyWithImpl;
@useResult
$Res call({
 List<Organizer> joinedOrganizers, List<Organizer> allOrganizers, Set<String> joinedOrganizerIds, Set<String> followedOrganizerIds
});




}
/// @nodoc
class _$ExploreViewModelCopyWithImpl<$Res>
    implements $ExploreViewModelCopyWith<$Res> {
  _$ExploreViewModelCopyWithImpl(this._self, this._then);

  final ExploreViewModel _self;
  final $Res Function(ExploreViewModel) _then;

/// Create a copy of ExploreViewModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? joinedOrganizers = null,Object? allOrganizers = null,Object? joinedOrganizerIds = null,Object? followedOrganizerIds = null,}) {
  return _then(_self.copyWith(
joinedOrganizers: null == joinedOrganizers ? _self.joinedOrganizers : joinedOrganizers // ignore: cast_nullable_to_non_nullable
as List<Organizer>,allOrganizers: null == allOrganizers ? _self.allOrganizers : allOrganizers // ignore: cast_nullable_to_non_nullable
as List<Organizer>,joinedOrganizerIds: null == joinedOrganizerIds ? _self.joinedOrganizerIds : joinedOrganizerIds // ignore: cast_nullable_to_non_nullable
as Set<String>,followedOrganizerIds: null == followedOrganizerIds ? _self.followedOrganizerIds : followedOrganizerIds // ignore: cast_nullable_to_non_nullable
as Set<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [ExploreViewModel].
extension ExploreViewModelPatterns on ExploreViewModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExploreViewModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExploreViewModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExploreViewModel value)  $default,){
final _that = this;
switch (_that) {
case _ExploreViewModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExploreViewModel value)?  $default,){
final _that = this;
switch (_that) {
case _ExploreViewModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Organizer> joinedOrganizers,  List<Organizer> allOrganizers,  Set<String> joinedOrganizerIds,  Set<String> followedOrganizerIds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExploreViewModel() when $default != null:
return $default(_that.joinedOrganizers,_that.allOrganizers,_that.joinedOrganizerIds,_that.followedOrganizerIds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Organizer> joinedOrganizers,  List<Organizer> allOrganizers,  Set<String> joinedOrganizerIds,  Set<String> followedOrganizerIds)  $default,) {final _that = this;
switch (_that) {
case _ExploreViewModel():
return $default(_that.joinedOrganizers,_that.allOrganizers,_that.joinedOrganizerIds,_that.followedOrganizerIds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Organizer> joinedOrganizers,  List<Organizer> allOrganizers,  Set<String> joinedOrganizerIds,  Set<String> followedOrganizerIds)?  $default,) {final _that = this;
switch (_that) {
case _ExploreViewModel() when $default != null:
return $default(_that.joinedOrganizers,_that.allOrganizers,_that.joinedOrganizerIds,_that.followedOrganizerIds);case _:
  return null;

}
}

}

/// @nodoc


class _ExploreViewModel extends ExploreViewModel {
  const _ExploreViewModel({required final  List<Organizer> joinedOrganizers, required final  List<Organizer> allOrganizers, final  Set<String> joinedOrganizerIds = const {}, final  Set<String> followedOrganizerIds = const {}}): _joinedOrganizers = joinedOrganizers,_allOrganizers = allOrganizers,_joinedOrganizerIds = joinedOrganizerIds,_followedOrganizerIds = followedOrganizerIds,super._();
  

 final  List<Organizer> _joinedOrganizers;
@override List<Organizer> get joinedOrganizers {
  if (_joinedOrganizers is EqualUnmodifiableListView) return _joinedOrganizers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_joinedOrganizers);
}

 final  List<Organizer> _allOrganizers;
@override List<Organizer> get allOrganizers {
  if (_allOrganizers is EqualUnmodifiableListView) return _allOrganizers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_allOrganizers);
}

 final  Set<String> _joinedOrganizerIds;
@override@JsonKey() Set<String> get joinedOrganizerIds {
  if (_joinedOrganizerIds is EqualUnmodifiableSetView) return _joinedOrganizerIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_joinedOrganizerIds);
}

 final  Set<String> _followedOrganizerIds;
@override@JsonKey() Set<String> get followedOrganizerIds {
  if (_followedOrganizerIds is EqualUnmodifiableSetView) return _followedOrganizerIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_followedOrganizerIds);
}


/// Create a copy of ExploreViewModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExploreViewModelCopyWith<_ExploreViewModel> get copyWith => __$ExploreViewModelCopyWithImpl<_ExploreViewModel>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExploreViewModel&&const DeepCollectionEquality().equals(other._joinedOrganizers, _joinedOrganizers)&&const DeepCollectionEquality().equals(other._allOrganizers, _allOrganizers)&&const DeepCollectionEquality().equals(other._joinedOrganizerIds, _joinedOrganizerIds)&&const DeepCollectionEquality().equals(other._followedOrganizerIds, _followedOrganizerIds));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_joinedOrganizers),const DeepCollectionEquality().hash(_allOrganizers),const DeepCollectionEquality().hash(_joinedOrganizerIds),const DeepCollectionEquality().hash(_followedOrganizerIds));

@override
String toString() {
  return 'ExploreViewModel(joinedClubs: $joinedOrganizers, allClubs: $allOrganizers, joinedClubIds: $joinedOrganizerIds, followedClubIds: $followedOrganizerIds)';
}


}

/// @nodoc
abstract mixin class _$ExploreViewModelCopyWith<$Res> implements $ExploreViewModelCopyWith<$Res> {
  factory _$ExploreViewModelCopyWith(_ExploreViewModel value, $Res Function(_ExploreViewModel) _then) = __$ExploreViewModelCopyWithImpl;
@override @useResult
$Res call({
 List<Organizer> joinedOrganizers, List<Organizer> allOrganizers, Set<String> joinedOrganizerIds, Set<String> followedOrganizerIds
});




}
/// @nodoc
class __$ExploreViewModelCopyWithImpl<$Res>
    implements _$ExploreViewModelCopyWith<$Res> {
  __$ExploreViewModelCopyWithImpl(this._self, this._then);

  final _ExploreViewModel _self;
  final $Res Function(_ExploreViewModel) _then;

/// Create a copy of ExploreViewModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? joinedOrganizers = null,Object? allOrganizers = null,Object? joinedOrganizerIds = null,Object? followedOrganizerIds = null,}) {
  return _then(_ExploreViewModel(
joinedOrganizers: null == joinedOrganizers ? _self._joinedOrganizers : joinedOrganizers // ignore: cast_nullable_to_non_nullable
as List<Organizer>,allOrganizers: null == allOrganizers ? _self._allOrganizers : allOrganizers // ignore: cast_nullable_to_non_nullable
as List<Organizer>,joinedOrganizerIds: null == joinedOrganizerIds ? _self._joinedOrganizerIds : joinedOrganizerIds // ignore: cast_nullable_to_non_nullable
as Set<String>,followedOrganizerIds: null == followedOrganizerIds ? _self._followedOrganizerIds : followedOrganizerIds // ignore: cast_nullable_to_non_nullable
as Set<String>,
  ));
}


}

// dart format on
