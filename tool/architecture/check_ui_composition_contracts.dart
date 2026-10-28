import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/source/line_info.dart';
import 'package:crypto/crypto.dart';

const screenRegistryConformanceCode = 'catch_screen_registry_conformance';
const screenTopBarConformanceCode = 'catch_screen_top_bar_conformance';
const screenLayoutFamilyCode = 'catch_screen_layout_family_conformance';
const screenRouteOwnerBindingCode = 'catch_screen_route_owner_binding';
const screenScaffoldOwnershipCode = 'catch_screen_scaffold_ownership';
const screenLayoutConstructorVocabularyCode =
    'catch_screen_layout_constructor_vocabulary';

const _registryPath = 'design/screens/catch.screens.json';
const _screenCoveragePath = 'design/screens/screen_coverage.json';
const _routeInventoryPath = 'tool/ui_capture/route_inventory.json';
const _topBarRegistryPath = 'tool/design/screen_top_bar_contracts.json';
const _canonicalScaffoldPath =
    'packages/catch_ui/lib/src/patterns/catch_scaffold.dart';
const _canonicalRootScaffoldPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_scaffold.dart';
const _canonicalRootScrollPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_scroll_view.dart';
const _canonicalRouteScaffoldPath =
    'packages/catch_ui/lib/src/patterns/catch_route_scaffold.dart';
const _canonicalRootScreenBodyPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_body.dart';
const _canonicalRootScreenPageSpecPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_page_spec.dart';
const _canonicalRootScreenPageScrollPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_page_scroll_view.dart';
const _canonicalRootScreenPageOwnerPath =
    'packages/catch_ui/lib/src/patterns/catch_root_screen_page_owner.dart';
const _canonicalNavigationViewportPath =
    'packages/catch_ui/lib/src/patterns/catch_navigation_viewport.dart';

const _rootScaffoldExpressions = <String>{
  'CatchRootScreenScaffold.standard',
  'CatchRootScreenScaffold.sections',
  'CatchRootScreenScaffold.fullBleed',
  'CatchRootScreenScaffold.withPrimaryRail',
};

const _rootScrollExpressions = <String>{
  'CatchRootScreenScrollView.standard',
  'CatchRootScreenScrollView.sections',
  'CatchRootScreenScrollView.fullBleed',
  'CatchRootScreenScrollView.withPrimaryRail',
};

const _screenScaffoldExpressions = <String>{
  'CatchScaffold.standalone',
  'CatchScaffold.stepFlow',
  'CatchScaffold.workspace',
};

const catchRootScreenPageScrollExpressions = <String>{
  'CatchRootScreenPageScrollView.standard',
  'CatchRootScreenPageScrollView.sections',
  'CatchRootScreenPageScrollView.fullBleed',
  'CatchRootScreenPageScrollView.embeddedViewport',
};

const catchRootScreenBodyExpressions = <String>{
  'CatchRootScreenBody.single',
  'CatchRootScreenBody.paged',
};

const catchRootScreenPageSpecExpressions = <String>{
  'CatchRootScreenPageSpec.scroll',
  'CatchRootScreenPageSpec.surface',
};

/// Closed vocabulary shared with the screen-contract schema.
///
/// [test/tool/ui_composition_contracts_test.dart] rejects drift between this
/// executable analyzer vocabulary and the JSON schema accepted by CI.
const catchScreenLayoutOwnerExpressions = <String>{
  'CatchNavigationViewport',
  ..._rootScaffoldExpressions,
  ..._rootScrollExpressions,
  'CatchRouteScaffold',
  ..._screenScaffoldExpressions,
};

const _canonicalLayoutConstructorsByPath = <String, Map<String, Set<String>>>{
  _canonicalScaffoldPath: <String, Set<String>>{
    'CatchScaffold': _screenScaffoldExpressions,
  },
  _canonicalRootScaffoldPath: <String, Set<String>>{
    'CatchRootScreenScaffold': _rootScaffoldExpressions,
  },
  _canonicalNavigationViewportPath: <String, Set<String>>{
    'CatchNavigationViewport': <String>{'CatchNavigationViewport'},
  },
  _canonicalRootScrollPath: <String, Set<String>>{
    'CatchRootScreenScrollView': _rootScrollExpressions,
  },
  _canonicalRootScreenPageScrollPath: <String, Set<String>>{
    'CatchRootScreenPageScrollView': catchRootScreenPageScrollExpressions,
  },
  _canonicalRootScreenBodyPath: <String, Set<String>>{
    'CatchRootScreenBody': catchRootScreenBodyExpressions,
  },
  _canonicalRootScreenPageSpecPath: <String, Set<String>>{
    'CatchRootScreenPageSpec': catchRootScreenPageSpecExpressions,
  },
  _canonicalRouteScaffoldPath: <String, Set<String>>{
    'CatchRouteScaffold': <String>{'CatchRouteScaffold'},
  },
};

const _rootPageScrollRoles = <String, String>{
  'CatchRootScreenPageScrollView.standard': 'CatchPageBodyMode.standard',
  'CatchRootScreenPageScrollView.sections': 'CatchPageBodyMode.fullBleed',
  'CatchRootScreenPageScrollView.fullBleed': 'CatchPageBodyMode.fullBleed',
  'CatchRootScreenPageScrollView.embeddedViewport':
      'CatchPageBodyMode.fullBleed',
};

const _rootScreenRoles = <String, String>{
  'CatchRootScreenScaffold.standard': 'CatchPageBodyMode.standard',
  'CatchRootScreenScaffold.sections': 'CatchPageBodyMode.fullBleed',
  'CatchRootScreenScaffold.fullBleed': 'CatchPageBodyMode.fullBleed',
  'CatchRootScreenScrollView.standard': 'CatchPageBodyMode.standard',
  'CatchRootScreenScrollView.sections': 'CatchPageBodyMode.fullBleed',
  'CatchRootScreenScrollView.fullBleed': 'CatchPageBodyMode.fullBleed',
};

const _familyExpressions = <String, Set<String>>{
  'root': <String>{
    ..._rootScaffoldExpressions,
    ..._rootScrollExpressions,
    'CatchNavigationViewport',
  },
  'pushed-route': <String>{'CatchRouteScaffold'},
  'media-hero': <String>{'CatchScaffold.workspace'},
  'immersive': <String>{'CatchScaffold.workspace'},
  'adaptive-workspace': <String>{
    'CatchScaffold.workspace',
    ..._rootScrollExpressions,
  },
  'standalone': <String>{'CatchScaffold.standalone'},
  'step-flow': <String>{'CatchScaffold.stepFlow'},
};

Future<void> main(List<String> arguments) async {
  final check = arguments.contains('--check');
  final jsonIndex = arguments.indexOf('--json');
  final jsonPath = jsonIndex >= 0 && jsonIndex + 1 < arguments.length
      ? arguments[jsonIndex + 1]
      : null;
  final known = <String>{'--check', '--json'};
  for (var index = 0; index < arguments.length; index += 1) {
    final argument = arguments[index];
    if (argument == '--json') {
      index += 1;
      continue;
    }
    if (!known.contains(argument)) {
      stderr.writeln(
        'Usage: dart run tool/architecture/check_ui_composition_contracts.dart [--check] [--json PATH]',
      );
      exitCode = 64;
      return;
    }
  }

  final root = Directory.current.absolute.path;
  final registry = _readJson(_fromRoot(root, _registryPath));
  final screenCoverage = _readJson(_fromRoot(root, _screenCoveragePath));
  final routeInventory = _readJson(_fromRoot(root, _routeInventoryPath));
  final topBarRegistry = _readJson(_fromRoot(root, _topBarRegistryPath));
  final screens = (registry['screens'] as List<Object?>)
      .cast<Map<String, Object?>>();
  final layoutContracts =
      ((registry['layoutContracts'] as Map?) ?? const <Object?, Object?>{})
          .cast<String, Object?>();
  final layoutOnlyRoutes =
      ((registry['layoutOnlyRoutes'] as Map?) ?? const <Object?, Object?>{})
          .cast<String, Object?>();
  final imperativePageContracts =
      ((registry['imperativePageContracts'] as Map?) ??
              const <Object?, Object?>{})
          .cast<String, Object?>();
  final collection = _analysisContextCollection(root);
  final productionAnalysis = _ProductionAnalysis(
    root: root,
    collection: collection,
  );
  final semanticRootPageOwnerRoles = await _productionRootPageOwnerRoles(
    productionAnalysis,
  );
  final hardFailures = <String>[];
  hardFailures.addAll(canonicalLayoutConstructorVocabularyFailures(root: root));

  _validateLayoutRegistryCoverage(
    screens,
    layoutContracts,
    layoutOnlyRoutes,
    screenCoverage,
    routeInventory,
    hardFailures,
  );
  final routeBindingStats = await _validateRouteOwnerBindings(
    root: root,
    collection: collection,
    productionAnalysis: productionAnalysis,
    layoutContracts: layoutContracts,
    layoutOnlyRoutes: layoutOnlyRoutes,
    routeInventory: routeInventory,
    hardFailures: hardFailures,
  );
  final imperativeBindingStats = await _validateImperativePageOwnerBindings(
    root: root,
    collection: collection,
    productionAnalysis: productionAnalysis,
    imperativePageContracts: imperativePageContracts,
    routeInventory: routeInventory,
    hardFailures: hardFailures,
  );

  for (final screen in screens) {
    final source = (screen['source'] as Map<String, Object?>?) ?? const {};
    final relativePath = source['file'] as String? ?? '';
    final absolutePath = _fromRoot(root, relativePath);
    final result = await _resolvedUnit(collection, absolutePath);
    if (result == null) {
      hardFailures.add(
        '$screenRegistryConformanceCode ${screen['id']}: analyzer could not resolve $relativePath',
      );
      continue;
    }
    hardFailures.addAll(evaluateSourceContract(screen, result.content));
  }

  for (final entry in layoutContracts.entries) {
    final contract = (entry.value as Map).cast<String, Object?>();
    final owners = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>();
    for (final owner in owners) {
      await _validateLayoutOwner(
        root: root,
        collection: collection,
        screenId: entry.key,
        owner: owner,
        terminalOwnerDelegates: _sameFamilyOwnerDelegates(owners, owner),
        terminalOwnerBindings: _sameFamilyOwnerBindings(owners, owner),
        semanticRootPageOwnerRoles: semanticRootPageOwnerRoles,
        hardFailures: hardFailures,
      );
    }
  }
  for (final entry in layoutOnlyRoutes.entries) {
    final contract = (entry.value as Map).cast<String, Object?>();
    final owners = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>();
    for (final owner in owners) {
      await _validateLayoutOwner(
        root: root,
        collection: collection,
        screenId: 'route.${entry.key}',
        owner: owner,
        terminalOwnerDelegates: _sameFamilyOwnerDelegates(owners, owner),
        terminalOwnerBindings: _sameFamilyOwnerBindings(owners, owner),
        semanticRootPageOwnerRoles: semanticRootPageOwnerRoles,
        hardFailures: hardFailures,
      );
    }
  }
  for (final entry in imperativePageContracts.entries) {
    final contract = (entry.value as Map).cast<String, Object?>();
    final owners = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>();
    for (final owner in owners) {
      await _validateLayoutOwner(
        root: root,
        collection: collection,
        screenId: 'imperative.${entry.key}',
        owner: owner,
        terminalOwnerDelegates: _sameFamilyOwnerDelegates(owners, owner),
        terminalOwnerBindings: _sameFamilyOwnerBindings(owners, owner),
        semanticRootPageOwnerRoles: semanticRootPageOwnerRoles,
        hardFailures: hardFailures,
      );
    }
  }

  await _validateProductionScaffoldOwnership(productionAnalysis, hardFailures);
  await _validateProductionRootPageOwners(productionAnalysis, hardFailures);
  _validateMediaHeroes(root, screens, topBarRegistry, hardFailures);

  final report = <String, Object?>{
    'version': 4,
    'complete': hardFailures.isEmpty,
    'screenCount': screens.length,
    'layoutContractCount': layoutContracts.length,
    'layoutOnlyRouteCount': layoutOnlyRoutes.length,
    'renderedRouteBindingCount': routeBindingStats.renderedRoutes,
    'reachableOwnerDeclarationBindingCount': routeBindingStats.ownerBindings,
    'imperativePageRouteSiteCount': imperativeBindingStats.sites,
    'imperativePageTargetCount': imperativeBindingStats.targets,
    'reachableImperativeOwnerDeclarationBindingCount':
        imperativeBindingStats.ownerBindings,
    'hardFailures': hardFailures,
  };
  final encoded = const JsonEncoder.withIndent('  ').convert(report);
  if (jsonPath != null) File(jsonPath).writeAsStringSync('$encoded\n');

  if (hardFailures.isNotEmpty) {
    stderr.writeln('Catch UI composition contract check failed:');
    for (final failure in hardFailures) {
      stderr.writeln('- $failure');
    }
    exitCode = 1;
    return;
  }

  stdout.writeln(
    'Catch UI composition contracts passed '
    '(${screens.length} screens, ${layoutContracts.length} typed screen layout contracts, '
    '${layoutOnlyRoutes.length} layout-only routes, ${routeBindingStats.renderedRoutes} rendered route bindings, '
    '${routeBindingStats.ownerBindings} reachable route-to-declaration bindings, '
    '${imperativeBindingStats.sites} imperative page sites across ${imperativeBindingStats.targets} targets, '
    '${imperativeBindingStats.ownerBindings} reachable imperative target-to-declaration bindings, '
    'zero unauthorized Material Scaffold constructions or subclasses).',
  );
  if (!check) {
    stdout.writeln('Run with --check to use this as a blocking gate.');
  }
}

List<String> canonicalLayoutConstructorVocabularyFailures({
  required String root,
}) {
  final failures = <String>[];
  for (final pathEntry in _canonicalLayoutConstructorsByPath.entries) {
    final relativePath = pathEntry.key;
    final absolutePath = _fromRoot(root, relativePath);
    final file = File(absolutePath);
    if (!file.existsSync()) {
      failures.add(
        '$screenLayoutConstructorVocabularyCode: missing canonical source $relativePath',
      );
      continue;
    }
    final unit = parseString(
      content: file.readAsStringSync(),
      path: absolutePath,
      throwIfDiagnostics: false,
    ).unit;
    final classes = <String, ClassDeclaration>{
      for (final declaration in unit.declarations.whereType<ClassDeclaration>())
        declaration.namePart.typeName.lexeme: declaration,
    };
    for (final classEntry in pathEntry.value.entries) {
      final className = classEntry.key;
      final declaration = classes[className];
      if (declaration == null) {
        failures.add(
          '$screenLayoutConstructorVocabularyCode: $className is not declared in $relativePath',
        );
        continue;
      }
      final actual = declaration.body.members
          .whereType<ConstructorDeclaration>()
          .map((constructor) => constructor.name?.lexeme)
          .where((name) => name == null || !name.startsWith('_'))
          .map((name) => name == null ? className : '$className.$name')
          .toSet();
      final expected = classEntry.value;
      final missing = expected.difference(actual).toList()..sort();
      final unexpected = actual.difference(expected).toList()..sort();
      if (missing.isEmpty && unexpected.isEmpty) continue;
      failures.add(
        '$screenLayoutConstructorVocabularyCode: $className public constructors in $relativePath drifted'
        '${missing.isEmpty ? '' : '; missing ${missing.join(', ')}'}'
        '${unexpected.isEmpty ? '' : '; unregistered ${unexpected.join(', ')}'}',
      );
    }
  }
  return failures;
}

List<String> evaluateSourceContract(
  Map<String, Object?> screen,
  String sourceText,
) {
  final hardFailures = <String>[];
  final id = screen['id'] as String? ?? '<missing-screen>';
  final source = (screen['source'] as Map<String, Object?>?) ?? const {};
  final symbol = source['symbol'] as String? ?? '';
  final relativePath = source['file'] as String? ?? '';
  if (symbol.isEmpty ||
      !RegExp(
        '\\b(?:class|mixin|enum|extension\\s+type)\\s+${RegExp.escape(symbol)}\\b',
      ).hasMatch(sourceText)) {
    hardFailures.add(
      '$screenRegistryConformanceCode $id: symbol $symbol is not declared by $relativePath',
    );
  }

  final statePolicy =
      (screen['statePolicy'] as Map<String, Object?>?) ?? const {};
  final declaredStates = ((screen['states'] as List<Object?>?) ?? const [])
      .cast<Map<String, Object?>>()
      .map((state) => state['kind'] == 'populated' ? 'data' : state['kind'])
      .whereType<String>()
      .toSet();
  for (final required
      in ((statePolicy['requiredStates'] as List<Object?>?) ?? const [])) {
    if (!declaredStates.contains(required)) {
      hardFailures.add(
        '$screenRegistryConformanceCode $id: statePolicy requires unregistered state $required',
      );
    }
  }

  final topBar = (screen['topBar'] as Map<String, Object?>?) ?? const {};
  final role = topBar['role'] as String? ?? '';
  final expression = topBar['expression'] as String? ?? '';
  if (<String>{
        'screen',
        'compact',
        'identity',
        'step-flow',
        'inline',
      }.contains(role) &&
      !sourceText.contains(expression)) {
    hardFailures.add(
      '$screenTopBarConformanceCode $id: $relativePath does not contain registered $expression',
    );
  }

  return hardFailures;
}

Set<String> _sameFamilyOwnerDelegates(
  List<Map<String, Object?>> owners,
  Map<String, Object?> owner,
) {
  final family = owner['family'];
  final symbol = owner['symbol'];
  final expression = owner['expression'];
  final delegates = <String>{};
  for (final candidate in owners) {
    if (candidate['family'] != family ||
        !_ownerRoutesOverlap(candidate, owner) ||
        (candidate['symbol'] == symbol &&
            candidate['expression'] == expression)) {
      continue;
    }
    final value = candidate['symbol'] == symbol
        ? candidate['expression']
        : candidate['symbol'];
    if (value is String) delegates.add(value);
  }
  return delegates;
}

Set<DeclarationBinding> _sameFamilyOwnerBindings(
  List<Map<String, Object?>> owners,
  Map<String, Object?> owner,
) {
  final family = owner['family'];
  final symbol = owner['symbol'];
  final expression = owner['expression'];
  final bindings = <DeclarationBinding>{};
  for (final candidate in owners) {
    if (candidate['family'] != family ||
        !_ownerRoutesOverlap(candidate, owner) ||
        (candidate['symbol'] == symbol &&
            candidate['expression'] == expression) ||
        candidate['symbol'] == symbol) {
      continue;
    }
    final file = candidate['file'];
    final candidateSymbol = candidate['symbol'];
    if (file is String && candidateSymbol is String) {
      bindings.add(DeclarationBinding(file: file, symbol: candidateSymbol));
    }
  }
  return bindings;
}

bool _ownerRoutesOverlap(
  Map<String, Object?> first,
  Map<String, Object?> second,
) {
  final firstRoutes = ((first['routes'] as List<Object?>?) ?? const [])
      .whereType<String>()
      .toSet();
  final secondRoutes = ((second['routes'] as List<Object?>?) ?? const [])
      .whereType<String>()
      .toSet();
  return firstRoutes.intersection(secondRoutes).isNotEmpty;
}

List<String> evaluateLayoutOwnerContract({
  required String screenId,
  required Map<String, Object?> owner,
  required String declarationSource,
  Set<String> terminalOwnerDelegates = const <String>{},
  Map<String, String> semanticRootPageOwnerRoles = const <String, String>{},
  bool resolvedTerminalOwnerProof = false,
}) {
  final failures = <String>[];
  final family = owner['family'] as String? ?? '';
  final expression = owner['expression'] as String? ?? '';
  final instantiations = terminalLayoutOwnerInstantiations(declarationSource);
  final matchingInstantiations = instantiations
      .where((instantiation) => instantiation.signature == expression)
      .toList();
  final allowedExpressions = _familyExpressions[family];
  if (allowedExpressions == null || !allowedExpressions.contains(expression)) {
    failures.add(
      '$screenLayoutFamilyCode $screenId: $family cannot be owned by $expression',
    );
  }
  if (matchingInstantiations.isEmpty) {
    failures.add(
      '$screenLayoutFamilyCode $screenId: ${owner['symbol']} build/return tree does not instantiate registered owner $expression',
    );
  }
  final acceptedTerminalOwners = <String>{
    expression,
    ...terminalOwnerDelegates,
  };
  if (matchingInstantiations.isNotEmpty &&
      !terminalLayoutOwnerOnEveryBranch(
        declarationSource,
        acceptedTerminalOwners,
      ) &&
      !resolvedTerminalOwnerProof) {
    failures.add(
      '$screenLayoutFamilyCode $screenId: every ${owner['symbol']} build/return terminal must resolve to the registered $family layout family',
    );
  }

  final bodyGeometry = owner['bodyGeometry'] as String? ?? '';
  failures.addAll(
    _evaluateBodyGeometryContract(
      screenId: screenId,
      family: family,
      expression: expression,
      bodyGeometry: bodyGeometry,
      declarationSource: declarationSource,
      instantiations: matchingInstantiations,
      reachableInstantiations: instantiations,
      semanticRootPageOwnerRoles: semanticRootPageOwnerRoles,
    ),
  );

  final topEdge = owner['topEdge'] as String? ?? '';
  if (topEdge == 'header-owned' &&
      matchingInstantiations.isNotEmpty &&
      !matchingInstantiations.every(
        (instantiation) =>
            instantiation.namedArguments['topEdge'] ==
            'CatchRootScreenScrollViewPlacement.headerOwned',
      )) {
    failures.add(
      '$screenLayoutFamilyCode $screenId: header-owned top edge must select CatchRootScreenScrollViewPlacement.headerOwned',
    );
  }
  return failures;
}

List<String> _evaluateBodyGeometryContract({
  required String screenId,
  required String family,
  required String expression,
  required String bodyGeometry,
  required String declarationSource,
  required List<LayoutOwnerInstantiation> instantiations,
  required List<LayoutOwnerInstantiation> reachableInstantiations,
  required Map<String, String> semanticRootPageOwnerRoles,
}) {
  if (instantiations.isEmpty) return const <String>[];
  final failures = <String>[];

  bool everyBody(bool Function(String body) predicate) => instantiations.every(
    (instantiation) => switch (instantiation.namedArguments['body']) {
      final String body => predicate(_normalizeDartExpression(body)),
      null => false,
    },
  );

  if (expression == 'CatchRouteScaffold') {
    bool everyRouteBody(bool Function(String body) predicate) => everyBody(
      (body) => terminalExpressionUsesInDeclaration(
        declarationSource: declarationSource,
        expressionSource: body,
        acceptedSignatures: _typedRouteBodyExpressions,
        allowTransparentWrappers: false,
        terminalPredicate: (terminal) =>
            predicate(_normalizeDartExpression(terminal)),
      ),
    );

    final valid = switch (bodyGeometry) {
      'standard' => everyRouteBody(_isStandardRouteBody),
      'full-bleed' => everyRouteBody(
        (body) => _hasConstructor(body, 'CatchRouteBody.fullBleed'),
      ),
      'mixed' => everyRouteBody(_isTypedRouteBody),
      _ => true,
    };
    if (!valid) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: $bodyGeometry pushed-route bodies must use the corresponding CatchRouteBody typed constructor on every build/return terminal',
      );
    }
    final competingGeometry = terminalStandardBodyGeometryConflicts(
      declarationSource,
    );
    if (competingGeometry.isNotEmpty) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: standard body content must not nest competing page geometry (${competingGeometry.join(', ')}); CatchRouteBody owns the 20-point horizontal gutter and 24-point top rhythm',
      );
    }
    return failures;
  }

  if (expression == 'CatchRootScreenScaffold.withPrimaryRail' ||
      expression == 'CatchRootScreenScrollView.withPrimaryRail') {
    final typed = instantiations.every((instantiation) {
      final body = instantiation.namedArguments['body'];
      return body != null &&
          terminalExpressionUsesInDeclaration(
            declarationSource: declarationSource,
            expressionSource: body,
            acceptedSignatures: catchRootScreenBodyExpressions,
          );
    });
    if (!typed) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: root primary-rail bodies must use CatchRootScreenBody.single or CatchRootScreenBody.paged on every build/return terminal',
      );
      return failures;
    }
    final pageSpecs = reachableInstantiations
        .where(
          (instantiation) => catchRootScreenPageSpecExpressions.contains(
            instantiation.signature,
          ),
        )
        .toList();
    String? resolvePageOwnerRole(LayoutOwnerInstantiation spec) {
      final pageArgument = spec.namedArguments['page'];
      if (pageArgument == null) return null;
      final ownerSignature = _rootConstructorSignature(pageArgument);
      if (!_rootPageScrollRoles.containsKey(ownerSignature)) {
        return semanticRootPageOwnerRoles[ownerSignature];
      }
      final inlineOwners =
          layoutOwnerInstantiations('Object _page() => $pageArgument;').where(
            (instantiation) =>
                _rootPageScrollRoles.containsKey(instantiation.signature),
          );
      final inlineRoles = inlineOwners
          .map((owner) => _rootPageScrollRoles[owner.signature])
          .whereType<String>()
          .toSet();
      return inlineRoles.length == 1 ? inlineRoles.single : null;
    }

    final roles = pageSpecs.map(resolvePageOwnerRole).toList();
    if (pageSpecs.isEmpty || roles.any((role) => role == null)) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: every typed root page must resolve directly to one semantic CatchRootScreenPageScrollView geometry constructor or a known semantic CatchRootScreenPageOwner',
      );
      return failures;
    }
    final competingGeometry = terminalStandardBodyGeometryConflicts(
      declarationSource,
    );
    if (competingGeometry.isNotEmpty) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: standard root page content must not nest competing page geometry (${competingGeometry.join(', ')}); CatchRootScreenPageScrollView owns the 20-point horizontal gutter and 24-point top rhythm',
      );
    }
    final hasStandard = roles.contains('CatchPageBodyMode.standard');
    final hasFullBleed = roles.contains('CatchPageBodyMode.fullBleed');
    final onlyStandard = roles.every(
      (role) => role == 'CatchPageBodyMode.standard',
    );
    final onlyFullBleed = roles.every(
      (role) => role == 'CatchPageBodyMode.fullBleed',
    );
    if (bodyGeometry == 'standard' && !onlyStandard) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: standard root primary-rail bodies must select only CatchPageBodyMode.standard pages at the typed body terminal',
      );
    } else if (bodyGeometry == 'full-bleed' && !onlyFullBleed) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: full-bleed root primary-rail bodies must select only CatchPageBodyMode.fullBleed pages at the typed body terminal',
      );
    } else if (bodyGeometry == 'mixed' && (!hasStandard || !hasFullBleed)) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: mixed root primary-rail bodies must expose both standard and full-bleed page roles at the typed body terminal',
      );
    }
    return failures;
  }

  if (_rootScreenRoles.containsKey(expression)) {
    final requiredRole = switch (bodyGeometry) {
      'standard' => 'CatchPageBodyMode.standard',
      'full-bleed' => 'CatchPageBodyMode.fullBleed',
      _ => null,
    };
    if (requiredRole != null && _rootScreenRoles[expression] != requiredRole) {
      failures.add(
        '$screenLayoutFamilyCode $screenId: $bodyGeometry $family bodies must select the matching closed root-screen constructor',
      );
    }
    if (bodyGeometry == 'standard') {
      final competingGeometry = terminalStandardBodyGeometryConflicts(
        declarationSource,
      );
      if (competingGeometry.isNotEmpty) {
        failures.add(
          '$screenLayoutFamilyCode $screenId: standard root content must not nest competing page geometry (${competingGeometry.join(', ')}); CatchRootScreenScrollView owns the 20-point horizontal gutter and 24-point top rhythm',
        );
      }
    }
    return failures;
  }

  if (expression == 'CatchScaffold.standalone' &&
      bodyGeometry == 'standard' &&
      !everyBody((body) => _hasConstructor(body, 'CatchPageBody.screen'))) {
    failures.add(
      '$screenLayoutFamilyCode $screenId: standard standalone bodies must delegate canonical page geometry to CatchPageBody.screen on every build/return terminal',
    );
  }
  return failures;
}

const _typedRouteBodyExpressions = <String>{
  'CatchRouteBody.standard',
  'CatchRouteBody.standardViewport',
  'CatchRouteBody.standardConstrained',
  'CatchRouteBody.standardSlivers',
  'CatchRouteBody.standardConstrainedSlivers',
  'CatchRouteBody.standardSections',
  'CatchRouteBody.paged',
  'CatchRouteBody.fullBleed',
};

bool _isTypedRouteBody(String body) => _typedRouteBodyExpressions.any(
  (constructor) => _hasConstructor(body, constructor),
);

bool _isStandardRouteBody(String body) {
  if (_hasConstructor(body, 'CatchRouteBody.standard') ||
      _hasConstructor(body, 'CatchRouteBody.standardViewport') ||
      _hasConstructor(body, 'CatchRouteBody.standardConstrained') ||
      _hasConstructor(body, 'CatchRouteBody.standardSlivers') ||
      _hasConstructor(body, 'CatchRouteBody.standardConstrainedSlivers') ||
      _hasConstructor(body, 'CatchRouteBody.standardSections')) {
    return !body.contains('CatchRouteBody.fullBleed');
  }
  if (!_hasConstructor(body, 'CatchRouteBody.paged') ||
      body.contains('CatchRouteBody.fullBleed')) {
    return false;
  }
  return body.contains('CatchRouteBody.standard(') ||
      body.contains('CatchRouteBody.standardViewport(') ||
      body.contains('CatchRouteBody.standardConstrained(') ||
      body.contains('CatchRouteBody.standardSlivers(') ||
      body.contains('CatchRouteBody.standardConstrainedSlivers(') ||
      body.contains('CatchRouteBody.standardSections(');
}

const _competingPageGeometryOwners = <String>{
  'CatchPageBody',
  'CatchPageBody.screen',
  'CatchPageBody.formStep',
  'CatchPageBody.sliver',
  'CatchPageBody.slivers',
  'CatchFormReviewPageBody',
  'CatchSectionList.page',
};

const _defaultPageGeometryOwnerPadding = <String, String>{
  'CatchSectionList.inset': 'padding',
};

const _competingPageInsetNames = <String>{
  'pageBody',
  'pageBodyRelaxed',
  'pageBodyTight',
  'pageBodyRelaxedTight',
  'pageBodyUnderHeader',
  'pageBodyHero',
  'pageHorizontal',
  'pageHorizontalWide',
  'eventTypeBrowseIndex',
  'eventTypeBrowseSkeleton',
  'hostAuthStage',
  'pageHeaderBody',
  'pageHeaderCompact',
  'formStepBody',
  'formStepBodyRelaxed',
  'formStepBodyWithBottomActions',
  'formStepBodyRelaxedWithBottomActions',
  'formBuilderNotices',
  'formEditBodyRelaxed',
  'hostCreateEventLoadingBody',
  'launchAccessBodyTop',
};

/// Finds competing page-level geometry reachable from an actual standard
/// route/tab terminal. Local values and helpers are followed in the same
/// declaration, while dead helpers remain outside the traversal. Component
/// insets such as `CatchInsets.content` are deliberately not page owners.
List<String> terminalStandardBodyGeometryConflicts(
  String declarationSource, {
  String? semanticRootPageOwnerRole,
}) {
  final unit = parseString(
    content: declarationSource,
    throwIfDiagnostics: false,
  ).unit;
  if (unit.declarations.isEmpty) return const <String>[];
  final graph = _LayoutOwnerTerminalGraph(unit.declarations.first);
  final traversal = _StandardBodyGeometryTraversal(
    graph,
    semanticRootPageOwnerRole: semanticRootPageOwnerRole,
  );
  for (final root in graph.reachableRoots()) {
    traversal.walk(root, withinStandardContent: false);
  }
  return traversal.conflicts.toList()..sort();
}

bool _hasConstructor(String expression, String constructor) =>
    expression.startsWith('$constructor(') ||
    expression.startsWith('const $constructor(');

String? _rootConstructorSignature(String expressionSource) {
  final unit = parseString(
    content: 'Object _page() => $expressionSource;',
    throwIfDiagnostics: false,
  ).unit;
  final declaration = unit.declarations.firstOrNull;
  if (declaration is! FunctionDeclaration) return null;
  final body = declaration.functionExpression.body;
  if (body is! ExpressionFunctionBody) return null;
  Expression expression = body.expression;
  while (expression is ParenthesizedExpression) {
    expression = expression.expression;
  }
  if (expression is InstanceCreationExpression) {
    final typeName = expression.constructorName.type.toSource();
    final constructorName = expression.constructorName.name?.name;
    return constructorName == null ? typeName : '$typeName.$constructorName';
  }
  if (expression is MethodInvocation) {
    final target = expression.target?.toSource();
    return target == null
        ? expression.methodName.name
        : '$target.${expression.methodName.name}';
  }
  return null;
}

List<LayoutOwnerInstantiation> layoutOwnerInstantiations(String sourceText) {
  final unit = parseString(content: sourceText, throwIfDiagnostics: false).unit;
  final visitor = _LayoutOwnerInstantiationVisitor(
    includeAllFunctionBodies: true,
  );
  unit.accept(visitor);
  return visitor.instantiations;
}

/// Returns layout constructions reachable from a declaration's actual
/// `build`/function return tree.
///
/// Unlike [layoutOwnerInstantiations], this deliberately ignores unreferenced
/// members and local values. It follows same-declaration helpers and values
/// that the returned expression references, so a dead helper cannot satisfy a
/// registered screen contract.
List<LayoutOwnerInstantiation> terminalLayoutOwnerInstantiations(
  String declarationSource,
) {
  final unit = parseString(
    content: declarationSource,
    throwIfDiagnostics: false,
  ).unit;
  if (unit.declarations.isEmpty) return const <LayoutOwnerInstantiation>[];
  final graph = _LayoutOwnerTerminalGraph(unit.declarations.first);
  final instantiations = <LayoutOwnerInstantiation>[];
  for (final root in graph.reachableRoots()) {
    final visitor = _LayoutOwnerInstantiationVisitor();
    root.accept(visitor);
    instantiations.addAll(visitor.instantiations);
  }
  return instantiations;
}

/// Proves that every statically reachable widget-producing branch terminates
/// in one of [acceptedSignatures]. Behavior-only callbacks (for example,
/// `onTap`) are deliberately excluded, while widget-builder callbacks and
/// transparent `child`/`body` wrappers are followed.
bool terminalLayoutOwnerOnEveryBranch(
  String declarationSource,
  Set<String> acceptedSignatures,
) {
  final unit = parseString(
    content: declarationSource,
    throwIfDiagnostics: false,
  ).unit;
  if (unit.declarations.isEmpty || acceptedSignatures.isEmpty) return false;
  return _LayoutOwnerTerminalGraph(
    unit.declarations.first,
  ).everyTerminalUses(acceptedSignatures);
}

/// Proves a rendered expression through local values, switches, and helpers
/// declared by the same owner. Unresolved parameters or qualified helpers fail
/// closed rather than inheriting a typed role from a dead sibling declaration.
/// [terminalPredicate], when provided, must also accept each matched constructor
/// independently; finding an accepted signature alone is not sufficient.
/// Disable [allowTransparentWrappers] when the value itself must be typed, as
/// with route bodies, rather than a widget containing the accepted owner.
bool terminalExpressionUsesInDeclaration({
  required String declarationSource,
  required String expressionSource,
  required Set<String> acceptedSignatures,
  bool Function(String expressionSource)? terminalPredicate,
  bool allowTransparentWrappers = true,
}) {
  final declarationUnit = parseString(
    content: declarationSource,
    throwIfDiagnostics: false,
  ).unit;
  if (declarationUnit.declarations.isEmpty) return false;
  final expressionUnit = parseString(
    content: 'Object _terminal() => $expressionSource;',
    throwIfDiagnostics: false,
  ).unit;
  final expressionDeclaration = expressionUnit.declarations.firstOrNull;
  if (expressionDeclaration is! FunctionDeclaration) return false;
  final body = expressionDeclaration.functionExpression.body;
  if (body is! ExpressionFunctionBody) return false;
  return _LayoutOwnerTerminalGraph(
    declarationUnit.declarations.first,
    terminalPredicate: terminalPredicate,
    allowTransparentWrappers: allowTransparentWrappers,
  ).expressionEveryTerminalUses(body.expression, acceptedSignatures);
}

List<String> evaluateRootPageOwnerContract({
  required String symbol,
  required String declarationSource,
}) {
  final unit = parseString(
    content: declarationSource,
    throwIfDiagnostics: false,
  ).unit;
  final firstDeclaration = unit.declarations.firstOrNull;
  if (firstDeclaration is! ClassDeclaration) {
    return <String>[
      '$screenLayoutFamilyCode $symbol: semantic root page owner is not a class declaration',
    ];
  }
  final pageScrollOwners = terminalLayoutOwnerInstantiations(declarationSource)
      .where(
        (instantiation) =>
            _rootPageScrollRoles.containsKey(instantiation.signature),
      )
      .toList();
  final everyTerminalOwnsPageScroll = terminalLayoutOwnerOnEveryBranch(
    declarationSource,
    _rootPageScrollRoles.keys.toSet(),
  );
  final roles = pageScrollOwners
      .map((owner) => _rootPageScrollRoles[owner.signature])
      .whereType<String>()
      .toSet();
  final resolvedRole = roles.length == 1 ? roles.single : null;
  final failures = <String>[];
  if (pageScrollOwners.isEmpty || !everyTerminalOwnsPageScroll) {
    failures.add(
      '$screenLayoutFamilyCode $symbol: every semantic root page owner build/return terminal must terminate in CatchRootScreenPageScrollView',
    );
  } else if (resolvedRole == null) {
    failures.add(
      '$screenLayoutFamilyCode $symbol: every semantic root page owner terminal must select one consistent CatchRootScreenPageScrollView geometry constructor',
    );
  }
  if (resolvedRole == 'CatchPageBodyMode.standard') {
    final competingGeometry = terminalStandardBodyGeometryConflicts(
      declarationSource,
      semanticRootPageOwnerRole: resolvedRole,
    );
    if (competingGeometry.isNotEmpty) {
      failures.add(
        '$screenLayoutFamilyCode $symbol: standard semantic root page content must not nest competing page geometry (${competingGeometry.join(', ')}); CatchRootScreenPageScrollView owns the page gutter and top rhythm',
      );
    }
  }
  return failures;
}

const _transparentWidgetArgumentNames = <String>{
  'child',
  'body',
  'page',
  'master',
  'detail',
  'sliver',
};

const _widgetBuilderArgumentNames = <String>{
  'builder',
  'data',
  'dataBuilder',
  'emptyBuilder',
  'error',
  'errorBuilder',
  'loading',
  'loadingBuilder',
  'orElse',
};

const _widgetBuilderOwnerSignatures = <String>{
  'AnimatedBuilder',
  'Builder',
  'CatchAsyncBoundary',
  'CatchViewport.box',
  'FutureBuilder',
  'LayoutBuilder',
  'ListenableBuilder',
  'StatefulBuilder',
  'StreamBuilder',
  'ValueListenableBuilder',
};

bool _isWidgetBuilderArgumentName(String name) =>
    _widgetBuilderArgumentNames.contains(name);

bool _isWidgetBuilderArgument(NamedExpression node) {
  if (!_isWidgetBuilderArgumentName(node.name.label.name)) return false;
  final invocation = node.parent?.parent;
  final signature = switch (invocation) {
    final InstanceCreationExpression creation => _instanceCreationSignature(
      creation,
    ),
    final MethodInvocation method => _methodInvocationSignature(method),
    _ => null,
  };
  return signature != null && _widgetBuilderOwnerSignatures.contains(signature);
}

String _instanceCreationSignature(InstanceCreationExpression node) {
  final typeName = node.constructorName.type.toSource();
  final constructorName = node.constructorName.name?.name;
  return constructorName == null ? typeName : '$typeName.$constructorName';
}

String _resolvedInstanceCreationSignature(InstanceCreationExpression node) {
  final constructor = node.constructorName.element?.baseElement;
  if (constructor is! ConstructorElement) {
    return _instanceCreationSignature(node);
  }
  final typeName = constructor.enclosingElement.displayName;
  final constructorName = node.constructorName.name?.name;
  return constructorName == null ? typeName : '$typeName.$constructorName';
}

String _methodInvocationSignature(MethodInvocation node) {
  final target = node.target?.toSource();
  return target == null
      ? node.methodName.name
      : '$target.${node.methodName.name}';
}

final class _LayoutOwnerTerminalGraph {
  _LayoutOwnerTerminalGraph(
    this.declaration, {
    this.terminalPredicate,
    this.allowTransparentWrappers = true,
  }) {
    if (declaration case final ClassDeclaration classDeclaration) {
      for (final member in classDeclaration.body.members) {
        if (member case final MethodDeclaration method) {
          _executables[method.name.lexeme] = method.body;
        } else if (member case final FieldDeclaration field) {
          for (final variable in field.fields.variables) {
            if (variable.initializer case final initializer?) {
              (_values[variable.name.lexeme] ??= <AstNode>[]).add(initializer);
            }
          }
        }
      }
    }
  }

  final CompilationUnitMember declaration;
  final bool Function(String expressionSource)? terminalPredicate;
  final bool allowTransparentWrappers;
  final Map<String, FunctionBody> _executables = <String, FunctionBody>{};
  final Map<String, List<AstNode>> _values = <String, List<AstNode>>{};
  final Set<FunctionBody> _indexedBodies = <FunctionBody>{};

  List<FunctionBody> _entryBodies() {
    if (declaration is ClassDeclaration) {
      return switch (_executables['build']) {
        final FunctionBody build => <FunctionBody>[build],
        null => const <FunctionBody>[],
      };
    }
    if (declaration case final FunctionDeclaration function) {
      return <FunctionBody>[function.functionExpression.body];
    }
    return const <FunctionBody>[];
  }

  void _indexBody(FunctionBody body) {
    if (!_indexedBodies.add(body)) return;
    final definitions = _LayoutValueDefinitionVisitor();
    body.accept(definitions);
    for (final entry in definitions.values.entries) {
      (_values[entry.key] ??= <AstNode>[]).addAll(entry.value);
    }
    _executables.addAll(definitions.executables);
  }

  bool everyTerminalUses(Set<String> acceptedSignatures) {
    final roots = <AstNode>[];
    for (final body in _entryBodies()) {
      _indexBody(body);
      roots.addAll(_returnRoots(body));
    }
    if (roots.isEmpty) return false;
    return roots.every(
      (root) => _terminalUses(root, acceptedSignatures, visiting: <AstNode>{}),
    );
  }

  bool expressionEveryTerminalUses(
    AstNode root,
    Set<String> acceptedSignatures,
  ) {
    for (final body in _entryBodies()) {
      _indexBody(body);
    }
    return _terminalUses(root, acceptedSignatures, visiting: <AstNode>{});
  }

  bool _terminalUses(
    AstNode node,
    Set<String> acceptedSignatures, {
    required Set<AstNode> visiting,
  }) {
    if (!visiting.add(node)) return false;
    try {
      if (node case final ParenthesizedExpression expression) {
        return _terminalUses(
          expression.expression,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final AwaitExpression expression) {
        return _terminalUses(
          expression.expression,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final AsExpression expression) {
        return _terminalUses(
          expression.expression,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final ConditionalExpression expression) {
        return _terminalUses(
              expression.thenExpression,
              acceptedSignatures,
              visiting: visiting,
            ) &&
            _terminalUses(
              expression.elseExpression,
              acceptedSignatures,
              visiting: visiting,
            );
      }
      if (node case final SwitchExpression expression) {
        return expression.cases.isNotEmpty &&
            expression.cases.every(
              (branch) => _terminalUses(
                branch.expression,
                acceptedSignatures,
                visiting: visiting,
              ),
            );
      }
      if (node case final SimpleIdentifier identifier) {
        final values = _values[identifier.name];
        return values != null &&
            values.isNotEmpty &&
            values.every(
              (value) =>
                  _terminalUses(value, acceptedSignatures, visiting: visiting),
            );
      }
      if (node case final InstanceCreationExpression creation) {
        final signature = _instanceCreationSignature(creation);
        if (acceptedSignatures.contains(signature)) {
          return terminalPredicate?.call(node.toSource()) ?? true;
        }
        if (signature == 'Stack') {
          return _stackRootPlanesUse(
            creation.argumentList,
            acceptedSignatures,
            visiting: visiting,
          );
        }
        return _transparentInvocationUses(
          signature,
          creation.argumentList,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final MethodInvocation invocation) {
        final signature = _methodInvocationSignature(invocation);
        if (acceptedSignatures.contains(signature)) {
          return terminalPredicate?.call(node.toSource()) ?? true;
        }
        if (signature == 'Stack') {
          return _stackRootPlanesUse(
            invocation.argumentList,
            acceptedSignatures,
            visiting: visiting,
          );
        }
        if (invocation.target == null) {
          final helper = _executables[invocation.methodName.name];
          if (helper != null) {
            _indexBody(helper);
            final roots = _returnRoots(helper);
            return roots.isNotEmpty &&
                roots.every(
                  (root) => _terminalUses(
                    root,
                    acceptedSignatures,
                    visiting: visiting,
                  ),
                );
          }
        }
        return _transparentInvocationUses(
          signature,
          invocation.argumentList,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final FunctionExpressionInvocation invocation) {
        return _terminalUses(
          invocation.function,
          acceptedSignatures,
          visiting: visiting,
        );
      }
      if (node case final FunctionExpression function) {
        _indexBody(function.body);
        final roots = _returnRoots(function.body);
        return roots.isNotEmpty &&
            roots.every(
              (root) =>
                  _terminalUses(root, acceptedSignatures, visiting: visiting),
            );
      }
      return false;
    } finally {
      visiting.remove(node);
    }
  }

  bool _transparentInvocationUses(
    String signature,
    ArgumentList arguments,
    Set<String> acceptedSignatures, {
    required Set<AstNode> visiting,
  }) {
    if (!allowTransparentWrappers) return false;
    final named = arguments.arguments.whereType<NamedExpression>().toList();
    final builders = named
        .where(
          (argument) =>
              _widgetBuilderOwnerSignatures.contains(signature) &&
              _isWidgetBuilderArgumentName(argument.name.label.name),
        )
        .map((argument) => argument.expression)
        .toList();
    if (builders.isNotEmpty) {
      return builders.every(
        (builder) =>
            _terminalUses(builder, acceptedSignatures, visiting: visiting),
      );
    }

    final content = named
        .where(
          (argument) => _transparentWidgetArgumentNames.contains(
            argument.name.label.name,
          ),
        )
        .map((argument) => argument.expression)
        .toList();
    return content.isNotEmpty &&
        content.every(
          (child) =>
              _terminalUses(child, acceptedSignatures, visiting: visiting),
        );
  }

  bool _stackRootPlanesUse(
    ArgumentList arguments,
    Set<String> acceptedSignatures, {
    required Set<AstNode> visiting,
  }) {
    if (!allowTransparentWrappers) return false;
    final children = _namedArgumentExpression(arguments, 'children');
    if (children is! ListLiteral || children.elements.isEmpty) return false;
    final first = children.elements.first;
    if (first is! Expression || _isPositionedStackOverlay(first)) return false;
    if (!_terminalUses(first, acceptedSignatures, visiting: visiting)) {
      return false;
    }
    return children.elements.skip(1).every(_stackElementIsPositionedOverlay);
  }

  bool _stackElementIsPositionedOverlay(CollectionElement element) {
    if (element is Expression) {
      return _isPositionedStackOverlay(element);
    }
    if (element is IfElement) {
      return _stackElementIsPositionedOverlay(element.thenElement) &&
          (element.elseElement == null ||
              _stackElementIsPositionedOverlay(element.elseElement!));
    }
    return false;
  }

  Iterable<AstNode> reachableRoots() sync* {
    final pendingBodies = <FunctionBody>[];
    if (declaration is ClassDeclaration) {
      if (_executables['build'] case final build?) pendingBodies.add(build);
    } else if (declaration case final FunctionDeclaration function) {
      pendingBodies.add(function.functionExpression.body);
    }
    final visitedBodies = <FunctionBody>{};
    final pendingRoots = <AstNode>[];
    final visitedRoots = <AstNode>{};

    while (pendingBodies.isNotEmpty || pendingRoots.isNotEmpty) {
      while (pendingBodies.isNotEmpty) {
        final body = pendingBodies.removeLast();
        if (!visitedBodies.add(body)) continue;
        _indexBody(body);
        pendingRoots.addAll(_returnRoots(body));
      }
      if (pendingRoots.isEmpty) continue;
      final root = pendingRoots.removeLast();
      if (!visitedRoots.add(root)) continue;
      yield root;

      final dependencies = _LayoutTerminalDependencyVisitor();
      root.accept(dependencies);
      for (final name in dependencies.names) {
        if (_executables[name] case final executable?) {
          pendingBodies.add(executable);
        }
        pendingRoots.addAll(_values[name] ?? const <AstNode>[]);
      }
    }
  }

  List<AstNode> _returnRoots(FunctionBody body) {
    if (body case final ExpressionFunctionBody expressionBody) {
      return <AstNode>[expressionBody.expression];
    }
    final visitor = _DirectReturnExpressionVisitor();
    body.accept(visitor);
    return visitor.expressions;
  }
}

final class _StandardBodyGeometryTraversal {
  _StandardBodyGeometryTraversal(
    this.graph, {
    required this.semanticRootPageOwnerRole,
  });

  final _LayoutOwnerTerminalGraph graph;
  final String? semanticRootPageOwnerRole;
  final Set<String> conflicts = <String>{};
  final Set<AstNode> _outerVisited = <AstNode>{};
  final Set<AstNode> _contentVisited = <AstNode>{};

  void walk(AstNode node, {required bool withinStandardContent}) {
    final visited = withinStandardContent ? _contentVisited : _outerVisited;
    if (!visited.add(node)) return;
    node.accept(
      _StandardBodyGeometryNodeVisitor(
        this,
        withinStandardContent: withinStandardContent,
      ),
    );
  }

  void inspectInvocation(
    String signature,
    ArgumentList arguments, {
    required bool withinStandardContent,
  }) {
    if (withinStandardContent) {
      if (_competingPageGeometryOwners.contains(signature)) {
        conflicts.add(signature);
      }
      if (_defaultPageGeometryOwnerPadding[signature] case final paddingName?) {
        if (_namedArgumentExpression(arguments, paddingName) == null) {
          conflicts.add('$signature(default page padding)');
        }
      }
      return;
    }

    final standardContentName = switch (signature) {
      'CatchRouteBody.standard' => 'child',
      'CatchRouteBody.standardViewport' => 'child',
      'CatchRouteBody.standardConstrained' => 'child',
      'CatchRouteBody.standardSlivers' => 'slivers',
      'CatchRouteBody.standardConstrainedSlivers' => 'slivers',
      'CatchRouteBody.standardSections' => 'sections',
      _ => null,
    };
    if (standardContentName != null) {
      if (_namedArgumentExpression(arguments, standardContentName)
          case final content?) {
        walk(content, withinStandardContent: true);
      }
      return;
    }

    if (_rootScreenRoles[signature] == 'CatchPageBodyMode.standard') {
      if (_namedArgumentExpression(arguments, 'children') case final slivers?) {
        walk(slivers, withinStandardContent: true);
      }
      return;
    }

    if (catchRootScreenPageSpecExpressions.contains(signature)) {
      final page = _namedArgumentExpression(arguments, 'page');
      final pageArguments = page == null ? null : _rootArgumentList(page);
      final pageSignature = page == null
          ? null
          : _rootConstructorSignature(page.toSource());
      if (pageArguments != null &&
          _rootPageScrollRoles[pageSignature] == 'CatchPageBodyMode.standard') {
        if (_namedArgumentExpression(pageArguments, 'children')
            case final slivers?) {
          walk(slivers, withinStandardContent: true);
        }
      }
      return;
    }

    if (_rootPageScrollRoles.containsKey(signature) &&
        semanticRootPageOwnerRole == 'CatchPageBodyMode.standard') {
      if (_namedArgumentExpression(arguments, 'children') case final slivers?) {
        walk(slivers, withinStandardContent: true);
      }
    }
  }

  void recordInsetReference(String source) {
    if (!source.startsWith('CatchInsets.')) return;
    final name = source.substring('CatchInsets.'.length);
    if (_competingPageInsetNames.contains(name)) {
      conflicts.add('CatchInsets.$name');
    }
  }

  void follow(String name, {required bool withinStandardContent}) {
    for (final value in graph._values[name] ?? const <AstNode>[]) {
      walk(value, withinStandardContent: withinStandardContent);
    }
    if (graph._executables[name] case final executable?) {
      for (final root in graph._returnRoots(executable)) {
        walk(root, withinStandardContent: withinStandardContent);
      }
    }
  }
}

final class _StandardBodyGeometryNodeVisitor extends RecursiveAstVisitor<void> {
  _StandardBodyGeometryNodeVisitor(
    this.traversal, {
    required this.withinStandardContent,
  });

  final _StandardBodyGeometryTraversal traversal;
  final bool withinStandardContent;

  @override
  void visitNamedExpression(NamedExpression node) {
    if (node.expression case final FunctionExpression callback) {
      if (_isWidgetBuilderArgument(node)) {
        callback.body.accept(this);
      }
      return;
    }
    super.visitNamedExpression(node);
  }

  @override
  void visitFunctionExpression(FunctionExpression node) {
    // Positional and behavior callbacks are not part of the rendered terminal.
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.toSource();
    final constructorName = node.constructorName.name?.name;
    traversal.inspectInvocation(
      constructorName == null ? typeName : '$typeName.$constructorName',
      node.argumentList,
      withinStandardContent: withinStandardContent,
    );
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final target = node.target?.toSource();
    traversal.inspectInvocation(
      target == null ? node.methodName.name : '$target.${node.methodName.name}',
      node.argumentList,
      withinStandardContent: withinStandardContent,
    );
    if (node.target == null) {
      traversal.follow(
        node.methodName.name,
        withinStandardContent: withinStandardContent,
      );
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (withinStandardContent) {
      traversal.recordInsetReference(node.toSource());
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    if (withinStandardContent) {
      traversal.recordInsetReference(node.toSource());
    }
    super.visitPropertyAccess(node);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (_isUnqualifiedLayoutDependency(node)) {
      traversal.follow(node.name, withinStandardContent: withinStandardContent);
    }
    super.visitSimpleIdentifier(node);
  }
}

Expression? _namedArgumentExpression(ArgumentList arguments, String name) =>
    arguments.arguments
        .whereType<NamedExpression>()
        .where((argument) => argument.name.label.name == name)
        .firstOrNull
        ?.expression;

bool _isPositionedStackOverlay(Expression expression) {
  Expression current = expression;
  while (current is ParenthesizedExpression) {
    current = current.expression;
  }
  final signature = switch (current) {
    final InstanceCreationExpression creation => _instanceCreationSignature(
      creation,
    ),
    final MethodInvocation invocation => _methodInvocationSignature(invocation),
    _ => null,
  };
  if (signature == null) return false;
  return signature == 'Positioned' ||
      signature.startsWith('Positioned.') ||
      signature == 'PositionedDirectional' ||
      signature.startsWith('PositionedDirectional.');
}

ArgumentList? _rootArgumentList(Expression expression) {
  Expression current = expression;
  while (current is ParenthesizedExpression) {
    current = current.expression;
  }
  return switch (current) {
    final InstanceCreationExpression creation => creation.argumentList,
    final MethodInvocation invocation => invocation.argumentList,
    _ => null,
  };
}

final class _DirectReturnExpressionVisitor extends RecursiveAstVisitor<void> {
  final List<AstNode> expressions = <AstNode>[];

  @override
  void visitFunctionExpression(FunctionExpression node) {
    // A callback is traversed when its containing terminal expression is
    // evaluated, not while finding returns from the enclosing build method.
  }

  @override
  void visitReturnStatement(ReturnStatement node) {
    if (node.expression case final expression?) expressions.add(expression);
  }
}

final class _LayoutValueDefinitionVisitor extends RecursiveAstVisitor<void> {
  final Map<String, List<AstNode>> values = <String, List<AstNode>>{};
  final Map<String, FunctionBody> executables = <String, FunctionBody>{};

  void _add(String name, AstNode value) =>
      (values[name] ??= <AstNode>[]).add(value);

  @override
  void visitFunctionExpression(FunctionExpression node) {
    // Callback-local values belong to that callback and are indexed only when
    // the callback is followed as a widget-producing builder.
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    if (node.initializer case final initializer?) {
      _add(node.name.lexeme, initializer);
    }
    super.visitVariableDeclaration(node);
  }

  @override
  void visitAssignmentExpression(AssignmentExpression node) {
    if (node.leftHandSide case final SimpleIdentifier identifier) {
      _add(identifier.name, node.rightHandSide);
    }
    super.visitAssignmentExpression(node);
  }

  @override
  void visitFunctionDeclarationStatement(FunctionDeclarationStatement node) {
    final function = node.functionDeclaration;
    executables[function.name.lexeme] = function.functionExpression.body;
  }
}

final class _LayoutTerminalDependencyVisitor extends RecursiveAstVisitor<void> {
  final Set<String> names = <String>{};

  @override
  void visitNamedExpression(NamedExpression node) {
    if (node.expression case final FunctionExpression callback) {
      if (_isWidgetBuilderArgument(node)) {
        callback.body.accept(this);
      }
      return;
    }
    super.visitNamedExpression(node);
  }

  @override
  void visitFunctionExpression(FunctionExpression node) {
    // Positional and behavior callbacks cannot contribute a screen terminal.
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (_isUnqualifiedLayoutDependency(node)) names.add(node.name);
    super.visitSimpleIdentifier(node);
  }
}

bool _isUnqualifiedLayoutDependency(SimpleIdentifier node) {
  final parent = node.parent;
  if (parent is PrefixedIdentifier || parent is PropertyAccess) return false;
  if (parent is MethodInvocation) {
    return identical(parent.methodName, node) && parent.target == null;
  }
  if (parent is ConstructorName || parent is NamedType) return false;
  return true;
}

List<int> rawScaffoldLines(String sourceText) {
  final unit = parseString(content: sourceText, throwIfDiagnostics: false).unit;
  return _rawScaffoldLines(unit);
}

void _validateLayoutRegistryCoverage(
  List<Map<String, Object?>> screens,
  Map<String, Object?> layoutContracts,
  Map<String, Object?> layoutOnlyRoutes,
  Map<String, Object?> screenCoverage,
  Map<String, Object?> routeInventory,
  List<String> hardFailures,
) {
  final coverageRows =
      ((screenCoverage['routes'] as List<Object?>?) ?? const [])
          .cast<Map<String, Object?>>();
  final coverageByRoute = <String, Map<String, Object?>>{
    for (final row in coverageRows)
      if (row['routeId'] case final String routeId) routeId: row,
  };
  final renderKindByRoute = <String, String>{
    for (final row
        in ((routeInventory['routes'] as List<Object?>?) ?? const [])
            .cast<Map<String, Object?>>())
      if (row['id'] case final String routeId)
        if (row['renderKind'] case final String renderKind) routeId: renderKind,
  };
  hardFailures.addAll(
    evaluateRouteCoveragePresentationContracts(
      coverageRows: coverageRows,
      renderKindByRoute: renderKindByRoute,
    ),
  );
  final screenIds = screens
      .map((screen) => screen['id'])
      .whereType<String>()
      .toSet();
  final layoutIds = layoutContracts.keys.toSet();
  for (final missing in screenIds.difference(layoutIds).toList()..sort()) {
    hardFailures.add(
      '$screenLayoutFamilyCode $missing: missing typed layout contract',
    );
  }
  for (final orphan in layoutIds.difference(screenIds).toList()..sort()) {
    hardFailures.add(
      '$screenLayoutFamilyCode $orphan: layout contract has no registered screen',
    );
  }
  for (final screen in screens) {
    final screenId = screen['id'] as String?;
    if (screenId == null || !layoutContracts.containsKey(screenId)) continue;
    final contract = (layoutContracts[screenId] as Map).cast<String, Object?>();
    final owners = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>();
    final registeredRoutes = ((screen['routes'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>()
        .map((route) => route['id'])
        .whereType<String>()
        .toSet();
    final renderedRoutes = registeredRoutes
        .where((route) => renderKindByRoute[route] != 'redirect')
        .toSet();
    final redirectTo = contract['redirectTo'] as String?;
    if (redirectTo != null) {
      for (final route in registeredRoutes) {
        final coverage = coverageByRoute[route];
        if (coverage?['status'] != 'alias' ||
            coverage?['canonicalRouteId'] != redirectTo) {
          hardFailures.add(
            '$screenLayoutFamilyCode $screenId: redirect route $route must be an alias of $redirectTo',
          );
        }
      }
      continue;
    }
    final ownedRoutes = <String>{};
    for (final owner in owners) {
      for (final route
          in ((owner['routes'] as List<Object?>?) ?? const [])
              .whereType<String>()) {
        ownedRoutes.add(route);
      }
    }
    hardFailures.addAll(
      evaluateLayoutFamilyConsistency(screenId: screenId, owners: owners),
    );
    for (final missing
        in renderedRoutes.difference(ownedRoutes).toList()..sort()) {
      hardFailures.add(
        '$screenLayoutFamilyCode $screenId: route $missing has no typed layout owner',
      );
    }
    for (final orphan
        in ownedRoutes.difference(renderedRoutes).toList()..sort()) {
      hardFailures.add(
        '$screenLayoutFamilyCode $screenId: owner references unregistered route $orphan',
      );
    }
    for (final route in renderedRoutes) {
      if (coverageByRoute[route]?['status'] != 'contracted') {
        hardFailures.add(
          '$screenLayoutFamilyCode $screenId: rendered route $route must be contracted coverage',
        );
      }
    }
    for (final route in registeredRoutes.difference(renderedRoutes)) {
      if (coverageByRoute[route]?['status'] != 'alias') {
        hardFailures.add(
          '$screenLayoutFamilyCode $screenId: redirect route $route must use alias coverage',
        );
      }
    }
  }

  final registeredRoutes = screens
      .expand(
        (screen) => ((screen['routes'] as List<Object?>?) ?? const [])
            .cast<Map<String, Object?>>()
            .map((route) => route['id'])
            .whereType<String>(),
      )
      .toSet();
  for (final routeEntry in layoutOnlyRoutes.entries) {
    if (registeredRoutes.contains(routeEntry.key)) {
      hardFailures.add(
        '$screenLayoutFamilyCode route.${routeEntry.key}: layout-only route duplicates a registered screen route',
      );
    }
    final contract = (routeEntry.value as Map).cast<String, Object?>();
    final ownerRoutes = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>()
        .expand(
          (owner) => ((owner['routes'] as List<Object?>?) ?? const [])
              .whereType<String>(),
        )
        .toSet();
    if (ownerRoutes.length != 1 || !ownerRoutes.contains(routeEntry.key)) {
      hardFailures.add(
        '$screenLayoutFamilyCode route.${routeEntry.key}: layout-only owners must reference exactly ${routeEntry.key}',
      );
    }
  }

  final allTypedRoutes = <String>{
    ...registeredRoutes,
    ...layoutOnlyRoutes.keys,
  };
  for (final row in coverageRows) {
    final routeId = row['routeId'] as String? ?? '';
    final status = row['status'] as String? ?? '';
    if (status == 'contracted' && !registeredRoutes.contains(routeId)) {
      hardFailures.add(
        '$screenLayoutFamilyCode route.$routeId: contracted route is absent from the screen layout registry',
      );
    } else if (status == 'excluded' && !layoutOnlyRoutes.containsKey(routeId)) {
      hardFailures.add(
        '$screenLayoutFamilyCode route.$routeId: rendered design-parity exclusion still needs a layout-only contract',
      );
    } else if (status == 'alias') {
      final canonicalRouteId = row['canonicalRouteId'] as String? ?? '';
      if (!allTypedRoutes.contains(canonicalRouteId)) {
        hardFailures.add(
          '$screenLayoutFamilyCode route.$routeId: alias target $canonicalRouteId has no typed layout contract',
        );
      }
    }
  }
}

List<String> evaluateLayoutFamilyConsistency({
  required String screenId,
  required List<Map<String, Object?>> owners,
}) {
  final familiesByRoute = <String, Set<String>>{};
  for (final owner in owners) {
    final family = owner['family'] as String? ?? '';
    for (final route
        in ((owner['routes'] as List<Object?>?) ?? const [])
            .whereType<String>()) {
      (familiesByRoute[route] ??= <String>{}).add(family);
    }
  }
  final failures = <String>[];
  for (final entry in familiesByRoute.entries) {
    if (entry.value.length > 1) {
      final families = entry.value.toList()..sort();
      failures.add(
        '$screenLayoutFamilyCode $screenId: route ${entry.key} mixes layout families ${families.join(', ')}',
      );
    }
  }
  return failures;
}

List<String> evaluateRouteCoveragePresentationContracts({
  required List<Map<String, Object?>> coverageRows,
  required Map<String, String> renderKindByRoute,
}) {
  final failures = <String>[];
  final seenCoverage = <String>{};
  for (final row in coverageRows) {
    final routeId = row['routeId'] as String? ?? '';
    if (routeId.isEmpty || !seenCoverage.add(routeId)) {
      failures.add(
        '$screenLayoutFamilyCode route.$routeId: coverage route IDs must be unique and non-empty',
      );
    }
    final status = row['status'] as String? ?? '';
    final renderKind = renderKindByRoute[routeId];
    if (renderKind == null) {
      failures.add(
        '$screenLayoutFamilyCode route.$routeId: route inventory has no presentation kind',
      );
      continue;
    }
    if (status == 'planned') {
      failures.add(
        '$screenLayoutFamilyCode route.$routeId: planned coverage cannot bypass the zero-debt composition gate',
      );
    }
    if (status == 'alias' && renderKind != 'redirect') {
      failures.add(
        '$screenLayoutFamilyCode route.$routeId: rendered $renderKind route cannot use alias coverage',
      );
    } else if (status != 'alias' && renderKind == 'redirect') {
      failures.add(
        '$screenLayoutFamilyCode route.$routeId: redirect-only route must use alias coverage',
      );
    }
  }
  for (final routeId
      in renderKindByRoute.keys.toSet().difference(seenCoverage).toList()
        ..sort()) {
    failures.add(
      '$screenLayoutFamilyCode route.$routeId: route inventory entry has no coverage contract',
    );
  }
  return failures;
}

List<String> evaluateRouteOwnerReachability({
  required String routeId,
  required String? renderKind,
  required String? presentationExpression,
  required String? presentationTarget,
  required Iterable<DeclarationBinding> requiredOwners,
  required Set<DeclarationBinding> reachableDeclarations,
}) {
  if (renderKind == 'redirect') return const <String>[];
  final failures = <String>[];
  if (renderKind != 'builder' && renderKind != 'pageBuilder') {
    failures.add(
      '$screenRouteOwnerBindingCode route.$routeId: rendered route must declare builder or pageBuilder presentation',
    );
  }
  if (presentationExpression == null || presentationExpression.trim().isEmpty) {
    failures.add(
      '$screenRouteOwnerBindingCode route.$routeId: route inventory has no presentation expression',
    );
  }
  if (presentationTarget == null || presentationTarget.trim().isEmpty) {
    failures.add(
      '$screenRouteOwnerBindingCode route.$routeId: route inventory has no presentation target',
    );
  }
  for (final owner in requiredOwners) {
    if (!reachableDeclarations.contains(owner)) {
      failures.add(
        '$screenRouteOwnerBindingCode route.$routeId: registered owner ${owner.symbol} in ${owner.file} is not reachable from the GoRoute presentation',
      );
    }
  }
  return failures;
}

Future<({int renderedRoutes, int ownerBindings})> _validateRouteOwnerBindings({
  required String root,
  required AnalysisContextCollection collection,
  required _ProductionAnalysis productionAnalysis,
  required Map<String, Object?> layoutContracts,
  required Map<String, Object?> layoutOnlyRoutes,
  required Map<String, Object?> routeInventory,
  required List<String> hardFailures,
}) async {
  final inventoryRows =
      ((routeInventory['routes'] as List<Object?>?) ?? const [])
          .cast<Map<String, Object?>>();
  final inventoryByRoute = <String, Map<String, Object?>>{
    for (final row in inventoryRows)
      if (row['id'] case final String routeId) routeId: row,
  };
  final ownersByRoute = <String, Set<DeclarationBinding>>{};
  for (final contracts in <Map<String, Object?>>[
    layoutContracts,
    layoutOnlyRoutes,
  ]) {
    for (final contractValue in contracts.values) {
      final contract = (contractValue as Map).cast<String, Object?>();
      for (final owner
          in ((contract['owners'] as List<Object?>?) ?? const [])
              .cast<Map<String, Object?>>()) {
        final file = owner['file'] as String? ?? '';
        final symbol = owner['symbol'] as String? ?? '';
        final binding = DeclarationBinding(file: file, symbol: symbol);
        for (final route
            in ((owner['routes'] as List<Object?>?) ?? const [])
                .whereType<String>()) {
          (ownersByRoute[route] ??= <DeclarationBinding>{}).add(binding);
        }
      }
    }
  }

  final resolvedByRoute = <String, _ResolvedRoutePresentation>{};
  final resolvedRouteIds = <String>{};
  final units = await productionAnalysis.units();
  for (final unresolved in productionAnalysis.unresolvedPaths) {
    hardFailures.add(
      '$screenRouteOwnerBindingCode route: analyzer could not resolve $unresolved',
    );
  }
  for (final unit in units) {
    final visitor = _GoRoutePresentationVisitor(
      relativePath: unit.relativePath,
      lineInfo: unit.result.unit.lineInfo,
    );
    unit.result.unit.accept(visitor);
    for (final construction in visitor.constructions) {
      final location = '${construction.relativePath}:${construction.line}';
      if (construction.relativePath != 'lib/routing/go_router.dart') {
        hardFailures.add(
          '$screenRouteOwnerBindingCode $location: GoRoute construction is outside the canonical route graph',
        );
      }
      if (construction.kind != _RouteConstructionKind.constructor) {
        hardFailures.add(
          '$screenRouteOwnerBindingCode $location: ${construction.kind.label} returning GoRoute is not inventory-safe; construct GoRoute directly in lib/routing/go_router.dart',
        );
      } else if (!construction.inventorySafeConstructor) {
        hardFailures.add(
          '$screenRouteOwnerBindingCode $location: ${construction.routeType} resolves to GoRoute but aliases and subclasses bypass textual inventory generation',
        );
      }
      if (construction.problem case final String problem) {
        hardFailures.add('$screenRouteOwnerBindingCode $location: $problem');
      }
      final routeId = construction.routeId;
      if (routeId == null) continue;
      if (!resolvedRouteIds.add(routeId)) {
        hardFailures.add(
          '$screenRouteOwnerBindingCode route.$routeId: analyzer resolved more than one named GoRoute construction',
        );
        continue;
      }
      final presentation = construction.presentation;
      if (presentation != null) resolvedByRoute[routeId] = presentation;
    }
  }

  for (final routeId in resolvedRouteIds.difference(
    inventoryByRoute.keys.toSet(),
  )) {
    hardFailures.add(
      '$screenRouteOwnerBindingCode route.$routeId: analyzer resolved a named GoRoute that is absent from the generated route inventory',
    );
  }
  for (final routeId in inventoryByRoute.keys.toSet().difference(
    resolvedRouteIds,
  )) {
    hardFailures.add(
      '$screenRouteOwnerBindingCode route.$routeId: generated route inventory entry was not resolved as a named GoRoute construction',
    );
  }
  final graph = _PresentationReachabilityGraph(
    root: root,
    collection: collection,
  );

  for (final row in inventoryRows) {
    final routeId = row['id'] as String? ?? '';
    final renderKind = row['renderKind'] as String?;
    if (renderKind == 'redirect') continue;
    final expression = row['presentationExpression'] as String?;
    final target = row['presentationTarget'] as String?;
    final routePresentation = resolvedByRoute[routeId];
    if (routePresentation == null) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode route.$routeId: no named GoRoute presentation was resolved',
      );
      continue;
    }
    if (routePresentation.renderKind != renderKind) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode route.$routeId: inventory render kind $renderKind does not match resolved ${routePresentation.renderKind}',
      );
    }
    final resolvedExpression = _normalizeDartExpression(
      routePresentation.expression.toSource(),
    );
    if (resolvedExpression != expression) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode route.$routeId: inventory presentation expression `$expression` does not match resolved `$resolvedExpression`',
      );
    }
    final roots = routePresentation.rootsForTarget(target ?? '', root);
    if (roots.isEmpty) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode route.$routeId: resolved GoRoute expression does not reference presentation target ${target ?? '<missing>'}',
      );
    }
    final reachable = await graph.reachableDeclarations(roots);
    hardFailures.addAll(
      evaluateRouteOwnerReachability(
        routeId: routeId,
        renderKind: renderKind,
        presentationExpression: expression,
        presentationTarget: target,
        requiredOwners: ownersByRoute[routeId] ?? const <DeclarationBinding>{},
        reachableDeclarations: reachable,
      ),
    );
  }

  for (final routeId in ownersByRoute.keys) {
    if (!inventoryByRoute.containsKey(routeId)) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode route.$routeId: registered owner route is absent from the generated route inventory',
      );
    }
  }
  return (
    renderedRoutes: inventoryRows
        .where((row) => row['renderKind'] != 'redirect')
        .length,
    ownerBindings: ownersByRoute.values.fold<int>(
      0,
      (total, owners) => total + owners.length,
    ),
  );
}

List<String> evaluateImperativePageContractCoverage({
  required List<Map<String, Object?>> inventoryRows,
  required Map<String, Object?> imperativePageContracts,
}) {
  final failures = <String>[];
  final seenSites = <String>{};
  final inventoryTargets = <String>{};
  for (final row in inventoryRows) {
    final siteId = row['siteId'] as String? ?? '';
    final sourcePath = row['sourcePath'] as String? ?? '';
    final ordinal = row['ordinal'] as int?;
    final expression = row['presentationExpression'] as String? ?? '';
    final target = row['presentationTarget'] as String? ?? '';
    if (siteId.isEmpty || !seenSites.add(siteId)) {
      failures.add(
        '$screenRouteOwnerBindingCode imperative.$siteId: site IDs must be unique and non-empty',
      );
    }
    if (sourcePath.isEmpty || ordinal == null || ordinal < 1) {
      failures.add(
        '$screenRouteOwnerBindingCode imperative.$siteId: inventory source path and positive ordinal are required',
      );
    }
    if (expression.isEmpty || target.isEmpty) {
      failures.add(
        '$screenRouteOwnerBindingCode imperative.$siteId: presentation expression and target are required',
      );
    }
    if (target.isNotEmpty) inventoryTargets.add(target);
  }

  final contractTargets = imperativePageContracts.keys.toSet();
  for (final target
      in inventoryTargets.difference(contractTargets).toList()..sort()) {
    failures.add(
      '$screenRouteOwnerBindingCode imperative.$target: analyzer inventory target has no typed layout contract',
    );
  }
  for (final target
      in contractTargets.difference(inventoryTargets).toList()..sort()) {
    failures.add(
      '$screenRouteOwnerBindingCode imperative.$target: typed layout contract has no generated MaterialPageRoute target',
    );
  }
  for (final entry in imperativePageContracts.entries) {
    final contract = (entry.value as Map?)?.cast<String, Object?>();
    final owners = (contract?['owners'] as List<Object?>?) ?? const [];
    if (owners.isEmpty) {
      failures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: typed layout contract must register at least one owner',
      );
      continue;
    }
    final families = owners
        .whereType<Map>()
        .map((owner) => owner['family'])
        .whereType<String>()
        .toSet();
    if (families.length > 1) {
      final sorted = families.toList()..sort();
      failures.add(
        '$screenLayoutFamilyCode imperative.${entry.key}: target mixes layout families ${sorted.join(', ')}',
      );
    }
  }
  return failures;
}

List<String> evaluateImperativePageOwnerReachability({
  required String siteId,
  required String? presentationExpression,
  required String? presentationTarget,
  required Iterable<DeclarationBinding> requiredOwners,
  required Set<DeclarationBinding> reachableDeclarations,
}) {
  final failures = <String>[];
  if (presentationExpression == null || presentationExpression.trim().isEmpty) {
    failures.add(
      '$screenRouteOwnerBindingCode imperative.$siteId: route inventory has no presentation expression',
    );
  }
  if (presentationTarget == null || presentationTarget.trim().isEmpty) {
    failures.add(
      '$screenRouteOwnerBindingCode imperative.$siteId: route inventory has no presentation target',
    );
  }
  if (requiredOwners.isEmpty) {
    failures.add(
      '$screenRouteOwnerBindingCode imperative.$siteId: presentation target has no typed layout owner',
    );
  }
  for (final owner in requiredOwners) {
    if (!reachableDeclarations.contains(owner)) {
      failures.add(
        '$screenRouteOwnerBindingCode imperative.$siteId: registered owner ${owner.symbol} in ${owner.file} is not reachable from the MaterialPageRoute builder',
      );
    }
  }
  return failures;
}

Future<({int sites, int targets, int ownerBindings})>
_validateImperativePageOwnerBindings({
  required String root,
  required AnalysisContextCollection collection,
  required _ProductionAnalysis productionAnalysis,
  required Map<String, Object?> imperativePageContracts,
  required Map<String, Object?> routeInventory,
  required List<String> hardFailures,
}) async {
  final inventoryRows =
      ((routeInventory['imperativePageRoutes'] as List<Object?>?) ?? const [])
          .cast<Map<String, Object?>>();
  hardFailures.addAll(
    evaluateImperativePageContractCoverage(
      inventoryRows: inventoryRows,
      imperativePageContracts: imperativePageContracts,
    ),
  );

  final ownersByTarget = <String, Set<DeclarationBinding>>{};
  for (final entry in imperativePageContracts.entries) {
    final contract = (entry.value as Map).cast<String, Object?>();
    final owners = ((contract['owners'] as List<Object?>?) ?? const [])
        .cast<Map<String, Object?>>();
    ownersByTarget[entry.key] = {
      for (final owner in owners)
        DeclarationBinding(
          file: owner['file'] as String? ?? '',
          symbol: owner['symbol'] as String? ?? '',
        ),
    };
  }

  final inventoryBySite = <String, Map<String, Object?>>{
    for (final row in inventoryRows)
      if (row['siteId'] case final String siteId) siteId: row,
  };
  final resolvedBySite = <String, _ResolvedImperativePagePresentation>{};
  final units = await productionAnalysis.units();
  for (final unresolved in productionAnalysis.unresolvedPaths) {
    hardFailures.add(
      '$screenRouteOwnerBindingCode imperative: analyzer could not resolve $unresolved',
    );
  }
  for (final unit in units) {
    final visitor = _ImperativePageRouteVisitor(
      relativePath: unit.relativePath,
      lineInfo: unit.result.unit.lineInfo,
    );
    unit.result.unit.accept(visitor);
    for (final presentation in visitor.presentations) {
      if (resolvedBySite.containsKey(presentation.siteId)) {
        hardFailures.add(
          '$screenRouteOwnerBindingCode imperative.${presentation.siteId}: analyzer resolved a duplicate construction site',
        );
      } else {
        resolvedBySite[presentation.siteId] = presentation;
      }
    }
  }

  final graph = _PresentationReachabilityGraph(
    root: root,
    collection: collection,
  );
  for (final entry in resolvedBySite.entries) {
    final resolved = entry.value;
    if (!resolved.inventorySupported) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: ${resolved.routeType} is a full-screen PageRoute reached through ${resolved.kind.label}, but only direct MaterialPageRoute construction is inventory-supported',
      );
      continue;
    }
    final row = inventoryBySite[entry.key];
    if (row == null) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: production MaterialPageRoute construction is absent from the generated inventory',
      );
      continue;
    }
    final expression = row['presentationExpression'] as String?;
    final target = row['presentationTarget'] as String?;
    final fullscreenDialogExpression =
        row['fullscreenDialogExpression'] as String?;
    if (resolved.expression == null) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: MaterialPageRoute must declare a builder',
      );
      continue;
    }
    final resolvedExpression = _normalizeDartExpression(
      resolved.expression!.toSource(),
    );
    if (resolvedExpression != expression) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: inventory presentation expression `$expression` does not match resolved `$resolvedExpression`',
      );
    }
    final resolvedFullscreenDialog = resolved.fullscreenDialog == null
        ? null
        : _normalizeDartExpression(resolved.fullscreenDialog!.toSource());
    if (resolvedFullscreenDialog != fullscreenDialogExpression) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: inventory fullscreenDialog expression `$fullscreenDialogExpression` does not match resolved `$resolvedFullscreenDialog`',
      );
    }
    final roots = resolved.rootsForTarget(target ?? '', root);
    if (roots.isEmpty) {
      hardFailures.add(
        '$screenRouteOwnerBindingCode imperative.${entry.key}: resolved MaterialPageRoute builder does not reference presentation target ${target ?? '<missing>'}',
      );
    }
    final reachable = await graph.reachableDeclarations(roots);
    hardFailures.addAll(
      evaluateImperativePageOwnerReachability(
        siteId: '${entry.key} (line ${resolved.line})',
        presentationExpression: expression,
        presentationTarget: target,
        requiredOwners: ownersByTarget[target] ?? const <DeclarationBinding>{},
        reachableDeclarations: reachable,
      ),
    );
  }

  for (final siteId in inventoryBySite.keys.toSet().difference(
    resolvedBySite.keys.toSet(),
  )) {
    hardFailures.add(
      '$screenRouteOwnerBindingCode imperative.$siteId: generated inventory site was not resolved as a Flutter MaterialPageRoute construction',
    );
  }

  return (
    sites: resolvedBySite.length,
    targets: ownersByTarget.length,
    ownerBindings: ownersByTarget.values.fold<int>(
      0,
      (total, owners) => total + owners.length,
    ),
  );
}

String _normalizeDartExpression(String value) {
  final result = StringBuffer();
  String? quote;
  var escaped = false;
  for (var index = 0; index < value.length; index += 1) {
    final char = value[index];
    if (quote != null) {
      result.write(char);
      if (escaped) {
        escaped = false;
      } else if (char == r'\') {
        escaped = true;
      } else if (char == quote) {
        quote = null;
      }
      continue;
    }
    if (char == "'" || char == '"') {
      quote = char;
      result.write(char);
      continue;
    }
    if (RegExp(r'\s').hasMatch(char)) {
      var nextIndex = index + 1;
      while (nextIndex < value.length &&
          RegExp(r'\s').hasMatch(value[nextIndex])) {
        nextIndex += 1;
      }
      final previous = result.isEmpty
          ? ''
          : result.toString()[result.length - 1];
      final next = nextIndex < value.length ? value[nextIndex] : '';
      if (RegExp(r'[A-Za-z0-9_$]').hasMatch(previous) &&
          RegExp(r'[A-Za-z0-9_$]').hasMatch(next)) {
        result.write(' ');
      }
      index = nextIndex - 1;
      continue;
    }
    if (char == ',') {
      var nextIndex = index + 1;
      while (nextIndex < value.length &&
          RegExp(r'\s').hasMatch(value[nextIndex])) {
        nextIndex += 1;
      }
      if (nextIndex < value.length &&
          const <String>{')', ']', '}'}.contains(value[nextIndex])) {
        continue;
      }
    }
    result.write(char);
  }
  return result.toString();
}

/// Projects the layout of direct, typed private route factories into their
/// callers. This is analyzer evidence for the existing checks, not an allowlist
/// or a substitute for terminal, route-body, or competing-inset validation.
///
/// Only same-owner methods and same-unit top-level functions with one direct
/// canonical constructor and a required named body pass through. Other shapes
/// remain unchanged and must satisfy the existing fail-closed proof.
String expandDirectRouteFactoryCallsForOwner({
  required String root,
  required ResolvedUnitResult result,
  required CompilationUnitMember declaration,
}) {
  final factories = <Element, InstanceCreationExpression>{};
  bool canonicalType(DartType? type, String name) =>
      type is InterfaceType &&
      type.nullabilitySuffix == NullabilitySuffix.none &&
      type.element.displayName == name &&
      type.element.library.firstFragment.source.fullName.replaceAll(
            '\\',
            '/',
          ) ==
          _fromRoot(root, _canonicalRouteScaffoldPath).replaceAll('\\', '/');

  void record(ExecutableElement? element, FunctionBody body, bool generic) {
    if (element == null ||
        generic ||
        !element.displayName.startsWith('_') ||
        !canonicalType(element.returnType, 'CatchRouteScaffold') ||
        body is! ExpressionFunctionBody ||
        body.isAsynchronous ||
        body.isGenerator) {
      return;
    }
    final construction = body.expression;
    if (construction is! InstanceCreationExpression ||
        construction.constructorName.type.toSource() != 'CatchRouteScaffold' ||
        construction.constructorName.name != null) {
      return;
    }
    final constructor = construction.constructorName.element?.baseElement;
    if (constructor is! ConstructorElement ||
        constructor.enclosingElement.displayName != 'CatchRouteScaffold' ||
        constructor.enclosingElement.library.firstFragment.source.fullName
                .replaceAll('\\', '/') !=
            _fromRoot(
              root,
              _canonicalRouteScaffoldPath,
            ).replaceAll('\\', '/')) {
      return;
    }
    final bodyParameters = element.formalParameters
        .where(
          (parameter) =>
              parameter.name == 'body' &&
              parameter.isRequiredNamed &&
              canonicalType(parameter.type, 'CatchRouteBody'),
        )
        .toList();
    if (bodyParameters.length != 1) return;
    // This bounded proof covers only the existing body + optional chrome text
    // protocol. Generic, positional and widget-valued parameters are unsupported.
    if (element.formalParameters.any(
      (parameter) =>
          !parameter.isNamed ||
          (parameter != bodyParameters.single &&
              !parameter.type.isDartCoreString),
    )) {
      return;
    }
    final forwarded = _namedArgumentExpression(
      construction.argumentList,
      'body',
    );
    if (forwarded is! SimpleIdentifier ||
        forwarded.element?.baseElement != bodyParameters.single.baseElement) {
      return;
    }
    factories[element.baseElement] = construction;
  }

  for (final member in result.unit.declarations) {
    if (member is FunctionDeclaration) {
      record(
        member.declaredFragment?.element,
        member.functionExpression.body,
        member.functionExpression.typeParameters != null,
      );
    }
  }
  if (declaration is ClassDeclaration) {
    for (final member in declaration.body.members) {
      if (member is MethodDeclaration && !member.isStatic) {
        record(
          member.declaredFragment?.element,
          member.body,
          member.typeParameters != null,
        );
      }
    }
  }

  final visitor = _DirectRouteFactoryCallProjection(
    factories: factories,
    source: result.content,
    owner: declaration,
    isCanonicalBody: (type) => canonicalType(type, 'CatchRouteBody'),
  );
  declaration.accept(visitor);
  // Nested factory invocations need a deeper proof. Do not partially rewrite
  // overlapping calls or accidentally combine bindings from different sites.
  final edits =
      visitor.edits
          .where(
            (edit) => !visitor.edits.any(
              (other) =>
                  edit.offset != other.offset &&
                  edit.offset < other.end &&
                  other.offset < edit.end,
            ),
          )
          .toList()
        ..sort((a, b) => b.offset.compareTo(a.offset));
  var source = result.content.substring(declaration.offset, declaration.end);
  for (final edit in edits) {
    source = source.replaceRange(
      edit.offset - declaration.offset,
      edit.end - declaration.offset,
      edit.source,
    );
  }
  return source;
}

final class _DirectRouteFactoryCallProjection
    extends RecursiveAstVisitor<void> {
  _DirectRouteFactoryCallProjection({
    required this.factories,
    required this.source,
    required this.owner,
    required this.isCanonicalBody,
  });
  final Map<Element, InstanceCreationExpression> factories;
  final String source;
  final CompilationUnitMember owner;
  final bool Function(DartType?) isCanonicalBody;
  final edits = <({int offset, int end, String source})>[];

  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    // Do not recursively project indirect factories or dead sibling helpers.
    if (node.name.lexeme == 'build') super.visitMethodDeclaration(node);
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (identical(node, owner)) super.visitFunctionDeclaration(node);
  }

  @override
  void visitNamedExpression(NamedExpression node) {
    if (node.expression is FunctionExpression) {
      final invocation = node.parent?.parent;
      final signature = switch (invocation) {
        final InstanceCreationExpression creation =>
          _resolvedInstanceCreationSignature(creation),
        final MethodInvocation method => _methodInvocationSignature(method),
        _ => null,
      };
      if (!_isWidgetBuilderArgumentName(node.name.label.name) ||
          !_widgetBuilderOwnerSignatures.contains(signature)) {
        return;
      }
    }
    super.visitNamedExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    super.visitMethodInvocation(node);
    if (node.target != null && node.target is! ThisExpression) return;
    if (node.typeArguments != null) return;
    final element = node.methodName.element?.baseElement;
    final construction = factories[element];
    if (construction == null || element is! ExecutableElement) return;
    final arguments = node.argumentList.arguments;
    if (arguments.any((argument) => argument is! NamedExpression)) return;
    final named = arguments.cast<NamedExpression>();
    final names = named.map((argument) => argument.name.label.name).toList();
    if (names.toSet().length != names.length ||
        names.any(
          (name) => !element.formalParameters.any((p) => p.name == name),
        )) {
      return;
    }
    final body = _namedArgumentExpression(node.argumentList, 'body');
    if (body == null || !isCanonicalBody(body.staticType)) return;
    final forwarded = _namedArgumentExpression(
      construction.argumentList,
      'body',
    )!;
    final projected = source
        .substring(construction.offset, construction.end)
        .replaceRange(
          forwarded.offset - construction.offset,
          forwarded.end - construction.offset,
          '(${body.toSource()})',
        );
    edits.add((offset: node.offset, end: node.end, source: projected));
  }
}

Future<void> _validateLayoutOwner({
  required String root,
  required AnalysisContextCollection collection,
  required String screenId,
  required Map<String, Object?> owner,
  required Set<String> terminalOwnerDelegates,
  required Set<DeclarationBinding> terminalOwnerBindings,
  required Map<String, String> semanticRootPageOwnerRoles,
  required List<String> hardFailures,
}) async {
  final relativePath = owner['file'] as String? ?? '';
  final symbol = owner['symbol'] as String? ?? '';
  final absolutePath = _fromRoot(root, relativePath);
  final result = await _resolvedUnit(collection, absolutePath);
  if (result == null) {
    hardFailures.add(
      '$screenLayoutFamilyCode $screenId: analyzer could not resolve owner $relativePath',
    );
    return;
  }
  final declaration = _namedDeclaration(result.unit, symbol);
  if (declaration == null) {
    hardFailures.add(
      '$screenLayoutFamilyCode $screenId: owner symbol $symbol is not declared by $relativePath',
    );
    return;
  }
  final declarationSource = expandDirectRouteFactoryCallsForOwner(
    root: root,
    result: result,
    declaration: declaration,
  );
  final referencedSemanticOwnerRoles = _resolvedSemanticRootPageOwnerRoles(
    declaration,
    semanticRootPageOwnerRoles,
  );
  final expression = owner['expression'] as String? ?? '';
  final resolvedTerminalOwnerProof = await _ResolvedLayoutOwnerTerminalProof(
    root: root,
    collection: collection,
    acceptedSignatures: <String>{expression},
    acceptedOwnerBindings: terminalOwnerBindings,
  ).everyTerminalUses(_ReachTarget(file: relativePath, symbol: symbol));
  hardFailures.addAll(
    evaluateLayoutOwnerContract(
      screenId: screenId,
      owner: owner,
      declarationSource: declarationSource,
      terminalOwnerDelegates: terminalOwnerDelegates,
      semanticRootPageOwnerRoles: referencedSemanticOwnerRoles,
      resolvedTerminalOwnerProof: resolvedTerminalOwnerProof,
    ),
  );
}

Future<void> _validateProductionScaffoldOwnership(
  _ProductionAnalysis productionAnalysis,
  List<String> hardFailures,
) async {
  for (final unit in await productionAnalysis.units()) {
    hardFailures.addAll(
      resolvedScaffoldOwnershipFailures(
        relativePath: unit.relativePath,
        unit: unit.result.unit,
      ),
    );
  }
}

Future<Map<String, String>> _productionRootPageOwnerRoles(
  _ProductionAnalysis productionAnalysis,
) async {
  final roles = <String, String>{};
  for (final unit in await productionAnalysis.units()) {
    for (final declaration in unit.result.unit.declarations) {
      if (declaration is! ClassDeclaration) continue;
      final element = declaration.declaredFragment?.element;
      if (element == null || !_implementsCatchRootScreenPageOwner(element)) {
        continue;
      }
      final declarationSource = unit.result.content.substring(
        declaration.offset,
        declaration.end,
      );
      final ownerRoles = terminalLayoutOwnerInstantiations(declarationSource)
          .map((owner) => _rootPageScrollRoles[owner.signature])
          .whereType<String>()
          .toSet();
      if (ownerRoles.length == 1) {
        roles[_interfaceElementKey(element)] = ownerRoles.single;
      }
    }
  }
  return roles;
}

Map<String, String> _resolvedSemanticRootPageOwnerRoles(
  CompilationUnitMember declaration,
  Map<String, String> rolesByElement,
) {
  final visitor = _ResolvedSemanticRootPageOwnerVisitor(rolesByElement);
  declaration.accept(visitor);
  return visitor.rolesBySourceSignature;
}

String _interfaceElementKey(InterfaceElement element) {
  final source = element.library.firstFragment.source.fullName.replaceAll(
    '\\',
    '/',
  );
  return '$source#${element.displayName}';
}

Future<void> _validateProductionRootPageOwners(
  _ProductionAnalysis productionAnalysis,
  List<String> hardFailures,
) async {
  for (final unit in await productionAnalysis.units()) {
    for (final declaration in unit.result.unit.declarations) {
      if (declaration is! ClassDeclaration) continue;
      final element = declaration.declaredFragment?.element;
      if (element == null || !_implementsCatchRootScreenPageOwner(element)) {
        continue;
      }
      final symbol = declaration.namePart.typeName.lexeme;
      if (unit.relativePath == _canonicalRootScreenPageScrollPath &&
          symbol == 'CatchRootScreenPageScrollView') {
        continue;
      }
      final declarationSource = unit.result.content.substring(
        declaration.offset,
        declaration.end,
      );
      for (final failure in evaluateRootPageOwnerContract(
        symbol: symbol,
        declarationSource: declarationSource,
      )) {
        hardFailures.add('$failure (${unit.relativePath})');
      }
    }
  }
}

bool _implementsCatchRootScreenPageOwner(InterfaceElement element) =>
    element.allSupertypes.any((type) {
      final candidate = type.element;
      if (candidate.displayName != 'CatchRootScreenPageOwner') return false;
      final source = candidate.library.firstFragment.source.fullName.replaceAll(
        '\\',
        '/',
      );
      return source.endsWith('/$_canonicalRootScreenPageOwnerPath');
    });

List<String> resolvedScaffoldOwnershipFailures({
  required String relativePath,
  required CompilationUnit unit,
  String canonicalScaffoldPath = _canonicalScaffoldPath,
}) {
  final visitor = _ResolvedScaffoldOwnershipVisitor();
  unit.accept(visitor);
  final findings = visitor.findings;
  final failures = <String>[];
  if (relativePath == canonicalScaffoldPath) {
    final canonicalOwner = _namedDeclaration(unit, 'CatchScaffold');
    final allowed = canonicalOwner == null
        ? const <_ResolvedScaffoldFinding>[]
        : findings
              .where(
                (finding) =>
                    finding.kind == _ScaffoldFindingKind.construction &&
                    finding.isExactScaffold &&
                    finding.node.offset >= canonicalOwner.offset &&
                    finding.node.end <= canonicalOwner.end,
              )
              .toList();
    if (canonicalOwner == null || allowed.length != 1) {
      failures.add(
        '$screenScaffoldOwnershipCode $canonicalScaffoldPath: exactly one analyzer-resolved Flutter Scaffold construction must be owned by CatchScaffold',
      );
    }
    for (final finding in findings.where(
      (finding) => !allowed.contains(finding),
    )) {
      final line = unit.lineInfo.getLocation(finding.node.offset).lineNumber;
      failures.add(
        '$screenScaffoldOwnershipCode $relativePath:$line: ${finding.description} is outside the canonical CatchScaffold owner',
      );
    }
    return failures;
  }

  for (final finding in findings) {
    final line = unit.lineInfo.getLocation(finding.node.offset).lineNumber;
    failures.add(
      '$screenScaffoldOwnershipCode $relativePath:$line: ${finding.description} is reserved for $canonicalScaffoldPath',
    );
  }
  return failures;
}

List<int> _rawScaffoldLines(CompilationUnit unit) {
  return _rawScaffoldNodes(
    unit,
  ).map((node) => unit.lineInfo.getLocation(node.offset).lineNumber).toList();
}

List<AstNode> _rawScaffoldNodes(CompilationUnit unit) {
  final visitor = _RawScaffoldVisitor();
  unit.accept(visitor);
  return visitor.nodes;
}

Future<ResolvedUnitResult?> _resolvedUnit(
  AnalysisContextCollection collection,
  String absolutePath,
) async {
  if (!File(absolutePath).existsSync()) return null;
  final result = await collection
      .contextFor(absolutePath)
      .currentSession
      .getResolvedUnit(absolutePath);
  return result is ResolvedUnitResult ? result : null;
}

Future<List<String>> resolveScaffoldOwnershipFailuresForFile({
  required String root,
  required String relativePath,
  String canonicalScaffoldPath = _canonicalScaffoldPath,
}) async {
  final collection = _analysisContextCollection(root);
  final result = await _resolvedUnit(collection, _fromRoot(root, relativePath));
  if (result == null) {
    return <String>[
      '$screenScaffoldOwnershipCode $relativePath: analyzer could not resolve source',
    ];
  }
  return resolvedScaffoldOwnershipFailures(
    relativePath: relativePath,
    unit: result.unit,
    canonicalScaffoldPath: canonicalScaffoldPath,
  );
}

Future<List<String>> resolveRouteConstructionSummariesForFile({
  required String root,
  required String relativePath,
}) async {
  final collection = _analysisContextCollection(root);
  final result = await _resolvedUnit(collection, _fromRoot(root, relativePath));
  if (result == null) {
    return <String>['unresolved:$relativePath'];
  }
  final goRouteVisitor = _GoRoutePresentationVisitor(
    relativePath: relativePath,
    lineInfo: result.unit.lineInfo,
  );
  final pageRouteVisitor = _ImperativePageRouteVisitor(
    relativePath: relativePath,
    lineInfo: result.unit.lineInfo,
  );
  result.unit.accept(goRouteVisitor);
  result.unit.accept(pageRouteVisitor);
  return <String>[
    for (final route in goRouteVisitor.constructions)
      'go-route:${route.kind.name}:${route.routeType}:${route.routeId ?? '<unnamed>'}:${route.renderKind}:${route.inventorySafeConstructor}',
    for (final route in pageRouteVisitor.presentations)
      'page-route:${route.kind.name}:${route.routeType}:${route.inventorySupported}',
  ];
}

AnalysisContextCollection _analysisContextCollection(String root) {
  final dartSdk = Directory(analysisDartSdkPath());
  final includedPaths = <String>[
    root,
    for (final nestedRoot in const <String>[
      'apps/consumer',
      'apps/host',
      'packages/catch_ui',
    ])
      if (Directory(_fromRoot(root, nestedRoot)).existsSync())
        _fromRoot(root, nestedRoot),
  ];
  return AnalysisContextCollection(
    includedPaths: includedPaths,
    sdkPath: dartSdk.path,
  );
}

List<String> analysisContextMembershipFailures({
  required String root,
  required Iterable<String> relativePaths,
}) {
  final collection = _analysisContextCollection(root);
  final failures = <String>[];
  for (final relativePath in relativePaths) {
    try {
      collection.contextFor(_fromRoot(root, relativePath));
    } on StateError {
      failures.add(relativePath);
    }
  }
  return failures;
}

String analysisDartSdkPath() {
  final candidates = <String>[];
  final flutterRoot = Platform.environment['FLUTTER_ROOT'];
  if (flutterRoot != null && flutterRoot.isNotEmpty) {
    candidates.add('$flutterRoot/bin/cache/dart-sdk');
  }

  var cursor = File(Platform.resolvedExecutable).parent;
  while (true) {
    candidates.add(cursor.path);
    candidates.add('${cursor.path}/dart-sdk');
    candidates.add('${cursor.path}/bin/cache/dart-sdk');
    final parent = cursor.parent;
    if (parent.path == cursor.path) break;
    cursor = parent;
  }

  for (final path in candidates.toSet()) {
    final executable = File('$path/bin/dart');
    final legacyLibraries = File('$path/lib/_internal/libraries.dart');
    final metadataLibraries = File(
      '$path/lib/_internal/sdk_library_metadata/lib/libraries.dart',
    );
    if (executable.existsSync() &&
        (legacyLibraries.existsSync() || metadataLibraries.existsSync())) {
      return Directory(path).absolute.path;
    }
  }
  throw StateError(
    'Could not derive a complete Dart SDK from FLUTTER_ROOT or ${Platform.resolvedExecutable}.',
  );
}

CompilationUnitMember? _namedDeclaration(CompilationUnit unit, String symbol) {
  for (final declaration in unit.declarations) {
    String? declarationName;
    if (declaration is ClassDeclaration) {
      declarationName = declaration.namePart.typeName.lexeme;
    } else if (declaration is MixinDeclaration) {
      declarationName = declaration.name.lexeme;
    } else if (declaration is EnumDeclaration) {
      declarationName = declaration.namePart.typeName.lexeme;
    } else if (declaration is ExtensionTypeDeclaration) {
      declarationName = declaration.primaryConstructor.typeName.lexeme;
    } else if (declaration is FunctionDeclaration) {
      declarationName = declaration.name.lexeme;
    }
    if (declarationName == symbol) return declaration;
  }
  return null;
}

void _validateMediaHeroes(
  String root,
  List<Map<String, Object?>> screens,
  Map<String, Object?> topBarRegistry,
  List<String> hardFailures,
) {
  final exceptionPaths =
      ((topBarRegistry['rawChromeExceptions'] as List<Object?>?) ?? const [])
          .cast<Map<String, Object?>>()
          .where((entry) => entry['expression'] == 'SliverAppBar')
          .map((entry) => entry['path'])
          .whereType<String>()
          .toList();
  for (final screen in screens.where(
    (screen) =>
        (screen['topBar'] as Map<String, Object?>?)?['role'] == 'media-hero',
  )) {
    final source = (screen['source'] as Map<String, Object?>?) ?? const {};
    final sourcePath = source['file'] as String? ?? '';
    final sourceParts = sourcePath.split('/');
    final feature = sourceParts.length > 1 ? sourceParts[1] : '';
    final matching = exceptionPaths
        .where((path) => path.contains('/$feature/'))
        .toList();
    if (matching.isEmpty ||
        !matching.any(
          (path) => File(
            _fromRoot(root, path),
          ).readAsStringSync().contains('SliverAppBar'),
        )) {
      hardFailures.add(
        '$screenTopBarConformanceCode ${screen['id']}: no registered resolved SliverAppBar media hero for feature $feature',
      );
    }
  }
}

Map<String, Object?> _readJson(String path) =>
    (jsonDecode(File(path).readAsStringSync()) as Map).cast<String, Object?>();

String _fromRoot(String root, String relativePath) => '$root/$relativePath';

final class DeclarationBinding {
  const DeclarationBinding({required this.file, required this.symbol});

  final String file;
  final String symbol;

  @override
  bool operator ==(Object other) =>
      other is DeclarationBinding &&
      other.file == file &&
      other.symbol == symbol;

  @override
  int get hashCode => Object.hash(file, symbol);
}

final class _ProductionUnit {
  const _ProductionUnit({required this.relativePath, required this.result});

  final String relativePath;
  final ResolvedUnitResult result;
}

final class _ProductionAnalysis {
  _ProductionAnalysis({required this.root, required this.collection});

  final String root;
  final AnalysisContextCollection collection;
  Future<List<_ProductionUnit>>? _units;
  final List<String> unresolvedPaths = <String>[];

  Future<List<_ProductionUnit>> units() => _units ??= _loadUnits();

  Future<List<_ProductionUnit>> _loadUnits() async {
    final paths = <String>[];
    for (final sourceRoot in const <String>[
      'lib',
      'apps/host/lib',
      'apps/consumer/lib',
      'packages/catch_ui/lib',
    ]) {
      final directory = Directory(_fromRoot(root, sourceRoot));
      if (!directory.existsSync()) continue;
      await for (final entity in directory.list(
        recursive: true,
        followLinks: false,
      )) {
        if (entity is! File) continue;
        final relativePath = entity.path.substring(root.length + 1);
        if (_isHandAuthoredPresentationSource(relativePath)) {
          paths.add(relativePath);
        }
      }
    }
    paths.sort();
    final units = <_ProductionUnit>[];
    for (final relativePath in paths) {
      final result = await _resolvedUnit(
        collection,
        _fromRoot(root, relativePath),
      );
      if (result == null) {
        unresolvedPaths.add(relativePath);
      } else {
        units.add(_ProductionUnit(relativePath: relativePath, result: result));
      }
    }
    return units;
  }
}

final class _ResolvedImperativePagePresentation {
  const _ResolvedImperativePagePresentation({
    required this.siteId,
    required this.line,
    required this.routeType,
    required this.kind,
    required this.inventorySupported,
    required this.expression,
    required this.fullscreenDialog,
  });

  final String siteId;
  final int line;
  final String routeType;
  final _RouteConstructionKind kind;
  final bool inventorySupported;
  final Expression? expression;
  final Expression? fullscreenDialog;

  Set<_ReachTarget> rootsForTarget(String presentationTarget, String root) {
    final expression = this.expression;
    if (expression == null) return const <_ReachTarget>{};
    final visitor = _ReferencedExecutableVisitor(root);
    expression.accept(visitor);
    return visitor.elements
        .where(
          (element) =>
              _presentationNameForElement(element) == presentationTarget,
        )
        .map((element) => _reachTargetForElement(element, root))
        .whereType<_ReachTarget>()
        .toSet();
  }
}

final class _ImperativePageRouteVisitor extends RecursiveAstVisitor<void> {
  _ImperativePageRouteVisitor({
    required this.relativePath,
    required this.lineInfo,
  });

  final String relativePath;
  final LineInfo lineInfo;
  final List<_ResolvedImperativePagePresentation> presentations =
      <_ResolvedImperativePagePresentation>[];
  final _materialOccurrences = <String, int>{};
  var _unsupportedOrdinal = 0;

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final constructor = node.constructorName.element?.baseElement;
    if (constructor is ConstructorElement) {
      final element =
          _interfaceElementForType(node.staticType) ??
          constructor.enclosingElement;
      if (_isFlutterPageRouteSubtype(element)) {
        final routeType = node.constructorName.type.toSource();
        _record(
          node: node,
          routeType: routeType,
          element: element,
          kind: _RouteConstructionKind.constructor,
          inventorySafeSpelling: _isCanonicalMaterialPageRouteSpelling(
            routeType,
          ),
          argumentList: node.argumentList,
        );
      }
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    final element = _interfaceElementForType(node.staticType);
    if (element != null && _isFlutterPageRouteSubtype(element)) {
      _record(
        node: node,
        routeType: node.staticType?.getDisplayString() ?? '<PageRoute>',
        element: element,
        kind: _RouteConstructionKind.factoryInvocation,
        inventorySafeSpelling: false,
        argumentList: node.argumentList,
      );
    }
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final element = _interfaceElementForType(node.staticType);
    if (element != null && _isFlutterPageRouteSubtype(element)) {
      _record(
        node: node,
        routeType: node.staticType?.getDisplayString() ?? '<PageRoute>',
        element: element,
        kind: _RouteConstructionKind.factoryInvocation,
        inventorySafeSpelling: false,
        argumentList: node.argumentList,
      );
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitConstructorReference(ConstructorReference node) {
    final constructor = node.constructorName.element?.baseElement;
    if (constructor is ConstructorElement &&
        _isFlutterPageRouteSubtype(constructor.enclosingElement)) {
      _record(
        node: node,
        routeType: node.constructorName.type.toSource(),
        element: constructor.enclosingElement,
        kind: _RouteConstructionKind.constructorTearOff,
        inventorySafeSpelling: false,
        argumentList: null,
      );
    }
    super.visitConstructorReference(node);
  }

  void _record({
    required AstNode node,
    required String routeType,
    required InterfaceElement element,
    required _RouteConstructionKind kind,
    required bool inventorySafeSpelling,
    required ArgumentList? argumentList,
  }) {
    final inventorySupported =
        kind == _RouteConstructionKind.constructor &&
        _isFlutterMaterialPageRouteInterface(element) &&
        inventorySafeSpelling;
    final arguments = _namedArguments(argumentList);
    final expression = arguments['builder'] ?? arguments['pageBuilder'];
    final fullscreen = arguments['fullscreenDialog'];
    final identity = imperativePageIdentity(
      sourcePath: relativePath,
      presentationExpression: expression?.toSource() ?? '',
      fullscreenDialogExpression: fullscreen?.toSource(),
    );
    final ordinal = inventorySupported
        ? _materialOccurrences.update(
            identity,
            (value) => value + 1,
            ifAbsent: () => 1,
          )
        : ++_unsupportedOrdinal;
    presentations.add(
      _ResolvedImperativePagePresentation(
        siteId: inventorySupported
            ? 'material-page:$identity:$ordinal'
            : 'unsupported-page-route:$relativePath:$ordinal',
        line: lineInfo.getLocation(node.offset).lineNumber,
        routeType: routeType,
        kind: kind,
        inventorySupported: inventorySupported,
        expression: arguments['builder'] ?? arguments['pageBuilder'],
        fullscreenDialog: arguments['fullscreenDialog'],
      ),
    );
  }
}

// Match the generated semantic identity; physical source positions are live
// diagnostics and do not participate in a route's canonical contract.
String imperativePageIdentity({
  required String sourcePath,
  required String presentationExpression,
  String? fullscreenDialogExpression,
}) {
  final payload = jsonEncode([
    _normalizeDartExpression(presentationExpression),
    fullscreenDialogExpression == null
        ? null
        : _normalizeDartExpression(fullscreenDialogExpression),
  ]);
  return '$sourcePath:${sha256.convert(utf8.encode(payload))}';
}

enum _RouteConstructionKind {
  constructor('direct constructor'),
  factoryInvocation('factory or constructor-alias invocation'),
  constructorTearOff('constructor tear-off');

  const _RouteConstructionKind(this.label);

  final String label;
}

final class _ResolvedRoutePresentation {
  const _ResolvedRoutePresentation({
    required this.renderKind,
    required this.expression,
  });

  final String renderKind;
  final Expression expression;

  Set<_ReachTarget> rootsForTarget(String presentationTarget, String root) {
    final visitor = _ReferencedExecutableVisitor(root);
    expression.accept(visitor);
    return visitor.elements
        .where(
          (element) =>
              _presentationNameForElement(element) == presentationTarget,
        )
        .map((element) => _reachTargetForElement(element, root))
        .whereType<_ReachTarget>()
        .toSet();
  }
}

final class _ResolvedGoRouteConstruction {
  const _ResolvedGoRouteConstruction({
    required this.relativePath,
    required this.line,
    required this.routeType,
    required this.kind,
    required this.inventorySafeConstructor,
    required this.routeId,
    required this.renderKind,
    required this.expression,
    required this.problem,
  });

  final String relativePath;
  final int line;
  final String routeType;
  final _RouteConstructionKind kind;
  final bool inventorySafeConstructor;
  final String? routeId;
  final String renderKind;
  final Expression? expression;
  final String? problem;

  _ResolvedRoutePresentation? get presentation {
    final expression = this.expression;
    if (routeId == null || expression == null) return null;
    return _ResolvedRoutePresentation(
      renderKind: renderKind,
      expression: expression,
    );
  }
}

final class _GoRoutePresentationVisitor extends RecursiveAstVisitor<void> {
  _GoRoutePresentationVisitor({
    required this.relativePath,
    required this.lineInfo,
  });

  final String relativePath;
  final LineInfo lineInfo;
  final List<_ResolvedGoRouteConstruction> constructions =
      <_ResolvedGoRouteConstruction>[];

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final constructor = node.constructorName.element?.baseElement;
    if (constructor is ConstructorElement) {
      final element =
          _interfaceElementForType(node.staticType) ??
          constructor.enclosingElement;
      if (_isGoRouteSubtype(element)) {
        final routeType = node.constructorName.type.toSource();
        _record(
          node: node,
          routeType: routeType,
          kind: _RouteConstructionKind.constructor,
          inventorySafeConstructor:
              (_isGoRouteInterface(element) &&
                  _isCanonicalGoRouteSpelling(routeType)) ||
              (element.displayName == 'HostWorkspaceDestination' &&
                  element.library.uri.toString() ==
                      'package:catch_dating_app/routing/go_router.dart' &&
                  node.argumentList.arguments.whereType<NamedExpression>().any(
                    (argument) =>
                        argument.name.label.name == 'root' &&
                        const {
                          'HostWorkspaceRoot.today',
                          'HostWorkspaceRoot.events',
                          'HostWorkspaceRoot.audience',
                          'HostWorkspaceRoot.inbox',
                          'HostWorkspaceRoot.organizer',
                        }.contains(argument.expression.toSource()),
                  )),
          argumentList: node.argumentList,
        );
      }
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    final element = _interfaceElementForType(node.staticType);
    if (element != null && _isGoRouteSubtype(element)) {
      _record(
        node: node,
        routeType: node.staticType?.getDisplayString() ?? '<GoRoute>',
        kind: _RouteConstructionKind.factoryInvocation,
        inventorySafeConstructor: false,
        argumentList: node.argumentList,
      );
    }
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final element = _interfaceElementForType(node.staticType);
    if (element != null && _isGoRouteSubtype(element)) {
      if (!_isCanonicalGoRouterExecutable(node.methodName.element)) {
        _record(
          node: node,
          routeType: node.staticType?.getDisplayString() ?? '<GoRoute>',
          kind: _RouteConstructionKind.factoryInvocation,
          inventorySafeConstructor: false,
          argumentList: node.argumentList,
        );
      }
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitConstructorReference(ConstructorReference node) {
    final constructor = node.constructorName.element?.baseElement;
    if (constructor is ConstructorElement &&
        _isGoRouteSubtype(constructor.enclosingElement)) {
      _record(
        node: node,
        routeType: node.constructorName.type.toSource(),
        kind: _RouteConstructionKind.constructorTearOff,
        inventorySafeConstructor: false,
        argumentList: null,
      );
    }
    super.visitConstructorReference(node);
  }

  void _record({
    required AstNode node,
    required String routeType,
    required _RouteConstructionKind kind,
    required bool inventorySafeConstructor,
    required ArgumentList? argumentList,
  }) {
    final arguments = _namedArguments(argumentList);
    final name = arguments['name'];
    final routeId = _routeIdFromNameExpression(name);
    final (renderKind, expression) = switch (arguments) {
      {'builder': final Expression expression} => ('builder', expression),
      {'pageBuilder': final Expression expression} => (
        'pageBuilder',
        expression,
      ),
      {'redirect': final Expression expression} => ('redirect', expression),
      _ => ('missing', null),
    };
    final isUnnamedRedirectOnly =
        name == null &&
        arguments.containsKey('redirect') &&
        !arguments.containsKey('builder') &&
        !arguments.containsKey('pageBuilder');
    final problem = switch ((name, routeId, expression)) {
      (final Expression _, null, _) =>
        'GoRoute name must be expressed as Routes.<id>.name',
      (null, null, _) when !isUnnamedRedirectOnly =>
        'an unnamed GoRoute is allowed only for a redirect-only legacy path',
      (_, final String _, null) =>
        'named GoRoute has no builder, pageBuilder, or redirect presentation',
      _ => null,
    };
    constructions.add(
      _ResolvedGoRouteConstruction(
        relativePath: relativePath,
        line: lineInfo.getLocation(node.offset).lineNumber,
        routeType: routeType,
        kind: kind,
        inventorySafeConstructor: inventorySafeConstructor,
        routeId: routeId,
        renderKind: renderKind,
        expression: expression,
        problem: problem,
      ),
    );
  }
}

Map<String, Expression> _namedArguments(ArgumentList? argumentList) {
  final arguments = <String, Expression>{};
  if (argumentList == null) return arguments;
  for (final argument in argumentList.arguments) {
    if (argument is NamedExpression) {
      arguments[argument.name.label.name] = argument.expression;
    }
  }
  return arguments;
}

InterfaceElement? _interfaceElementForType(DartType? type) {
  if (type is InterfaceType) return type.element;
  return null;
}

bool _isCanonicalGoRouteSpelling(String source) =>
    RegExp(r'(?:^|\.)GoRoute(?:<.*>)?$').hasMatch(source);

bool _isCanonicalMaterialPageRouteSpelling(String source) =>
    RegExp(r'(?:^|\.)MaterialPageRoute(?:<.*>)?$').hasMatch(source);

bool _isCanonicalGoRouterExecutable(Element? element) {
  if (element is! ExecutableElement) return false;
  final source = element.library.firstFragment.source.fullName.replaceAll(
    '\\',
    '/',
  );
  return source.endsWith('/lib/routing/go_router.dart');
}

String? _routeIdFromNameExpression(Expression? expression) {
  if (expression == null) return null;
  return RegExp(
    r'^Routes\.([A-Za-z][A-Za-z0-9_]*)\.name$',
  ).firstMatch(expression.toSource())?.group(1);
}

String? _presentationNameForElement(Element element) {
  if (element is ConstructorElement) {
    final typeName = element.enclosingElement.name;
    final constructorName = element.name;
    if (constructorName == null ||
        constructorName.isEmpty ||
        constructorName == 'new') {
      return typeName;
    }
    return '$typeName.$constructorName';
  }
  if (element is ExecutableElement) {
    final enclosing = element.enclosingElement;
    if (enclosing is InterfaceElement) {
      return '${enclosing.displayName}.${element.displayName}';
    }
    return element.displayName;
  }
  return null;
}

final class _ReachTarget {
  const _ReachTarget({required this.file, required this.symbol, this.member});

  final String file;
  final String symbol;
  final String? member;

  DeclarationBinding? get declaration =>
      member == null ? DeclarationBinding(file: file, symbol: symbol) : null;

  @override
  bool operator ==(Object other) =>
      other is _ReachTarget &&
      other.file == file &&
      other.symbol == symbol &&
      other.member == member;

  @override
  int get hashCode => Object.hash(file, symbol, member);
}

_ReachTarget? _reachTargetForElement(Element original, String root) {
  final sourcePath = original.firstFragment.libraryFragment?.source.fullName;
  if (sourcePath == null) return null;
  if (!sourcePath.startsWith('$root/')) return null;
  final relativePath = sourcePath.substring(root.length + 1);
  if (!_isHandAuthoredPresentationSource(relativePath)) return null;

  final element = original.baseElement;
  if (element is ConstructorElement) {
    if (!_isPresentationInterface(element.enclosingElement)) return null;
    return _ReachTarget(
      file: relativePath,
      symbol:
          element.enclosingElement.name ?? element.enclosingElement.displayName,
    );
  }
  if (element is! ExecutableElement) return null;
  if (!_isPresentationType(element.returnType)) return null;
  final enclosing = element.enclosingElement;
  if (enclosing is InterfaceElement) {
    return _ReachTarget(
      file: relativePath,
      symbol: enclosing.name ?? enclosing.displayName,
      member: element.displayName,
    );
  }
  return _ReachTarget(file: relativePath, symbol: element.displayName);
}

bool _isPresentationType(DartType type) {
  if (type is InterfaceType) return _isPresentationInterface(type.element);
  return RegExp(
    r'\b(?:Widget|State|Page)(?:\b|<)',
  ).hasMatch(type.getDisplayString());
}

bool _isPresentationInterface(InterfaceElement element) {
  bool matches(InterfaceElement candidate) =>
      const <String>{'Widget', 'State', 'Page'}.contains(candidate.displayName);
  return matches(element) ||
      element.allSupertypes.any((type) => matches(type.element));
}

bool _isHandAuthoredPresentationSource(String relativePath) =>
    relativePath.endsWith('.dart') &&
    !relativePath.endsWith('.g.dart') &&
    !relativePath.endsWith('.freezed.dart') &&
    (relativePath.startsWith('lib/') ||
        relativePath.startsWith('packages/catch_ui/lib/') ||
        relativePath.startsWith('apps/host/lib/') ||
        relativePath.startsWith('apps/consumer/lib/'));

/// Analyzer-resolved universal terminal proof used by the production layout
/// gate and its adversarial tests.
///
/// A registered owner must still instantiate its configured canonical family
/// directly somewhere in its reachable return tree. This proof only closes
/// the remaining branches that pass through typed production Widget adapters;
/// unresolved, external, cyclic, or mixed-family paths fail closed.
Future<bool> resolvedLayoutOwnerOnEveryBranch({
  required String root,
  required String relativePath,
  required String symbol,
  required Set<String> acceptedSignatures,
  Set<DeclarationBinding> acceptedOwnerBindings = const <DeclarationBinding>{},
}) async {
  final collection = _analysisContextCollection(root);
  return _ResolvedLayoutOwnerTerminalProof(
    root: root,
    collection: collection,
    acceptedSignatures: acceptedSignatures,
    acceptedOwnerBindings: acceptedOwnerBindings,
  ).everyTerminalUses(_ReachTarget(file: relativePath, symbol: symbol));
}

final class _ResolvedLayoutOwnerTerminalProof {
  _ResolvedLayoutOwnerTerminalProof({
    required this.root,
    required this.collection,
    required this.acceptedSignatures,
    required this.acceptedOwnerBindings,
  });

  final String root;
  final AnalysisContextCollection collection;
  final Set<String> acceptedSignatures;
  final Set<DeclarationBinding> acceptedOwnerBindings;
  final Map<String, Future<ResolvedUnitResult?>> _unitCache =
      <String, Future<ResolvedUnitResult?>>{};

  Future<bool> everyTerminalUses(_ReachTarget target) =>
      _targetEveryTerminalUses(target, visiting: <_ReachTarget>{});

  Future<bool> _targetEveryTerminalUses(
    _ReachTarget target, {
    required Set<_ReachTarget> visiting,
  }) async {
    if (target.declaration case final declaration?) {
      if (acceptedOwnerBindings.contains(declaration)) return true;
    }
    if (!visiting.add(target)) return false;
    try {
      final absolutePath = _fromRoot(root, target.file);
      final result = await (_unitCache[absolutePath] ??= _resolvedUnit(
        collection,
        absolutePath,
      ));
      if (result == null) return false;
      final declaration = _namedDeclaration(result.unit, target.symbol);
      if (declaration == null) return false;
      final graph = _LayoutOwnerTerminalGraph(declaration);
      final bodies = _targetBodies(declaration, target, graph);
      if (bodies.isEmpty) return false;
      final roots = <AstNode>[];
      for (final body in bodies) {
        graph._indexBody(body);
        roots.addAll(graph._returnRoots(body));
      }
      if (roots.isEmpty) return false;
      for (final terminal in roots) {
        if (!await _nodeEveryTerminalUses(
          terminal,
          graph: graph,
          visitingNodes: <AstNode>{},
          visitingTargets: visiting,
        )) {
          return false;
        }
      }
      return true;
    } finally {
      visiting.remove(target);
    }
  }

  List<FunctionBody> _targetBodies(
    CompilationUnitMember declaration,
    _ReachTarget target,
    _LayoutOwnerTerminalGraph graph,
  ) {
    if (declaration is FunctionDeclaration && target.member == null) {
      return <FunctionBody>[declaration.functionExpression.body];
    }
    if (declaration is! ClassDeclaration) return const <FunctionBody>[];
    if (target.member case final member?) {
      return switch (graph._executables[member]) {
        final FunctionBody body => <FunctionBody>[body],
        null => const <FunctionBody>[],
      };
    }
    if (graph._executables['build'] case final build?) {
      return <FunctionBody>[build];
    }
    if (graph._executables['createState'] case final createState?) {
      return <FunctionBody>[createState];
    }
    return const <FunctionBody>[];
  }

  Future<bool> _nodeEveryTerminalUses(
    AstNode node, {
    required _LayoutOwnerTerminalGraph graph,
    required Set<AstNode> visitingNodes,
    required Set<_ReachTarget> visitingTargets,
  }) async {
    if (!visitingNodes.add(node)) return false;
    try {
      if (node case final ParenthesizedExpression expression) {
        return await _nodeEveryTerminalUses(
          expression.expression,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
      }
      if (node case final AwaitExpression expression) {
        return await _nodeEveryTerminalUses(
          expression.expression,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
      }
      if (node case final AsExpression expression) {
        return await _nodeEveryTerminalUses(
          expression.expression,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
      }
      if (node case final PostfixExpression expression
          when expression.operator.lexeme == '!') {
        return await _nodeEveryTerminalUses(
          expression.operand,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
      }
      if (node case final ConditionalExpression expression) {
        return await _nodeEveryTerminalUses(
              expression.thenExpression,
              graph: graph,
              visitingNodes: visitingNodes,
              visitingTargets: visitingTargets,
            ) &&
            await _nodeEveryTerminalUses(
              expression.elseExpression,
              graph: graph,
              visitingNodes: visitingNodes,
              visitingTargets: visitingTargets,
            );
      }
      if (node case final SwitchExpression expression) {
        if (expression.cases.isEmpty) return false;
        for (final branch in expression.cases) {
          if (!await _nodeEveryTerminalUses(
            branch.expression,
            graph: graph,
            visitingNodes: visitingNodes,
            visitingTargets: visitingTargets,
          )) {
            return false;
          }
        }
        return true;
      }
      if (node case final SimpleIdentifier identifier) {
        final values = graph._values[identifier.name];
        if (values != null && values.isNotEmpty) {
          for (final value in values) {
            if (!await _nodeEveryTerminalUses(
              value,
              graph: graph,
              visitingNodes: visitingNodes,
              visitingTargets: visitingTargets,
            )) {
              return false;
            }
          }
          return true;
        }
        return await _resolvedExecutableEveryTerminalUses(
          identifier.element,
          visiting: visitingTargets,
        );
      }
      if (node case final InstanceCreationExpression creation) {
        final signature = _resolvedInstanceCreationSignature(creation);
        if (acceptedSignatures.contains(signature)) return true;
        if (signature == 'Stack') {
          return await _resolvedStackEveryTerminalUses(
            creation.argumentList,
            graph: graph,
            visitingNodes: visitingNodes,
            visitingTargets: visitingTargets,
          );
        }
        final transparent = await _resolvedTransparentInvocationUses(
          signature,
          creation.argumentList,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
        if (transparent != null) return transparent;
        return await _resolvedExecutableEveryTerminalUses(
          creation.constructorName.element,
          visiting: visitingTargets,
        );
      }
      if (node case final MethodInvocation invocation) {
        final signature = _methodInvocationSignature(invocation);
        if (acceptedSignatures.contains(signature)) return true;
        if (signature == 'Stack') {
          return await _resolvedStackEveryTerminalUses(
            invocation.argumentList,
            graph: graph,
            visitingNodes: visitingNodes,
            visitingTargets: visitingTargets,
          );
        }
        if (invocation.target == null) {
          final helper = graph._executables[invocation.methodName.name];
          if (helper != null) {
            graph._indexBody(helper);
            final roots = graph._returnRoots(helper);
            if (roots.isEmpty) return false;
            for (final root in roots) {
              if (!await _nodeEveryTerminalUses(
                root,
                graph: graph,
                visitingNodes: visitingNodes,
                visitingTargets: visitingTargets,
              )) {
                return false;
              }
            }
            return true;
          }
        }
        final transparent = await _resolvedTransparentInvocationUses(
          signature,
          invocation.argumentList,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
        if (transparent != null) return transparent;
        return await _resolvedExecutableEveryTerminalUses(
          invocation.methodName.element,
          visiting: visitingTargets,
        );
      }
      if (node case final FunctionExpressionInvocation invocation) {
        return await _nodeEveryTerminalUses(
          invocation.function,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        );
      }
      if (node case final FunctionExpression function) {
        graph._indexBody(function.body);
        final roots = graph._returnRoots(function.body);
        if (roots.isEmpty) return false;
        for (final root in roots) {
          if (!await _nodeEveryTerminalUses(
            root,
            graph: graph,
            visitingNodes: visitingNodes,
            visitingTargets: visitingTargets,
          )) {
            return false;
          }
        }
        return true;
      }
      return false;
    } finally {
      visitingNodes.remove(node);
    }
  }

  Future<bool?> _resolvedTransparentInvocationUses(
    String signature,
    ArgumentList arguments, {
    required _LayoutOwnerTerminalGraph graph,
    required Set<AstNode> visitingNodes,
    required Set<_ReachTarget> visitingTargets,
  }) async {
    final named = arguments.arguments.whereType<NamedExpression>().toList();
    final builders = named
        .where(
          (argument) =>
              _widgetBuilderOwnerSignatures.contains(signature) &&
              _isWidgetBuilderArgumentName(argument.name.label.name),
        )
        .map((argument) => argument.expression)
        .toList();
    if (builders.isNotEmpty) {
      for (final builder in builders) {
        if (!await _nodeEveryTerminalUses(
          builder,
          graph: graph,
          visitingNodes: visitingNodes,
          visitingTargets: visitingTargets,
        )) {
          return false;
        }
      }
      return true;
    }
    final content = named
        .where(
          (argument) => _transparentWidgetArgumentNames.contains(
            argument.name.label.name,
          ),
        )
        .map((argument) => argument.expression)
        .toList();
    if (content.isEmpty) return null;
    for (final child in content) {
      if (!await _nodeEveryTerminalUses(
        child,
        graph: graph,
        visitingNodes: visitingNodes,
        visitingTargets: visitingTargets,
      )) {
        return false;
      }
    }
    return true;
  }

  Future<bool> _resolvedStackEveryTerminalUses(
    ArgumentList arguments, {
    required _LayoutOwnerTerminalGraph graph,
    required Set<AstNode> visitingNodes,
    required Set<_ReachTarget> visitingTargets,
  }) async {
    final children = _namedArgumentExpression(arguments, 'children');
    if (children is! ListLiteral || children.elements.isEmpty) return false;
    final first = children.elements.first;
    if (first is! Expression || _isResolvedPositionedOverlay(first)) {
      return false;
    }
    if (!await _nodeEveryTerminalUses(
      first,
      graph: graph,
      visitingNodes: visitingNodes,
      visitingTargets: visitingTargets,
    )) {
      return false;
    }
    return children.elements.skip(1).every(_resolvedStackElementIsOverlay);
  }

  bool _resolvedStackElementIsOverlay(CollectionElement element) {
    if (element is Expression) return _isResolvedPositionedOverlay(element);
    if (element is IfElement) {
      return _resolvedStackElementIsOverlay(element.thenElement) &&
          (element.elseElement == null ||
              _resolvedStackElementIsOverlay(element.elseElement!));
    }
    return false;
  }

  bool _isResolvedPositionedOverlay(Expression expression) {
    Expression current = expression;
    while (current is ParenthesizedExpression) {
      current = current.expression;
    }
    if (current is! InstanceCreationExpression) return false;
    final element = current.constructorName.element?.baseElement;
    if (element is ConstructorElement) {
      final name = element.enclosingElement.displayName;
      if (name == 'Positioned' || name == 'PositionedDirectional') return true;
    }
    return _isPositionedStackOverlay(current);
  }

  Future<bool> _resolvedExecutableEveryTerminalUses(
    Element? element, {
    required Set<_ReachTarget> visiting,
  }) async {
    if (element == null) return false;
    final target = _reachTargetForElement(element, root);
    if (target == null) return false;
    return _targetEveryTerminalUses(target, visiting: visiting);
  }
}

final class _PresentationReachabilityGraph {
  _PresentationReachabilityGraph({
    required this.root,
    required this.collection,
  });

  final String root;
  final AnalysisContextCollection collection;
  final Map<_ReachTarget, Set<_ReachTarget>> _dependencyCache =
      <_ReachTarget, Set<_ReachTarget>>{};
  final Map<String, Future<ResolvedUnitResult?>> _unitCache =
      <String, Future<ResolvedUnitResult?>>{};

  Future<Set<DeclarationBinding>> reachableDeclarations(
    Set<_ReachTarget> roots,
  ) async {
    final queue = <_ReachTarget>[...roots];
    final visited = <_ReachTarget>{};
    final declarations = <DeclarationBinding>{};
    while (queue.isNotEmpty) {
      final target = queue.removeLast();
      if (!visited.add(target)) continue;
      if (target.declaration case final declaration?) {
        declarations.add(declaration);
      }
      if (visited.length > 2000) {
        throw StateError(
          'Presentation reachability exceeded 2000 declarations from ${roots.map((root) => root.symbol).join(', ')}.',
        );
      }
      final dependencies = await _dependencies(target);
      queue.addAll(
        dependencies.where((dependency) => !visited.contains(dependency)),
      );
    }
    return declarations;
  }

  Future<Set<_ReachTarget>> _dependencies(_ReachTarget target) async {
    final cached = _dependencyCache[target];
    if (cached != null) return cached;
    final absolutePath = _fromRoot(root, target.file);
    final result = await (_unitCache[absolutePath] ??= _resolvedUnit(
      collection,
      absolutePath,
    ));
    if (result == null) return _dependencyCache[target] = <_ReachTarget>{};
    final declaration = _namedDeclaration(result.unit, target.symbol);
    if (declaration == null) {
      return _dependencyCache[target] = <_ReachTarget>{};
    }

    final nodes = <AstNode>[];
    if (declaration is FunctionDeclaration && target.member == null) {
      nodes.add(declaration.functionExpression.body);
    } else if (declaration is ClassDeclaration) {
      if (target.member == null) {
        for (final member in declaration.body.members) {
          if (member is ConstructorDeclaration) {
            nodes.add(member);
          }
        }
        if (_isFrameworkBuiltClass(declaration)) {
          for (final member
              in declaration.body.members.whereType<MethodDeclaration>()) {
            if (member.name.lexeme == 'createState' ||
                member.name.lexeme == 'build') {
              nodes.add(member);
            }
          }
        }
      } else {
        for (final member
            in declaration.body.members.whereType<MethodDeclaration>()) {
          if (member.name.lexeme == target.member) nodes.add(member);
        }
      }
    }

    final dependencies = <_ReachTarget>{};
    for (final node in nodes) {
      final visitor = _ReferencedExecutableVisitor(root);
      node.accept(visitor);
      dependencies.addAll(
        visitor.elements
            .map((element) => _reachTargetForElement(element, root))
            .whereType<_ReachTarget>(),
      );
    }
    return _dependencyCache[target] = dependencies;
  }
}

bool _isFrameworkBuiltClass(ClassDeclaration declaration) {
  final supertype = declaration.extendsClause?.superclass.toSource() ?? '';
  return RegExp(r'(?:Widget|State)(?:<[^>]+>)?$').hasMatch(supertype);
}

final class _ReferencedExecutableVisitor extends RecursiveAstVisitor<void> {
  _ReferencedExecutableVisitor(this.root);

  final String root;
  final Set<Element> elements = <Element>{};

  void _add(Element? element) {
    if (element == null) return;
    if (_reachTargetForElement(element, root) != null) elements.add(element);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    _add(node.constructorName.element);
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    _add(node.methodName.element);
    super.visitMethodInvocation(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    _add(node.element);
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (node.element is ExecutableElement) _add(node.element);
    super.visitSimpleIdentifier(node);
  }
}

final class LayoutOwnerInstantiation {
  const LayoutOwnerInstantiation({
    required this.signature,
    required this.namedArguments,
  });

  final String signature;
  final Map<String, String> namedArguments;
}

final class _LayoutOwnerInstantiationVisitor extends RecursiveAstVisitor<void> {
  _LayoutOwnerInstantiationVisitor({this.includeAllFunctionBodies = false});

  final bool includeAllFunctionBodies;
  final List<LayoutOwnerInstantiation> instantiations =
      <LayoutOwnerInstantiation>[];

  @override
  void visitNamedExpression(NamedExpression node) {
    if (includeAllFunctionBodies) {
      super.visitNamedExpression(node);
      return;
    }
    if (node.expression case final FunctionExpression callback) {
      if (_isWidgetBuilderArgument(node)) {
        callback.body.accept(this);
      }
      return;
    }
    super.visitNamedExpression(node);
  }

  @override
  void visitFunctionExpression(FunctionExpression node) {
    if (includeAllFunctionBodies) {
      super.visitFunctionExpression(node);
      return;
    }
    // Positional and behavior callbacks cannot supply the rendered screen
    // terminal. Widget-builder callbacks are visited by visitNamedExpression.
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.toSource();
    final constructorName = node.constructorName.name?.name;
    final signature = constructorName == null
        ? typeName
        : '$typeName.$constructorName';
    _add(signature, node.argumentList);
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final target = node.target?.toSource();
    final signature = target == null
        ? node.methodName.name
        : '$target.${node.methodName.name}';
    _add(signature, node.argumentList);
    super.visitMethodInvocation(node);
  }

  void _add(String signature, ArgumentList argumentList) {
    final namedArguments = <String, String>{};
    for (final argument in argumentList.arguments) {
      if (argument is NamedExpression) {
        namedArguments[argument.name.label.name] = argument.expression
            .toSource();
      }
    }
    instantiations.add(
      LayoutOwnerInstantiation(
        signature: signature,
        namedArguments: namedArguments,
      ),
    );
  }
}

final class _ResolvedSemanticRootPageOwnerVisitor
    extends RecursiveAstVisitor<void> {
  _ResolvedSemanticRootPageOwnerVisitor(this.rolesByElement);

  final Map<String, String> rolesByElement;
  final Map<String, String> rolesBySourceSignature = <String, String>{};

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final type = node.staticType;
    if (type is InterfaceType) {
      final role = rolesByElement[_interfaceElementKey(type.element)];
      if (role != null) {
        final typeName = node.constructorName.type.toSource();
        final constructorName = node.constructorName.name?.name;
        final signature = constructorName == null
            ? typeName
            : '$typeName.$constructorName';
        rolesBySourceSignature[signature] = role;
      }
    }
    super.visitInstanceCreationExpression(node);
  }
}

bool _isFlutterMaterialPageRouteInterface(InterfaceElement element) =>
    _isFlutterFrameworkInterface(
      element,
      name: 'MaterialPageRoute',
      sourceSuffix: 'flutter/src/material/page.dart',
    );

bool _isFlutterPageRouteInterface(InterfaceElement element) =>
    _isFlutterFrameworkInterface(
      element,
      name: 'PageRoute',
      sourceSuffix: 'flutter/src/widgets/pages.dart',
    );

bool _isFlutterPageRouteSubtype(InterfaceElement element) =>
    _isFlutterPageRouteInterface(element) ||
    element.allSupertypes.any(
      (type) => _isFlutterPageRouteInterface(type.element),
    );

bool _isGoRouteInterface(InterfaceElement element) {
  if (element.displayName != 'GoRoute') return false;
  final source = element.library.firstFragment.source;
  final uri = source.uri.toString();
  final fullName = source.fullName.replaceAll('\\', '/');
  return uri == 'package:go_router/src/route.dart' ||
      fullName.endsWith('/go_router/lib/src/route.dart') ||
      RegExp(r'/go_router-[^/]+/lib/src/route\.dart$').hasMatch(fullName);
}

bool _isGoRouteSubtype(InterfaceElement element) =>
    _isGoRouteInterface(element) ||
    element.allSupertypes.any((type) => _isGoRouteInterface(type.element));

bool _isFlutterScaffoldInterface(InterfaceElement element) =>
    _isFlutterFrameworkInterface(
      element,
      name: 'Scaffold',
      sourceSuffix: 'flutter/src/material/scaffold.dart',
    );

bool _isFlutterFrameworkInterface(
  InterfaceElement element, {
  required String name,
  required String sourceSuffix,
}) {
  if (element.displayName != name) return false;
  final source = element.library.firstFragment.source;
  return source.uri.toString().endsWith(sourceSuffix) ||
      source.fullName.replaceAll('\\', '/').endsWith(sourceSuffix);
}

bool _isFlutterScaffoldSubtype(InterfaceElement element) =>
    _isFlutterScaffoldInterface(element) ||
    element.allSupertypes.any(
      (type) => _isFlutterScaffoldInterface(type.element),
    );

bool _isFlutterScaffoldType(DartType? type) =>
    type is InterfaceType && _isFlutterScaffoldSubtype(type.element);

enum _ScaffoldFindingKind {
  construction,
  subclass,
  typeAlias,
  constructorAlias,
}

final class _ResolvedScaffoldFinding {
  const _ResolvedScaffoldFinding({
    required this.node,
    required this.kind,
    required this.isExactScaffold,
    required this.description,
  });

  final AstNode node;
  final _ScaffoldFindingKind kind;
  final bool isExactScaffold;
  final String description;
}

final class _ResolvedScaffoldOwnershipVisitor
    extends RecursiveAstVisitor<void> {
  final List<_ResolvedScaffoldFinding> findings = <_ResolvedScaffoldFinding>[];
  final Set<String> _keys = <String>{};

  void _add({
    required AstNode node,
    required _ScaffoldFindingKind kind,
    required bool isExactScaffold,
    required String description,
  }) {
    if (!_keys.add('${kind.name}:${node.offset}:${node.end}')) return;
    findings.add(
      _ResolvedScaffoldFinding(
        node: node,
        kind: kind,
        isExactScaffold: isExactScaffold,
        description: description,
      ),
    );
  }

  @override
  void visitClassDeclaration(ClassDeclaration node) {
    final element = node.declaredFragment?.element;
    if (element != null &&
        !_isFlutterScaffoldInterface(element) &&
        _isFlutterScaffoldSubtype(element)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.subclass,
        isExactScaffold: false,
        description:
            'class ${element.displayName} directly or indirectly subclasses Flutter Scaffold',
      );
    }
    super.visitClassDeclaration(node);
  }

  @override
  void visitGenericTypeAlias(GenericTypeAlias node) {
    final element = node.declaredFragment?.element;
    final aliasedType = element is TypeAliasElement
        ? element.aliasedType
        : null;
    if (_isFlutterScaffoldType(aliasedType)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.typeAlias,
        isExactScaffold:
            aliasedType is InterfaceType &&
            _isFlutterScaffoldInterface(aliasedType.element),
        description: 'type alias resolves to Flutter Scaffold or its subclass',
      );
    }
    super.visitGenericTypeAlias(node);
  }

  @override
  void visitConstructorReference(ConstructorReference node) {
    final constructor = node.constructorName.element?.baseElement;
    if (constructor is ConstructorElement &&
        _isFlutterScaffoldSubtype(constructor.enclosingElement)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.constructorAlias,
        isExactScaffold: _isFlutterScaffoldInterface(
          constructor.enclosingElement,
        ),
        description:
            'constructor tear-off resolves to Flutter Scaffold or its subclass',
      );
    }
    super.visitConstructorReference(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final type = node.staticType;
    if (_isFlutterScaffoldType(type)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.construction,
        isExactScaffold:
            type is InterfaceType && _isFlutterScaffoldInterface(type.element),
        description:
            'construction resolves to Flutter Scaffold or its subclass',
      );
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    final type = node.staticType;
    if (_isFlutterScaffoldType(type)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.construction,
        isExactScaffold:
            type is InterfaceType && _isFlutterScaffoldInterface(type.element),
        description:
            'constructor alias invocation resolves to Flutter Scaffold or its subclass',
      );
    }
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final type = node.staticType;
    if (_isFlutterScaffoldType(type)) {
      _add(
        node: node,
        kind: _ScaffoldFindingKind.construction,
        isExactScaffold:
            type is InterfaceType && _isFlutterScaffoldInterface(type.element),
        description:
            'factory invocation resolves to Flutter Scaffold or its subclass',
      );
    }
    super.visitMethodInvocation(node);
  }
}

final class _RawScaffoldVisitor extends RecursiveAstVisitor<void> {
  final List<AstNode> nodes = <AstNode>[];

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.toSource();
    if (typeName == 'Scaffold' || typeName.endsWith('.Scaffold')) {
      nodes.add(node);
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.methodName.name == 'Scaffold') nodes.add(node);
    super.visitMethodInvocation(node);
  }
}
