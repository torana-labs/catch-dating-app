// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'profile_prompts.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ProfilePromptAnswer {

 String get promptId; String get prompt; String get answer;
/// Create a copy of ProfilePromptAnswer
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ProfilePromptAnswerCopyWith<ProfilePromptAnswer> get copyWith => _$ProfilePromptAnswerCopyWithImpl<ProfilePromptAnswer>(this as ProfilePromptAnswer, _$identity);

  /// Serializes this ProfilePromptAnswer to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ProfilePromptAnswer&&(identical(other.promptId, promptId) || other.promptId == promptId)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.answer, answer) || other.answer == answer));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,promptId,prompt,answer);

@override
String toString() {
  return 'ProfilePromptAnswer(promptId: $promptId, prompt: $prompt, answer: $answer)';
}


}

/// @nodoc
abstract mixin class $ProfilePromptAnswerCopyWith<$Res>  {
  factory $ProfilePromptAnswerCopyWith(ProfilePromptAnswer value, $Res Function(ProfilePromptAnswer) _then) = _$ProfilePromptAnswerCopyWithImpl;
@useResult
$Res call({
 String promptId, String prompt, String answer
});




}
/// @nodoc
class _$ProfilePromptAnswerCopyWithImpl<$Res>
    implements $ProfilePromptAnswerCopyWith<$Res> {
  _$ProfilePromptAnswerCopyWithImpl(this._self, this._then);

  final ProfilePromptAnswer _self;
  final $Res Function(ProfilePromptAnswer) _then;

/// Create a copy of ProfilePromptAnswer
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? promptId = null,Object? prompt = null,Object? answer = null,}) {
  return _then(_self.copyWith(
promptId: null == promptId ? _self.promptId : promptId // ignore: cast_nullable_to_non_nullable
as String,prompt: null == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as String,answer: null == answer ? _self.answer : answer // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ProfilePromptAnswer].
extension ProfilePromptAnswerPatterns on ProfilePromptAnswer {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ProfilePromptAnswer value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ProfilePromptAnswer() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ProfilePromptAnswer value)  $default,){
final _that = this;
switch (_that) {
case _ProfilePromptAnswer():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ProfilePromptAnswer value)?  $default,){
final _that = this;
switch (_that) {
case _ProfilePromptAnswer() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String promptId,  String prompt,  String answer)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ProfilePromptAnswer() when $default != null:
return $default(_that.promptId,_that.prompt,_that.answer);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String promptId,  String prompt,  String answer)  $default,) {final _that = this;
switch (_that) {
case _ProfilePromptAnswer():
return $default(_that.promptId,_that.prompt,_that.answer);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String promptId,  String prompt,  String answer)?  $default,) {final _that = this;
switch (_that) {
case _ProfilePromptAnswer() when $default != null:
return $default(_that.promptId,_that.prompt,_that.answer);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ProfilePromptAnswer extends ProfilePromptAnswer {
  const _ProfilePromptAnswer({required this.promptId, required this.prompt, this.answer = ''}): super._();
  factory _ProfilePromptAnswer.fromJson(Map<String, dynamic> json) => _$ProfilePromptAnswerFromJson(json);

@override final  String promptId;
@override final  String prompt;
@override@JsonKey() final  String answer;

/// Create a copy of ProfilePromptAnswer
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ProfilePromptAnswerCopyWith<_ProfilePromptAnswer> get copyWith => __$ProfilePromptAnswerCopyWithImpl<_ProfilePromptAnswer>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ProfilePromptAnswerToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ProfilePromptAnswer&&(identical(other.promptId, promptId) || other.promptId == promptId)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.answer, answer) || other.answer == answer));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,promptId,prompt,answer);

@override
String toString() {
  return 'ProfilePromptAnswer(promptId: $promptId, prompt: $prompt, answer: $answer)';
}


}

/// @nodoc
abstract mixin class _$ProfilePromptAnswerCopyWith<$Res> implements $ProfilePromptAnswerCopyWith<$Res> {
  factory _$ProfilePromptAnswerCopyWith(_ProfilePromptAnswer value, $Res Function(_ProfilePromptAnswer) _then) = __$ProfilePromptAnswerCopyWithImpl;
@override @useResult
$Res call({
 String promptId, String prompt, String answer
});




}
/// @nodoc
class __$ProfilePromptAnswerCopyWithImpl<$Res>
    implements _$ProfilePromptAnswerCopyWith<$Res> {
  __$ProfilePromptAnswerCopyWithImpl(this._self, this._then);

  final _ProfilePromptAnswer _self;
  final $Res Function(_ProfilePromptAnswer) _then;

/// Create a copy of ProfilePromptAnswer
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? promptId = null,Object? prompt = null,Object? answer = null,}) {
  return _then(_ProfilePromptAnswer(
promptId: null == promptId ? _self.promptId : promptId // ignore: cast_nullable_to_non_nullable
as String,prompt: null == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as String,answer: null == answer ? _self.answer : answer // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$PhotoPromptAnswer {

 int get photoIndex; String get promptId; String get prompt; String get caption;
/// Create a copy of PhotoPromptAnswer
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PhotoPromptAnswerCopyWith<PhotoPromptAnswer> get copyWith => _$PhotoPromptAnswerCopyWithImpl<PhotoPromptAnswer>(this as PhotoPromptAnswer, _$identity);

  /// Serializes this PhotoPromptAnswer to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PhotoPromptAnswer&&(identical(other.photoIndex, photoIndex) || other.photoIndex == photoIndex)&&(identical(other.promptId, promptId) || other.promptId == promptId)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.caption, caption) || other.caption == caption));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,photoIndex,promptId,prompt,caption);

@override
String toString() {
  return 'PhotoPromptAnswer(photoIndex: $photoIndex, promptId: $promptId, prompt: $prompt, caption: $caption)';
}


}

/// @nodoc
abstract mixin class $PhotoPromptAnswerCopyWith<$Res>  {
  factory $PhotoPromptAnswerCopyWith(PhotoPromptAnswer value, $Res Function(PhotoPromptAnswer) _then) = _$PhotoPromptAnswerCopyWithImpl;
@useResult
$Res call({
 int photoIndex, String promptId, String prompt, String caption
});




}
/// @nodoc
class _$PhotoPromptAnswerCopyWithImpl<$Res>
    implements $PhotoPromptAnswerCopyWith<$Res> {
  _$PhotoPromptAnswerCopyWithImpl(this._self, this._then);

  final PhotoPromptAnswer _self;
  final $Res Function(PhotoPromptAnswer) _then;

/// Create a copy of PhotoPromptAnswer
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? photoIndex = null,Object? promptId = null,Object? prompt = null,Object? caption = null,}) {
  return _then(_self.copyWith(
photoIndex: null == photoIndex ? _self.photoIndex : photoIndex // ignore: cast_nullable_to_non_nullable
as int,promptId: null == promptId ? _self.promptId : promptId // ignore: cast_nullable_to_non_nullable
as String,prompt: null == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as String,caption: null == caption ? _self.caption : caption // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PhotoPromptAnswer].
extension PhotoPromptAnswerPatterns on PhotoPromptAnswer {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PhotoPromptAnswer value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PhotoPromptAnswer() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PhotoPromptAnswer value)  $default,){
final _that = this;
switch (_that) {
case _PhotoPromptAnswer():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PhotoPromptAnswer value)?  $default,){
final _that = this;
switch (_that) {
case _PhotoPromptAnswer() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int photoIndex,  String promptId,  String prompt,  String caption)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PhotoPromptAnswer() when $default != null:
return $default(_that.photoIndex,_that.promptId,_that.prompt,_that.caption);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int photoIndex,  String promptId,  String prompt,  String caption)  $default,) {final _that = this;
switch (_that) {
case _PhotoPromptAnswer():
return $default(_that.photoIndex,_that.promptId,_that.prompt,_that.caption);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int photoIndex,  String promptId,  String prompt,  String caption)?  $default,) {final _that = this;
switch (_that) {
case _PhotoPromptAnswer() when $default != null:
return $default(_that.photoIndex,_that.promptId,_that.prompt,_that.caption);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PhotoPromptAnswer extends PhotoPromptAnswer {
  const _PhotoPromptAnswer({required this.photoIndex, required this.promptId, required this.prompt, this.caption = ''}): super._();
  factory _PhotoPromptAnswer.fromJson(Map<String, dynamic> json) => _$PhotoPromptAnswerFromJson(json);

@override final  int photoIndex;
@override final  String promptId;
@override final  String prompt;
@override@JsonKey() final  String caption;

/// Create a copy of PhotoPromptAnswer
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PhotoPromptAnswerCopyWith<_PhotoPromptAnswer> get copyWith => __$PhotoPromptAnswerCopyWithImpl<_PhotoPromptAnswer>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PhotoPromptAnswerToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PhotoPromptAnswer&&(identical(other.photoIndex, photoIndex) || other.photoIndex == photoIndex)&&(identical(other.promptId, promptId) || other.promptId == promptId)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.caption, caption) || other.caption == caption));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,photoIndex,promptId,prompt,caption);

@override
String toString() {
  return 'PhotoPromptAnswer(photoIndex: $photoIndex, promptId: $promptId, prompt: $prompt, caption: $caption)';
}


}

/// @nodoc
abstract mixin class _$PhotoPromptAnswerCopyWith<$Res> implements $PhotoPromptAnswerCopyWith<$Res> {
  factory _$PhotoPromptAnswerCopyWith(_PhotoPromptAnswer value, $Res Function(_PhotoPromptAnswer) _then) = __$PhotoPromptAnswerCopyWithImpl;
@override @useResult
$Res call({
 int photoIndex, String promptId, String prompt, String caption
});




}
/// @nodoc
class __$PhotoPromptAnswerCopyWithImpl<$Res>
    implements _$PhotoPromptAnswerCopyWith<$Res> {
  __$PhotoPromptAnswerCopyWithImpl(this._self, this._then);

  final _PhotoPromptAnswer _self;
  final $Res Function(_PhotoPromptAnswer) _then;

/// Create a copy of PhotoPromptAnswer
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? photoIndex = null,Object? promptId = null,Object? prompt = null,Object? caption = null,}) {
  return _then(_PhotoPromptAnswer(
photoIndex: null == photoIndex ? _self.photoIndex : photoIndex // ignore: cast_nullable_to_non_nullable
as int,promptId: null == promptId ? _self.promptId : promptId // ignore: cast_nullable_to_non_nullable
as String,prompt: null == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as String,caption: null == caption ? _self.caption : caption // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
