import 'dart:convert';

import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

/// Matches the server's ordered JSON snapshot for inherited defaults.
String organizerEventDefaultsHash({
  required String? cityId,
  required String? marketId,
  required String? timezone,
  required int? revision,
}) {
  final city =
      cityId != null &&
          cityId.isNotEmpty &&
          marketId != null &&
          marketId.isNotEmpty
      ? {'cityId': cityId, 'marketId': marketId}
      : null;
  return sha256Digest(
    jsonEncode({'city': city, 'timezone': timezone, 'revision': revision}),
  );
}

/// A field can inherit, be explicitly set, or be explicitly cleared.
///
/// Required first-save fields reject [clear]. Keeping the three intentions
/// distinct prevents an omitted optional value from silently inheriting one.
enum EventSetupValueMode { inherit, set, clear }

class EventSetupValue<T> {
  const EventSetupValue.inherit()
    : mode = EventSetupValueMode.inherit,
      value = null;
  const EventSetupValue.set(this.value) : mode = EventSetupValueMode.set;
  const EventSetupValue.clear()
    : mode = EventSetupValueMode.clear,
      value = null;

  final EventSetupValueMode mode;
  final T? value;

  Map<String, Object?> toJson(Object? Function(T) encode) => {
    'mode': mode.name,
    if (mode == EventSetupValueMode.set) 'value': encode(value as T),
  };
}

class EventSetupCity {
  const EventSetupCity({required this.cityId, required this.marketId});

  final String cityId;
  final String marketId;

  Map<String, Object?> toJson() => {'cityId': cityId, 'marketId': marketId};
}

/// The private first-save payload. Venue, end time, capacity and price are
/// deliberately absent from this type and cannot be synthesized by its caller.
class PrivateEventBasics {
  const PrivateEventBasics({
    required this.name,
    required this.city,
    required this.localDate,
    required this.localStartTime,
    required this.timezone,
    this.reviewedDefaultsHash,
  });

  final String name;
  final EventSetupValue<EventSetupCity> city;
  final String localDate;
  final String localStartTime;
  final EventSetupValue<String> timezone;
  final String? reviewedDefaultsHash;

  factory PrivateEventBasics.fromJson(Map<String, dynamic> json) {
    EventSetupValue<T> parseValue<T>(Object? raw, T Function(Object?) parse) {
      if (raw is! Map) throw const FormatException('Invalid setup value');
      final value = Map<String, dynamic>.from(raw);
      return switch (value['mode']) {
        'inherit' => EventSetupValue<T>.inherit(),
        'set' => EventSetupValue.set(parse(value['value'])),
        _ => throw const FormatException('Invalid setup value mode'),
      };
    }

    final city = parseValue<EventSetupCity>(json['city'], (raw) {
      if (raw is! Map) throw const FormatException('Invalid city');
      final value = Map<String, dynamic>.from(raw);
      if (value['cityId'] is! String || value['marketId'] is! String) {
        throw const FormatException('Invalid city');
      }
      return EventSetupCity(
        cityId: value['cityId'] as String,
        marketId: value['marketId'] as String,
      );
    });
    final timezone = parseValue<String>(json['timezone'], (raw) {
      if (raw is! String) throw const FormatException('Invalid timezone');
      return raw;
    });
    final basics = PrivateEventBasics(
      name: json['name'] as String,
      city: city,
      localDate: json['localDate'] as String,
      localStartTime: json['localStartTime'] as String,
      timezone: timezone,
      reviewedDefaultsHash: json['reviewedDefaultsHash'] as String?,
    );
    if (!basics.isValid) throw const FormatException('Invalid saved basics');
    return basics;
  }

  bool get isValid {
    if (name.trim().isEmpty ||
        name.trim().length > 120 ||
        city.mode == EventSetupValueMode.clear ||
        timezone.mode == EventSetupValueMode.clear) {
      return false;
    }
    if (city.mode == EventSetupValueMode.set &&
        ((city.value?.cityId.trim().isEmpty ?? true) ||
            (city.value?.marketId.trim().isEmpty ?? true))) {
      return false;
    }
    if (timezone.mode == EventSetupValueMode.set &&
        (timezone.value?.trim().isEmpty ?? true)) {
      return false;
    }
    if ((city.mode == EventSetupValueMode.inherit ||
            timezone.mode == EventSetupValueMode.inherit) &&
        (reviewedDefaultsHash?.trim().isEmpty ?? true)) {
      return false;
    }
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(localDate) ||
        !RegExp(r'^\d{2}:\d{2}$').hasMatch(localStartTime)) {
      return false;
    }
    final dateParts = localDate.split('-');
    if (dateParts.length != 3) return false;
    final year = int.tryParse(dateParts[0]);
    final month = int.tryParse(dateParts[1]);
    final day = int.tryParse(dateParts[2]);
    if (year == null ||
        year < 2000 ||
        year > 2100 ||
        month == null ||
        day == null) {
      return false;
    }
    final date = DateTime.utc(year, month, day);
    if (date.year != year || date.month != month || date.day != day) {
      return false;
    }
    final timeParts = localStartTime.split(':');
    if (timeParts.length != 2) return false;
    final hour = int.tryParse(timeParts[0]);
    final minute = int.tryParse(timeParts[1]);
    return hour != null &&
        minute != null &&
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59;
  }

  Map<String, Object?> toJson() => {
    'name': name.trim(),
    'city': city.toJson((value) => value.toJson()),
    'localDate': localDate,
    'localStartTime': localStartTime,
    'timezone': timezone.toJson((value) => value.trim()),
    if (reviewedDefaultsHash != null)
      'reviewedDefaultsHash': reviewedDefaultsHash,
  };
}
