import 'dart:math';

import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:flutter/material.dart';

/// Restores both canonical local dates and older wizard draft dates.
DateTime? restoredPrivateEventDate(
  EventDraft draft, {
  required bool rejectPast,
}) {
  final localDate = draft.eventLocalDate;
  DateTime? date = localDate == null ? null : DateTime.tryParse(localDate);
  final today = DateUtils.dateOnly(DateTime.now());
  if (rejectPast && date != null && date.isBefore(today)) {
    date = null;
  }
  final legacyMillis = draft.selectedDateMillis;
  if (date == null && legacyMillis != null) {
    date = DateTime.fromMillisecondsSinceEpoch(legacyMillis);
  }
  if (date == null) {
    return null;
  }
  final day = DateUtils.dateOnly(date);
  if (rejectPast && day.isBefore(today)) {
    return null;
  }
  return day;
}

/// Canonical HH:mm takes priority; legacy picker fields remain readable.
TimeOfDay? restoredPrivateEventStart(EventDraft draft) {
  final parts = draft.eventLocalStartTime?.split(':');
  if (parts?.length == 2) {
    final hour = int.tryParse(parts![0]);
    final minute = int.tryParse(parts[1]);
    if (hour != null &&
        minute != null &&
        hour >= 0 &&
        hour < 24 &&
        minute >= 0 &&
        minute < 60) {
      return TimeOfDay(hour: hour, minute: minute);
    }
  }
  final hour = draft.selectedStartHour;
  final minute = draft.selectedStartMinute;
  if (hour == null ||
      minute == null ||
      hour < 0 ||
      hour >= 24 ||
      minute < 0 ||
      minute >= 60) {
    return null;
  }
  return TimeOfDay(hour: hour, minute: minute);
}

/// Decodes a persisted draft independently of route lifetime and UI controllers.
class PrivateEventDraftRestore {
  PrivateEventDraftRestore(
    EventDraft draft, {
    required String? organizerCityId,
    required String? organizerMarketId,
    required String? organizerTimezone,
    required bool trustedDefaults,
    required String organizerDefaultsHash,
  }) {
    receipt =
        draft.eventCreateReceiptEventId != null &&
            draft.eventCreateReceiptRevision != null
        ? PrivateEventCreateReceipt(
            eventId: draft.eventCreateReceiptEventId!,
            setupRevision: draft.eventCreateReceiptRevision!,
            replayed: true,
          )
        : null;
    city = defaultCityOptions
        .where(
          (option) =>
              option.effectiveCityId == draft.eventCityId &&
              option.effectiveMarketId == draft.eventMarketId,
        )
        .firstOrNull;
    city ??= defaultCityOptions
        .where(
          (option) =>
              option.effectiveCityId == organizerCityId &&
              option.effectiveMarketId == organizerMarketId,
        )
        .firstOrNull;
    timezone = draft.eventTimezone ?? organizerTimezone ?? city?.timeZone ?? '';
    date = restoredPrivateEventDate(draft, rejectPast: false);
    start = restoredPrivateEventStart(draft);
    cityInherited = trustedDefaults && draft.eventCityMode == 'inherit';
    timezoneInherited = trustedDefaults && draft.eventTimezoneMode == 'inherit';
    defaultsChanged =
        (cityInherited || timezoneInherited) &&
        draft.eventReviewedDefaultsHash != organizerDefaultsHash;
    savedCity = city == null
        ? null
        : EventSetupCity(
            cityId: city!.effectiveCityId,
            marketId: city!.effectiveMarketId,
          );
  }
  late final PrivateEventCreateReceipt? receipt;
  CityOption? city;
  late final String timezone;
  late final DateTime? date;
  late final TimeOfDay? start;
  late final bool cityInherited;
  late final bool timezoneInherited;
  late final bool defaultsChanged;
  late final EventSetupCity? savedCity;
}

/// Updates only the first-save snapshot; other wizard/import fields survive.
EventDraft privateEventDraftSnapshot({
  required EventDraft? old,
  required String draftId,
  required String clubId,
  required String name,
  required String? cityId,
  required String? marketId,
  required String? localDate,
  required String? localStartTime,
  required String timezone,
  required bool cityInherited,
  required bool timezoneInherited,
  required String organizerDefaultsHash,
  required String requestId,
  required String? submittedSignature,
  required String? submittedPayloadJson,
  required DateTime? date,
  required TimeOfDay? start,
  PrivateEventCreateReceipt? receipt,
}) {
  return (old ??
          EventDraft(id: draftId, clubId: clubId, savedAt: DateTime.now()))
      .copyWith(
        savedAt: DateTime.now(),
        name: name,
        eventCityId: cityId,
        eventMarketId: marketId,
        eventLocalDate: localDate,
        eventLocalStartTime: localStartTime,
        eventTimezone: timezone,
        eventCityMode: cityInherited ? 'inherit' : 'set',
        eventTimezoneMode: timezoneInherited ? 'inherit' : 'set',
        eventReviewedDefaultsHash: cityInherited || timezoneInherited
            ? organizerDefaultsHash
            : null,
        eventCreateRequestId: requestId,
        eventCreatePayloadSignature: submittedSignature,
        eventCreatePayloadJson: submittedPayloadJson,
        eventCreateReceiptEventId:
            receipt?.eventId ?? old?.eventCreateReceiptEventId,
        eventCreateReceiptRevision:
            receipt?.setupRevision ?? old?.eventCreateReceiptRevision,
        selectedDateMillis: date?.millisecondsSinceEpoch,
        selectedStartHour: start?.hour,
        selectedStartMinute: start?.minute,
      );
}

String newPrivateEventRequestId() {
  final random = Random.secure();
  return List<int>.generate(
    24,
    (_) => random.nextInt(256),
  ).map((value) => value.toRadixString(16).padLeft(2, '0')).join();
}
