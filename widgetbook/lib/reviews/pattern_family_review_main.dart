import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_stepper.dart'
    show EventSuccessCountdownStepper;
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart'
    show HostOrganizerAvatar, HostOrganizerSwitcherSheet;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../preview_layout_contracts.dart';

void main() => runApp(const PatternFamilyReviewApp());

class PatternFamilyReviewApp extends StatefulWidget {
  const PatternFamilyReviewApp({super.key});

  @override
  State<PatternFamilyReviewApp> createState() => _PatternFamilyReviewAppState();
}

class _PatternFamilyReviewAppState extends State<PatternFamilyReviewApp> {
  late ThemeMode _themeMode;
  late double _textScale;

  @override
  void initState() {
    super.initState();
    _themeMode = Uri.base.queryParameters['theme'] == 'dark'
        ? ThemeMode.dark
        : ThemeMode.light;
    _textScale = switch (Uri.base.queryParameters['scale']) {
      '1.5' => 1.5,
      '2' => 2,
      _ => 1,
    };
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Catch pattern family review',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeMode,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) {
        final mediaQuery =
            MediaQuery.maybeOf(context) ?? const MediaQueryData();
        return MediaQuery(
          data: mediaQuery.copyWith(textScaler: TextScaler.linear(_textScale)),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: PatternFamilyReviewHome(
        themeMode: _themeMode,
        textScale: _textScale,
        onThemeModeChanged: (value) => setState(() => _themeMode = value),
        onTextScaleChanged: (value) => setState(() => _textScale = value),
      ),
    );
  }
}

class PatternFamilyReviewHome extends StatelessWidget {
  const PatternFamilyReviewHome({
    super.key,
    required this.themeMode,
    required this.textScale,
    required this.onThemeModeChanged,
    required this.onTextScaleChanged,
  });

  final ThemeMode themeMode;
  final double textScale;
  final ValueChanged<ThemeMode> onThemeModeChanged;
  final ValueChanged<double> onTextScaleChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final requestedFamily = Uri.base.queryParameters['family'];
    final families = <String, Widget>{
      'badge': _BadgeStatusFamily(tokens: t),
      'controls': const _CompactControlFamily(),
      'identity': const _IdentitySwitcherFamily(),
      'progress': const _ProgressCueFamily(),
    };
    final focusedFamily = families[requestedFamily];
    final visibleFamilies = focusedFamily == null
        ? families.values.toList(growable: false)
        : [focusedFamily];
    final familyList = <Widget>[];
    for (var index = 0; index < visibleFamilies.length; index++) {
      if (index > 0) {
        familyList.add(const SizedBox(height: CatchSpacing.s8));
      }
      familyList.add(visibleFamilies[index]);
    }
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  CatchSpacing.s6,
                  CatchSpacing.s6,
                  CatchSpacing.s6,
                  CatchSpacing.s2,
                ),
                child: focusedFamily == null
                    ? _ReviewHeader(
                        themeMode: themeMode,
                        textScale: textScale,
                        onThemeModeChanged: onThemeModeChanged,
                        onTextScaleChanged: onTextScaleChanged,
                      )
                    : _FocusedReviewHeader(
                        family: requestedFamily!,
                        themeMode: themeMode,
                        textScale: textScale,
                      ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                CatchSpacing.s6,
                CatchSpacing.s3,
                CatchSpacing.s6,
                CatchSpacing.s16,
              ),
              sliver: SliverList.list(children: familyList),
            ),
          ],
        ),
      ),
    );
  }
}

class _FocusedReviewHeader extends StatelessWidget {
  const _FocusedReviewHeader({
    required this.family,
    required this.themeMode,
    required this.textScale,
  });

  final String family;
  final ThemeMode themeMode;
  final double textScale;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Text(
      'FOCUSED REVIEW · ${family.toUpperCase()} · '
      '${themeMode == ThemeMode.dark ? 'DARK' : 'LIGHT'} · $textScale×',
      style: CatchTextStyles.kicker(context, color: t.ink3),
    );
  }
}

class _ReviewHeader extends StatelessWidget {
  const _ReviewHeader({
    required this.themeMode,
    required this.textScale,
    required this.onThemeModeChanged,
    required this.onTextScaleChanged,
  });

  final ThemeMode themeMode;
  final double textScale;
  final ValueChanged<ThemeMode> onThemeModeChanged;
  final ValueChanged<double> onTextScaleChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: CatchSpacing.s6,
      runSpacing: CatchSpacing.s4,
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'WIDGET PATTERN REVIEW',
                style: CatchTextStyles.kicker(context, color: t.ink3),
              ),
              const SizedBox(height: CatchSpacing.s2),
              Text(
                'One wall for the remaining consolidation decisions',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: t.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: CatchSpacing.s2),
              Text(
                'These are production widgets rendered without changing their contracts. '
                'Use the compare page question IDs to approve the strongest pattern, '
                'repair it, or keep a semantic boundary.',
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: t.ink2),
              ),
            ],
          ),
        ),
        Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s3,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.light, label: Text('Light')),
                ButtonSegment(value: ThemeMode.dark, label: Text('Dark')),
              ],
              selected: {themeMode},
              onSelectionChanged: (value) => onThemeModeChanged(value.first),
            ),
            SegmentedButton<double>(
              segments: const [
                ButtonSegment(value: 1, label: Text('1×')),
                ButtonSegment(value: 1.5, label: Text('1.5×')),
                ButtonSegment(value: 2, label: Text('2×')),
              ],
              selected: {textScale},
              onSelectionChanged: (value) => onTextScaleChanged(value.first),
            ),
          ],
        ),
      ],
    );
  }
}

class _BadgeStatusFamily extends StatelessWidget {
  const _BadgeStatusFamily({required this.tokens});

  final CatchTokens tokens;

  @override
  Widget build(BuildContext context) {
    return _FamilySection(
      id: 'badge-status · B1–B5',
      title: 'Badge and compact status',
      description:
          'Compare inline status grammar, typed count overlays, dot ingredients, '
          'semantic adapters, and the stronger on-dark treatment.',
      cards: [
        _PreviewCard(
          title: 'CatchBadge grammar',
          note: 'Functional uppercase versus sentence-case metadata.',
          child: Wrap(
            spacing: CatchSpacing.micro10,
            runSpacing: CatchSpacing.micro10,
            children: [
              CatchBadge.functional(
                label: 'Ready',
                tone: CatchBadgeTone.success,
              ),
              CatchBadge(label: 'Draft'),
              CatchBadge.live(label: 'Live now'),
              CatchBadge.solid(label: '412 members'),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Semantic adapters',
          note: 'Keep domain meaning; converge the underlying chrome.',
          child: Wrap(
            spacing: CatchSpacing.micro10,
            runSpacing: CatchSpacing.micro10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatchPrivacyBadge(copy: catchPrivacyBadgeCopy(context.l10n)),
              CatchStatusRow(
                label: 'Unsaved changes',
                tone: CatchStatusRowTone.warning,
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Numeric overlays',
          note: 'One integer contract hides zero and clamps overflow to 99+.',
          child: Wrap(
            spacing: CatchSpacing.s6,
            runSpacing: CatchSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatchCountBadge(count: 7, child: Icon(CatchIcons.notifications)),
              CatchCountBadge(
                count: 124,
                child: Icon(CatchIcons.notifications),
              ),
              CatchCountBadge.label(
                semanticsLabel: catchPersonRowCopy(
                  context.l10n,
                ).unreadCountLabel(12),
                count: 12,
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Dot ingredients',
          note: 'One rendering primitive can support feature semantics.',
          child: Wrap(
            spacing: CatchSpacing.s6,
            runSpacing: CatchSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const CatchStatusIndicator(),
              CatchStatusIndicator(color: tokens.warning),
              CatchStatusIndicator(
                size: CatchSpacing.s2,
                semanticsLabel: catchPersonRowCopy(context.l10n).newMatchLabel,
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Retired edge cases',
          note: 'Unused public APIs are removed instead of kept speculatively.',
          child: const Text(
            'The unused rating pill and card-edge sash were removed.',
          ),
        ),
        _PreviewCard(
          title: 'On-dark status',
          note: 'A single shared recipe should absorb feature-owned variants.',
          onDark: true,
          child: Wrap(
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s3,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatchBadge.onDark(label: 'Starts in 2 hours'),
              CatchBadge.onDarkStatus(
                label: 'Preview only',
                icon: CatchIcons.show,
              ),
              CatchBadge.live(label: 'Live now'),
            ],
          ),
        ),
      ],
    );
  }
}

class _CompactControlFamily extends StatelessWidget {
  const _CompactControlFamily();

  @override
  Widget build(BuildContext context) {
    return _FamilySection(
      id: 'floating-compact-controls · C1–C4',
      title: 'Floating compact controls',
      description:
          'The key ergonomic comparison is semantic role plus target size: '
          'labelled and icon-only actions share a 44px default, with a 40px '
          'app-bar navigation exception.',
      cards: [
        _PreviewCard(
          title: 'Labelled floating action',
          note: 'CountPill stays labelled, interactive, and typed for counts.',
          child: Wrap(
            spacing: CatchSpacing.s4,
            runSpacing: CatchSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatchButton.floating(
                icon: CatchIcons.map,
                label: 'Map',
                semanticsLabel: 'Show map',
                onPressed: _noop,
              ),
              CatchButton.floating(
                icon: CatchIcons.filters,
                label: 'Filters',
                count: 3,
                onPressed: _noop,
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Hit-target comparison',
          note:
              '40px is reserved for app-bar navigation; compact actions default to 44px.',
          child: Wrap(
            spacing: CatchSpacing.s5,
            runSpacing: CatchSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.end,
            children: [
              _MeasuredControl(
                label: '44 label',
                child: CatchButton.floating(
                  icon: CatchIcons.map,
                  label: 'Map',
                  onPressed: _noop,
                ),
              ),
              _MeasuredControl(
                label: '40',
                child: CatchIconAction.icon(
                  icon: CatchIcons.filters,
                  size: CatchIconAction.navSize,
                  onPressed: _noop,
                ),
              ),
              _MeasuredControl(
                label: '44',
                child: CatchIconAction.icon(
                  icon: CatchIcons.filters,
                  onPressed: _noop,
                ),
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Icon-button treatments',
          note: 'One icon-only contract; treatment varies by placement.',
          child: Wrap(
            spacing: CatchSpacing.s5,
            runSpacing: CatchSpacing.s4,
            children: [
              CatchIconAction.icon(icon: CatchIcons.filters, onPressed: _noop),
              CatchIconAction.icon(
                icon: CatchIcons.filters,
                variant: CatchIconActionVariant.float,
                onPressed: _noop,
              ),
              CatchIconAction.icon(
                icon: CatchIcons.filters,
                variant: CatchIconActionVariant.plain,
                onPressed: _noop,
              ),
            ],
          ),
        ),
        _PreviewCard(
          title: 'Counted icon action',
          note: 'The canonical icon action owns its typed count badge.',
          child: CatchIconAction.counted(
            icon: CatchIcons.filters,
            count: 3,
            variant: CatchIconActionVariant.plain,
            tooltip: '3 active filters',
            onPressed: _noop,
          ),
        ),
      ],
    );
  }
}

class _IdentitySwitcherFamily extends StatelessWidget {
  const _IdentitySwitcherFamily();

  @override
  Widget build(BuildContext context) {
    final club = HostOperationsFixtures.primaryClub;
    final logoClub = club.copyWith(
      profileImageUrl:
          'packages/catch_dating_app/assets/fixtures/club_hero_portrait.jpg',
    );
    final clubs = [logoClub, ...HostOperationsFixtures.clubs.skip(1)];
    final longClub = logoClub.copyWith(
      name: 'Sea Face Social With A Deliberately Long Club Name',
    );
    return _FamilySection(
      id: 'identity-switchers · I1–I3',
      title: 'Compact identity switchers',
      description:
          'Compare the navigation avatar, its selected state, and the long-press '
          'organizer sheet used to change the global Host context.',
      cards: [
        _PreviewCard(
          title: 'Navigation identity',
          note: 'Real organizer art in the stable bottom-navigation footprint.',
          child: HostOrganizerAvatar(
            club: logoClub,
            size: CatchLayout.appShellNavigationIdentityExtent,
          ),
        ),
        _PreviewCard(
          title: 'Selected identity',
          note:
              'Selection stays legible without adding a second top-bar control.',
          child: HostOrganizerAvatar(
            club: logoClub,
            size: CatchLayout.appShellNavigationIdentityExtent,
            selected: true,
          ),
        ),
        _PreviewCard(
          title: 'Long-press switcher',
          note: 'The sheet retains full organizer names and selected state.',
          child: HostOrganizerSwitcherSheet(
            clubs: [longClub, ...clubs.skip(1)],
            selectedOrganizerId: longClub.id,
          ),
        ),
      ],
    );
  }
}

class _ProgressCueFamily extends StatelessWidget {
  const _ProgressCueFamily();

  @override
  Widget build(BuildContext context) {
    final items = [
      (label: 'Hold', icon: CatchIcons.tap),
      (label: 'Watch', icon: CatchIcons.show),
      (label: 'Move', icon: CatchIcons.instant),
    ];
    return _FamilySection(
      id: 'progress-cues · P1–P3',
      title: 'Compact progress cues',
      description:
          'Compact rails and expanded rows share one future/current/complete '
          'state model while retaining distinct layouts.',
      cards: [
        _PreviewCard(
          title: 'Sequence · upcoming',
          note: 'Early progress keeps the first step current.',
          child: SizedBox(
            width: WidgetbookPreviewLayout.standardContractWidth,
            child: EventSuccessCountdownStepper(items: items, currentIndex: 0),
          ),
        ),
        _PreviewCard(
          title: 'Sequence · current',
          note: 'Middle progress should distinguish complete from current.',
          child: SizedBox(
            width: WidgetbookPreviewLayout.standardContractWidth,
            child: EventSuccessCountdownStepper(items: items, currentIndex: 1),
          ),
        ),
        _PreviewCard(
          title: 'Sequence · complete',
          note: 'Completed items use success checks; current alone stays gold.',
          child: SizedBox(
            width: WidgetbookPreviewLayout.standardContractWidth,
            child: EventSuccessCountdownStepper(items: items, currentIndex: 2),
          ),
        ),
      ],
    );
  }
}

class _FamilySection extends StatelessWidget {
  const _FamilySection({
    required this.id,
    required this.title,
    required this.description,
    required this.cards,
  });

  final String id;
  final String title;
  final String description;
  final List<Widget> cards;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          id.toUpperCase(),
          style: CatchTextStyles.kicker(context, color: t.primary),
        ),
        const SizedBox(height: CatchSpacing.micro6),
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: t.ink,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: CatchSpacing.micro6),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 780),
          child: Text(
            description,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: t.ink2),
          ),
        ),
        const SizedBox(height: CatchSpacing.micro14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var index = 0; index < cards.length; index++) ...[
                cards[index],
                if (index < cards.length - 1)
                  const SizedBox(width: CatchSpacing.s3),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({
    required this.title,
    required this.note,
    required this.child,
    this.onDark = false,
  });

  final String title;
  final String note;
  final Widget child;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final background = onDark ? CatchTokens.editorialBlack : t.surface;
    final foreground = onDark ? CatchTokens.editorialWhite : t.ink;
    final supporting = onDark
        ? CatchTokens.editorialWhite.withValues(alpha: .72)
        : t.ink2;
    return Container(
      width: WidgetbookPreviewLayout.reviewCardWidth,
      padding: const EdgeInsets.all(CatchSpacing.micro18),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(
          WidgetbookPreviewLayout.reviewCardRadius,
        ),
        border: Border.all(color: onDark ? CatchTokens.editorialBlack : t.line),
        boxShadow: onDark ? const [] : CatchElevation.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: CatchSpacing.s1),
          Text(
            note,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: supporting),
          ),
          const SizedBox(height: CatchSpacing.s6),
          child,
        ],
      ),
    );
  }
}

class _MeasuredControl extends StatelessWidget {
  const _MeasuredControl({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        child,
        const SizedBox(height: CatchSpacing.micro6),
        Text(
          '$label px',
          style: Theme.of(
            context,
          ).textTheme.labelSmall?.copyWith(color: t.ink3),
        ),
      ],
    );
  }
}

void _noop() {}
