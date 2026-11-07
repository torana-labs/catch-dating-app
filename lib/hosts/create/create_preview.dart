import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// What the poster says about an event still being set up: the format,
/// when, where with the price, and the places, with placeholders for what
/// is not set yet.
@immutable
class CreatePreview {
  const CreatePreview({
    required this.formatLabel,
    required this.when,
    required this.place,
    required this.counts,
  });

  factory CreatePreview.of(BuildContext context, CreateFlowState state) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final draft = state.draft;
    final date = DateTime.tryParse(draft.eventLocalDate ?? '');
    final clock = createClock(draft.eventLocalStartTime, locale);
    final day = date == null
        ? null
        : DateFormat('EEE d MMM', locale).format(date);
    final when = switch ((day, clock)) {
      (final String day, final String clock) => '$day · $clock',
      (final String day, null) => day,
      _ => CreateCopy.dateToCome,
    };
    final price = int.tryParse(draft.price ?? '');
    final placeName = draft.meetingPoint ?? CreateCopy.placeToCome;
    final place = draft.externalBookingMode || price == null
        ? placeName
        : price == 0
        ? placeName
        : '$placeName · ₹${NumberFormat.decimalPattern(locale).format(price)}';
    final places = draft.externalBookingMode
        ? null
        : int.tryParse(draft.capacity ?? '') ??
              (draft.price == null ? null : createDefaultPlaces);
    final format = state.format;
    return CreatePreview(
      formatLabel: format == null ? null : CreateCopy.formatShort(format),
      when: when,
      place: place,
      counts: [
        CatchMetricValue(
          value: places == null ? CreateCopy.dash : '$places',
          label: CreateCopy.places,
        ),
        CatchMetricValue(
          value: state.published ? '0' : CreateCopy.dash,
          label: CreateCopy.booked,
        ),
      ],
    );
  }

  final String? formatLabel;
  final String when;
  final String place;
  final List<CatchMetricValue> counts;
}
