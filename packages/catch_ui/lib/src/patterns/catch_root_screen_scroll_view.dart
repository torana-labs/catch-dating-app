// ignore_for_file: prefer_initializing_formals

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_banner.dart';
import 'package:catch_ui/src/components/catch_banner_status_scope.dart';
import 'package:catch_ui/src/components/catch_choice_input_variant.dart';
import 'package:catch_ui/src/components/catch_field_visibility_scope.dart';
import 'package:catch_ui/src/components/catch_legacy_top_bar.dart';
import 'package:catch_ui/src/components/catch_page_tab_bar.dart';
import 'package:catch_ui/src/components/catch_primary_rail.dart';
import 'package:catch_ui/src/components/catch_top_bar_search.dart';
import 'package:catch_ui/src/patterns/catch_navigation_viewport.dart';
import 'package:catch_ui/src/patterns/catch_page_body.dart';
import 'package:catch_ui/src/patterns/catch_page_body_mode.dart';
import 'package:catch_ui/src/patterns/catch_root_screen_body.dart';
import 'package:catch_ui/src/patterns/catch_root_screen_scroll_view_placement.dart';
import 'package:catch_ui/src/patterns/catch_scroll_terminal_gap.dart';
import 'package:catch_ui/src/patterns/catch_tab_viewport_scope.dart';
import 'package:catch_ui/src/patterns/catch_workspace_pane_scaffold.dart';
import 'package:catch_ui/src/primitives/catch_scaled_preferred_size.dart';
import 'package:flutter/material.dart';

part 'catch_root_screen_header.dart';

/// Root-screen scroll composition for a pane whose parent already owns the
/// [Scaffold], such as an adaptive master-detail workspace.
class CatchRootScreenScrollView extends StatelessWidget {
  const CatchRootScreenScrollView.standard({
    super.key,
    required Widget title,
    required List<Widget> children,
    this.scrollKey,
    this.controller,
    this.physics,
    this.primary,
    this.onRefresh,
    this.maxContentExtent = CatchLayout.screenPageMaxExtent,
    this.semanticsLabel,
    this.semanticsHint,
    this.topEdge = CatchRootScreenScrollViewPlacement.safeArea,
  }) : _title = title,
       _primaryRailHeader = null,
       bodyLayout = CatchPageBodyMode.standard,
       _sectionRhythm = false,
       children = children,
       actions = null,
       body = null,
       constrainToContentWidth = true,
       assert(children.length > 0),
       assert(maxContentExtent > 0);

  const CatchRootScreenScrollView.fullBleed({
    super.key,
    required Widget title,
    required List<Widget> children,
    this.scrollKey,
    this.controller,
    this.physics,
    this.primary,
    this.onRefresh,
    this.semanticsLabel,
    this.semanticsHint,
    this.topEdge = CatchRootScreenScrollViewPlacement.safeArea,
  }) : _title = title,
       _primaryRailHeader = null,
       bodyLayout = CatchPageBodyMode.fullBleed,
       _sectionRhythm = false,
       children = children,
       actions = null,
       body = null,
       constrainToContentWidth = false,
       maxContentExtent = CatchLayout.screenPageMaxExtent,
       assert(children.length > 0);

  /// Section-composed root: full-width rows with the standard title-to-body gap.
  const CatchRootScreenScrollView.sections({
    super.key,
    required Widget title,
    required List<Widget> children,
    this.scrollKey,
    this.controller,
    this.physics,
    this.primary,
    this.onRefresh,
    this.semanticsLabel,
    this.semanticsHint,
    this.topEdge = CatchRootScreenScrollViewPlacement.safeArea,
  }) : _title = title,
       _primaryRailHeader = null,
       bodyLayout = CatchPageBodyMode.fullBleed,
       _sectionRhythm = true,
       children = children,
       actions = null,
       body = null,
       constrainToContentWidth = false,
       maxContentExtent = CatchLayout.screenPageMaxExtent,
       assert(children.length > 0);

  /// Embedded root composition with a scroll-away header and pinned rail.
  /// [actions] accepts only a typed primary control rail.
  const CatchRootScreenScrollView.withPrimaryRail({
    super.key,
    required CatchRootScreenHeader header,
    required CatchPrimaryRail actions,
    required this.body,
    this.scrollKey,
    this.controller,
    this.physics,
    this.semanticsLabel,
    this.semanticsHint,
    this.topEdge = CatchRootScreenScrollViewPlacement.safeArea,
  }) : _title = null,
       _primaryRailHeader = header,
       actions = actions,
       bodyLayout = null,
       _sectionRhythm = false,
       children = null,
       primary = null,
       onRefresh = null,
       constrainToContentWidth = false,
       maxContentExtent = CatchLayout.screenPageMaxExtent;

  final Widget? _title;
  final CatchRootScreenHeader? _primaryRailHeader;
  final CatchPageBodyMode? bodyLayout;
  final bool _sectionRhythm;

  /// Sliver children of the standard/fullBleed recipes; the rail recipe uses body.
  final List<Widget>? children;
  final CatchPrimaryRail? actions;
  final CatchRootScreenBody? body;
  final Key? scrollKey;
  final ScrollController? controller;
  final ScrollPhysics? physics;
  final bool? primary;
  final Future<void> Function()? onRefresh;
  final bool constrainToContentWidth;
  final double maxContentExtent;
  final String? semanticsLabel;
  final String? semanticsHint;
  final CatchRootScreenScrollViewPlacement topEdge;

  @override
  Widget build(BuildContext context) {
    final obstruction = CatchTabViewportScope.bottomOverlayInsetOf(context);
    final statuses = CatchBannerStatusScope.of(context);
    final inWorkspace = CatchWorkspacePaneScope.isSinglePaneOf(context) != null;
    Widget scrollView;
    if (actions == null) {
      scrollView = CustomScrollView(
        key: scrollKey,
        controller: controller,
        primary: primary,
        physics: onRefresh == null
            ? physics
            : AlwaysScrollableScrollPhysics(parent: physics),
        slivers: [
          if (!inWorkspace) SliverToBoxAdapter(child: _title!),
          if (!inWorkspace && statuses.isNotEmpty)
            PinnedHeaderSliver(child: CatchBanner.statuses(statuses: statuses)),
          if (_sectionRhythm)
            const SliverToBoxAdapter(
              child: SizedBox(height: CatchSpacing.screenPt),
            ),
          CatchPageBody.slivers(
            mode: bodyLayout!,
            constrainToContentWidth: constrainToContentWidth,
            maxContentExtent: maxContentExtent,
            children: children!,
          ),
          const CatchScrollTerminalGap.sliver(),
        ],
      );
    } else if (inWorkspace) {
      _validatePrimaryRailGeometry(context);
      scrollView = body!.build();
    } else {
      _validatePrimaryRailGeometry(context);
      scrollView = NestedScrollView(
        key: scrollKey,
        controller: controller,
        physics: physics,
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(child: _primaryRailHeader!._build(context)),
            SliverOverlapAbsorber(
              handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
              // Keep rail and status in one intrinsic pinned unit so the
              // inner page absorbs their complete height at every text scale.
              sliver: PinnedHeaderSliver(
                child: ColoredBox(
                  color: CatchTokens.of(context).bg,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        height: switch (actions) {
                          final CatchScaledPreferredSize scaled =>
                            scaled.preferredSizeFor(context).height,
                          _ => CatchPageTabBar.heightFor(context),
                        },
                        child: actions,
                      ),
                      CatchBanner.statuses(statuses: statuses),
                    ],
                  ),
                ),
              ),
            ),
          ];
        },
        body: body!.build(),
      );
    }
    if (actions == null && onRefresh != null) {
      scrollView = RefreshIndicator.adaptive(
        onRefresh: onRefresh!,
        child: scrollView,
      );
    }
    if (inWorkspace) {
      scrollView = CatchWorkspacePaneScaffold(
        title: _title ?? _primaryRailHeader!._build(context),
        actions: actions,
        body: Column(
          children: [
            CatchBanner.statuses(statuses: statuses),
            Expanded(child: scrollView),
          ],
        ),
      );
    }
    if (semanticsLabel != null || semanticsHint != null) {
      scrollView = Semantics(
        label: semanticsLabel,
        hint: semanticsHint,
        child: scrollView,
      );
    }
    return CatchBannerStatusScope(
      statuses: const [],
      child: CatchFieldVisibilityScope(
        bottomObstruction: obstruction,
        child: SafeArea(
          // While status is pinned, this viewport owns the physical inset.
          // SafeArea removes it from MediaQuery so an edge-owned hero cannot
          // apply it twice or let the pinned status move under system chrome.
          top:
              topEdge == CatchRootScreenScrollViewPlacement.safeArea ||
              statuses.isNotEmpty,
          bottom: false,
          child: scrollView,
        ),
      ),
    );
  }

  void _validatePrimaryRailGeometry(BuildContext context) {
    final declaredHeight = actions!.preferredSize.height;
    // Canonical variants own their insets as well as their target floor.
    // Feature adapters must forward the same unscaled minimum, never restate
    // the old 44-point constant or substitute local geometry.
    final variant = actions is CatchPageTabBar
        ? (actions as CatchPageTabBar).variant
        : CatchChoiceInputVariant.label;
    final expectedMinimum = CatchPageTabBar.minimumHeightFor(variant);
    final expectedScaled = CatchPageTabBar.heightFor(context, variant: variant);
    final declaredScaled = switch (actions) {
      final CatchScaledPreferredSize scaled =>
        scaled.preferredSizeFor(context).height,
      _ => expectedScaled,
    };
    if (declaredHeight == expectedMinimum && declaredScaled == expectedScaled) {
      return;
    }

    throw FlutterError.fromParts([
      ErrorSummary(
        'CatchRootScreenScaffold requires a '
        '$expectedMinimum-point primary rail.',
      ),
      ErrorDescription(
        '${actions.runtimeType} declared a preferred height of '
        '$declaredHeight points and a scaled height of $declaredScaled points '
        '(expected $expectedScaled).',
      ),
      ErrorHint(
        'Use CatchPageTabBar, or make the feature '
        'adapter report CatchPageTabBar.minimumHeight. The root scaffold owns the '
        'pinned extent; screens must not define local rail geometry.',
      ),
    ]);
  }
}
