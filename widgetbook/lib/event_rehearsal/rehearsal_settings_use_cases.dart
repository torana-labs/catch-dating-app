import 'dart:convert';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_preview_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_sheet.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _path = '[P1 product surfaces]/Event Success/Rehearsal settings';
@widgetbook.UseCase(
  name: 'Compact settings entry',
  type: EventRehearsalSettingsSection,
  path: _path,
)
Widget rehearsalSettingsEntry(BuildContext context) =>
    const _Preview(surface: _Surface.entry);
@widgetbook.UseCase(
  name: 'Practice save and exact retry',
  type: EventRehearsalSettingsSheet,
  path: _path,
)
Widget rehearsalSettingsSheet(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);
@widgetbook.UseCase(
  name: 'Progressive delivery configuration',
  type: EventRehearsalRuntimeSection,
  path: _path,
)
Widget rehearsalRuntimeSection(BuildContext context) =>
    const _Preview(surface: _Surface.form);
@widgetbook.UseCase(
  name: 'Simulated outcome sequence',
  type: EventRehearsalRuntimePreviewSection,
  path: _path,
)
Widget rehearsalRuntimeFields(BuildContext context) =>
    const _Preview(surface: _Surface.outcomes);

enum _Surface { entry, sheet, form, outcomes }

Future<EventRehearsalBootstrap>? _loaded;
Future<EventRehearsalBootstrap> loadRehearsalSettingsPreviewFixture() =>
    _loaded ??= rootBundle
        .loadString('../test/event_rehearsal/fixtures/settings_reviews.json')
        .then(
          (raw) => EventRehearsalBootstrap.fromCallableData(
            (jsonDecode(raw) as Map)['configured'],
          ),
        );

class _Preview extends StatefulWidget {
  const _Preview({required this.surface});
  final _Surface surface;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  final _future = loadRehearsalSettingsPreviewFixture();
  RehearsalRuntimeDraft? _draft;
  @override
  Widget build(BuildContext context) => FutureBuilder<EventRehearsalBootstrap>(
    future: _future,
    builder: (context, async) {
      if (async.hasError) return Text('Preview unavailable: ${async.error}');
      if (!async.hasData) return const CatchLoadingIndicator();
      final snapshot = async.requireData;
      final draft =
          _draft ??
          RehearsalRuntimeDraft.fromConfiguration(
            snapshot.settingsReview!.runtime!.configuration,
          );
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventRehearsalRepositoryProvider.overrideWith(
            (ref) => _Repository(snapshot),
          ),
        ],
        child: Scaffold(
          body: widget.surface == _Surface.sheet
              ? Align(
                  alignment: Alignment.bottomCenter,
                  child: EventRehearsalSettingsSheet(
                    sessionId: snapshot.session.id,
                  ),
                )
              : SingleChildScrollView(
                  child: CatchPageBody(
                    child: switch (widget.surface) {
                      _Surface.entry => EventRehearsalSettingsSection(
                        sessionId: snapshot.session.id,
                        review: snapshot.settingsReview!,
                      ),
                      _Surface.form => EventRehearsalRuntimeSection(
                        reviewIdentity: snapshot,
                        snapshot: snapshot,
                        phase: RehearsalSettingsPhase.ready,
                        onConfigure: (_) {},
                        onPause: () {},
                        onRetry: () {},
                        onReload: () {},
                        onDone: () {},
                      ),
                      _Surface.outcomes => EventRehearsalRuntimePreviewSection(
                        draft: draft,
                        enabled: true,
                        consumedPrefix: 0,
                        onChanged: (v) => setState(() => _draft = v),
                        showOutcomes: true,
                      ),
                      _Surface.sheet => const SizedBox.shrink(),
                    },
                  ),
                ),
        ),
      );
    },
  );
}

class _Repository implements EventRehearsalRepository {
  _Repository(this.snapshot);
  final EventRehearsalBootstrap snapshot;
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<EventRehearsalBootstrap> applySettings(
    RehearsalSettingsChange change,
  ) async => throw const NetworkException(
    'unavailable',
    'Preview: try the exact request again.',
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
