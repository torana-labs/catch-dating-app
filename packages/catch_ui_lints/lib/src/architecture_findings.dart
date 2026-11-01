import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/token.dart';
import 'package:analyzer/dart/ast/visitor.dart';

import 'migration_scope.dart' show migrationRepositoryRoot;

/// Lint codes for the dependency-direction and bounded-context rules. Every
/// code is `catch_arch_*` so `catch_no_allow_debt` can keep rejecting ignores
/// of the UI rules while these take a reasoned `// ignore:`.
abstract final class ArchitectureCodes {
  static const domainFrameworkImport = 'catch_arch_domain_framework_import';
  static const dataDomainPresentationImport =
      'catch_arch_data_domain_presentation_import';
  static const crossFeaturePresentationImport =
      'catch_arch_cross_feature_presentation_import';
  static const presentationPluginImport =
      'catch_arch_presentation_plugin_import';
  static const barrelPresentationExport =
      'catch_arch_barrel_presentation_export';
  static const domainClockAccess = 'catch_arch_domain_clock_access';
  static const dataStreamTimeout = 'catch_arch_data_stream_timeout';
  static const widgetRefParameter = 'catch_arch_widget_ref_parameter';
  static const widgetRepositoryProviderRead =
      'catch_arch_widget_repository_provider_read';
  static const stateFileProviderCoupling =
      'catch_arch_state_file_provider_coupling';
  static const partsProviderCoupling = 'catch_arch_parts_provider_coupling';
  static const misplacedStateClass = 'catch_arch_misplaced_state_class';
  static const multiRouteScreenFile = 'catch_arch_multi_route_screen_file';
  static const undocumentedKeepAlive = 'catch_arch_undocumented_keep_alive';
  static const manualProviderDeclaration =
      'catch_arch_manual_provider_declaration';
  static const upwardLayerImport = 'catch_arch_upward_layer_import';
  static const contextOrderImport = 'catch_arch_context_order_import';
  static const contextBarrelBypass = 'catch_arch_context_barrel_bypass';
  static const unmappedFile = 'catch_arch_unmapped_file';
  static const unknownContext = 'catch_arch_unknown_context';
  static const legacyContextFile = 'catch_arch_legacy_context_file';
  static const providerFreeBoundary = 'catch_arch_provider_free_boundary';
  static const invalidIgnore = 'catch_arch_invalid_ignore';

  static const all = <String>[
    domainFrameworkImport,
    dataDomainPresentationImport,
    crossFeaturePresentationImport,
    presentationPluginImport,
    barrelPresentationExport,
    domainClockAccess,
    dataStreamTimeout,
    widgetRefParameter,
    widgetRepositoryProviderRead,
    stateFileProviderCoupling,
    partsProviderCoupling,
    misplacedStateClass,
    multiRouteScreenFile,
    undocumentedKeepAlive,
    manualProviderDeclaration,
    upwardLayerImport,
    contextOrderImport,
    contextBarrelBypass,
    unmappedFile,
    unknownContext,
    legacyContextFile,
    providerFreeBoundary,
    invalidIgnore,
  ];

  /// These hold everywhere: an `// ignore:` of one is itself a finding.
  static const hardGates = <String>{
    barrelPresentationExport,
    partsProviderCoupling,
    contextBarrelBypass,
    unmappedFile,
    unknownContext,
    legacyContextFile,
    invalidIgnore,
  };
}

class ArchitectureFinding {
  const ArchitectureFinding(this.code, this.offset, this.length, this.reason);

  final String code;
  final int offset;
  final int length;
  final String reason;
}

const _appPackage = 'package:catch_dating_app/';

const _allowedDomainPackages = <String>{
  'catch_dating_app',
  'collection',
  'freezed_annotation',
  'json_annotation',
  'meta',
  'pub_semver',
};

const _pluginPackages = <String>{
  'audioplayers',
  'connectivity_plus',
  'firebase_analytics',
  'firebase_app_check',
  'firebase_crashlytics',
  'firebase_messaging',
  'firebase_remote_config',
  'geolocator',
  'google_maps_flutter',
  'health',
  'image_picker',
  'mobile_scanner',
  'package_info_plus',
  'razorpay_flutter',
  'share_plus',
  'shared_preferences',
  'url_launcher',
};

const _providerBuilders = <String>{
  'Provider',
  'StateProvider',
  'FutureProvider',
  'StreamProvider',
  'NotifierProvider',
  'AsyncNotifierProvider',
  'StreamNotifierProvider',
  'ChangeNotifierProvider',
  'StateNotifierProvider',
};

const _routeScreenBases = <String>{
  'ConsumerWidget',
  'ConsumerStatefulWidget',
  'StatelessWidget',
  'StatefulWidget',
};

// Fixtures in tool/check_catch_ui_lints.sh opt in with an arch/ folder, which
// keeps the UI-rule fixtures out of the layer rules.
final _probePrefix = RegExp(r'^tool/catch_ui_lints_probe/[^/]+/\d+/arch/');

/// The repository-relative path these rules place, or null when the file is
/// outside lib/ and apps/*/lib/ or is generated.
String? architectureRelativePath(String absolutePath) {
  final normalized = absolutePath.replaceAll(r'\', '/');
  if (normalized.endsWith('.g.dart') || normalized.endsWith('.freezed.dart')) {
    return null;
  }
  final root = migrationRepositoryRoot(normalized);
  if (root == null) return null;
  final relative = normalized
      .substring(root.length + 1)
      .replaceFirst(_probePrefix, '');
  return relative.startsWith('lib/') ||
          RegExp(r'^apps/[^/]+/lib/').hasMatch(relative)
      ? relative
      : null;
}

// Places a file for the dependency-direction rules: legacy features use
// lib/<feature>/<layer>/; bounded-context roots use lib/contexts/<context>/,
// lib/kernel/ (held to domain rules), lib/platform/, lib/pages/<page>/ and
// apps/<app>/lib/<destination>/ (held to screen rules).
({String root, String owner, String layer})? placeSource(String relativePath) {
  var match = RegExp(
    r'^lib/contexts/([^/]+)/(domain|data|actions|parts)/.+\.dart$',
  ).firstMatch(relativePath);
  if (match != null) {
    return (root: 'context', owner: 'contexts/${match[1]}', layer: match[2]!);
  }
  if (RegExp(r'^lib/kernel/.+\.dart$').hasMatch(relativePath)) {
    return (root: 'kernel', owner: 'kernel', layer: 'domain');
  }
  if (RegExp(r'^lib/platform/.+\.dart$').hasMatch(relativePath)) {
    return (root: 'platform', owner: 'platform', layer: 'platform');
  }
  match = RegExp(r'^lib/pages/([^/]+)/.+\.dart$').firstMatch(relativePath);
  if (match != null) {
    return (root: 'pages', owner: 'pages/${match[1]}', layer: 'presentation');
  }
  match = RegExp(
    r'^apps/([^/]+)/lib/([^/]+)/.+\.dart$',
  ).firstMatch(relativePath);
  if (match != null) {
    return (
      root: 'app',
      owner: 'apps/${match[1]}/${match[2]}',
      layer: 'presentation',
    );
  }
  match = RegExp(
    r'^lib/([^/]+)/(domain|data|presentation)/.+\.dart$',
  ).firstMatch(relativePath);
  if (match != null) {
    return (root: 'legacy', owner: match[1]!, layer: match[2]!);
  }
  return null;
}

bool _isPresentationLayer(String relativePath) => const {
  'presentation',
  'actions',
  'parts',
}.contains(placeSource(relativePath)?.layer);

bool isFeatureRootBarrel(String relativePath) {
  final match = RegExp(r'^lib/([^/]+)/([^/]+)\.dart$').firstMatch(relativePath);
  return match != null && match[1] == match[2];
}

typedef DirectiveUri = ({String uri, StringLiteral node});

List<DirectiveUri> importUris(CompilationUnit unit) => [
  for (final directive in unit.directives.whereType<ImportDirective>())
    ..._namespaceUris(directive),
];

List<DirectiveUri> exportUris(CompilationUnit unit) => [
  for (final directive in unit.directives.whereType<ExportDirective>())
    ..._namespaceUris(directive),
];

List<DirectiveUri> _namespaceUris(NamespaceDirective directive) => [
  if (directive.uri.stringValue case final uri?)
    (uri: uri, node: directive.uri),
  for (final configuration in directive.configurations)
    if (configuration.uri.stringValue case final uri?)
      (uri: uri, node: configuration.uri),
];

// Compare relative imports using the same app identity as package imports.
String resolveAppImport(String relativePath, String uri) {
  if (RegExp(r'^[A-Za-z][A-Za-z0-9+.-]*:').hasMatch(uri)) return uri;
  final resolved = _resolvedPath(relativePath, uri);
  return resolved.startsWith('/lib/')
      ? '$_appPackage${resolved.substring('/lib/'.length)}'
      : uri;
}

String _resolvedPath(String relativePath, String uri) =>
    Uri.decodeComponent(Uri.parse('file:///$relativePath').resolve(uri).path);

// The repository path a directive points at, or null when it leaves lib/.
String? resolveLibPath(String relativePath, String uri) {
  if (uri.startsWith(_appPackage)) {
    return 'lib/${uri.substring(_appPackage.length)}';
  }
  if (RegExp(r'^[A-Za-z][A-Za-z0-9+.-]*:').hasMatch(uri)) return null;
  final resolved = _resolvedPath(relativePath, uri);
  return resolved.startsWith('/lib/') ? resolved.substring(1) : null;
}

String _packageName(String uri) =>
    RegExp(r'^package:([^/]+)').firstMatch(uri)?[1] ?? '';

Iterable<Token> _codeTokens(CompilationUnit unit) sync* {
  // The token stream has no comments and keeps string interpolation code.
  var token = unit.beginToken;
  while (!token.isEof) {
    yield token;
    token = token.next!;
  }
}

bool _isMemberAccess(Token token) =>
    const {'.', '?.', '..', '?..'}.contains(token.lexeme);

/// The dependency-direction rules. [source] supplies the marker comments.
List<ArchitectureFinding> dependencyDirectionFindings({
  required String relativePath,
  required String source,
  required CompilationUnit unit,
}) {
  final findings = <ArchitectureFinding>[];
  void add(String code, int offset, int length, String reason) =>
      findings.add(ArchitectureFinding(code, offset, length, reason));
  void addNode(String code, AstNode node, String reason) =>
      add(code, node.offset, node.length, reason);
  void addToken(String code, Token token, String reason) =>
      add(code, token.offset, token.length, reason);

  final lines = source.split(RegExp(r'\r?\n'));
  int lineOf(int offset) => unit.lineInfo.getLocation(offset).lineNumber;
  // Marker on the given 1-based line or the one above it.
  bool hasMarker(RegExp marker, int line) => [line - 1, line - 2].any(
    (index) =>
        index >= 0 && index < lines.length && marker.hasMatch(lines[index]),
  );

  final place = placeSource(relativePath);
  final layer = place?.layer;
  final isPresentation = _isPresentationLayer(relativePath);
  final isActions = layer == 'actions';
  final fileName = relativePath.split('/').last;
  final isControllerOrService = RegExp(
    r'_(?:controller|service)\.dart$',
  ).hasMatch(fileName);
  final isScreenOrController = RegExp(
    r'_(?:screen|controller)\.dart$',
  ).hasMatch(fileName);
  final isStateFile =
      layer == 'presentation' && fileName.endsWith('_state.dart');

  for (final (:uri, :node) in importUris(unit)) {
    final target = resolveAppImport(relativePath, uri);
    if (layer == 'domain' &&
        target.startsWith('package:') &&
        !_allowedDomainPackages.contains(_packageName(target))) {
      addNode(
        ArchitectureCodes.domainFrameworkImport,
        node,
        'Domain files must import only the Dart SDK, app domain and core primitives, and approved pure Dart annotation or value packages.',
      );
    }
    if ((layer == 'data' || layer == 'domain') &&
        target.startsWith(_appPackage) &&
        _isPresentationLayer('lib/${target.substring(_appPackage.length)}')) {
      addNode(
        ArchitectureCodes.dataDomainPresentationImport,
        node,
        'Data and domain files must not import screens, actions or parts.',
      );
    }
    // Sibling seams apply between legacy features; the context rules own
    // cross-context imports through each context's public API file.
    if (place?.root == 'legacy' && layer == 'presentation') {
      final feature = RegExp(
        r'^package:catch_dating_app/([^/]+)/presentation/',
      ).firstMatch(target)?[1];
      if (feature != null &&
          feature != 'core' &&
          feature != place!.owner &&
          !(isScreenOrController &&
              RegExp(
                r'^package:catch_dating_app/[^/]+/presentation/.+_controller\.dart$',
              ).hasMatch(target))) {
        addNode(
          ArchitectureCodes.crossFeaturePresentationImport,
          node,
          'Feature presentation files must not import sibling feature presentation internals without a sanctioned seam: a sibling controller from a screen or controller, or an annotated barrel export.',
        );
      }
    }
    if (isPresentation &&
        !isControllerOrService &&
        !isActions &&
        target.startsWith('package:') &&
        _pluginPackages.contains(_packageName(target))) {
      addNode(
        ArchitectureCodes.presentationPluginImport,
        node,
        'Presentation widgets must route plugin and platform side effects through controllers or services.',
      );
    }
  }

  if (isFeatureRootBarrel(relativePath)) {
    for (final directive in unit.directives.whereType<ExportDirective>()) {
      final uri = directive.uri.stringValue;
      if (uri == null || !uri.contains('presentation/')) continue;
      if (hasMarker(
        RegExp(r'//\s*public-api:\s*\S'),
        lineOf(directive.uri.offset),
      )) {
        continue;
      }
      addNode(
        ArchitectureCodes.barrelPresentationExport,
        directive.uri,
        'Feature-root barrels may export presentation files only with a // public-api: annotation explaining the cross-feature seam.',
      );
    }
  }

  final riverpodPrefixes = <String>{
    for (final directive in unit.directives.whereType<ImportDirective>())
      if (RegExp(
            r'^package:(?:flutter_riverpod|hooks_riverpod|riverpod)/',
          ).hasMatch(directive.uri.stringValue ?? '') &&
          directive.prefix != null)
        directive.prefix!.name,
  };
  final isHandwrittenApp = !RegExp(
    r'^lib/(?:core|platform)/',
  ).hasMatch(relativePath);
  final keepAliveMarker = RegExp(r'//\s*keepalive:\s*\S');
  final streamTimeoutOverride = RegExp(
    r'//\s*architecture:allow\s+stream-timeout\s+--\s+reason:\s*\S',
  );
  Token? firstProviderCoupling;
  final stateFactories = <Token>[];
  final screenClasses = <Token>[];

  for (final token in _codeTokens(unit)) {
    final next = token.next!;
    final lexeme = token.lexeme;
    if (layer == 'domain' &&
        lexeme == 'DateTime' &&
        _isMemberAccess(next) &&
        next.next!.lexeme == 'now' &&
        next.next!.next!.lexeme == '(') {
      addToken(
        ArchitectureCodes.domainClockAccess,
        token,
        'Domain time predicates must accept an injected clock instead of calling DateTime.now() internally.',
      );
    }
    if (layer == 'data' &&
        _isMemberAccess(token) &&
        next.lexeme == 'timeout' &&
        next.next!.lexeme == '(' &&
        !hasMarker(streamTimeoutOverride, lineOf(token.offset))) {
      addToken(
        ArchitectureCodes.dataStreamTimeout,
        next,
        'Realtime Firestore streams must not be idle-timed-out; annotate non-Firestore protocol deadlines with // architecture:allow stream-timeout -- reason: <why>.',
      );
    }
    final isRefRead =
        lexeme == 'ref' &&
        next.lexeme == '.' &&
        const {'watch', 'read', 'listen'}.contains(next.next!.lexeme);
    final isProviderType = lexeme == 'Provider' && next.lexeme == '<';
    if ((isRefRead || isProviderType) && firstProviderCoupling == null) {
      firstProviderCoupling = token;
    }
    if (isPresentation &&
        !isActions &&
        !RegExp(
          r'_(?:controller|service|view_model|provider)\.dart$',
        ).hasMatch(fileName) &&
        lexeme.endsWith('ef') &&
        next.lexeme == '.' &&
        const {'watch', 'read', 'listen'}.contains(next.next!.lexeme) &&
        next.next!.next!.lexeme == '(' &&
        RegExp(
          r'^[a-z]\w*[Rr]epositoryProvider$',
        ).hasMatch(next.next!.next!.next!.lexeme)) {
      addToken(
        ArchitectureCodes.widgetRepositoryProviderRead,
        next.next!.next!.next!,
        'Presentation widgets must not read repository providers directly; go through a controller, service or view model.',
      );
    }
    if (lexeme == 'keepAlive' &&
        next.lexeme == ':' &&
        next.next!.lexeme == 'true') {
      final line = lineOf(token.offset);
      final documented = [line - 2, line - 3, line - 4].any(
        (index) =>
            index >= 0 &&
            index < lines.length &&
            keepAliveMarker.hasMatch(lines[index]),
      );
      if (!documented) {
        addToken(
          ArchitectureCodes.undocumentedKeepAlive,
          token,
          'keepAlive providers must document their lifecycle with // keepalive: within the three lines above the annotation or declaration.',
        );
      }
    }
    if (isHandwrittenApp &&
        token.type == TokenType.IDENTIFIER &&
        next.lexeme == '=') {
      final builder = _manualProviderBuilder(next.next!, riverpodPrefixes);
      if (builder != null) {
        addToken(
          ArchitectureCodes.manualProviderDeclaration,
          token,
          'Handwritten $builder providers outside the platform layer should use @riverpod codegen; give a reasoned // ignore: when one cannot.',
        );
      }
    }
    if (lexeme == 'class' &&
        next.lexeme.endsWith('Screen') &&
        next.next!.lexeme == 'extends' &&
        _routeScreenBases.contains(next.next!.next!.lexeme)) {
      screenClasses.add(next);
    }
    // A factory is named after its class, so this finds the display state
    // classes: `factory EventScreenState.from(...)`.
    if (lexeme == 'factory' &&
        RegExp(r'\w+State$').hasMatch(next.lexeme) &&
        next.next!.lexeme == '.' &&
        const {'from', 'resolve'}.contains(next.next!.next!.lexeme) &&
        next.next!.next!.next!.lexeme == '(') {
      stateFactories.add(next);
    }
  }

  if (isPresentation) {
    final refParameters = _WidgetRefParameters();
    unit.accept(refParameters);
    for (final parameter in refParameters.sites) {
      addNode(
        ArchitectureCodes.widgetRefParameter,
        parameter,
        'Presentation helpers and constructors must not receive WidgetRef; lift provider reads to the route or controller boundary.',
      );
    }

    final riverpodImport = unit.directives
        .whereType<ImportDirective>()
        .where(
          (directive) => RegExp(
            r'^package:(?:flutter_riverpod|hooks_riverpod|riverpod_annotation)/',
          ).hasMatch(directive.uri.stringValue ?? ''),
        )
        .firstOrNull;
    void addCoupling(String code, String reason) {
      if (riverpodImport != null) {
        addNode(code, riverpodImport.uri, reason);
      } else if (firstProviderCoupling case final token?) {
        addToken(code, token, reason);
      }
    }

    if (isStateFile) {
      addCoupling(
        ArchitectureCodes.stateFileProviderCoupling,
        'Presentation *_state.dart files are provider-free display adapters.',
      );
    }
    if (layer == 'parts') {
      addCoupling(
        ArchitectureCodes.partsProviderCoupling,
        'Context parts/ widgets bind values to catch_ui components and must not import Riverpod or read providers.',
      );
    }
    if (!isStateFile) {
      for (final name in stateFactories) {
        addToken(
          ArchitectureCodes.misplacedStateClass,
          name,
          'Provider-free display state classes with from/resolve factories should live in *_state.dart files.',
        );
      }
    }
    if (screenClasses.length >= 2) {
      addToken(
        ArchitectureCodes.multiRouteScreenFile,
        screenClasses.first,
        'Keep route-level screens findable; a file declaring several route screens should be split.',
      );
    }
  }

  return findings;
}

// `Provider`, `rp.FutureProvider.autoDispose.family` and so on, when followed
// by type arguments or a call.
String? _manualProviderBuilder(Token start, Set<String> riverpodPrefixes) {
  var token = start;
  if (token.next!.lexeme == '.' &&
      !_providerBuilders.contains(token.lexeme) &&
      token.type == TokenType.IDENTIFIER) {
    if (!riverpodPrefixes.contains(token.lexeme)) return null;
    token = token.next!.next!;
  }
  if (!_providerBuilders.contains(token.lexeme)) return null;
  final builder = token.lexeme;
  token = token.next!;
  while (token.lexeme == '.' &&
      const {'autoDispose', 'family'}.contains(token.next!.lexeme)) {
    token = token.next!.next!;
  }
  return const {'<', '('}.contains(token.lexeme) ? builder : null;
}

class _WidgetRefParameters extends RecursiveAstVisitor<void> {
  final sites = <SimpleFormalParameter>[];

  @override
  void visitSimpleFormalParameter(SimpleFormalParameter node) {
    super.visitSimpleFormalParameter(node);
    if (node.type?.toSource() != 'WidgetRef' || node.name == null) return;
    final owner = node.thisOrAncestorOfType<FormalParameterList>()?.parent;
    if (owner is MethodDeclaration && owner.name.lexeme == 'build') return;
    sites.add(node);
  }
}
