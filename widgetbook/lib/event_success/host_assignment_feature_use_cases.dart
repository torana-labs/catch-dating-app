import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_assignment_feature_rule_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_assignment_features_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _path = '[P1 product surfaces]/Event Success/Assignment components';
const _question = EventSuccessAssignmentFeatureQuestion(
  questionId: 'music-style',
  label: 'Music style',
  kind: 'singleChoice',
  options: [
    EventSuccessAssignmentFeatureOption(optionId: 'jazz', label: 'Jazz'),
    EventSuccessAssignmentFeatureOption(optionId: 'folk', label: 'Folk'),
  ],
);
const _source = EventSuccessAssignmentFeatureSource(
  formId: 'run-rsvp',
  formTitle: 'Sunday run RSVP',
  versionId: 'run-rsvp_v2',
  isActiveVersion: true,
  questions: [_question],
);

final _form = HostFormSummary(
  organizerId: 'run-club',
  formId: 'run-rsvp',
  title: 'Sunday run RSVP',
  description: null,
  purpose: HostFormPurpose.registration,
  status: HostFormLifecycleStatus.published,
  templateId: null,
  publicFormId: 'public-run-rsvp',
  defaultTargetKind: HostFormTargetKind.event,
  defaultTargetId: 'event-1',
  activeVersionId: 'run-rsvp_v2',
  draftRevision: 3,
  publishedVersion: 2,
  submittedResponseCount: 8,
  consequences: const HostFormConsequences.unavailable(),
  updatedAt: DateTime.utc(2026, 9, 23),
  publishedAt: DateTime.utc(2026, 9, 20),
  lastResponseAt: null,
);

@widgetbook.UseCase(
  name: 'Current roster coverage',
  type: EventSuccessAssignmentFeaturesSection,
  path: _path,
)
Widget eventSuccessAssignmentFeaturesSection(BuildContext context) =>
    const _MatchingPreview(showRuleSheet: false);

@widgetbook.UseCase(
  name: 'Published question transform',
  type: EventSuccessAssignmentFeatureRuleSheet,
  path: _path,
)
Widget eventSuccessAssignmentFeatureRuleSheet(BuildContext context) =>
    const _MatchingPreview(showRuleSheet: true);

class _MatchingPreview extends StatefulWidget {
  const _MatchingPreview({required this.showRuleSheet});

  final bool showRuleSheet;

  @override
  State<_MatchingPreview> createState() => _MatchingPreviewState();
}

class _MatchingPreviewState extends State<_MatchingPreview> {
  late List<EventSuccessAssignmentFeatureRule> _saved = [
    EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
      source: _source,
      question: _question,
      kind: 'category',
      mode: 'preferSimilar',
      weight: 1,
    ),
  ];
  int _revision = 3;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 390,
    height: 844,
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: SafeArea(
          child: widget.showRuleSheet
              ? Align(
                  alignment: Alignment.bottomCenter,
                  child: EventSuccessAssignmentFeatureRuleSheet(
                    source: _source,
                    question: _question,
                    current: _saved.single,
                  ),
                )
              : SingleChildScrollView(
                  child: EventSuccessAssignmentFeaturesSection(
                    eventId: 'event-1',
                    viewerUid: 'host-1',
                    enabled: true,
                    sequenceUnsupported: false,
                    formsState: CatchAsyncState<List<HostFormSummary>>.data([
                      _form,
                    ]),
                    onLoadMoreForms: null,
                    onPreview:
                        ({
                          required eventId,
                          required rules,
                          required sourceFormIds,
                        }) async => EventSuccessAssignmentFeaturePreview(
                          eventId: eventId,
                          revision: _revision,
                          rosterCount: 8,
                          sources: const [_source],
                          savedRules: _saved,
                          coverage: [
                            for (final rule in rules)
                              EventSuccessAssignmentFeatureCoverage(
                                featureId: rule.featureId,
                                grantedCount: 5,
                                usableCount: 4,
                                missingCount: 4,
                              ),
                          ],
                        ),
                    onSave:
                        ({
                          required eventId,
                          required expectedRevision,
                          required requestId,
                          required rules,
                        }) async {
                          setState(() {
                            _saved = List.unmodifiable(rules);
                            _revision++;
                          });
                          return EventSuccessAssignmentFeatureSaveResult(
                            eventId: eventId,
                            revision: _revision,
                            replayed: false,
                          );
                        },
                  ),
                ),
        ),
      ),
    ),
  );
}
