import 'dart:math';

import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'city_repository.g.dart';

/// Fetches the list of supported cities from Firestore.
///
/// The primary source is the `config/cities` document. When that document
/// is missing or unreadable, the function falls back to the default city
/// catalog so the picker never renders empty.
class CityRepository {
  const CityRepository(this._db, this._errorLogger);

  static const _configDocPath = 'config/cities';

  final FirebaseFirestore _db;
  final ErrorLogger _errorLogger;

  Future<List<CityData>> fetchCities() async {
    try {
      final snap = await _db.doc(_configDocPath).get();
      if (snap.exists) {
        final data = snap.data();
        final list = data?['cities'] as List<dynamic>?;
        if (list != null && list.isNotEmpty) {
          return list
              .map((e) => CityData.fromJson(e as Map<String, dynamic>))
              .where((city) => city.profileSelectable || city.exploreVisible)
              .toList(growable: false);
        }
      }
    } catch (e, st) {
      // Fall through to defaults — network errors or missing indexes
      // should not prevent the city picker from rendering.
      _errorLogger.logAppException(
        normalizeBackendError(
          e,
          stackTrace: st,
          context: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'fetch city config',
            resource: 'config/cities',
          ),
        ),
      );
    }

    return _defaultCities;
  }

  /// Finds the nearest city to [lat] / [lng] from the fetched list.
  ///
  /// Uses the Haversine formula against the configured city list.
  Future<CityData?> nearestCity(double lat, double lng) async {
    final cities = await fetchCities();
    if (cities.isEmpty) return null;

    CityData? nearest;
    double minDistance = double.infinity;

    for (final city in cities) {
      final d = _haversineKm(lat, lng, city.latitude, city.longitude);
      if (d < minDistance) {
        minDistance = d;
        nearest = city;
      }
    }

    return nearest;
  }
}

// ── Fallback ───────────────────────────────────────────────────────────────

final _defaultCities = launchedDefaultCityData;

// ── Haversine ──────────────────────────────────────────────────────────────

double _haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371; // Earth's radius in km
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a =
      sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRad(lat1)) * cos(_toRad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return r * c;
}

double _toRad(double deg) => deg * pi / 180;

// ── Providers ──────────────────────────────────────────────────────────────

/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the 9 hardcoded defaults.
// keepalive: city repository backs global city selection and should remain a
// single cached Firestore facade.
@Riverpod(keepAlive: true)
CityRepository cityRepository(Ref ref) => CityRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(errorLoggerProvider),
);

// keepalive: city list is app-wide discovery configuration reused by Explore,
// onboarding, and profile flows.
@Riverpod(keepAlive: true)
Future<List<CityData>> cityList(Ref ref) async {
  return ref.watch(cityRepositoryProvider).fetchCities();
}
