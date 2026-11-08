import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The live top bar of a formats screen: the event, a kicker, back, the
/// live tag with the time now and an optional action.
CatchTopBar hostFormatsLiveTopBar(
  BuildContext context, {
  required Event event,
  required DateTime now,
  String? kicker,
  CatchTopBarAction? action,
}) => CatchTopBar(
  variant: CatchTopBarVariant.live,
  title: event.title,
  kicker: kicker,
  back: CatchTopBarBack(label: context.l10n.hostFormatsBackToEvent),
  live: context.l10n.hostLiveTag(time: AppTimeFormatters.time(now)),
  action: action,
);

/// The tool top bar of a formats setup screen: what is set up, the event
/// and its day as the kicker, and back.
CatchTopBar hostFormatsToolTopBar(
  BuildContext context, {
  required Event event,
  required String title,
  CatchTopBarAction? action,
}) => CatchTopBar(
  variant: CatchTopBarVariant.tool,
  title: title,
  kicker: context.l10n.hostFormatsSetupKicker(
    event: event.title,
    day: AppTimeFormatters.weekdayDayMonth(event.startTime),
  ),
  back: CatchTopBarBack(label: context.l10n.hostFormatsBack),
  action: action,
);
