import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:flutter/material.dart';

const createEventFutureStartError = 'Choose a start time later than now';

class CreateEventScheduleState {
  const CreateEventScheduleState({
    required this.selectedDate,
    required this.selectedStartTime,
    this.durationMinutes = BusinessRules.eventDefaultDurationMinutes,
  });

  final DateTime? selectedDate;
  final TimeOfDay? selectedStartTime;
  final int durationMinutes;

  DateTime? get selectedStartDateTime {
    final date = selectedDate;
    final time = selectedStartTime;
    if (date == null || time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  TimeOfDay initialStartTime({required DateTime now}) {
    final date = selectedDate;
    if (date != null && DateUtils.isSameDay(date, now)) {
      final soon = now.add(const Duration(minutes: 5));
      if (DateUtils.isSameDay(date, soon)) {
        return TimeOfDay(hour: soon.hour, minute: soon.minute);
      }
    }
    return const TimeOfDay(hour: 7, minute: 0);
  }

  bool get canDecreaseDuration =>
      durationMinutes > BusinessRules.eventMinDurationMinutes;

  bool get canIncreaseDuration =>
      durationMinutes < BusinessRules.eventMaxDurationMinutes;

  CreateEventSchedulePickerResult selectDate(
    DateTime selectedDate, {
    required DateTime now,
  }) {
    final candidate = CreateEventScheduleState(
      selectedDate: selectedDate,
      selectedStartTime: selectedStartTime,
      durationMinutes: durationMinutes,
    );
    final errorText = candidate.errorText(now: now);
    final resolvedStartTime = errorText == null ? selectedStartTime : null;
    return CreateEventSchedulePickerResult(
      selectedDate: selectedDate,
      selectedStartTime: resolvedStartTime,
      dateText: formatDate(selectedDate),
      startTimeText: resolvedStartTime == null
          ? ''
          : formatClockTime(resolvedStartTime),
      errorText: errorText,
    );
  }

  CreateEventSchedulePickerResult selectStartTime(
    TimeOfDay selectedStartTime, {
    required DateTime now,
  }) {
    final candidate = CreateEventScheduleState(
      selectedDate: selectedDate,
      selectedStartTime: selectedStartTime,
      durationMinutes: durationMinutes,
    );
    final errorText = candidate.errorText(now: now);
    final resolvedStartTime = errorText == null ? selectedStartTime : null;
    return CreateEventSchedulePickerResult(
      selectedDate: selectedDate,
      selectedStartTime: resolvedStartTime,
      dateText: selectedDate == null ? '' : formatDate(selectedDate!),
      startTimeText: resolvedStartTime == null
          ? ''
          : formatClockTime(resolvedStartTime),
      errorText: errorText,
    );
  }

  CreateEventScheduleState decreaseDuration() {
    if (!canDecreaseDuration) return this;
    return _copyWith(
      durationMinutes: durationMinutes - BusinessRules.eventDurationStepMinutes,
    );
  }

  CreateEventScheduleState increaseDuration() {
    if (!canIncreaseDuration) return this;
    return _copyWith(
      durationMinutes: durationMinutes + BusinessRules.eventDurationStepMinutes,
    );
  }

  String? errorText({required DateTime now}) {
    final startDateTime = selectedStartDateTime;
    if (startDateTime == null) return null;
    return startDateTime.isAfter(now) ? null : createEventFutureStartError;
  }

  CreateEventScheduleValidationResult validate({
    required bool isScheduleStep,
    required DateTime now,
  }) {
    if (!isScheduleStep) {
      return const CreateEventScheduleValidationResult.valid();
    }
    final startDateTime = selectedStartDateTime;
    if (startDateTime == null) {
      return const CreateEventScheduleValidationResult.invalid();
    }
    return startDateTime.isAfter(now)
        ? const CreateEventScheduleValidationResult.valid()
        : const CreateEventScheduleValidationResult.invalid(
            errorText: createEventFutureStartError,
          );
  }

  CreateEventScheduleState _copyWith({int? durationMinutes}) {
    return CreateEventScheduleState(
      selectedDate: selectedDate,
      selectedStartTime: selectedStartTime,
      durationMinutes: durationMinutes ?? this.durationMinutes,
    );
  }

  static String formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  static String formatClockTime(TimeOfDay time) {
    return AppTimeFormatters.clockTime(hour: time.hour, minute: time.minute);
  }
}

class CreateEventScheduleValidationResult {
  const CreateEventScheduleValidationResult._({
    required this.isValid,
    required this.errorText,
  });

  const CreateEventScheduleValidationResult.valid()
    : this._(isValid: true, errorText: null);

  const CreateEventScheduleValidationResult.invalid({String? errorText})
    : this._(isValid: false, errorText: errorText);

  final bool isValid;
  final String? errorText;
}

class CreateEventSchedulePickerResult {
  const CreateEventSchedulePickerResult({
    required this.selectedDate,
    required this.selectedStartTime,
    required this.dateText,
    required this.startTimeText,
    required this.errorText,
  });

  final DateTime? selectedDate;
  final TimeOfDay? selectedStartTime;
  final String dateText;
  final String startTimeText;
  final String? errorText;
}
