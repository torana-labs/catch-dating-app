import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

enum EventSuccessMixPrototypeMode { wholeGroup, pods, pairs, teams, tables }

@widgetbook.UseCase(
  name: 'Whole group · proposed',
  type: EventSuccessModuleConsolidationPrototype,
  path: '[Prototypes]/Event Success/Phase 4 owner review',
)
Widget eventSuccessModuleConsolidationWholeGroup(BuildContext context) =>
    const EventSuccessModuleConsolidationPrototype(
      initialMode: EventSuccessMixPrototypeMode.wholeGroup,
    );

@widgetbook.UseCase(
  name: 'Pods · proposed',
  type: EventSuccessModuleConsolidationPrototype,
  path: '[Prototypes]/Event Success/Phase 4 owner review',
)
Widget eventSuccessModuleConsolidationPods(BuildContext context) =>
    const EventSuccessModuleConsolidationPrototype(
      initialMode: EventSuccessMixPrototypeMode.pods,
    );

@widgetbook.UseCase(
  name: 'Rotating teams · proposed',
  type: EventSuccessModuleConsolidationPrototype,
  path: '[Prototypes]/Event Success/Phase 4 owner review',
)
Widget eventSuccessModuleConsolidationTeams(BuildContext context) =>
    const EventSuccessModuleConsolidationPrototype(
      initialMode: EventSuccessMixPrototypeMode.teams,
    );

/// Widgetbook-only owner review for the gated Phase 4 interaction model.
///
/// This deliberately has no production import or domain-writing seam. It
/// proves the proposed row order and disclosure behavior before the module
/// projection is added to EventSuccessHostDraft.
class EventSuccessModuleConsolidationPrototype extends StatefulWidget {
  const EventSuccessModuleConsolidationPrototype({
    super.key,
    required this.initialMode,
  });

  final EventSuccessMixPrototypeMode initialMode;

  @override
  State<EventSuccessModuleConsolidationPrototype> createState() =>
      _EventSuccessModuleConsolidationPrototypeState();
}

class _EventSuccessModuleConsolidationPrototypeState
    extends State<EventSuccessModuleConsolidationPrototype> {
  late EventSuccessMixPrototypeMode _mode;
  int _unitSize = 6;
  String _groupCount = 'Automatic';
  int? _rotationMinutes = 15;
  bool _repeatAssignments = false;
  bool _arrivalIcebreaker = true;
  bool _welcomeScript = true;
  bool _conversationPrompts = true;
  bool _liveReveal = false;
  _MatchCluePrototypeMode _matchClues = _MatchCluePrototypeMode.cluesOnly;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final rotating = switch (_mode) {
      EventSuccessMixPrototypeMode.pairs ||
      EventSuccessMixPrototypeMode.teams ||
      EventSuccessMixPrototypeMode.tables => true,
      _ => false,
    };

    return Theme(
      data: AppTheme.light,
      child: Scaffold(
        backgroundColor: tokens.bg,
        body: SafeArea(
          child: ListView(
            padding: CatchInsets.pageBody,
            children: [
              const CatchTopBar.primaryRail(
                title: 'Live event guide',
                subtitle: 'Owner review only · not wired to production',
              ),
              gapH20,
              CatchSectionList(
                emptyStateOmitted: true,
                children: [
                  CatchSection.fieldRows(
                    first: true,
                    title: 'HOW PEOPLE MIX',
                    children: [
                      CatchField<EventSuccessMixPrototypeMode>.choices(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Group flow',
                        body: _recommendationFor(_mode),
                        icon: CatchIcons.people,
                        values: EventSuccessMixPrototypeMode.values,
                        itemLabelBuilder: _modeLabel,
                        selected: {_mode},
                        onSelectionChanged: (selection) {
                          setState(() => _mode = selection.single);
                        },
                      ),
                      if (_mode != EventSuccessMixPrototypeMode.wholeGroup)
                        CatchSection.containedFieldRows(
                          children: [
                            if (_mode != EventSuccessMixPrototypeMode.pairs)
                              CatchField<int>.choices(
                                copy: catchFieldCopy(context.l10n),
                                title: _unitSizeTitle(_mode),
                                values: const [4, 6, 8, 10],
                                itemLabelBuilder: (value) => '$value people',
                                selected: {_unitSize},
                                onSelectionChanged: (selection) {
                                  setState(() => _unitSize = selection.single);
                                },
                              ),
                            CatchField<String>.choices(
                              copy: catchFieldCopy(context.l10n),
                              title: 'Group count',
                              body: 'Let Catch estimate it from attendance.',
                              values: const ['Automatic', 'Fixed'],
                              itemLabelBuilder: (value) => value,
                              selected: {_groupCount},
                              onSelectionChanged: (selection) {
                                setState(() => _groupCount = selection.single);
                              },
                            ),
                            if (rotating)
                              CatchField<int?>.choices(
                                copy: catchFieldCopy(context.l10n),
                                title: 'Rotate every',
                                values: const [null, 10, 15, 20, 30],
                                itemLabelBuilder: (value) => value == null
                                    ? 'Do not rotate'
                                    : '$value min',
                                selected: {_rotationMinutes},
                                onSelectionChanged: (selection) {
                                  setState(
                                    () => _rotationMinutes = selection.single,
                                  );
                                },
                              ),
                            if (rotating && _rotationMinutes != null)
                              CatchField.toggle(
                                copy: catchFieldCopy(context.l10n),
                                title: 'Repeat assignments',
                                body:
                                    'Allow someone to meet the same group again.',
                                value: _repeatAssignments,
                                onChanged: (value) =>
                                    setState(() => _repeatAssignments = value),
                              ),
                          ],
                        ),
                    ],
                  ),
                  CatchSection.fieldRows(
                    title: 'WHEN PEOPLE ARRIVE',
                    child: CatchField.toggle(
                      copy: catchFieldCopy(context.l10n),
                      title: 'Arrival icebreaker',
                      body: 'Give each attendee one easy first conversation.',
                      value: _arrivalIcebreaker,
                      onChanged: (value) =>
                          setState(() => _arrivalIcebreaker = value),
                    ),
                  ),
                  CatchSection.fieldRows(
                    title: 'DURING THE EVENT',
                    children: [
                      CatchField.toggle(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Welcome script',
                        body:
                            'A short opening that gives people permission to talk.',
                        value: _welcomeScript,
                        onChanged: (value) =>
                            setState(() => _welcomeScript = value),
                      ),
                      CatchField.toggle(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Conversation prompts',
                        body:
                            'Offer an easy next conversation at planned moments.',
                        value: _conversationPrompts,
                        onChanged: (value) =>
                            setState(() => _conversationPrompts = value),
                      ),
                      CatchField.toggle(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Live reveal',
                        body: 'Reveal the next partner or group together.',
                        value: _liveReveal,
                        onChanged: (value) =>
                            setState(() => _liveReveal = value),
                      ),
                      CatchField<_MatchCluePrototypeMode>.choices(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Match clue questions',
                        body: _matchClueDescription(_matchClues),
                        values: _MatchCluePrototypeMode.values,
                        itemLabelBuilder: _matchClueLabel,
                        selected: {_matchClues},
                        onSelectionChanged: (selection) {
                          setState(() => _matchClues = selection.single);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _MatchCluePrototypeMode { off, cluesOnly, cluesAndPairing }

String _modeLabel(EventSuccessMixPrototypeMode mode) => switch (mode) {
  EventSuccessMixPrototypeMode.wholeGroup => 'Whole group',
  EventSuccessMixPrototypeMode.pods => 'Pods',
  EventSuccessMixPrototypeMode.pairs => 'Pairs',
  EventSuccessMixPrototypeMode.teams => 'Teams',
  EventSuccessMixPrototypeMode.tables => 'Tables',
};

String _recommendationFor(EventSuccessMixPrototypeMode mode) => switch (mode) {
  EventSuccessMixPrototypeMode.wholeGroup =>
    'Recommended for runs and shared activities. Everyone follows one flow.',
  EventSuccessMixPrototypeMode.pods =>
    'Recommended for social events. Small groups make first conversations easier.',
  EventSuccessMixPrototypeMode.pairs =>
    'Best when each round should create one focused conversation.',
  EventSuccessMixPrototypeMode.teams =>
    'Best for games and quizzes. Keep teammates together for each round.',
  EventSuccessMixPrototypeMode.tables =>
    'Best for seated events. Each table becomes one conversation group.',
};

String _unitSizeTitle(EventSuccessMixPrototypeMode mode) => switch (mode) {
  EventSuccessMixPrototypeMode.pods => 'People per pod',
  EventSuccessMixPrototypeMode.teams => 'People per team',
  EventSuccessMixPrototypeMode.tables => 'People per table',
  _ => 'People per group',
};

String _matchClueLabel(_MatchCluePrototypeMode mode) => switch (mode) {
  _MatchCluePrototypeMode.off => 'Off',
  _MatchCluePrototypeMode.cluesOnly => 'Clues only',
  _MatchCluePrototypeMode.cluesAndPairing => 'Clues + soft pairing',
};

String _matchClueDescription(_MatchCluePrototypeMode mode) => switch (mode) {
  _MatchCluePrototypeMode.off => 'Optional prompts are off.',
  _MatchCluePrototypeMode.cluesOnly => 'Answers create reveal clues.',
  _MatchCluePrototypeMode.cluesAndPairing =>
    'Answers create clues and softly guide pairings.',
};
