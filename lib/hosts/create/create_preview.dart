import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_l10n/l10n.dart';
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
      _ => context.l10n.hostCreateDateToCome,
    };
    final price = int.tryParse(draft.price ?? '');
    final placeName = draft.meetingPoint ?? context.l10n.hostCreatePlaceToCome;
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
      formatLabel: format == null
          ? null
          : context.l10n.hostCreateFormatShort(format: format.name),
      when: when,
      place: place,
      counts: [
        CatchMetricValue(
          value: places == null ? context.l10n.hostCreateNoValue : '$places',
          label: context.l10n.hostCreatePlaces,
        ),
        CatchMetricValue(
          value: state.published ? '0' : context.l10n.hostCreateNoValue,
          label: context.l10n.hostCreateBooked,
        ),
      ],
    );
  }

  final String? formatLabel;
  final String when;
  final String place;
  final List<CatchMetricValue> counts;
}
