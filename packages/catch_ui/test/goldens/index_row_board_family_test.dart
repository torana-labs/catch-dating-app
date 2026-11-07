@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

void _noop() {}

/// The rows the Door, Create, Live and Insights boards draw.
class _Rows extends StatelessWidget {
  const _Rows();

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    format: CatchFormat.games,
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchSection(
            children: const [
              CatchIndexRow(
                title: 'Dev Patel',
                subtitle: '2 places · first time',
                onTap: null,
                density: CatchIndexRowSize.compact,
                leading: CatchAvatar(
                  size: GeneratedCatchSizeTokens.avatarLg,
                  name: 'Dev Patel',
                ),
                badge: CatchIndexRowBadge(
                  label: 'New',
                  format: CatchFormat.games,
                ),
                action: CatchIndexRowAction(
                  label: 'Check in',
                  onPressed: _noop,
                  variant: CatchIndexRowActionVariant.primary,
                ),
              ),
              CatchIndexRow(
                title: 'Aanya Sharma',
                subtitle: 'In at 7:38 PM',
                onTap: null,
                density: CatchIndexRowSize.compact,
                leading: CatchAvatar(
                  size: GeneratedCatchSizeTokens.avatarLg,
                  name: 'Aanya Sharma',
                  status: CatchAvatarStatus.checkedIn,
                ),
                action: CatchIndexRowAction(label: 'Undo', onPressed: _noop),
              ),
            ],
          ),
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: const [
              CatchIndexRow(
                title: 'The basics',
                subtitle: 'Name, format, photos',
                onTap: _noop,
                selected: true,
                density: CatchIndexRowSize.compact,
                leading: CatchMarker.number(1),
              ),
              CatchIndexRow(
                title: 'When and where',
                onTap: _noop,
                density: CatchIndexRowSize.compact,
                leading: CatchMarker.number(2, tone: CatchMarkerTone.muted),
              ),
            ],
          ),
          CatchSection(
            title: "Tonight's plan",
            timeline: true,
            dividers: CatchSectionPlacement.none,
            children: const [
              CatchIndexRow(
                title: 'Mix the teams',
                onTap: null,
                time: '8:40',
                status: 'Done',
                emphasis: CatchIndexRowEmphasis.done,
                density: CatchIndexRowSize.compact,
                leading: CatchMarker(
                  tone: CatchMarkerTone.muted,
                  size: CatchMarkerSize.lg,
                ),
              ),
              CatchIndexRow(
                title: 'Round two',
                onTap: null,
                time: '9:00',
                status: 'Now',
                density: CatchIndexRowSize.compact,
                leading: CatchMarker(
                  tone: CatchMarkerTone.format,
                  size: CatchMarkerSize.lg,
                  live: true,
                ),
              ),
              CatchIndexRow(
                title: 'Scores and goodbyes',
                onTap: null,
                time: '9:40',
                status: 'Next',
                density: CatchIndexRowSize.compact,
                leading: CatchMarker(
                  variant: CatchMarkerVariant.ring,
                  size: CatchMarkerSize.lg,
                ),
              ),
            ],
          ),
          CatchSection(
            children: [
              CatchIndexRow(
                title: 'Round one',
                subtitle: '40 min · general knowledge',
                onTap: null,
                time: '8:00',
                density: CatchIndexRowSize.compact,
                trailing: CatchIconAction.icon(
                  icon: CatchIcons.edit,
                  tooltip: 'Edit Round one',
                  onPressed: _noop,
                  variant: CatchIconActionVariant.plain,
                  size: GeneratedCatchSizeTokens.controlSm,
                ),
              ),
              CatchIndexRow(
                title: "Waitlist when it's full",
                subtitle: 'You offer freed places in order',
                onTap: null,
                density: CatchIndexRowSize.regular,
                trailing: CatchToggleInput(
                  value: true,
                  onChanged: (_) {},
                  semanticLabel: "Waitlist when it's full",
                ),
              ),
              CatchIndexRow(
                title: 'A QR for the door',
                subtitle: 'Walk-ins scan it to book on the spot',
                onTap: null,
                density: CatchIndexRowSize.regular,
                icon: CatchIcons.qrCode,
                action: const CatchIndexRowAction(
                  label: 'Print',
                  onPressed: _noop,
                ),
              ),
            ],
          ),
          CatchSection(
            title: 'What guests said',
            children: const [
              CatchIndexRow(
                title: 'Rhea K.',
                status: 'Rated 5',
                body:
                    'Came alone, left with a team for next week. The food '
                    'round was brilliant.',
                meta: 'Booked on Catch',
                metaTone: CatchIndexRowTone.success,
                onTap: null,
                density: CatchIndexRowSize.roomy,
              ),
            ],
          ),
          CatchSection(
            title: 'Downloads',
            children: [
              CatchIndexRow(
                title: 'Guest list and check-ins',
                onTap: _noop,
                icon: CatchIcons.download,
                value: 'CSV',
                chevron: true,
                density: CatchIndexRowSize.regular,
              ),
              const CatchIndexRow(
                title: 'Your page had 3,412 visits',
                subtitle: '1,086 link clicks · 318 went on to book',
                onTap: _noop,
                chevron: true,
                density: CatchIndexRowSize.regular,
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

/// The scoreboard: ranked rows in two columns on a landscape tablet.
class _Scores extends StatelessWidget {
  const _Scores({required this.sizeClass});

  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    size: sizeClass,
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: CatchSection(
        title: 'Scores after round one',
        action: const CatchSectionAction(
          label: 'Enter round two',
          onPressed: _noop,
        ),
        columns: 2,
        children: [
          for (final (rank, name, score) in const [
            (1, 'Quizzy Rascals', '41'),
            (2, 'Harbour Lights', '38'),
            (3, 'Vada Pav Theory', '35'),
            (4, 'The Late Ones', '29'),
            (5, 'Table Six', '27'),
            (6, 'Sea Link Sleepers', '22'),
          ])
            CatchIndexRow(
              title: name,
              onTap: null,
              rank: rank,
              value: score,
              density: CatchIndexRowSize.compact,
            ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('door, create, plan, review and download rows on a phone', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'index_row_board_family',
      size: const Size(390, 1320),
      builder: (_) => const _Rows(),
    );
  });

  testWidgets('the scoreboard folds to one column on a phone', (tester) async {
    await matchCatchGolden(
      tester,
      'index_row_scores_compact',
      size: const Size(390, 420),
      builder: (_) => const _Scores(sizeClass: CatchWindowSize.compact),
    );
  });

  testWidgets('the scoreboard runs in two columns at 1024', (tester) async {
    await matchCatchGolden(
      tester,
      'index_row_scores_expanded',
      size: const Size(1024, 260),
      builder: (_) => const _Scores(sizeClass: CatchWindowSize.expanded),
    );
  });
}
