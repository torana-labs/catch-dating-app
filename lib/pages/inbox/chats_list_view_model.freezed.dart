// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chats_list_view_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ChatsListViewModel {

 List<ChatThreadPreview> get newMatches; List<ChatThreadPreview> get conversations; int get totalThreadCount; bool get sourceWindowMayHaveMore;
/// Create a copy of ChatsListViewModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChatsListViewModelCopyWith<ChatsListViewModel> get copyWith => _$ChatsListViewModelCopyWithImpl<ChatsListViewModel>(this as ChatsListViewModel, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as ChatsListViewModel;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChatsListViewModel&&const DeepCollectionEquality().equals(other.newMatches, _this.newMatches)&&const DeepCollectionEquality().equals(other.conversations, _this.conversations)&&(identical(other.totalThreadCount, _this.totalThreadCount) || other.totalThreadCount == _this.totalThreadCount)&&(identical(other.sourceWindowMayHaveMore, _this.sourceWindowMayHaveMore) || other.sourceWindowMayHaveMore == _this.sourceWindowMayHaveMore));
}


@override
int get hashCode {
  final _this = this as ChatsListViewModel;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.newMatches),const DeepCollectionEquality().hash(_this.conversations),_this.totalThreadCount,_this.sourceWindowMayHaveMore);
}

@override
String toString() {
  final _this = this as ChatsListViewModel;
  return 'ChatsListViewModel(newMatches: ${_this.newMatches}, conversations: ${_this.conversations}, totalThreadCount: ${_this.totalThreadCount}, sourceWindowMayHaveMore: ${_this.sourceWindowMayHaveMore})';
}


}

/// @nodoc
abstract mixin class $ChatsListViewModelCopyWith<$Res>  {
  factory $ChatsListViewModelCopyWith(ChatsListViewModel value, $Res Function(ChatsListViewModel) _then) = _$ChatsListViewModelCopyWithImpl;
@useResult
$Res call({
 List<ChatThreadPreview> newMatches, List<ChatThreadPreview> conversations, int totalThreadCount, bool sourceWindowMayHaveMore
});




}
/// @nodoc
class _$ChatsListViewModelCopyWithImpl<$Res>
    implements $ChatsListViewModelCopyWith<$Res> {
  _$ChatsListViewModelCopyWithImpl(this._self, this._then);

  final ChatsListViewModel _self;
  final $Res Function(ChatsListViewModel) _then;

/// Create a copy of ChatsListViewModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? newMatches = null,Object? conversations = null,Object? totalThreadCount = null,Object? sourceWindowMayHaveMore = null,}) {
  return _then(ChatsListViewModel(
newMatches: null == newMatches ? _self.newMatches : newMatches // ignore: cast_nullable_to_non_nullable
as List<ChatThreadPreview>,conversations: null == conversations ? _self.conversations : conversations // ignore: cast_nullable_to_non_nullable
as List<ChatThreadPreview>,totalThreadCount: null == totalThreadCount ? _self.totalThreadCount : totalThreadCount // ignore: cast_nullable_to_non_nullable
as int,sourceWindowMayHaveMore: null == sourceWindowMayHaveMore ? _self.sourceWindowMayHaveMore : sourceWindowMayHaveMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ChatsListViewModel].
extension ChatsListViewModelPatterns on ChatsListViewModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChatsListViewModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChatsListViewModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChatsListViewModel value)  $default,){
final _that = this;
switch (_that) {
case _ChatsListViewModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChatsListViewModel value)?  $default,){
final _that = this;
switch (_that) {
case _ChatsListViewModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<ChatThreadPreview> newMatches,  List<ChatThreadPreview> conversations,  int totalThreadCount,  bool sourceWindowMayHaveMore)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChatsListViewModel() when $default != null:
return $default(_that.newMatches,_that.conversations,_that.totalThreadCount,_that.sourceWindowMayHaveMore);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<ChatThreadPreview> newMatches,  List<ChatThreadPreview> conversations,  int totalThreadCount,  bool sourceWindowMayHaveMore)  $default,) {final _that = this;
switch (_that) {
case _ChatsListViewModel():
return $default(_that.newMatches,_that.conversations,_that.totalThreadCount,_that.sourceWindowMayHaveMore);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<ChatThreadPreview> newMatches,  List<ChatThreadPreview> conversations,  int totalThreadCount,  bool sourceWindowMayHaveMore)?  $default,) {final _that = this;
switch (_that) {
case _ChatsListViewModel() when $default != null:
return $default(_that.newMatches,_that.conversations,_that.totalThreadCount,_that.sourceWindowMayHaveMore);case _:
  return null;

}
}

}

/// @nodoc


class _ChatsListViewModel extends ChatsListViewModel {
  const _ChatsListViewModel({required  List<ChatThreadPreview> newMatches, required  List<ChatThreadPreview> conversations, required this.totalThreadCount, this.sourceWindowMayHaveMore = false}): _newMatches = newMatches,_conversations = conversations,super._();
  

 final  List<ChatThreadPreview> _newMatches;
@override List<ChatThreadPreview> get newMatches {
  if (_newMatches is EqualUnmodifiableListView) return _newMatches;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_newMatches);
}

 final  List<ChatThreadPreview> _conversations;
@override List<ChatThreadPreview> get conversations {
  if (_conversations is EqualUnmodifiableListView) return _conversations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_conversations);
}

@override final  int totalThreadCount;
@override@JsonKey() final  bool sourceWindowMayHaveMore;

/// Create a copy of ChatsListViewModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChatsListViewModelCopyWith<_ChatsListViewModel> get copyWith => __$ChatsListViewModelCopyWithImpl<_ChatsListViewModel>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChatsListViewModel&&const DeepCollectionEquality().equals(other.newMatches, _newMatches)&&const DeepCollectionEquality().equals(other.conversations, _conversations)&&(identical(other.totalThreadCount, totalThreadCount) || other.totalThreadCount == totalThreadCount)&&(identical(other.sourceWindowMayHaveMore, sourceWindowMayHaveMore) || other.sourceWindowMayHaveMore == sourceWindowMayHaveMore));
}


@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_newMatches),const DeepCollectionEquality().hash(_conversations),totalThreadCount,sourceWindowMayHaveMore);
}

@override
String toString() {
    return 'ChatsListViewModel(newMatches: $newMatches, conversations: $conversations, totalThreadCount: $totalThreadCount, sourceWindowMayHaveMore: $sourceWindowMayHaveMore)';
}


}

/// @nodoc
abstract mixin class _$ChatsListViewModelCopyWith<$Res> implements $ChatsListViewModelCopyWith<$Res> {
  factory _$ChatsListViewModelCopyWith(_ChatsListViewModel value, $Res Function(_ChatsListViewModel) _then) = __$ChatsListViewModelCopyWithImpl;
@override @useResult
$Res call({
 List<ChatThreadPreview> newMatches, List<ChatThreadPreview> conversations, int totalThreadCount, bool sourceWindowMayHaveMore
});




}
/// @nodoc
class __$ChatsListViewModelCopyWithImpl<$Res>
    implements _$ChatsListViewModelCopyWith<$Res> {
  __$ChatsListViewModelCopyWithImpl(this._self, this._then);

  final _ChatsListViewModel _self;
  final $Res Function(_ChatsListViewModel) _then;

/// Create a copy of ChatsListViewModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? newMatches = null,Object? conversations = null,Object? totalThreadCount = null,Object? sourceWindowMayHaveMore = null,}) {
  return _then(_ChatsListViewModel(
newMatches: null == newMatches ? _self._newMatches : newMatches // ignore: cast_nullable_to_non_nullable
as List<ChatThreadPreview>,conversations: null == conversations ? _self._conversations : conversations // ignore: cast_nullable_to_non_nullable
as List<ChatThreadPreview>,totalThreadCount: null == totalThreadCount ? _self.totalThreadCount : totalThreadCount // ignore: cast_nullable_to_non_nullable
as int,sourceWindowMayHaveMore: null == sourceWindowMayHaveMore ? _self.sourceWindowMayHaveMore : sourceWindowMayHaveMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
