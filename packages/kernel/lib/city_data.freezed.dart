// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'city_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CityData {

/// App-facing selection id. New config stores the canonical market id here.
 String get name;/// Canonical global city id, e.g. `in-mh-mumbai`.
 String get cityId;/// Canonical product launch/search market id, e.g. `in-mh-mumbai`.
 String get marketId;/// Public URL/display slug, e.g. `mumbai`.
 String get slug;/// Human-readable label (e.g. `'Mumbai'`, `'New Delhi'`).
 String get label;/// Latitude for GPS-based nearest-city detection.
 double get latitude;/// Longitude for GPS-based nearest-city detection.
 double get longitude;/// ISO 3166-1 alpha-2 country code for market-specific behavior.
 String get countryIsoCode;/// Currency used for event price display and future provider routing.
 String get currencyCode;/// Local phone dial code used for contact/auth defaults in this market.
 String get dialCode;/// IANA timezone for event scheduling and future localized display.
 String get timeZone;/// Product rollout state for this market.
 String get launchStatus;/// Whether users can select this market in profile/onboarding.
 bool get profileSelectable;/// Whether hosts can create organizers here.
 bool get hostCreatable;/// Whether hosts can create events here.
 bool get eventCreatable;/// Whether Explore should show this market.
 bool get exploreVisible;
/// Create a copy of CityData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CityDataCopyWith<CityData> get copyWith => _$CityDataCopyWithImpl<CityData>(this as CityData, _$identity);

  /// Serializes this CityData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CityData&&(identical(other.name, name) || other.name == name)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.marketId, marketId) || other.marketId == marketId)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.label, label) || other.label == label)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.countryIsoCode, countryIsoCode) || other.countryIsoCode == countryIsoCode)&&(identical(other.currencyCode, currencyCode) || other.currencyCode == currencyCode)&&(identical(other.dialCode, dialCode) || other.dialCode == dialCode)&&(identical(other.timeZone, timeZone) || other.timeZone == timeZone)&&(identical(other.launchStatus, launchStatus) || other.launchStatus == launchStatus)&&(identical(other.profileSelectable, profileSelectable) || other.profileSelectable == profileSelectable)&&(identical(other.hostCreatable, hostCreatable) || other.hostCreatable == hostCreatable)&&(identical(other.eventCreatable, eventCreatable) || other.eventCreatable == eventCreatable)&&(identical(other.exploreVisible, exploreVisible) || other.exploreVisible == exploreVisible));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,cityId,marketId,slug,label,latitude,longitude,countryIsoCode,currencyCode,dialCode,timeZone,launchStatus,profileSelectable,hostCreatable,eventCreatable,exploreVisible);

@override
String toString() {
  return 'CityData(name: $name, cityId: $cityId, marketId: $marketId, slug: $slug, label: $label, latitude: $latitude, longitude: $longitude, countryIsoCode: $countryIsoCode, currencyCode: $currencyCode, dialCode: $dialCode, timeZone: $timeZone, launchStatus: $launchStatus, profileSelectable: $profileSelectable, hostCreatable: $hostCreatable, eventCreatable: $eventCreatable, exploreVisible: $exploreVisible)';
}


}

/// @nodoc
abstract mixin class $CityDataCopyWith<$Res>  {
  factory $CityDataCopyWith(CityData value, $Res Function(CityData) _then) = _$CityDataCopyWithImpl;
@useResult
$Res call({
 String name, String cityId, String marketId, String slug, String label, double latitude, double longitude, String countryIsoCode, String currencyCode, String dialCode, String timeZone, String launchStatus, bool profileSelectable, bool hostCreatable, bool eventCreatable, bool exploreVisible
});




}
/// @nodoc
class _$CityDataCopyWithImpl<$Res>
    implements $CityDataCopyWith<$Res> {
  _$CityDataCopyWithImpl(this._self, this._then);

  final CityData _self;
  final $Res Function(CityData) _then;

/// Create a copy of CityData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? cityId = null,Object? marketId = null,Object? slug = null,Object? label = null,Object? latitude = null,Object? longitude = null,Object? countryIsoCode = null,Object? currencyCode = null,Object? dialCode = null,Object? timeZone = null,Object? launchStatus = null,Object? profileSelectable = null,Object? hostCreatable = null,Object? eventCreatable = null,Object? exploreVisible = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,cityId: null == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String,marketId: null == marketId ? _self.marketId : marketId // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,countryIsoCode: null == countryIsoCode ? _self.countryIsoCode : countryIsoCode // ignore: cast_nullable_to_non_nullable
as String,currencyCode: null == currencyCode ? _self.currencyCode : currencyCode // ignore: cast_nullable_to_non_nullable
as String,dialCode: null == dialCode ? _self.dialCode : dialCode // ignore: cast_nullable_to_non_nullable
as String,timeZone: null == timeZone ? _self.timeZone : timeZone // ignore: cast_nullable_to_non_nullable
as String,launchStatus: null == launchStatus ? _self.launchStatus : launchStatus // ignore: cast_nullable_to_non_nullable
as String,profileSelectable: null == profileSelectable ? _self.profileSelectable : profileSelectable // ignore: cast_nullable_to_non_nullable
as bool,hostCreatable: null == hostCreatable ? _self.hostCreatable : hostCreatable // ignore: cast_nullable_to_non_nullable
as bool,eventCreatable: null == eventCreatable ? _self.eventCreatable : eventCreatable // ignore: cast_nullable_to_non_nullable
as bool,exploreVisible: null == exploreVisible ? _self.exploreVisible : exploreVisible // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [CityData].
extension CityDataPatterns on CityData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CityData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CityData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CityData value)  $default,){
final _that = this;
switch (_that) {
case _CityData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CityData value)?  $default,){
final _that = this;
switch (_that) {
case _CityData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String cityId,  String marketId,  String slug,  String label,  double latitude,  double longitude,  String countryIsoCode,  String currencyCode,  String dialCode,  String timeZone,  String launchStatus,  bool profileSelectable,  bool hostCreatable,  bool eventCreatable,  bool exploreVisible)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CityData() when $default != null:
return $default(_that.name,_that.cityId,_that.marketId,_that.slug,_that.label,_that.latitude,_that.longitude,_that.countryIsoCode,_that.currencyCode,_that.dialCode,_that.timeZone,_that.launchStatus,_that.profileSelectable,_that.hostCreatable,_that.eventCreatable,_that.exploreVisible);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String cityId,  String marketId,  String slug,  String label,  double latitude,  double longitude,  String countryIsoCode,  String currencyCode,  String dialCode,  String timeZone,  String launchStatus,  bool profileSelectable,  bool hostCreatable,  bool eventCreatable,  bool exploreVisible)  $default,) {final _that = this;
switch (_that) {
case _CityData():
return $default(_that.name,_that.cityId,_that.marketId,_that.slug,_that.label,_that.latitude,_that.longitude,_that.countryIsoCode,_that.currencyCode,_that.dialCode,_that.timeZone,_that.launchStatus,_that.profileSelectable,_that.hostCreatable,_that.eventCreatable,_that.exploreVisible);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String cityId,  String marketId,  String slug,  String label,  double latitude,  double longitude,  String countryIsoCode,  String currencyCode,  String dialCode,  String timeZone,  String launchStatus,  bool profileSelectable,  bool hostCreatable,  bool eventCreatable,  bool exploreVisible)?  $default,) {final _that = this;
switch (_that) {
case _CityData() when $default != null:
return $default(_that.name,_that.cityId,_that.marketId,_that.slug,_that.label,_that.latitude,_that.longitude,_that.countryIsoCode,_that.currencyCode,_that.dialCode,_that.timeZone,_that.launchStatus,_that.profileSelectable,_that.hostCreatable,_that.eventCreatable,_that.exploreVisible);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CityData extends CityData {
  const _CityData({required this.name, this.cityId = '', this.marketId = '', this.slug = '', required this.label, required this.latitude, required this.longitude, this.countryIsoCode = defaultCountryIsoCode, this.currencyCode = defaultCurrencyCode, this.dialCode = defaultCountryDialCode, this.timeZone = defaultTimeZone, this.launchStatus = 'planned', this.profileSelectable = false, this.hostCreatable = false, this.eventCreatable = false, this.exploreVisible = false}): super._();
  factory _CityData.fromJson(Map<String, dynamic> json) => _$CityDataFromJson(json);

/// App-facing selection id. New config stores the canonical market id here.
@override final  String name;
/// Canonical global city id, e.g. `in-mh-mumbai`.
@override@JsonKey() final  String cityId;
/// Canonical product launch/search market id, e.g. `in-mh-mumbai`.
@override@JsonKey() final  String marketId;
/// Public URL/display slug, e.g. `mumbai`.
@override@JsonKey() final  String slug;
/// Human-readable label (e.g. `'Mumbai'`, `'New Delhi'`).
@override final  String label;
/// Latitude for GPS-based nearest-city detection.
@override final  double latitude;
/// Longitude for GPS-based nearest-city detection.
@override final  double longitude;
/// ISO 3166-1 alpha-2 country code for market-specific behavior.
@override@JsonKey() final  String countryIsoCode;
/// Currency used for event price display and future provider routing.
@override@JsonKey() final  String currencyCode;
/// Local phone dial code used for contact/auth defaults in this market.
@override@JsonKey() final  String dialCode;
/// IANA timezone for event scheduling and future localized display.
@override@JsonKey() final  String timeZone;
/// Product rollout state for this market.
@override@JsonKey() final  String launchStatus;
/// Whether users can select this market in profile/onboarding.
@override@JsonKey() final  bool profileSelectable;
/// Whether hosts can create organizers here.
@override@JsonKey() final  bool hostCreatable;
/// Whether hosts can create events here.
@override@JsonKey() final  bool eventCreatable;
/// Whether Explore should show this market.
@override@JsonKey() final  bool exploreVisible;

/// Create a copy of CityData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CityDataCopyWith<_CityData> get copyWith => __$CityDataCopyWithImpl<_CityData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CityDataToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CityData&&(identical(other.name, name) || other.name == name)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.marketId, marketId) || other.marketId == marketId)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.label, label) || other.label == label)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.countryIsoCode, countryIsoCode) || other.countryIsoCode == countryIsoCode)&&(identical(other.currencyCode, currencyCode) || other.currencyCode == currencyCode)&&(identical(other.dialCode, dialCode) || other.dialCode == dialCode)&&(identical(other.timeZone, timeZone) || other.timeZone == timeZone)&&(identical(other.launchStatus, launchStatus) || other.launchStatus == launchStatus)&&(identical(other.profileSelectable, profileSelectable) || other.profileSelectable == profileSelectable)&&(identical(other.hostCreatable, hostCreatable) || other.hostCreatable == hostCreatable)&&(identical(other.eventCreatable, eventCreatable) || other.eventCreatable == eventCreatable)&&(identical(other.exploreVisible, exploreVisible) || other.exploreVisible == exploreVisible));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,cityId,marketId,slug,label,latitude,longitude,countryIsoCode,currencyCode,dialCode,timeZone,launchStatus,profileSelectable,hostCreatable,eventCreatable,exploreVisible);

@override
String toString() {
  return 'CityData(name: $name, cityId: $cityId, marketId: $marketId, slug: $slug, label: $label, latitude: $latitude, longitude: $longitude, countryIsoCode: $countryIsoCode, currencyCode: $currencyCode, dialCode: $dialCode, timeZone: $timeZone, launchStatus: $launchStatus, profileSelectable: $profileSelectable, hostCreatable: $hostCreatable, eventCreatable: $eventCreatable, exploreVisible: $exploreVisible)';
}


}

/// @nodoc
abstract mixin class _$CityDataCopyWith<$Res> implements $CityDataCopyWith<$Res> {
  factory _$CityDataCopyWith(_CityData value, $Res Function(_CityData) _then) = __$CityDataCopyWithImpl;
@override @useResult
$Res call({
 String name, String cityId, String marketId, String slug, String label, double latitude, double longitude, String countryIsoCode, String currencyCode, String dialCode, String timeZone, String launchStatus, bool profileSelectable, bool hostCreatable, bool eventCreatable, bool exploreVisible
});




}
/// @nodoc
class __$CityDataCopyWithImpl<$Res>
    implements _$CityDataCopyWith<$Res> {
  __$CityDataCopyWithImpl(this._self, this._then);

  final _CityData _self;
  final $Res Function(_CityData) _then;

/// Create a copy of CityData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? cityId = null,Object? marketId = null,Object? slug = null,Object? label = null,Object? latitude = null,Object? longitude = null,Object? countryIsoCode = null,Object? currencyCode = null,Object? dialCode = null,Object? timeZone = null,Object? launchStatus = null,Object? profileSelectable = null,Object? hostCreatable = null,Object? eventCreatable = null,Object? exploreVisible = null,}) {
  return _then(_CityData(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,cityId: null == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String,marketId: null == marketId ? _self.marketId : marketId // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,countryIsoCode: null == countryIsoCode ? _self.countryIsoCode : countryIsoCode // ignore: cast_nullable_to_non_nullable
as String,currencyCode: null == currencyCode ? _self.currencyCode : currencyCode // ignore: cast_nullable_to_non_nullable
as String,dialCode: null == dialCode ? _self.dialCode : dialCode // ignore: cast_nullable_to_non_nullable
as String,timeZone: null == timeZone ? _self.timeZone : timeZone // ignore: cast_nullable_to_non_nullable
as String,launchStatus: null == launchStatus ? _self.launchStatus : launchStatus // ignore: cast_nullable_to_non_nullable
as String,profileSelectable: null == profileSelectable ? _self.profileSelectable : profileSelectable // ignore: cast_nullable_to_non_nullable
as bool,hostCreatable: null == hostCreatable ? _self.hostCreatable : hostCreatable // ignore: cast_nullable_to_non_nullable
as bool,eventCreatable: null == eventCreatable ? _self.eventCreatable : eventCreatable // ignore: cast_nullable_to_non_nullable
as bool,exploreVisible: null == exploreVisible ? _self.exploreVisible : exploreVisible // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
