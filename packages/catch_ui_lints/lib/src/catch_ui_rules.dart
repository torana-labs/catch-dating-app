import 'package:analyzer/analysis_rule/analysis_rule.dart';
import 'package:analyzer/analysis_rule/rule_context.dart';
import 'package:analyzer/analysis_rule/rule_visitor_registry.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/token.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/error/error.dart';

import 'catch_drawing_migration.dart';
import 'catch_text_migration.dart';
import 'catch_ui_rules_tables.g.dart';

part 'catch_ui_test_rules.dart';
part 'catch_ui_mutation_rules.dart';
part 'catch_ui_feedback_rules.dart';
part 'catch_ui_text_rules.dart';

const _eventDetailPathFragments = <String>[
  '/lib/events/presentation/widgets/event_detail_',
  '/lib/events/presentation/widgets/event_photo_header.dart',
];

const _excludedPathFragments = <String>[
  '/packages/catch_tokens/lib/',
  '/lib/core/theme/',
  '/lib/core/schema_contracts/generated/',
  '/lib/l10n/generated/',
];

// These exact L1 definitions replace the former core/theme owners.
// Neighboring foundation files remain checked like any other shared source.
const _foundationDefinitionPaths = <String>{
  '/packages/catch_ui/lib/src/foundations/catch_fonts.dart',
  '/packages/catch_ui/lib/src/foundations/catch_text_styles.dart',
  '/packages/catch_ui/lib/src/foundations/catch_icons.dart',
  '/packages/catch_ui/lib/src/foundations/catch_theme.dart',
};

const _spacingNamedArguments = <String>{
  'height',
  'width',
  'top',
  'right',
  'bottom',
  'left',
  'horizontal',
  'vertical',
  'all',
  'mainAxisSpacing',
  'crossAxisSpacing',
  'runSpacing',
  'spacing',
  'contentPadding',
};

const _surfaceShellConstructors = <String>{
  'AnimatedContainer',
  'Container',
  'DecoratedBox',
};

final _allowDebtPattern = RegExp(
  r'(?:alpha|breakpoint|color-sweep|control|icon-size|motion|radius|shadow|sizing|spacing|surface|token|typography|ui-system):allow:|ignore(?:_for_file)?:[^\n]*\bcatch_[a-z0-9_]+',
);

const _localDesignConstantWords = <String>{
  'alpha',
  'color',
  'duration',
  'elevation',
  'extent',
  'gap',
  'height',
  'inset',
  'margin',
  'offset',
  'opacity',
  'padding',
  'radius',
  'shadow',
  'size',
  'width',
};

const _tokenPrefixes = <String>{
  'CatchFormWorkspaceTokens',
  'CatchWelcomeTokens',
  'CatchIcon',
  'CatchLayout',
  'CatchGaps',
  'CatchInsets',
  'CatchElevation',
  'CatchBorder',
  'CatchOpacity',
  'CatchMotion',
  'CatchAspectRatio',
  'CatchRadius',
  'CatchSpacing',
  'CatchStroke',
};

const _tokenSourceNames = <String>{
  ..._tokenPrefixes,
  'ActivityPalette',
  'CatchFonts',
  'CatchTextStyles',
  'CatchTokens',
  'Sizes',
};

const _assetPathConstructors = <String>{'AssetImage', 'ExactAssetImage'};

const _platformPackages = <String>{
  'connectivity_plus',
  'firebase_messaging',
  'image_picker',
  'share_plus',
  'url_launcher',
};

const _manualAsyncSnapshotMembers = <String>{
  'asData',
  'hasError',
  'hasValue',
  'isLoading',
  'valueOrNull',
};

const _lowLevelTypographyRoles = <String>{'bodyS', 'bodyM', 'titleS'};

const _lowLevelTypographyOwnerPaths = <String>{
  '/packages/catch_ui/lib/src/components/catch_empty_state.dart',
  '/packages/catch_ui/lib/src/components/catch_search_field.dart',
};

final _legacySpacingNamePattern = RegExp(
  r'^p(?:2|3|4|6|8|10|12|14|16|18|20|24|32|40|48|64)$',
);

final _screenGutterNamePattern = RegExp(
  r'(?:Body|Page|Screen)[A-Za-z0-9_]*Padding$',
);

const _roundedAffordanceConstructors = <String>{
  'CatchBadge',
  'CatchButton',
  'CatchChip',
  'CatchIconAction',
  'CatchPersonAvatar',
  'CatchPersonAvatarStack',
  'CatchSearchField',
  'CatchSkeleton',
  'CatchToggleInput',
};

const _roundedAffordanceNameFragments = <String>{
  'Avatar',
  'Badge',
  'Button',
  'Chip',
  'IconTile',
  'Image',
  'PageDots',
  'Pill',
  'Progress',
  'Sash',
  'SearchField',
  'Segmented',
  'Skeleton',
  'Slider',
  'StatusDot',
  'Switch',
  'Thumbnail',
  'Toggle',
};

const catchUiLintFontFamilies = <String>{
  'Archivo',
  'Roboto',
  'CupertinoSystemText',
  'CupertinoSystemDisplay',
  '.AppleSystemUIFont',
  'Segoe UI',
  'IBM Plex Mono',
};

const _hairlineLiteralLimit = 1.0;

class CatchUiLayoutRules extends MultiAnalysisRule {
  CatchUiLayoutRules()
    : super(
        name: 'catch_ui_layout_rules',
        description: 'Enforces Catch semantic UI layout invariants.',
      );

  static const rawUiSpacing = LintCode(
    'catch_no_raw_ui_spacing',
    'Use a named CatchSpacing/CatchLayout token or CatchSectionList gap instead of a raw UI spacing number.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const useSectionList = LintCode(
    'catch_use_section_list',
    'Use CatchSectionList or its named placement recipes for adjacent semantic sections instead of manually interleaving spacers.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noTokenArithmetic = LintCode(
    'catch_no_token_arithmetic',
    'Move token arithmetic into a named CatchLayout/CatchSpacing helper so layout intent is reusable and reviewable.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const preferSemanticInsets = LintCode(
    'catch_prefer_semantic_insets',
    'Use CatchInsets, a named inset contract, or a layout primitive instead of composing feature padding inline from CatchSpacing.',
    severity: DiagnosticSeverity.INFO,
  );

  static const eventDetailPrefersPhotoThumbnail = LintCode(
    'catch_event_detail_prefers_photo_thumbnail',
    'Event detail visuals must use EventThumbnail so photos lead when available and activity artwork is only the fallback.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawMaterialControl = LintCode(
    'catch_no_raw_material_control',
    'Use {0} instead of this raw Material/Cupertino control in audited feature UI.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawButtonControl = LintCode(
    'catch_no_raw_button_control',
    'Use a Catch control primitive or add the missing primitive instead of this raw Material/Cupertino input control.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawColor = LintCode(
    'catch_no_raw_color',
    'Use CatchTokens, ActivityPalette, or a named color role instead of a raw Color/Colors/CupertinoColors value.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawTextStyle = LintCode(
    'catch_no_raw_text_style',
    'Use CatchTextStyles instead of constructing a raw TextStyle in app UI.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawFontDrift = LintCode(
    'catch_no_raw_font_drift',
    'Use CatchTextStyles instead of raw GoogleFonts or fontFamily strings.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noDirectFontBuilder = LintCode(
    'catch_no_direct_font_builder',
    'Use a semantic CatchTextStyles role instead of calling CatchFonts directly in app UI.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawLetterSpacing = LintCode(
    'catch_no_raw_letter_spacing',
    'Define letter spacing in CatchTextStyles instead of overriding it at a call site.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawRadius = LintCode(
    'catch_no_raw_radius',
    'Use CatchRadius tokens instead of raw Radius/BorderRadius numeric values.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawContentDimension = LintCode(
    'catch_no_raw_content_dimension',
    'Use flexible constraints, aspect ratios, CatchLayout, or a named dimension contract instead of a raw fixed content dimension.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noLocalDesignConstant = LintCode(
    'catch_no_local_design_constant',
    'Route private feature UI constants through Catch tokens or a shared primitive instead of owning raw design values locally.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawIconSource = LintCode(
    'catch_no_raw_icon_source',
    'Use CatchIcons or a semantic icon contract instead of referencing Icons directly in app UI.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawIconSize = LintCode(
    'catch_no_raw_icon_size',
    'Use CatchIcon size tokens or a primitive-owned semantic icon size instead of a raw icon size.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawAlpha = LintCode(
    'catch_no_raw_alpha',
    'Use CatchOpacity or a named opacity contract instead of a raw alpha/opacity value.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawShadow = LintCode(
    'catch_no_raw_shadow',
    'Use CatchElevation/CatchSurface elevation roles or a named component shadow contract instead of raw shadow/elevation values.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawMotion = LintCode(
    'catch_no_raw_motion',
    'Use CatchMotion or a named motion helper instead of raw Duration/Curves values in app UI.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawBreakpoint = LintCode(
    'catch_no_raw_breakpoint',
    'Use CatchLayout breakpoints or a named responsive contract instead of hardcoded width checks.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawSurfaceShell = LintCode(
    'catch_no_raw_surface_shell',
    'Drawing belongs in catch_ui. Arrange existing Catch components instead of adding an SDK drawing constructor or subclass.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawStrokeWidth = LintCode(
    'catch_no_raw_stroke_width',
    'Use CatchBorder semantic roles, CatchStroke, or a primitive-owned stroke contract instead of a raw stroke width.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawAssetPath = LintCode(
    'catch_no_raw_asset_path',
    'Route asset paths through a named asset contract instead of passing raw assets/... strings to image loaders.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noNestedRoundedRectangles = LintCode(
    'catch_no_nested_rounded_rectangles',
    'Avoid nesting rounded rectangle surfaces. Use a divided section, hairline delimiter, or flattened layout inside the rounded container.',
    severity: DiagnosticSeverity.INFO,
  );

  static const iconButtonRequiresTooltip = LintCode(
    'catch_icon_button_requires_tooltip',
    'Icon-only buttons need a tooltip or an enclosing semantic label.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noAllowDebt = LintCode(
    'catch_no_allow_debt',
    'Remove temporary Catch UI allow debt or replace it with a narrow source-of-truth exception.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noWidgetReturningMethod = LintCode(
    'catch_no_widget_returning_method',
    'Extract private Widget-returning helpers in feature presentation code to named Widget classes.',
    severity: DiagnosticSeverity.INFO,
  );

  static const useNamedCatchFieldConstructor = LintCode(
    'catch_use_named_catch_field_constructor',
    'Use a named CatchField constructor so field anatomy is selected by contract.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const useNamedCatchSectionConstructor = LintCode(
    'catch_use_named_catch_section_constructor',
    'Use a named CatchSection constructor so section anatomy is selected by contract.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const mutationPendingRequiresError = LintCode(
    'catch_mutation_pending_requires_error',
    'Mutation "{0}" is used for isPending without hasError or a Catch mutation error surface.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noRawNetworkImage = LintCode(
    'catch_no_raw_network_image',
    'Use CatchNetworkImage instead of Image.network so caching, decode sizing, loading, and error behavior stay consistent.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noPresentationPlatformImport = LintCode(
    'catch_no_presentation_platform_import',
    'Move platform-plugin access behind a controller, provider, service, or repository seam.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noTokensPropDrilling = LintCode(
    'catch_no_tokens_prop_drilling',
    'Read CatchTokens at the rendering boundary instead of passing CatchTokens through widget constructors.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noPresentationRepositoryReach = LintCode(
    'catch_no_presentation_repository_reach',
    'Read feature state through a controller/view-model provider instead of reaching from a widget into a repository provider.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noLegacySpacingToken = LintCode(
    'catch_no_legacy_spacing_token',
    'Use CatchSpacing, CatchGaps, or a semantic CatchInsets/CatchLayout role instead of legacy Sizes.p* tokens.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noLowLevelTypographyRole = LintCode(
    'catch_no_low_level_typography_role',
    'Use a semantic CatchTextStyles role owned by the surface instead of a low-level bodyS/bodyM/titleS role.',
    severity: DiagnosticSeverity.INFO,
  );

  static const screenGutterUsesSemanticInsets = LintCode(
    'catch_screen_gutter_uses_semantic_insets',
    'Use CatchInsets.pageBody* or a screen layout primitive instead of rebuilding a page gutter from CatchSpacing.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const textRequiresStyle = LintCode(
    'catch_text_requires_style',
    '{0}',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noBrittlePumpTiming = LintCode(
    'catch_no_brittle_pump_timing',
    'Use deterministic pump helpers instead of pumpAndSettle, fixed-duration pumps, or warnIfMissed: false.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noPositionalWidgetFinder = LintCode(
    'catch_no_positional_widget_finder',
    'Use a semantic key or uniquely-scoped finder instead of .at/.first/.last positional selection.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noAsyncFlushHack = LintCode(
    'catch_no_async_flush_hack',
    'Use the deterministic async flush helper instead of Future<void>.delayed(Duration.zero).',
    severity: DiagnosticSeverity.WARNING,
  );

  static const topBarRequiresActionGroup = LintCode(
    'catch_top_bar_requires_action_group',
    'Compose CatchTopBar actions through CatchTopBarActionRow so the primitive owns action geometry.',
    severity: DiagnosticSeverity.INFO,
  );

  static const shellOwnsTabScaffold = LintCode(
    'catch_shell_owns_tab_scaffold',
    'Only app_shell.dart and host_app_shell.dart may instantiate the root tab scaffold or a Scaffold with bottom navigation.',
    severity: DiagnosticSeverity.INFO,
  );

  static const fieldRequiresSectionContext = LintCode(
    'catch_field_requires_section_context',
    'Place CatchField inside CatchSection, fieldRows or CatchFieldLanes.',
    severity: DiagnosticSeverity.INFO,
  );

  static const fieldGeometryIsSectionOwned = LintCode(
    'catch_field_geometry_is_section_owned',
    'Field paint scopes and focus surfaces are design-system internals. Choose a CatchSection/CatchFieldLanes variant or a responsive interaction policy.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const fieldDividerIsSectionOwned = LintCode(
    'catch_field_divider_is_section_owned',
    'Sibling dividers and lane gutters belong to CatchSection or CatchFieldLanes, not an individual field or feature override.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const sectionListRequiresEmptyPolicy = LintCode(
    'catch_section_list_requires_empty_policy',
    'CatchSectionList must declare emptyBuilder or the explicit emptyStateOmitted opt-out.',
    severity: DiagnosticSeverity.INFO,
  );

  static const asyncRequiresStateSurface = LintCode(
    'catch_async_requires_state_surface',
    'Convert watched AsyncValue snapshots with catchAsyncStateFromAsyncValue or render them exhaustively through CatchAsyncBoundary; do not inspect raw snapshot flags or force value/requireValue.',
    severity: DiagnosticSeverity.INFO,
  );

  static const asyncRequiresRetry = LintCode(
    'catch_async_requires_retry',
    'CatchAsyncBoundary and its sliver constructor must declare onRetry so both provider errors and initial-load timeouts have an actionable recovery path.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const errorStateRequiresAction = LintCode(
    'catch_error_state_requires_action',
    'Full-screen and sliver Catch error states must declare onRetry or nonempty actions so the user always has a recovery or exit path.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const noRawErrorSurface = LintCode(
    'catch_no_raw_error_surface',
    'Use CatchErrorState with an appropriate mode, or CatchSliverErrorState, instead of a raw Center(Text(...)) failure surface.',
    severity: DiagnosticSeverity.INFO,
  );

  static const noShellLocalMeasurement = LintCode(
    'catch_no_shell_local_measurement',
    'Use CatchLayout roles or shell-provided layout context instead of feature-local MediaQuery size or LayoutBuilder decisions.',
    severity: DiagnosticSeverity.INFO,
  );

  @override
  bool get canUseParsedResult => true;

  @override
  List<DiagnosticCode> get diagnosticCodes => const [
    rawUiSpacing,
    useSectionList,
    noTokenArithmetic,
    preferSemanticInsets,
    eventDetailPrefersPhotoThumbnail,
    noRawMaterialControl,
    noRawButtonControl,
    noRawColor,
    noRawTextStyle,
    noRawFontDrift,
    noDirectFontBuilder,
    noRawLetterSpacing,
    noRawRadius,
    noRawContentDimension,
    noLocalDesignConstant,
    noRawIconSource,
    noRawIconSize,
    noRawAlpha,
    noRawShadow,
    noRawMotion,
    noRawBreakpoint,
    noRawSurfaceShell,
    noRawStrokeWidth,
    noRawAssetPath,
    noNestedRoundedRectangles,
    iconButtonRequiresTooltip,
    noAllowDebt,
    noWidgetReturningMethod,
    useNamedCatchFieldConstructor,
    useNamedCatchSectionConstructor,
    mutationPendingRequiresError,
    noRawNetworkImage,
    noPresentationPlatformImport,
    noTokensPropDrilling,
    noPresentationRepositoryReach,
    noLegacySpacingToken,
    noLowLevelTypographyRole,
    screenGutterUsesSemanticInsets,
    textRequiresStyle,
    noBrittlePumpTiming,
    noPositionalWidgetFinder,
    noAsyncFlushHack,
    topBarRequiresActionGroup,
    shellOwnsTabScaffold,
    fieldRequiresSectionContext,
    fieldGeometryIsSectionOwned,
    fieldDividerIsSectionOwned,
    sectionListRequiresEmptyPolicy,
    asyncRequiresStateSurface,
    asyncRequiresRetry,
    errorStateRequiresAction,
    noRawErrorSurface,
    noShellLocalMeasurement,
  ];

  @override
  void registerNodeProcessors(
    RuleVisitorRegistry registry,
    RuleContext context,
  ) {
    final path = _normalizedPath(context);
    if (_isTestPath(path)) {
      registry.addCompilationUnit(
        this,
        _CatchUiTestVisitor(this, source: context.definingUnit.content),
      );
      return;
    }
    if (!_isAppPath(path)) return;

    final visitor = _CatchUiLayoutVisitor(
      this,
      ruleContext: context,
      source: context.definingUnit.content,
      path: path,
      isEventDetailPath: _isEventDetailPath(path),
      isColorExemptPath: false,
      isFeaturePresentationPath: _isFeaturePresentationPath(path),
      isPresentationPath: _isPresentationPath(path),
      isSizingScannerPath: _isSizingScannerPath(path),
      isUiSystemScannerPath: _isUiSystemScannerPath(path),
      allowRawControlConstructors:
          _isCoreWidgetPrimitivePath(path) || _isRawChromeExceptionPath(path),
    );
    registry.addInstanceCreationExpression(this, visitor);
    registry.addNamedExpression(this, visitor);
    registry.addBinaryExpression(this, visitor);
    registry.addMethodDeclaration(this, visitor);
    registry.addFunctionDeclaration(this, visitor);
    registry.addMethodInvocation(this, visitor);
    registry.addFunctionExpressionInvocation(this, visitor);
    registry.addPrefixedIdentifier(this, visitor);
    registry.addPropertyAccess(this, visitor);
    registry.addSimpleStringLiteral(this, visitor);
    registry.addImportDirective(this, visitor);
    registry.addCompilationUnit(this, visitor);
    registry.addVariableDeclaration(this, visitor);
  }

  String _normalizedPath(RuleContext context) {
    return context.definingUnit.file.path.replaceAll(r'\', '/');
  }

  bool _isAppPath(String path) {
    return path.contains('/lib/') &&
        !_excludedPathFragments.any(path.contains) &&
        !_foundationDefinitionPaths.any(path.endsWith) &&
        !path.endsWith('.g.dart') &&
        !path.endsWith('.freezed.dart');
  }

  bool _isTestPath(String path) {
    return (path.contains('/test/') || path.contains('/integration_test/')) &&
        (!path.contains('/tool/') ||
            path.contains('/tool/catch_ui_lints_probe/')) &&
        !path.endsWith('.g.dart') &&
        !path.endsWith('.freezed.dart');
  }

  bool _isEventDetailPath(String path) {
    return _eventDetailPathFragments.any(path.contains);
  }

  bool _isFeaturePresentationPath(String path) {
    return path.contains('/lib/') &&
        path.contains('/presentation/') &&
        !path.contains('/lib/core/');
  }

  bool _isPresentationPath(String path) {
    return path.contains('/lib/') && path.contains('/presentation/');
  }

  bool _isSizingScannerPath(String path) {
    return !path.contains('/lib/design_fixtures/');
  }

  bool _isUiSystemScannerPath(String path) {
    if (!_isSizingScannerPath(path)) return false;
    return path.contains('/packages/catch_ui/lib/src/') ||
        path.contains('/lib/core/widgets/') ||
        path.contains('/lib/core/presentation/') ||
        path.contains('/presentation/');
  }

  bool _isCoreWidgetPrimitivePath(String path) {
    return path.contains('/lib/core/widgets/');
  }

  bool _isRawChromeExceptionPath(String path) {
    return path.endsWith(
          '/lib/clubs/presentation/detail/widgets/club_hero_top_bar.dart',
        ) ||
        path.endsWith(
          '/lib/events/presentation/widgets/event_detail_hero_top_bar.dart',
        );
  }
}

class _CatchUiLayoutVisitor extends SimpleAstVisitor<void> {
  _CatchUiLayoutVisitor(
    this.rule, {
    required this.ruleContext,
    required this.source,
    required this.path,
    required this.isEventDetailPath,
    required this.isColorExemptPath,
    required this.isFeaturePresentationPath,
    required this.isPresentationPath,
    required this.isSizingScannerPath,
    required this.isUiSystemScannerPath,
    required this.allowRawControlConstructors,
  }) : _lineStarts = _computeLineStarts(source);

  final CatchUiLayoutRules rule;
  final RuleContext ruleContext;
  final String source;
  final String path;
  final bool isEventDetailPath;
  final bool isColorExemptPath;
  final bool isFeaturePresentationPath;
  final bool isPresentationPath;
  final bool isSizingScannerPath;
  final bool isUiSystemScannerPath;
  final bool allowRawControlConstructors;
  final List<int> _lineStarts;
  Set<String> _locallyShadowedTokenNames = const <String>{};
  final Set<String> _watchedProviderVariables = <String>{};
  final Set<String> _watchedMutationVariables = <String>{};

  @override
  void visitCompilationUnit(CompilationUnit node) {
    _locallyShadowedTokenNames = _declaredTokenShadows(node);

    final currentPath =
        ruleContext.currentUnit?.file.path.replaceAll(r'\', '/') ?? path;
    for (final site in newTextMigrationSites(node, currentPath)) {
      rule.reportAtNode(
        site.node,
        diagnosticCode: CatchUiLayoutRules.textRequiresStyle,
        arguments: [
          'Use CatchText with CatchTextVariant.${site.role} instead of styling Text in place.',
        ],
      );
    }

    for (final site in newDrawingMigrationSites(node, currentPath)) {
      final drawing = site.node;
      if (drawing is InstanceCreationExpression) {
        // Keep one boundary diagnostic where an existing rule already fires.
        // Share their resolved names so aliases receive the same delegation.
        final typeName = _constructorTypeName(drawing);
        if (!allowRawControlConstructors &&
            catchRawControlConstructors.contains(typeName)) {
          continue;
        }
        if (typeName == 'Image' &&
            _constructorMemberName(drawing) == 'network' &&
            !_isCoreWidgetPrimitivePath) {
          continue;
        }
      }
      rule.reportAtNode(
        drawing,
        diagnosticCode: CatchUiLayoutRules.noRawSurfaceShell,
      );
    }

    for (final match in _allowDebtPattern.allMatches(source)) {
      if (_isThemeIndependentArtAllow(match.start)) continue;
      rule.reportAtOffset(
        match.start,
        match.end - match.start,
        diagnosticCode: CatchUiLayoutRules.noAllowDebt,
      );
    }

    if (isFeaturePresentationPath) {
      final watchedVariablePattern = RegExp(
        r'(?:final|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*ref\.watch\s*\([^;]+\)\s*;',
      );
      for (final declaration in watchedVariablePattern.allMatches(source)) {
        final variable = declaration.group(1)!;
        final declarationSource = declaration.group(0)!;
        _watchedProviderVariables.add(variable);
        if (variable.toLowerCase().contains('mutation') ||
            declarationSource.contains('Mutation')) {
          _watchedMutationVariables.add(variable);
        }
        final forcedValuePattern = RegExp(
          '${RegExp.escape(variable)}\\s*\\.(?:value\\s*!|requireValue)\\b',
        );
        for (final match in forcedValuePattern.allMatches(source)) {
          rule.reportAtOffset(
            match.start,
            match.end - match.start,
            diagnosticCode: CatchUiLayoutRules.asyncRequiresStateSurface,
          );
        }
      }
    }
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    if (isFeaturePresentationPath) {
      final initializer = node.initializer;
      if (initializer != null &&
          !initializer.toSource().startsWith(
            'catchAsyncStateFromAsyncValue(',
          ) &&
          RegExp(r'\bref\.watch\s*\(').hasMatch(initializer.toSource())) {
        _watchedProviderVariables.add(node.name.lexeme);
        if (node.name.lexeme.toLowerCase().contains('mutation') ||
            initializer.toSource().contains('Mutation')) {
          _watchedMutationVariables.add(node.name.lexeme);
        }
      }
      if (initializer != null &&
          _screenGutterNamePattern.hasMatch(node.name.lexeme) &&
          _rebuildsScreenGutter(initializer)) {
        _reportAtNode(node, CatchUiLayoutRules.screenGutterUsesSemanticInsets);
      }

      final declarationList = node.parent;
      final declaredType = declarationList is VariableDeclarationList
          ? declarationList.type?.toSource().replaceAll(RegExp(r'\s+'), '')
          : null;
      if (declaredType == 'CatchTokens') {
        _reportAtNode(node, CatchUiLayoutRules.noTokensPropDrilling);
      }

      if (isSizingScannerPath &&
          !_isInsideCustomPainter(node) &&
          _isPrivateDesignConstant(node) &&
          initializer != null &&
          !_expressionUsesToken(initializer) &&
          _expressionContainsRawDesignValue(initializer)) {
        _reportAtNode(node, CatchUiLayoutRules.noLocalDesignConstant);
      }
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = _constructorTypeName(node);
    final constructorName = _constructorMemberName(node);

    if (typeName == 'CatchField' &&
        constructorName == null &&
        !_isCatchFieldImplementationPath) {
      _reportAtNode(node, CatchUiLayoutRules.useNamedCatchFieldConstructor);
    }

    if (typeName == 'CatchField' &&
        isFeaturePresentationPath &&
        !_hasFieldCompositionAncestor(node)) {
      _reportAtNode(node, CatchUiLayoutRules.fieldRequiresSectionContext);
    }

    if (isFeaturePresentationPath &&
        const {
          'CatchDividedFieldInteractionScope',
          'CatchFieldGeometryScope',
          'CatchFieldInteractionPlaneScope',
          'CatchSectionSurface',
        }.contains(typeName)) {
      _reportAtNode(node, CatchUiLayoutRules.fieldGeometryIsSectionOwned);
    }

    if (isFeaturePresentationPath &&
        ((typeName == 'CatchField' && _hasNamedArgument(node, 'divider')) ||
            (typeName == 'CatchFieldLanes' &&
                _hasNamedArgument(node, 'gutterOwnership')))) {
      _reportAtNode(node, CatchUiLayoutRules.fieldDividerIsSectionOwned);
    }

    if (typeName == 'CatchSection' &&
        constructorName == null &&
        !_isCatchSectionImplementationPath) {
      _reportAtNode(node, CatchUiLayoutRules.useNamedCatchSectionConstructor);
    }

    if (typeName == 'CatchSectionList' &&
        constructorName != 'panes' &&
        !_hasNamedArgument(node, 'emptyBuilder') &&
        !_hasNamedArgument(node, 'emptyStateOmitted')) {
      _reportAtNode(node, CatchUiLayoutRules.sectionListRequiresEmptyPolicy);
    }

    if (isFeaturePresentationPath &&
        typeName == 'CatchAsyncBoundary' &&
        !_hasNamedArgument(node, 'onRetry')) {
      _reportAtNode(node, CatchUiLayoutRules.asyncRequiresRetry);
    }

    if (isFeaturePresentationPath &&
        (typeName == 'CatchErrorState' ||
            typeName == 'CatchErrorScaffold' ||
            typeName == 'CatchSliverErrorState' ||
            typeName == 'CatchLocalizedErrorState' ||
            typeName == 'CatchLocalizedErrorScaffold' ||
            typeName == 'CatchLocalizedSliverErrorState') &&
        !_isInlineErrorState(node, typeName) &&
        !_hasErrorRecovery(node)) {
      _reportAtNode(node, CatchUiLayoutRules.errorStateRequiresAction);
    }

    if (typeName == 'Image' &&
        constructorName == 'network' &&
        !_isCoreWidgetPrimitivePath &&
        !path.endsWith(
          '/packages/catch_ui/lib/src/primitives/catch_network_image.dart',
        )) {
      _reportAtNode(node, CatchUiLayoutRules.noRawNetworkImage);
    }

    if (typeName == 'CatchTopBar' && _topBarHasRawActionComposition(node)) {
      _reportAtNode(node, CatchUiLayoutRules.topBarRequiresActionGroup);
    }

    if (!_isShellImplementationPath &&
        (typeName == 'AdaptiveTabScaffold' ||
            (typeName == 'Scaffold' && _scaffoldOwnsTabNavigation(node)))) {
      _reportAtNode(node, CatchUiLayoutRules.shellOwnsTabScaffold);
    }

    if (isFeaturePresentationPath && typeName == 'LayoutBuilder') {
      _reportAtNode(node, CatchUiLayoutRules.noShellLocalMeasurement);
    }

    if (isUiSystemScannerPath &&
        typeName == 'Text' &&
        !_textOwnsStyle(node) &&
        !_hasSanctionedAmbientTextAncestor(node)) {
      _reportAtNode(
        node,
        CatchUiLayoutRules.textRequiresStyle,
        arguments: [
          'App-facing Text must declare a CatchTextStyles role unless a sanctioned framework ancestor owns its typography.',
        ],
      );
    }

    if (isFeaturePresentationPath &&
        typeName == 'Center' &&
        _looksLikeRawErrorSurface(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawErrorSurface);
    }

    if (typeName == 'SizedBox') {
      _checkSizedBoxSpacing(node);
    } else if (_isEdgeInsetsConstructor(typeName)) {
      _checkEdgeInsetsSpacing(node);
    }

    if (isEventDetailPath && typeName == 'EventBackdropImage') {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchUiLayoutRules.eventDetailPrefersPhotoThumbnail,
      );
    }

    if (!allowRawControlConstructors &&
        catchRawControlConstructors.contains(typeName)) {
      _reportAtNode(
        node,
        CatchUiLayoutRules.noRawMaterialControl,
        arguments: [
          catchRawControlReplacements[typeName] ?? 'a Catch primitive',
        ],
      );
    }

    if (isUiSystemScannerPath &&
        catchRawButtonControlConstructors.contains(typeName) &&
        !_isAllowedPrimitiveRawButtonControl(typeName)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawButtonControl);
    }

    if (_isRawContentDimensionConstructor(node, typeName, constructorName)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawContentDimension);
    }

    if (isUiSystemScannerPath && _isRawShadowConstructor(node, typeName)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawShadow);
    }

    if (isUiSystemScannerPath && _isRawMotionConstructor(node, typeName)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawMotion);
    }

    if (isUiSystemScannerPath &&
        _isNestedRoundedRectangleSurface(node, typeName)) {
      _reportAtNode(node, CatchUiLayoutRules.noNestedRoundedRectangles);
    }

    if (isUiSystemScannerPath && _iconButtonMissingTooltip(node)) {
      _reportAtNode(node, CatchUiLayoutRules.iconButtonRequiresTooltip);
    }

    if (!isColorExemptPath && _isRawColorConstructor(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawColor);
    }

    if (typeName == 'TextStyle') {
      _reportAtNode(node, CatchUiLayoutRules.noRawTextStyle);
    }

    final rawRadiusOffender = _rawRadiusOffender(
      typeName,
      constructorName,
      node,
    );
    if (rawRadiusOffender != null) {
      _reportAtNode(rawRadiusOffender, CatchUiLayoutRules.noRawRadius);
    }

    if (typeName == 'Column') {
      _checkSectionColumn(node);
    }
  }

  @override
  void visitNamedExpression(NamedExpression node) {
    final name = node.name.label.name;
    if (isCatchUiLetterSpacingArgument(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawLetterSpacing);
    }

    if (_spacingNamedArguments.contains(name) &&
        _isPositiveNumberLiteral(node.expression) &&
        _isSpacingContext(node)) {
      rule.reportAtNode(
        node.expression,
        diagnosticCode: CatchUiLayoutRules.rawUiSpacing,
      );
    }

    if (_isRawContentDimensionNamedArgument(node)) {
      _reportAtNode(node.expression, CatchUiLayoutRules.noRawContentDimension);
    }

    if (isUiSystemScannerPath && _isRawIconSizeNamedArgument(node)) {
      _reportAtNode(node.expression, CatchUiLayoutRules.noRawIconSize);
    }

    if (isUiSystemScannerPath && _isRawAlphaNamedArgument(node)) {
      _reportAtNode(node.expression, CatchUiLayoutRules.noRawAlpha);
    }

    if (isUiSystemScannerPath && _isRawShadowNamedArgument(node)) {
      _reportAtNode(node.expression, CatchUiLayoutRules.noRawShadow);
    }

    if (isSizingScannerPath && _isRawStrokeNamedArgument(node)) {
      _reportAtNode(node.expression, CatchUiLayoutRules.noRawStrokeWidth);
    }
  }

  @override
  void visitBinaryExpression(BinaryExpression node) {
    final operator = node.operator.type;
    if (operator == TokenType.PLUS ||
        operator == TokenType.MINUS ||
        operator == TokenType.STAR ||
        operator == TokenType.SLASH) {
      final leftIsToken = _isTokenReference(
        node.leftOperand,
        _locallyShadowedTokenNames,
      );
      final rightIsToken = _isTokenReference(
        node.rightOperand,
        _locallyShadowedTokenNames,
      );
      final leftIsNumber = _isPositiveNumberLiteral(node.leftOperand);
      final rightIsNumber = _isPositiveNumberLiteral(node.rightOperand);
      if ((leftIsToken && (rightIsToken || rightIsNumber)) ||
          (rightIsToken && leftIsNumber)) {
        rule.reportAtNode(
          node,
          diagnosticCode: CatchUiLayoutRules.noTokenArithmetic,
        );
      }
    }

    if (isUiSystemScannerPath && _isRawBreakpointComparison(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawBreakpoint);
    }
  }

  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    if (!isFeaturePresentationPath) return;

    final name = node.name.lexeme;
    if (name == 'build') {
      for (final finding in catchUiMutationPendingWithoutErrorFindings(node)) {
        _reportAtNode(
          finding.node,
          CatchUiLayoutRules.mutationPendingRequiresError,
          arguments: [finding.label],
        );
      }
      return;
    }
    if (!name.startsWith('_')) return;

    final returnType = node.returnType?.toSource().replaceAll(
      RegExp(r'\s+'),
      '',
    );
    if (returnType == 'Widget' ||
        returnType == 'Widget?' ||
        returnType == 'List<Widget>') {
      _reportAtNode(node, CatchUiLayoutRules.noWidgetReturningMethod);
    }
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (!isFeaturePresentationPath) return;
    if (!node.name.lexeme.startsWith('_')) return;
    final returnType = node.returnType?.toSource().replaceAll(
      RegExp(r'\s+'),
      '',
    );
    if (returnType == 'Widget' ||
        returnType == 'Widget?' ||
        returnType == 'List<Widget>') {
      _reportAtNode(node, CatchUiLayoutRules.noWidgetReturningMethod);
    }
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (_isGoogleFontInvocation(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawFontDrift);
    }
    if (isCatchUiDirectFontBuilderInvocation(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noDirectFontBuilder);
    }
    if (isFeaturePresentationPath && _isRepositoryProviderReach(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noPresentationRepositoryReach);
    }
    if (_isLowLevelTypographyInvocation(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noLowLevelTypographyRole);
    }
    if (isFeaturePresentationPath && _isIncompleteAsyncWhen(node)) {
      _reportAtNode(node, CatchUiLayoutRules.asyncRequiresStateSurface);
    }
    if (isFeaturePresentationPath && _isMediaQuerySizeRead(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noShellLocalMeasurement);
    }
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    if (node.function.toSource().startsWith('GoogleFonts.')) {
      _reportAtNode(node, CatchUiLayoutRules.noRawFontDrift);
    }
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (_isManualAsyncInspection(node.prefix, node.identifier.name)) {
      _reportAtNode(node, CatchUiLayoutRules.asyncRequiresStateSurface);
    }
    if (node.prefix.name == 'Sizes' &&
        _legacySpacingNamePattern.hasMatch(node.identifier.name)) {
      _reportAtNode(node, CatchUiLayoutRules.noLegacySpacingToken);
    }

    if (isUiSystemScannerPath && node.prefix.name == 'Icons') {
      _reportAtNode(node, CatchUiLayoutRules.noRawIconSource);
    }

    if (isUiSystemScannerPath && node.prefix.name == 'Curves') {
      _reportAtNode(node, CatchUiLayoutRules.noRawMotion);
    }

    if (!isColorExemptPath && _isRawColorIdentifier(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawColor);
    }
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    if (_isManualAsyncInspection(node.target, node.propertyName.name)) {
      _reportAtNode(node, CatchUiLayoutRules.asyncRequiresStateSurface);
    }
    if (isFeaturePresentationPath && node.propertyName.name == 'requireValue') {
      _reportAtNode(node, CatchUiLayoutRules.asyncRequiresStateSurface);
    }
    if (!isColorExemptPath && _isRawColorPropertyAccess(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawColor);
    }
  }

  @override
  void visitImportDirective(ImportDirective node) {
    if (!isPresentationPath || _isPlatformImportOwnerPath) return;
    final uri = node.uri.stringValue;
    if (uri == null || !uri.startsWith('package:')) return;
    final packageName = uri.substring('package:'.length).split('/').first;
    if (_platformPackages.contains(packageName)) {
      _reportAtNode(node, CatchUiLayoutRules.noPresentationPlatformImport);
    }
  }

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    if (catchUiLintFontFamilies.contains(node.value) &&
        _isFontFamilyNamedArgument(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawFontDrift);
    }

    if (isFeaturePresentationPath && _isRawAssetPathLiteral(node)) {
      _reportAtNode(node, CatchUiLayoutRules.noRawAssetPath);
    }
  }

  bool _isThemeIndependentArtAllow(int offset) {
    final isKnownArtPath = path.endsWith(
      '/packages/catch_ui/lib/src/primitives/catch_graded_image.dart',
    );
    return isKnownArtPath &&
        _lineForOffsetText(offset).contains('theme-independent art');
  }

  bool _rebuildsScreenGutter(Expression expression) {
    final text = expression.toSource();
    if (!text.contains('EdgeInsets')) return false;
    final gutterRefs = RegExp(
      r'CatchSpacing\.(?:s5|screenPx)',
    ).allMatches(text).length;
    return gutterRefs >= 2;
  }

  bool _hasFieldCompositionAncestor(InstanceCreationExpression node) {
    if (_isCatchFieldImplementationPath) return true;
    var current = node.parent;
    while (current != null) {
      if (current is NamedExpression &&
          (current.name.label.name == 'fieldRows' ||
              current.name.label.name == 'fields')) {
        return true;
      }
      if (current is InstanceCreationExpression) {
        final typeName = _constructorTypeName(current);
        if (typeName == 'CatchSection' || typeName == 'CatchFieldLanes') {
          return true;
        }
      }
      if (current is FunctionDeclaration &&
          current.returnType?.toSource() == 'CatchField') {
        return true;
      }
      if (current is MethodDeclaration ||
          current is FunctionDeclaration ||
          current is CompilationUnit) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  bool _topBarHasRawActionComposition(InstanceCreationExpression node) {
    for (final argument in node.argumentList.arguments) {
      if (argument is! NamedExpression) continue;
      final name = argument.name.label.name;
      if (name != 'actions' && name != 'leading') continue;
      final text = argument.expression.toSource();
      if (text.contains('CatchTopBarActionRow')) continue;
      if (RegExp(r'\b(?:Row|Wrap)\s*\(').hasMatch(text)) return true;
    }
    return false;
  }

  bool _scaffoldOwnsTabNavigation(InstanceCreationExpression node) {
    final bottomNavigation = _namedArgument(node, 'bottomNavigationBar');
    if (bottomNavigation == null) return false;
    return RegExp(
      r'\b(?:BottomNavigationBar|NavigationBar|CupertinoTabBar|CatchTabBar|AdaptiveTabScaffold)\s*\(',
    ).hasMatch(bottomNavigation.toSource());
  }

  bool _looksLikeRawErrorSurface(InstanceCreationExpression node) {
    final text = node.toSource();
    return RegExp(
      r'''\bText\s*\(\s*(?:const\s+)?['"][^'"]*(?:unable|not found|failed|error|try again|unavailable)''',
      caseSensitive: false,
    ).hasMatch(text);
  }

  bool _isRepositoryProviderReach(MethodInvocation node) {
    if (_isPlatformImportOwnerPath) return false;
    if (node.target?.toSource() != 'ref') return false;
    if (node.methodName.name != 'watch' &&
        node.methodName.name != 'read' &&
        node.methodName.name != 'listen') {
      return false;
    }
    return RegExp(
      r'\b[A-Za-z_][A-Za-z0-9_]*RepositoryProvider\b',
    ).hasMatch(node.argumentList.toSource());
  }

  bool _isLowLevelTypographyInvocation(MethodInvocation node) {
    if (_lowLevelTypographyOwnerPaths.any(path.endsWith)) return false;
    return node.target?.toSource() == 'CatchTextStyles' &&
        _lowLevelTypographyRoles.contains(node.methodName.name);
  }

  bool _isIncompleteAsyncWhen(MethodInvocation node) {
    if (node.methodName.name != 'when') return false;
    final target = node.target;
    final targetSource = target?.toSource();
    if (targetSource == null) return false;
    final isWatchedVariable =
        target is SimpleIdentifier &&
        _watchedProviderVariables.contains(target.name);
    if (!isWatchedVariable && !targetSource.contains('ref.watch(')) {
      return false;
    }
    final names = <String>{
      for (final argument in node.argumentList.arguments)
        if (argument is NamedExpression) argument.name.label.name,
    };
    return !names.contains('loading') || !names.contains('error');
  }

  bool _isManualAsyncInspection(Expression? target, String member) {
    if (!isFeaturePresentationPath ||
        !_manualAsyncSnapshotMembers.contains(member) ||
        target == null) {
      return false;
    }
    if (target is SimpleIdentifier) {
      return _watchedProviderVariables.contains(target.name) &&
          !_watchedMutationVariables.contains(target.name);
    }
    return target.toSource().contains('ref.watch(');
  }

  bool _isMediaQuerySizeRead(MethodInvocation node) {
    if (node.target?.toSource() != 'MediaQuery' ||
        node.methodName.name != 'of') {
      return false;
    }
    final parent = node.parent;
    return parent is PropertyAccess && parent.propertyName.name == 'size';
  }

  bool get _isPlatformImportOwnerPath {
    return path.endsWith('_controller.dart') ||
        path.endsWith('_service.dart') ||
        path.endsWith('_repository.dart') ||
        path.endsWith('_provider.dart') ||
        path.endsWith('_actions.dart') ||
        path.endsWith('_lookup.dart') ||
        path.endsWith('_view_model.dart');
  }

  bool _isPrivateDesignConstant(VariableDeclaration node) {
    final name = node.name.lexeme;
    if (!name.startsWith('_')) return false;

    final parent = node.parent;
    if (parent is! VariableDeclarationList) return false;

    final keyword = parent.keyword?.lexeme;
    if (keyword != 'const' && keyword != 'final') return false;

    final lowerName = name.toLowerCase();
    return _localDesignConstantWords.any(lowerName.contains);
  }

  bool _isInsideCustomPainter(AstNode node) {
    var current = node.parent;
    while (current != null) {
      if (current is ClassDeclaration) {
        final extendsClause = current.extendsClause;
        return extendsClause?.superclass.name.lexeme == 'CustomPainter';
      }
      current = current.parent;
    }
    return false;
  }

  bool _expressionUsesToken(Expression expression) {
    final text = expression.toSource();
    if (_isTokenReference(expression, _locallyShadowedTokenNames)) return true;
    return _tokenPrefixes.any(
          (prefix) =>
              !_locallyShadowedTokenNames.contains(prefix) &&
              text.contains('$prefix.'),
        ) ||
        text.contains('ActivityPalette.') ||
        text.contains('CatchFonts.') ||
        text.contains('CatchTextStyles.') ||
        text.contains('Sizes.');
  }

  bool _expressionContainsRawDesignValue(Expression expression) {
    final text = expression.toSource();
    if (RegExp(
      r'\b(?:Color|Duration|Size|Offset|EdgeInsets(?:Directional|Geometry)?|BorderRadius|Radius)\b',
    ).hasMatch(text)) {
      return true;
    }
    if (RegExp(r'\b(?:Colors|CupertinoColors|Curves|Icons)\.').hasMatch(text)) {
      return true;
    }

    for (final match in RegExp(
      r'(?<![A-Za-z0-9_])-?\d+(?:\.\d+)?(?![A-Za-z0-9_])',
    ).allMatches(text)) {
      final value = double.tryParse(match.group(0)!);
      if (value != null && value.abs() > _hairlineLiteralLimit) return true;
    }

    return false;
  }

  bool _isRawContentDimensionConstructor(
    InstanceCreationExpression node,
    String typeName,
    String? constructorName,
  ) {
    if (!isSizingScannerPath) return false;

    if (typeName == 'Size') {
      if (constructorName != null && constructorName != 'square') {
        return false;
      }
      return node.argumentList.arguments.any(
        (argument) => _isNumberAtLeast(argument, 4),
      );
    }

    if (typeName == 'BoxConstraints') {
      return constructorName == 'tight' ||
          constructorName == 'tightFor' ||
          constructorName == 'expand';
    }

    return false;
  }

  bool _isRawContentDimensionNamedArgument(NamedExpression node) {
    if (!isSizingScannerPath) return false;

    final name = node.name.label.name;
    if (name != 'height' && name != 'width' && name != 'dimension') {
      return false;
    }
    if (!_isNumberAtLeast(node.expression, 4)) return false;
    return !_isIconConstructorContext(node);
  }

  bool _isRawIconSizeNamedArgument(NamedExpression node) {
    final name = node.name.label.name;
    if (name == 'iconSize') return _isNumberAtLeast(node.expression, 4);
    if (name != 'size') return false;
    if (!_isNumberAtLeast(node.expression, 4)) return false;

    final constructorType = _ancestorConstructorType(node);
    return constructorType == 'Icon' || constructorType == 'IconThemeData';
  }

  bool _isRawAlphaNamedArgument(NamedExpression node) {
    final name = node.name.label.name;
    if (name != 'alpha' && name != 'opacity') return false;
    return _isNumberBetween(node.expression, min: 0, max: 1);
  }

  bool _isRawShadowConstructor(
    InstanceCreationExpression node,
    String typeName,
  ) {
    return typeName == 'BoxShadow';
  }

  bool _isRawShadowNamedArgument(NamedExpression node) {
    final name = node.name.label.name;
    if (name == 'elevation') return _isNumberAtLeast(node.expression, 1);
    if (name == 'shadowColor') return _isRawColorExpression(node.expression);
    return false;
  }

  bool _isRawStrokeNamedArgument(NamedExpression node) {
    if (_isInsideCustomPainter(node)) return false;

    final name = node.name.label.name;
    final constructorType = _ancestorConstructorType(node);
    if (constructorType == null) return false;

    if (name == 'width') {
      if (constructorType != 'BorderSide' &&
          constructorType != 'Border' &&
          constructorType != 'CatchBorderSpec') {
        return false;
      }
      return _containsPositiveNumberLiteral(node.expression);
    }

    if (name == 'borderWidth' || name == 'strokeWidth') {
      return _containsPositiveNumberLiteral(node.expression);
    }

    if (name == 'thickness') {
      return constructorType == 'Divider' ||
              constructorType == 'VerticalDivider'
          ? _containsPositiveNumberLiteral(node.expression)
          : false;
    }

    return false;
  }

  bool _isRawMotionConstructor(
    InstanceCreationExpression node,
    String typeName,
  ) {
    if (typeName == 'Duration') return !isCatchUiDateArithmeticDuration(node);
    if (typeName != 'CurveTween') return false;
    return node.toSource().contains('Curves.');
  }

  bool _isNestedRoundedRectangleSurface(
    InstanceCreationExpression node,
    String typeName,
  ) {
    if (!_isRoundedRectangleSurface(node, typeName)) return false;

    var current = node.parent;
    while (current != null) {
      if (current is InstanceCreationExpression &&
          _isRoundedRectangleSurface(current, _constructorTypeName(current))) {
        return true;
      }

      if (current is Statement ||
          current is FunctionBody ||
          current is ClassDeclaration ||
          current is CompilationUnit) {
        return false;
      }

      current = current.parent;
    }

    return false;
  }

  bool _isRoundedRectangleSurface(
    InstanceCreationExpression node,
    String typeName,
  ) {
    if (_isRoundedAffordanceConstructor(typeName)) return false;

    if (typeName == 'CatchSurface') {
      return _isDisplayCatchSurface(node);
    }

    if (typeName == 'CatchSection') {
      return _isContainedCatchSection(node);
    }

    // CatchField's closed row/underline/bare variants have no rounded shell.
    // Contained fields inherit the section's rectangular press band.
    if (typeName == 'CatchField') return false;

    if (typeName == 'Card') return true;

    if (typeName == 'Material') {
      return _hasNamedArgument(node, 'borderRadius') ||
          _namedArgumentSourceContains(node, 'shape', 'RoundedRectangleBorder');
    }

    if (!_surfaceShellConstructors.contains(typeName)) return false;
    return _hasRoundedRectangleDecoration(node);
  }

  bool _isRoundedAffordanceConstructor(String typeName) {
    return _roundedAffordanceConstructors.contains(typeName) ||
        _roundedAffordanceNameFragments.any(typeName.contains);
  }

  bool _isDisplayCatchSurface(InstanceCreationExpression node) {
    final constructorName = _constructorMemberName(node);
    if (constructorName == 'tinted' || constructorName == 'message') {
      return false;
    }

    if (_namedArgumentSourceContains(
      node,
      'tone',
      'CatchSurfaceTone.transparent',
    )) {
      return false;
    }

    return true;
  }

  bool _isAllowedPrimitiveRawButtonControl(String typeName) {
    return (_isCatchFieldImplementationPath &&
            (typeName == 'TextField' || typeName == 'TextFormField')) ||
        (_isCatchMenuImplementationPath && typeName == 'MenuAnchor') ||
        (_isCatchTextInputImplementationPath && typeName == 'TextField') ||
        (_isCatchRangeInputImplementationPath && typeName == 'RangeSlider') ||
        (_isCatchButtonImplementationPath && typeName == 'TextButton');
  }

  bool _isContainedCatchSection(InstanceCreationExpression node) {
    return _constructorMemberName(node) == 'contained';
  }

  bool _hasRoundedRectangleDecoration(InstanceCreationExpression node) {
    final decoration = _namedArgument(node, 'decoration');
    if (decoration is! InstanceCreationExpression) return false;
    if (_constructorTypeName(decoration) != 'BoxDecoration') return false;

    final text = decoration.toSource();
    if (text.contains('shape: BoxShape.circle')) return false;
    if (text.contains('CatchRadius.pill')) return false;
    return text.contains('borderRadius:') ||
        text.contains('RoundedRectangleBorder');
  }

  bool _hasNamedArgument(InstanceCreationExpression node, String name) {
    return _namedArgument(node, name) != null;
  }

  bool _hasErrorRecovery(InstanceCreationExpression node) {
    final retry = _namedArgument(node, 'onRetry');
    if (retry != null && retry is! NullLiteral) return true;
    final actions = _namedArgument(node, 'actions');
    return actions != null &&
        actions is! NullLiteral &&
        (actions is! ListLiteral || actions.elements.isNotEmpty);
  }

  bool _isInlineErrorState(InstanceCreationExpression node, String typeName) {
    if (typeName != 'CatchErrorState' &&
        typeName != 'CatchLocalizedErrorState') {
      return false;
    }
    // These recipes inherit recovery from the surrounding section. Resolve
    // the enum owner so a matching spelling from another API cannot opt out.
    final mode = _namedArgument(node, 'mode');
    final element = switch (mode) {
      PrefixedIdentifier() => mode.element,
      PropertyAccess() => mode.propertyName.element,
      SimpleIdentifier() => mode.element,
      _ => null,
    };
    return element?.enclosingElement?.name == 'CatchErrorStateMode' &&
        element?.library?.uri.toString() ==
            'package:catch_ui/src/components/catch_error_state_mode.dart' &&
        const {'inline', 'compact'}.contains(element?.name);
  }

  bool _namedArgumentSourceContains(
    InstanceCreationExpression node,
    String name,
    String text,
  ) {
    final expression = _namedArgument(node, name);
    return expression != null && expression.toSource().contains(text);
  }

  bool _isRawBreakpointComparison(BinaryExpression node) {
    final operator = node.operator.type;
    if (operator != TokenType.LT &&
        operator != TokenType.LT_EQ &&
        operator != TokenType.GT &&
        operator != TokenType.GT_EQ) {
      return false;
    }

    return (_looksLikeWidthExpression(node.leftOperand) &&
            _isNumberAtLeast(node.rightOperand, 100)) ||
        (_looksLikeWidthExpression(node.rightOperand) &&
            _isNumberAtLeast(node.leftOperand, 100));
  }

  bool _looksLikeWidthExpression(Expression expression) {
    final text = expression.toSource();
    return RegExp(
      r'\b(?:constraints\.(?:maxWidth|minWidth)|MediaQuery\.of\(context\)\.size\.width|size\.width|width)\b',
    ).hasMatch(text);
  }

  bool _isRawColorExpression(Expression expression) {
    if (expression is InstanceCreationExpression) {
      return _isRawColorConstructor(expression);
    }
    if (expression is PrefixedIdentifier) {
      return _isRawColorIdentifier(expression);
    }
    if (expression is PropertyAccess) {
      return _isRawColorPropertyAccess(expression);
    }
    return false;
  }

  bool _isIconConstructorContext(AstNode node) {
    final constructorType = _ancestorConstructorType(node);
    return constructorType == 'Icon' || constructorType == 'IconThemeData';
  }

  Expression? _namedArgument(InstanceCreationExpression node, String name) {
    for (final argument in node.argumentList.arguments) {
      if (argument is NamedExpression && argument.name.label.name == name) {
        return argument.expression;
      }
    }
    return null;
  }

  String? _ancestorConstructorType(AstNode node) {
    var current = node.parent;
    while (current != null) {
      if (current is InstanceCreationExpression) {
        return _constructorTypeName(current);
      }
      if (current is Statement || current is CollectionElement) return null;
      current = current.parent;
    }
    return null;
  }

  void _checkSizedBoxSpacing(InstanceCreationExpression node) {
    for (final argument in node.argumentList.arguments) {
      if (argument is! NamedExpression) continue;
      final name = argument.name.label.name;
      if ((name == 'height' || name == 'width') &&
          _isPositiveNumberLiteral(argument.expression)) {
        rule.reportAtNode(
          argument.expression,
          diagnosticCode: CatchUiLayoutRules.rawUiSpacing,
        );
      }
    }
  }

  void _checkEdgeInsetsSpacing(InstanceCreationExpression node) {
    if (isFeaturePresentationPath &&
        !_isNamedInsetContract(node) &&
        _edgeInsetsUsesLowLevelSpacing(node)) {
      _reportAtNode(node, CatchUiLayoutRules.preferSemanticInsets);
    }

    for (final argument in node.argumentList.arguments) {
      if (argument is NamedExpression) {
        if (_isPositiveNumberLiteral(argument.expression)) {
          rule.reportAtNode(
            argument.expression,
            diagnosticCode: CatchUiLayoutRules.rawUiSpacing,
          );
        }
      } else if (_isPositiveNumberLiteral(argument)) {
        rule.reportAtNode(
          argument,
          diagnosticCode: CatchUiLayoutRules.rawUiSpacing,
        );
      }
    }
  }

  bool _edgeInsetsUsesLowLevelSpacing(InstanceCreationExpression node) {
    for (final argument in node.argumentList.arguments) {
      final expression = argument is NamedExpression
          ? argument.expression
          : argument;
      if (_usesCatchSpacing(expression)) return true;
    }
    return false;
  }

  bool _isNamedInsetContract(InstanceCreationExpression node) {
    var current = node.parent;
    while (current != null) {
      if (current is VariableDeclaration || current is DefaultFormalParameter) {
        return true;
      }
      if (current is Statement ||
          current is InstanceCreationExpression ||
          current is MethodInvocation) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  void _checkSectionColumn(InstanceCreationExpression node) {
    final children = _childrenArgument(node);
    if (children == null || children.elements.length < 3) return;

    var sectionLikeChildren = 0;
    var hasManualGap = false;

    for (final element in children.elements) {
      final expression = element is Expression ? element : null;
      if (expression == null) continue;
      final childName = _expressionTypeName(expression);
      if (childName.endsWith('Section') || childName.contains('Section')) {
        sectionLikeChildren += 1;
      }
      if (childName == 'SizedBox') {
        hasManualGap = true;
      }
    }

    if (sectionLikeChildren >= 2 && hasManualGap) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchUiLayoutRules.useSectionList,
      );
    }
  }

  bool _isRawColorConstructor(InstanceCreationExpression node) {
    if (_constructorTypeName(node) != 'Color') return false;

    final constructorName = _constructorMemberName(node);
    if (constructorName == null) {
      final arguments = node.argumentList.arguments;
      if (arguments.isEmpty) return false;

      final firstArgument = arguments.first;
      if (firstArgument is IntegerLiteral &&
          _isTransparentColorLiteral(firstArgument)) {
        return false;
      }
      return true;
    }

    return constructorName == 'fromARGB' || constructorName == 'fromRGBO';
  }

  Expression? _rawRadiusOffender(
    String typeName,
    String? constructorName,
    InstanceCreationExpression node,
  ) {
    if (typeName == 'Radius') {
      if (_isBorderRadiusRadiusArgument(node)) return null;
      if (constructorName != 'circular' && constructorName != 'elliptical') {
        return null;
      }
      return _firstPositiveNumberArgument(node.argumentList.arguments);
    }

    if (typeName == 'BorderRadius') {
      if (constructorName == 'circular') {
        return _firstPositiveNumberArgument(node.argumentList.arguments);
      }
      if (constructorName == 'all' ||
          constructorName == 'only' ||
          constructorName == 'vertical' ||
          constructorName == 'horizontal') {
        return _firstRawRadiusConstructorArgument(node.argumentList.arguments);
      }
    }

    return null;
  }

  Expression? _firstPositiveNumberArgument(NodeList<Expression> nodes) {
    for (final node in nodes) {
      if (node is NamedExpression &&
          _isPositiveNumberLiteral(node.expression)) {
        return node.expression;
      }
      if (_isPositiveNumberLiteral(node)) return node;
    }
    return null;
  }

  Expression? _firstRawRadiusConstructorArgument(NodeList<Expression> nodes) {
    for (final node in nodes) {
      final expression = node is NamedExpression ? node.expression : node;
      if (expression is! InstanceCreationExpression) continue;
      if (_constructorTypeName(expression) != 'Radius') continue;
      final constructorName = _constructorMemberName(expression);
      if (constructorName != 'circular' && constructorName != 'elliptical') {
        continue;
      }
      if (_firstPositiveNumberArgument(expression.argumentList.arguments) !=
          null) {
        return expression;
      }
    }
    return null;
  }

  bool _isBorderRadiusRadiusArgument(InstanceCreationExpression node) {
    final parent = node.parent;
    final borderRadius = parent is NamedExpression
        ? parent.parent?.parent
        : parent?.parent;
    if (borderRadius is! InstanceCreationExpression) return false;
    if (_constructorTypeName(borderRadius) != 'BorderRadius') return false;
    final constructorName = _constructorMemberName(borderRadius);
    return constructorName == 'all' ||
        constructorName == 'only' ||
        constructorName == 'vertical' ||
        constructorName == 'horizontal';
  }

  bool _isGoogleFontInvocation(MethodInvocation node) {
    final methodName = node.methodName.name;
    if (methodName == 'getFont') return true;

    final target = node.target;
    return (target is SimpleIdentifier && target.name == 'GoogleFonts') ||
        node.toSource().startsWith('GoogleFonts.');
  }

  bool _isRawColorIdentifier(PrefixedIdentifier node) {
    final prefix = node.prefix.name;
    if (prefix != 'Colors' && prefix != 'CupertinoColors') return false;

    return node.identifier.name != 'transparent';
  }

  bool _isRawColorPropertyAccess(PropertyAccess node) {
    final target = node.target;
    if (target is! SimpleIdentifier) return false;
    if (target.name != 'Colors' && target.name != 'CupertinoColors') {
      return false;
    }

    return node.propertyName.name != 'transparent';
  }

  bool _isFontFamilyNamedArgument(SimpleStringLiteral node) {
    final parent = node.parent;
    return parent is NamedExpression && parent.name.label.name == 'fontFamily';
  }

  bool _isRawAssetPathLiteral(SimpleStringLiteral node) {
    if (!node.value.startsWith('assets/')) return false;

    final argumentList = node.parent;
    if (argumentList is! ArgumentList) return false;

    final invocation = argumentList.parent;
    if (invocation is InstanceCreationExpression) {
      final typeName = _constructorTypeName(invocation);
      final constructorName = _constructorMemberName(invocation);
      return _assetPathConstructors.contains(typeName) ||
          ((typeName == 'Image' || typeName == 'SvgPicture') &&
              constructorName == 'asset');
    }
    if (invocation is MethodInvocation) {
      final methodName = invocation.methodName.name;
      final target = invocation.target;
      final targetName = target?.toSource();
      if (methodName == 'asset') {
        return targetName == 'Image' || targetName == 'SvgPicture';
      }
      if (methodName == 'load' || methodName == 'loadString') {
        return targetName == 'rootBundle';
      }
    }
    return false;
  }

  bool _iconButtonMissingTooltip(InstanceCreationExpression node) {
    if (_constructorTypeName(node) != 'IconButton') return false;
    if (_namedArgument(node, 'tooltip') != null) return false;
    return !_hasSemanticAncestor(node);
  }

  bool _hasSemanticAncestor(AstNode node) {
    var current = node.parent;
    while (current != null) {
      if (current is InstanceCreationExpression) {
        final typeName = _constructorTypeName(current);
        if (typeName == 'Semantics' || typeName == 'Tooltip') return true;
      }
      if (current is Statement || current is CollectionElement) return false;
      current = current.parent;
    }
    return false;
  }

  void _reportAtNode(
    AstNode node,
    LintCode diagnosticCode, {
    List<Object> arguments = const [],
  }) {
    if (diagnosticCode != CatchUiLayoutRules.noAllowDebt &&
        _hasUiAllowComment(node)) {
      return;
    }

    rule.reportAtNode(
      node,
      diagnosticCode: diagnosticCode,
      arguments: arguments,
    );
  }

  bool _hasUiAllowComment(AstNode node) {
    final line = _lineForOffset(node.offset);
    return _lineContainsUiAllow(line) || _lineContainsUiAllow(line - 1);
  }

  bool get _isCatchFieldImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/components/catch_field.dart',
    );
  }

  bool get _isCatchSectionImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/components/catch_section.dart',
    );
  }

  bool get _isCatchMenuImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/components/catch_menu.dart',
    );
  }

  bool get _isCatchButtonImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/components/catch_button.dart',
    );
  }

  bool get _isCatchTextInputImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/primitives/catch_text_input.dart',
    );
  }

  bool get _isCatchRangeInputImplementationPath {
    return path.endsWith(
      '/packages/catch_ui/lib/src/components/catch_range_input.dart',
    );
  }

  bool get _isCoreWidgetPrimitivePath {
    return path.contains('/lib/core/widgets/');
  }

  bool get _isShellImplementationPath {
    return path.endsWith('/lib/core/presentation/app_shell.dart') ||
        path.endsWith('/lib/core/presentation/host_app_shell.dart');
  }

  int _lineForOffset(int offset) {
    var low = 0;
    var high = _lineStarts.length - 1;
    while (low <= high) {
      final mid = (low + high) >> 1;
      final lineStart = _lineStarts[mid];
      if (lineStart > offset) {
        high = mid - 1;
      } else {
        if (mid == _lineStarts.length - 1 || _lineStarts[mid + 1] > offset) {
          return mid;
        }
        low = mid + 1;
      }
    }
    return 0;
  }

  bool _lineContainsUiAllow(int line) {
    if (line < 0 || line >= _lineStarts.length) return false;
    return _allowDebtPattern.hasMatch(_textForLine(line));
  }

  String _lineForOffsetText(int offset) {
    return _textForLine(_lineForOffset(offset));
  }

  String _textForLine(int line) {
    final start = _lineStarts[line];
    final end = line + 1 < _lineStarts.length
        ? _lineStarts[line + 1]
        : source.length;
    return source.substring(start, end);
  }

  ListLiteral? _childrenArgument(InstanceCreationExpression node) {
    for (final argument in node.argumentList.arguments) {
      if (argument is NamedExpression &&
          argument.name.label.name == 'children' &&
          argument.expression is ListLiteral) {
        return argument.expression as ListLiteral;
      }
    }
    return null;
  }

  bool _isSpacingContext(AstNode node) {
    var current = node.parent;
    while (current != null) {
      if (current is InstanceCreationExpression) {
        final typeName = _constructorTypeName(current);
        return typeName == 'SizedBox' ||
            typeName.startsWith('EdgeInsets') ||
            typeName == 'SliverGridDelegateWithFixedCrossAxisCount' ||
            typeName == 'SliverGridDelegateWithMaxCrossAxisExtent' ||
            typeName == 'Wrap';
      }
      if (current is MethodInvocation) {
        final methodName = current.methodName.name;
        return methodName == 'all' ||
            methodName == 'only' ||
            methodName == 'symmetric' ||
            methodName == 'fromLTRB';
      }
      current = current.parent;
    }
    return false;
  }
}

String _constructorTypeName(InstanceCreationExpression node) {
  final resolvedName = node.constructorName.element?.enclosingElement.name;
  if (resolvedName != null && resolvedName.isNotEmpty) return resolvedName;
  final raw = node.constructorName.type.toSource();
  return raw.split('<').first.split('.').last;
}

bool isCatchUiDateArithmeticDuration(InstanceCreationExpression node) {
  final parent = node.parent;
  if (parent is! ArgumentList) return false;
  if (parent.arguments.length != 1 || parent.arguments.first != node) {
    return false;
  }

  final invocation = parent.parent;
  if (invocation is! MethodInvocation) return false;
  final methodName = invocation.methodName.name;
  if (methodName != 'add' && methodName != 'subtract') return false;
  return invocation.target != null;
}

bool _isEdgeInsetsConstructor(String typeName) {
  return typeName == 'EdgeInsets' || typeName == 'EdgeInsetsDirectional';
}

bool isCatchUiDirectFontBuilderInvocation(MethodInvocation node) {
  final target = node.target;
  return target is SimpleIdentifier && target.name == 'CatchFonts';
}

bool isCatchUiLetterSpacingArgument(NamedExpression node) {
  return node.name.label.name == 'letterSpacing';
}

bool _isPositiveNumberLiteral(Expression expression) {
  if (expression is IntegerLiteral) {
    return (expression.value ?? 0) > _hairlineLiteralLimit;
  }
  if (expression is DoubleLiteral) {
    return expression.value > _hairlineLiteralLimit;
  }
  return false;
}

bool _isNumberAtLeast(Expression expression, double minimum) {
  final value = _numberLiteralValue(expression);
  return value != null && value >= minimum;
}

bool _containsPositiveNumberLiteral(Expression expression) {
  final directValue = _numberLiteralValue(expression);
  if (directValue != null) return directValue > 0;

  for (final entity in expression.childEntities) {
    if (entity is Expression && _containsPositiveNumberLiteral(entity)) {
      return true;
    }
  }
  return false;
}

bool _isNumberBetween(
  Expression expression, {
  required double min,
  required double max,
}) {
  final value = _numberLiteralValue(expression);
  return value != null && value >= min && value <= max;
}

double? _numberLiteralValue(Expression expression) {
  if (expression is IntegerLiteral) return expression.value?.toDouble();
  if (expression is DoubleLiteral) return expression.value;
  if (expression is PrefixExpression &&
      expression.operator.type == TokenType.MINUS) {
    final operandValue = _numberLiteralValue(expression.operand);
    return operandValue == null ? null : -operandValue;
  }
  if (expression is ParenthesizedExpression) {
    return _numberLiteralValue(expression.expression);
  }
  return null;
}

bool _isTokenReference(
  Expression expression, [
  Set<String> shadowedTokenNames = const <String>{},
]) {
  bool isSanctionedTokenName(String name) =>
      _tokenSourceNames.contains(name) && !shadowedTokenNames.contains(name);

  if (expression is SimpleIdentifier) {
    return isSanctionedTokenName(expression.name);
  }
  if (expression is PrefixedIdentifier) {
    return isSanctionedTokenName(expression.prefix.name) ||
        isSanctionedTokenName(expression.identifier.name);
  }
  if (expression is PropertyAccess) {
    final target = expression.target;
    return isSanctionedTokenName(expression.propertyName.name) ||
        (target != null && _isTokenReference(target, shadowedTokenNames));
  }
  if (expression is MethodInvocation) {
    final target = expression.target;
    return target is SimpleIdentifier &&
        !shadowedTokenNames.contains('CatchTokens') &&
        target.name == 'CatchTokens' &&
        expression.methodName.name == 'of';
  }
  if (expression is ParenthesizedExpression) {
    return _isTokenReference(expression.expression, shadowedTokenNames);
  }
  return false;
}

Set<String> _declaredTokenShadows(CompilationUnit node) {
  final shadows = <String>{};

  void addIfShadowed(String? name) {
    if (name != null && _tokenSourceNames.contains(name)) {
      shadows.add(name);
    }
  }

  for (final declaration in node.declarations) {
    if (declaration is ClassDeclaration) {
      addIfShadowed(declaration.namePart.typeName.lexeme);
    } else if (declaration is EnumDeclaration) {
      addIfShadowed(declaration.namePart.typeName.lexeme);
    } else if (declaration is ExtensionDeclaration) {
      addIfShadowed(declaration.name?.lexeme);
    } else if (declaration is FunctionDeclaration) {
      addIfShadowed(declaration.name.lexeme);
    } else if (declaration is MixinDeclaration) {
      addIfShadowed(declaration.name.lexeme);
    } else if (declaration is TopLevelVariableDeclaration) {
      for (final variable in declaration.variables.variables) {
        addIfShadowed(variable.name.lexeme);
      }
    }
  }

  return shadows;
}

bool _usesCatchSpacing(Expression expression) {
  if (expression is PrefixedIdentifier) {
    return expression.prefix.name == 'CatchSpacing';
  }
  if (expression is PropertyAccess) {
    final target = expression.target;
    if (target is SimpleIdentifier && target.name == 'CatchSpacing') {
      return true;
    }
    return target != null && _usesCatchSpacing(target);
  }
  if (expression is BinaryExpression) {
    return _usesCatchSpacing(expression.leftOperand) ||
        _usesCatchSpacing(expression.rightOperand);
  }
  if (expression is ConditionalExpression) {
    return _usesCatchSpacing(expression.condition) ||
        _usesCatchSpacing(expression.thenExpression) ||
        _usesCatchSpacing(expression.elseExpression);
  }
  if (expression is ParenthesizedExpression) {
    return _usesCatchSpacing(expression.expression);
  }
  return false;
}

String _expressionTypeName(Expression expression) {
  if (expression is InstanceCreationExpression) {
    return _constructorTypeName(expression);
  }
  if (expression is Identifier) {
    return expression.name;
  }
  if (expression is PrefixedIdentifier) {
    return expression.identifier.name;
  }
  if (expression is ParenthesizedExpression) {
    return _expressionTypeName(expression.expression);
  }
  return '';
}

String? _constructorMemberName(InstanceCreationExpression node) {
  return node.constructorName.name?.name;
}

bool _isTransparentColorLiteral(IntegerLiteral literal) {
  final lexeme = literal.literal.lexeme.toLowerCase();
  if (!lexeme.startsWith('0x')) return false;

  final hex = lexeme.substring(2).replaceAll('_', '');
  return hex.length == 8 && hex.startsWith('00');
}

List<int> _computeLineStarts(String source) {
  final starts = <int>[0];
  for (var index = 0; index < source.length; index += 1) {
    if (source.codeUnitAt(index) == 0x0A) {
      starts.add(index + 1);
    }
  }
  return starts;
}
