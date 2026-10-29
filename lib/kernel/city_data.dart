import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'city_data.freezed.dart';
part 'city_data.g.dart';

/// A supported city sourced from the `config/cities` Firestore document.
///
/// This is the app-facing city representation for UI selection, nearest-city
/// detection, and server-side validation.
@freezed
abstract class CityData with _$CityData {
  const CityData._();

  const factory CityData({
    /// App-facing selection id. New config stores the canonical market id here.
    required String name,

    /// Canonical global city id, e.g. `in-mh-mumbai`.
    @Default('') String cityId,

    /// Canonical product launch/search market id, e.g. `in-mh-mumbai`.
    @Default('') String marketId,

    /// Public URL/display slug, e.g. `mumbai`.
    @Default('') String slug,

    /// Human-readable label (e.g. `'Mumbai'`, `'New Delhi'`).
    required String label,

    /// Latitude for GPS-based nearest-city detection.
    required double latitude,

    /// Longitude for GPS-based nearest-city detection.
    required double longitude,

    /// ISO 3166-1 alpha-2 country code for market-specific behavior.
    @Default(defaultCountryIsoCode) String countryIsoCode,

    /// Currency used for event price display and future provider routing.
    @Default(defaultCurrencyCode) String currencyCode,

    /// Local phone dial code used for contact/auth defaults in this market.
    @Default(defaultCountryDialCode) String dialCode,

    /// IANA timezone for event scheduling and future localized display.
    @Default(defaultTimeZone) String timeZone,

    /// Product rollout state for this market.
    @Default('planned') String launchStatus,

    /// Whether users can select this market in profile/onboarding.
    @Default(false) bool profileSelectable,

    /// Whether hosts can create organizers here.
    @Default(false) bool hostCreatable,

    /// Whether hosts can create events here.
    @Default(false) bool eventCreatable,

    /// Whether Explore should show this market.
    @Default(false) bool exploreVisible,
  }) = _CityData;

  factory CityData.fromJson(Map<String, dynamic> json) =>
      _$CityDataFromJson(json);

  String get effectiveMarketId => marketId.isNotEmpty ? marketId : name;
  String get effectiveCityId => cityId.isNotEmpty ? cityId : effectiveMarketId;
  String get effectiveSlug => slug.isNotEmpty ? slug : name;
}
