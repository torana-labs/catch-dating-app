import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_destination_field.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_rules_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_settings_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_late_join_preview_repository.dart';

const _path = '[P1 product surfaces]/Event Success/Late arrival settings';
@widgetbook.UseCase(
  name: 'Compact entry and optional group rules',
  type: EventAssistanceLiveSettingsSection,
  path: _path,
)
Widget assistanceLateJoinEntry(BuildContext context) =>
    const _Preview(surface: _Surface.entry);
@widgetbook.UseCase(
  name: 'Reviewed settings and exact retry',
  type: EventAssistanceLateJoinSheet,
  path: _path,
)
Widget assistanceLateJoinSheet(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);
@widgetbook.UseCase(
  name: 'Smart defaults and progressive customization',
  type: EventAssistanceLateJoinSection,
  path: _path,
)
Widget assistanceLateJoinForm(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);
@widgetbook.UseCase(
  name: 'Custom rules preserve the remaining configuration',
  type: EventAssistanceLateJoinRulesSection,
  path: _path,
)
Widget assistanceLateJoinRules(BuildContext context) =>
    const _Preview(surface: _Surface.rules);
@widgetbook.UseCase(
  name: 'Verified places and joining point selection',
  type: EventAssistanceLateJoinDestinationField,
  path: _path,
)
Widget assistanceLateJoinDestinations(BuildContext context) =>
    const _Preview(surface: _Surface.destinations);

enum _Surface { entry, sheet, rules, destinations }

class _Preview extends StatefulWidget {
  const _Preview({required this.surface});
  final _Surface surface;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  late final _loaded = loadLateJoinPreviewFixture();
  AssistanceLateJoinRules? _rules;
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, Object?>>(
    future: _loaded,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Text('Preview unavailable: ${snapshot.error}');
      }
      if (!snapshot.hasData) return const CatchLoadingIndicator();
      final repository = LateJoinPreviewRepository(snapshot.requireData);
      final view = repository.view;
      final setup = view.setup!;
      final rules =
          _rules ?? (view.own!.preference as LateJoinConfigured).template.rules;
      final event = Event(
        id: view.scope.eventId,
        clubId: view.scope.organizerId,
        startTime: DateTime.fromMillisecondsSinceEpoch(view.serverTime),
        endTime: DateTime.fromMillisecondsSinceEpoch(setup.eventEnd),
        meetingPoint:
            setup.destinations.first.location?.name ??
            setup.destinations.first.label,
        distanceKm: 0,
        pace: PaceLevel.easy,
        capacityLimit: 40,
        description: 'Preview event context',
        priceInPaise: 0,
      );
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventAssistanceLateJoinSettingRepositoryProvider.overrideWith(
            (ref) => repository,
          ),
        ],
        child: Scaffold(
          body: switch (widget.surface) {
            _Surface.sheet => Align(
              alignment: Alignment.bottomCenter,
              child: EventAssistanceLateJoinSheet(
                scope: view.scope,
                groupLabel: context.l10n.eventAssistanceLateJoinEveryone,
              ),
            ),
            _Surface.entry => SingleChildScrollView(
              child: CatchPageBody(
                child: EventAssistanceLiveSettingsSection(event: event),
              ),
            ),
            _Surface.rules || _Surface.destinations => SingleChildScrollView(
              child: CatchPageBody(
                child: CatchSection.fieldRows(
                  child: widget.surface == _Surface.destinations
                      ? EventAssistanceLateJoinDestinationField(
                          value: rules.destination,
                          setup: setup,
                          enabled: true,
                          onChanged: (v) => setState(
                            () => _rules = rules.copyWith(destination: v),
                          ),
                        )
                      : EventAssistanceLateJoinRulesSection(
                          rules: rules,
                          setup: setup,
                          serverTime: view.serverTime,
                          enabled: true,
                          onChanged: (v) => setState(() => _rules = v),
                          onChooseCutoff: () async {
                            final time = await showCatchTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(
                                event.endTime,
                              ),
                              copy: catchTimePickerCopy(context.l10n),
                            );
                            if (!mounted || time == null) return;
                            setState(
                              () => _rules = rules.copyWith(
                                cutoff: LateJoinAtTime(
                                  DateTime(
                                    event.endTime.year,
                                    event.endTime.month,
                                    event.endTime.day,
                                    time.hour,
                                    time.minute,
                                  ).millisecondsSinceEpoch,
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
            ),
          },
        ),
      );
    },
  );
}
