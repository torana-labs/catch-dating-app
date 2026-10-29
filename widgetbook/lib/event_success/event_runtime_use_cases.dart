import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_channels_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_limits_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _path = '[P1 product surfaces]/Event Success/Automatic guest updates';
@widgetbook.UseCase(
  name: 'Reviewed event settings and recoverable save',
  type: EventAssistanceRuntimeSheet,
  path: _path,
)
Widget assistanceRuntimeSheet(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);
@widgetbook.UseCase(
  name: 'Explicit channels with progressive limits',
  type: EventAssistanceRuntimeSection,
  path: _path,
)
Widget assistanceRuntimeForm(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);
@widgetbook.UseCase(
  name: 'Named sender order and fallback choices',
  type: EventAssistanceRuntimeChannelsSection,
  path: _path,
)
Widget assistanceRuntimeChannels(BuildContext context) =>
    const _Preview(surface: _Surface.channels);
@widgetbook.UseCase(
  name: 'Optional response deadline and bounded retry limits',
  type: EventAssistanceRuntimeLimitsSection,
  path: _path,
)
Widget assistanceRuntimeLimits(BuildContext context) =>
    const _Preview(surface: _Surface.limits);

Future<RuntimePreviewRepository>? _fixture;
Future<RuntimePreviewRepository> loadRuntimePreviewFixture() =>
    _fixture ??= rootBundle
        .loadString('../test/event_success/fixtures/runtime_senders.json')
        .then(
          (raw) => RuntimePreviewRepository(
            (jsonDecode(raw) as Map).cast<String, Object?>(),
          ),
        );

enum _Surface { sheet, channels, limits }

class _Preview extends StatefulWidget {
  const _Preview({required this.surface});
  final _Surface surface;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  late final _loaded = loadRuntimePreviewFixture();
  AssistanceRuntimeDraft? _draft;
  @override
  Widget build(BuildContext context) => FutureBuilder<RuntimePreviewRepository>(
    future: _loaded,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Text('Preview unavailable: ${snapshot.error}');
      }
      if (!snapshot.hasData) return const CatchLoadingIndicator();
      final repository = snapshot.requireData;
      final view = repository.view;
      final draft = _draft ?? AssistanceRuntimeDraft.fromView(view);
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventAssistanceRuntimeRepositoryProvider.overrideWith(
            (ref) => repository,
          ),
        ],
        child: Scaffold(
          body: widget.surface == _Surface.sheet
              ? Align(
                  alignment: Alignment.bottomCenter,
                  child: EventAssistanceRuntimeSheet(scope: view.scope),
                )
              : SingleChildScrollView(
                  child: CatchPageBody(
                    child: widget.surface == _Surface.channels
                        ? EventAssistanceRuntimeChannelsSection(
                            draft: draft,
                            choices: view.senderSetup!.choices,
                            moreRoutes: const {},
                            enabled: true,
                            onChanged: (v) => setState(() => _draft = v),
                            onMore: (_) {},
                          )
                        : EventAssistanceRuntimeLimitsSection(
                            draft: draft,
                            eventEnd: view.eventEnd,
                            enabled: true,
                            onChanged: (v) => setState(() => _draft = v),
                            onChooseTime: (deadline) async {
                              final at = await chooseRuntimeTime(
                                context,
                                serverTime: view.serverTime,
                                eventEnd: view.eventEnd,
                                initial: draft.expiresAt,
                              );
                              if (!mounted || at == null) return;
                              setState(
                                () => _draft = deadline
                                    ? draft.withDeadline(at)
                                    : draft.withExpiry(at),
                              );
                            },
                          ),
                  ),
                ),
        ),
      );
    },
  );
}

class RuntimePreviewRepository implements EventAssistanceRuntimeRepository {
  RuntimePreviewRepository(Map<String, Object?> fixtures) {
    final raw = (fixtures['configured']! as Map)['view']! as Map;
    final context = raw['context']! as Map;
    view = AssistanceRuntimeView.fromJson(
      raw,
      expectedScope: EventAssistanceRuntimeScope(
        organizerId: context['organizerId'] as String,
        eventId: context['eventId'] as String,
      ),
    );
  }
  late final AssistanceRuntimeView view;
  @override
  Future<AssistanceRuntimeView> fetch(
    EventAssistanceRuntimeScope scope,
  ) async => view;
  @override
  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) async => view;
  @override
  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) async =>
      throw const NetworkException(
        'unavailable',
        'Preview save needs confirmation.',
      );
}
