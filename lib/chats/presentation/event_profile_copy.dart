import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_draft.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/widgets.dart';

String eventProfileValue(
  BuildContext context,
  EventProfileField field, {
  bool core = true,
}) {
  final choices = core
      ? FormProfileDraft.choices(field.id)
      : <String, String>{};
  if (core && field.id == 'city') {
    for (final city in defaultCityOptions) {
      choices[city.effectiveMarketId] = city.label;
    }
  }
  return switch (field.value) {
    final bool value =>
      value ? context.l10n.formProfileYes : context.l10n.formProfileNo,
    final List<String> values =>
      values.map((value) => choices[value] ?? value).join(', '),
    final String value => choices[value] ?? value,
    final num value => value.toString(),
    _ => throw const FormatException('Invalid event profile value'),
  };
}
