import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/swipes/presentation/filters_controller.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

final _filtersProfile = ProfileSurfaceFixtures.viewer.copyWith(
  interestedInGenders: const [Gender.man],
  minAgePreference: 24,
  maxAgePreference: 36,
);

@widgetbook.UseCase(
  name: 'Route states',
  type: FiltersScreen,
  path: '[P2 consumer surfaces]/Filters',
)
Widget filtersRouteStates(BuildContext context) {
  return _ConsumerCatalog(
    title: 'FiltersScreen',
    contractId: 'screen.filters.preferences',
    children: [
      _StateCard(
        label: 'default preferences',
        child: const _DeviceFrame(child: _FiltersRouteScope()),
      ),
      _StateCard(
        label: 'profile loading',
        child: _DeviceFrame(
          child: _FiltersRouteScope(
            profileStream: ProfileSurfaceFixtures.loadingStream<UserProfile?>(),
          ),
        ),
      ),
      _StateCard(
        label: 'profile error',
        child: _DeviceFrame(
          child: _FiltersRouteScope(
            profileStream: ProfileSurfaceFixtures.errorStream<UserProfile?>(
              'Profile failed',
            ),
          ),
        ),
      ),
      _StateCard(
        label: 'offline profile error',
        child: _DeviceFrame(
          child: _FiltersRouteScope(
            profileStream: Stream<UserProfile?>.error(
              ProfileSurfaceFixtures.offlineException(
                action: 'load filters profile',
              ),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      _StateCard(
        label: 'missing profile',
        child: _DeviceFrame(
          child: _FiltersRouteScope(
            profileStream: Stream<UserProfile?>.value(null),
          ),
        ),
      ),
      _StateCard(
        label: 'save error snackbar',
        child: const _DeviceFrame(
          child: _FiltersRouteScope(
            child: _FiltersSaveErrorSeeder(child: FiltersScreen()),
          ),
        ),
      ),
      _StateCard(
        label: 'text scale 2.0',
        child: const _DeviceFrame(
          child: _MediaOverride(
            textScaler: TextScaler.linear(2),
            child: _FiltersRouteScope(),
          ),
        ),
      ),
      _StateCard(
        label: 'reduced motion',
        child: const _DeviceFrame(
          child: _MediaOverride(
            disableAnimations: true,
            child: _FiltersRouteScope(),
          ),
        ),
      ),
      _StateCard(
        label: 'dark theme',
        child: _DeviceFrame(
          child: Theme(data: AppTheme.dark, child: const _FiltersRouteScope()),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Content states',
  type: FiltersBody,
  path: '[P2 consumer surfaces]/Filters',
)
Widget filtersContentStates(BuildContext context) {
  return _ConsumerCatalog(
    title: 'FiltersBody',
    contractId: 'screen.filters.preferences sections',
    children: [
      _StateCard(
        label: 'default preferences',
        child: _DeviceFrame(
          child: _FiltersBodyFrame(
            ageRange: filtersAgeRangeValues(_filtersProfile),
            interestedIn: _filtersProfile.interestedInGenders.toSet(),
          ),
        ),
      ),
      _StateCard(
        label: 'dirty edits',
        child: const _DeviceFrame(
          child: _FiltersBodyFrame(
            ageRange: RangeValues(20, 60),
            interestedIn: {Gender.woman, Gender.nonBinary},
          ),
        ),
      ),
      _StateCard(
        label: 'reset restored',
        child: _DeviceFrame(
          child: _FiltersBodyFrame(
            ageRange: filtersAgeRangeValues(_filtersProfile),
            interestedIn: _filtersProfile.interestedInGenders.toSet(),
          ),
        ),
      ),
      _StateCard(
        label: 'save pending',
        child: const _DeviceFrame(
          child: _FiltersBodyFrame(
            ageRange: RangeValues(25, 34),
            interestedIn: {Gender.man, Gender.woman},
            saving: true,
          ),
        ),
      ),
      _StateCard(
        label: 'text scale 2.0',
        child: const _DeviceFrame(
          child: _MediaOverride(
            textScaler: TextScaler.linear(2),
            child: _FiltersBodyFrame(
              ageRange: RangeValues(24, 36),
              interestedIn: {Gender.man},
            ),
          ),
        ),
      ),
      _StateCard(
        label: 'reduced motion',
        child: const _DeviceFrame(
          child: _MediaOverride(
            disableAnimations: true,
            child: _FiltersBodyFrame(
              ageRange: RangeValues(24, 36),
              interestedIn: {Gender.man},
            ),
          ),
        ),
      ),
      _StateCard(
        label: 'dark theme',
        child: _DeviceFrame(
          child: Theme(
            data: AppTheme.dark,
            child: const _FiltersBodyFrame(
              ageRange: RangeValues(24, 36),
              interestedIn: {Gender.man},
            ),
          ),
        ),
      ),
    ],
  );
}

class _FiltersRouteScope extends StatelessWidget {
  const _FiltersRouteScope({
    this.profileStream,
    this.child = const FiltersScreen(),
  });

  final Stream<UserProfile?>? profileStream;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [
        watchUserProfileProvider.overrideWith(
          (ref) => profileStream ?? Stream<UserProfile?>.value(_filtersProfile),
        ),
      ],
      child: child,
    );
  }
}

class _FiltersSaveErrorSeeder extends ConsumerStatefulWidget {
  const _FiltersSaveErrorSeeder({required this.child});

  final Widget child;

  @override
  ConsumerState<_FiltersSaveErrorSeeder> createState() =>
      _FiltersSaveErrorSeederState();
}

class _FiltersSaveErrorSeederState
    extends ConsumerState<_FiltersSaveErrorSeeder> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      unawaited(
        FiltersController.saveFiltersMutation
            .run(ref, (_) async => throw StateError('Filter save failed'))
            .catchError((_) {}),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _FiltersBodyFrame extends StatelessWidget {
  const _FiltersBodyFrame({
    required this.ageRange,
    required this.interestedIn,
    this.saving = false,
  });

  final RangeValues ageRange;
  final Set<Gender> interestedIn;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      appBar: CatchTopBar.route(
        title: 'Filters',
        actions: [
          CatchButton.text(label: 'Reset', onPressed: saving ? null : _noopTap),
        ],
      ),
      body: FiltersBody(
        ageRange: ageRange,
        interestedIn: interestedIn,
        saving: saving,
        onAgeRangeChanged: _ignoreRange,
        onGenderToggled: _ignoreGender,
        onApply: _noopTap,
      ),
    );
  }
}

class _ConsumerCatalog extends StatelessWidget {
  const _ConsumerCatalog({
    required this.title,
    required this.contractId,
    required this.children,
  });

  final String title;
  final String contractId;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.content,
          children: [
            Text(title, style: CatchTextStyles.titleL(context)),
            gapH4,
            Text(
              contractId,
              style: CatchTextStyles.monoLabel(context, color: t.ink2),
            ),
            gapH24,
            for (final child in children) ...[child, gapH20],
          ],
        ),
      ),
    );
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.surface,
        border: Border.all(color: t.line),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: Padding(
        padding: CatchInsets.content,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: CatchTextStyles.sectionTitle(context)),
            gapH12,
            child,
          ],
        ),
      ),
    );
  }
}

class _DeviceFrame extends StatelessWidget {
  const _DeviceFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 390),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: t.surface,
            border: Border.all(color: t.line),
            borderRadius: BorderRadius.circular(CatchRadius.lg),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(CatchRadius.lg),
            child: SizedBox(
              height: WidgetbookPreviewLayout.paperScaffoldViewportHeight,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class _MediaOverride extends StatelessWidget {
  const _MediaOverride({
    required this.child,
    this.textScaler,
    this.disableAnimations = false,
  });

  final Widget child;
  final TextScaler? textScaler;
  final bool disableAnimations;

  @override
  Widget build(BuildContext context) {
    final base = MediaQuery.of(context);
    return MediaQuery(
      data: base.copyWith(
        textScaler: textScaler ?? base.textScaler,
        disableAnimations: disableAnimations || base.disableAnimations,
      ),
      child: child,
    );
  }
}

void _noopTap() {}

void _ignoreRange(RangeValues values) {}

void _ignoreGender(Gender gender) {}
