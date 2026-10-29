import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

/// Syntax-only inventory of every constructor, including named/factory forms.
/// No analysis context, plugin, package resolution or repository output writes.
Map<String, Object?> collectComponentApi({
  required String repoRoot,
  List<String>? files,
  bool includeFramework = true,
  bool aliasesOnly = false,
}) {
  final rootDirectory = Directory(repoRoot).absolute;
  final rootUri = rootDirectory.uri;
  final paths =
      files ??
      [
        for (final root in [
          'packages/catch_ui/lib',
          'lib/platform/riverpod_ui',
        ])
          if (Directory.fromUri(rootUri.resolve(root)).existsSync())
            for (final file in Directory(
              rootUri.resolve(root).toFilePath(),
            ).listSync(recursive: true, followLinks: false))
              if (file is File &&
                  file.path.endsWith('.dart') &&
                  !file.path.endsWith('.g.dart'))
                file.path
                    .substring(rootDirectory.path.length + 1)
                    .replaceAll(Platform.pathSeparator, '/'),
      ];
  final classes = <Map<String, Object?>>[];
  final aliases = <Map<String, Object?>>[];
  final enums = <Map<String, Object?>>[];
  final failures = <String>[];
  for (final file in paths.toSet().toList()..sort()) {
    final path = rootUri.resolveUri(Uri.file(file)).toFilePath();
    final parsed = parseString(
      path: path,
      content: File(path).readAsStringSync(),
      throwIfDiagnostics: false,
    );
    for (final error in parsed.errors) {
      failures.add(
        '$file:${parsed.lineInfo.getLocation(error.offset).lineNumber}: '
        '${error.message}',
      );
    }
    Map<String, Object?> location(AstNode node) => {
      'file': file,
      'line': parsed.lineInfo.getLocation(node.offset).lineNumber,
      'column': parsed.lineInfo.getLocation(node.offset).columnNumber,
    };

    for (final declaration in parsed.unit.declarations) {
      switch (declaration) {
        case ClassDeclaration():
          if (aliasesOnly) continue;
          final name = declaration.namePart.typeName.lexeme;
          if (declaration.namePart is PrimaryConstructorDeclaration) {
            failures.add(
              '$file: $name uses primary-constructor syntax that '
              'requires an explicit API collector update',
            );
          }
          final fields = <String, String?>{};
          for (final field
              in declaration.body.members.whereType<FieldDeclaration>()) {
            if (field.isStatic) continue;
            for (final variable in field.fields.variables) {
              fields[variable.name.lexeme] =
                  field.fields.type?.toSource() ??
                  (variable.initializer is BooleanLiteral ? 'bool' : null);
            }
          }
          classes.add({
            ...location(declaration),
            'name': name,
            'base': declaration.extendsClause?.superclass.toSource(),
            'interfaces': [
              for (final interface
                  in declaration.implementsClause?.interfaces ?? <NamedType>[])
                interface.toSource(),
            ],
            'fields': fields,
            'typeParameters': {
              for (final parameter
                  in declaration.namePart.typeParameters?.typeParameters ??
                      <TypeParameter>[])
                parameter.name.lexeme: parameter.bound?.toSource(),
            },
            'constructors': [
              for (final constructor
                  in declaration.body.members
                      .whereType<ConstructorDeclaration>())
                if (!(constructor.name?.lexeme.startsWith('_') ?? false))
                  {
                    ...location(constructor),
                    'name': constructor.name?.lexeme ?? '',
                    'superConstructor':
                        [
                          for (final initializer
                              in constructor.initializers
                                  .whereType<SuperConstructorInvocation>())
                            RegExp(r'^super(?:\.([\w$]+))?\(')
                                    .firstMatch(initializer.toSource())
                                    ?.group(1) ??
                                '',
                        ].firstOrNull ??
                        '',
                    'parameters': [
                      for (final parameter in constructor.parameters.parameters)
                        {...location(parameter), ..._parameter(parameter)},
                    ],
                  },
            ],
          });
        case EnumDeclaration():
          if (aliasesOnly) continue;
          enums.add({
            ...location(declaration),
            'name': declaration.namePart.typeName.lexeme,
          });
        case GenericTypeAlias():
          aliases.add({
            ...location(declaration),
            'name': declaration.name.lexeme,
            'type': declaration.type.toSource(),
            'parameters': [
              for (final parameter
                  in declaration.typeParameters?.typeParameters ??
                      <TypeParameter>[])
                parameter.name.lexeme,
            ],
          });
        case FunctionTypeAlias():
          aliases.add({
            ...location(declaration),
            'name': declaration.name.lexeme,
            'type':
                '${declaration.returnType?.toSource() ?? 'dynamic'} '
                'Function${declaration.parameters.toSource()}',
            'parameters': [
              for (final parameter
                  in declaration.typeParameters?.typeParameters ??
                      <TypeParameter>[])
                parameter.name.lexeme,
            ],
          });
        case ClassTypeAlias():
          if (aliasesOnly) continue;
          failures.add(
            '$file: class aliases require an explicit API collector '
            'update so inherited constructors cannot escape the inventory',
          );
      }
    }
  }
  Map<String, Object?> framework = const {};
  Map<String, Object?> frameworkAliases = const {};
  if (includeFramework) {
    final config = File.fromUri(
      rootUri.resolve('.dart_tool/package_config.json'),
    );
    if (config.existsSync()) {
      final packages =
          (jsonDecode(config.readAsStringSync()) as Map)['packages'] as List;
      final flutter = packages
          .cast<Map>()
          .where((entry) => entry['name'] == 'flutter')
          .firstOrNull;
      if (flutter != null) {
        final packageRoot = config.uri.resolve(flutter['rootUri'] as String);
        final library = Uri.directory(
          packageRoot.toFilePath(),
        ).resolve(flutter['packageUri'] as String? ?? 'lib/').toFilePath();
        // Read inherited parameter types from the installed SDK.
        framework = collectComponentApi(
          repoRoot: library,
          files: [
            'src/widgets/framework.dart',
            'src/foundation/basic_types.dart',
          ],
          includeFramework: false,
        );
        failures.addAll((framework['failures'] as List).cast<String>());
        // Callback and builder typedefs are spread across Flutter libraries
        // (for example FormFieldValidator and InputCounterWidgetBuilder).
        // Read their syntax instead of maintaining a partial name allowlist.
        // Other SDK classes are outside our constructor inventory and may use
        // class-alias syntax; only collect typedefs in this additional pass.
        final engine = packages
            .cast<Map>()
            .where((entry) => entry['name'] == 'sky_engine')
            .firstOrNull;
        final aliasLibraries = [library];
        if (engine == null) {
          failures.add('sky_engine package is missing from ${config.path}');
        } else {
          // Flutter re-exports dart:ui callbacks, including VoidCallback.
          aliasLibraries.add(
            Uri.directory(
                  config.uri.resolve(engine['rootUri'] as String).toFilePath(),
                )
                .resolve(engine['packageUri'] as String? ?? 'lib/')
                .resolve('ui/')
                .toFilePath(),
          );
        }
        frameworkAliases = collectComponentApi(
          repoRoot: library,
          files: [
            for (final aliasLibrary in aliasLibraries)
              for (final file in Directory(
                aliasLibrary,
              ).listSync(recursive: true))
                if (file is File &&
                    file.path.endsWith('.dart') &&
                    file.readAsStringSync().contains('typedef '))
                  file.path,
          ],
          includeFramework: false,
          aliasesOnly: true,
        );
        failures.addAll((frameworkAliases['failures'] as List).cast<String>());
      } else {
        failures.add('Flutter package is missing from ${config.path}');
      }
    } else {
      failures.add('Package configuration is missing: ${config.path}');
    }
  }
  return {
    'classes': classes,
    'aliases': aliases,
    'enums': enums,
    'externalClasses': framework['classes'] ?? const [],
    'externalAliases': frameworkAliases['aliases'] ?? const [],
    'failures': failures,
  };
}

Map<String, Object?> _parameter(FormalParameter parameter) {
  final normal = parameter is DefaultFormalParameter
      ? parameter.parameter
      : parameter;
  final name = normal.name?.lexeme;
  final kind = switch (normal) {
    FieldFormalParameter() => 'field',
    SuperFormalParameter() => 'super',
    _ => 'value',
  };
  final String? type = switch (normal) {
    FieldFormalParameter(:final type, :final parameters) ||
    SuperFormalParameter(:final type, :final parameters) =>
      parameters == null
          ? type?.toSource()
          : '${type?.toSource() ?? 'dynamic'} Function${parameters.toSource()}',
    SimpleFormalParameter(:final type) => type?.toSource(),
    FunctionTypedFormalParameter(:final returnType, :final parameters) =>
      '${returnType?.toSource() ?? 'dynamic'} Function${parameters.toSource()}',
    _ => null,
  };
  return {
    // Named private field formals expose the name without the leading underscore.
    'name':
        kind == 'field' && parameter.isNamed && (name?.startsWith('_') ?? false)
        ? name!.substring(1)
        : name,
    'field': kind == 'field' ? name : null,
    'kind': kind,
    'type': type,
    'named': parameter.isNamed,
    'required': parameter.isRequired,
  };
}

void main(List<String> args) {
  if (args.contains('--help')) {
    stdout.writeln(
      'Usage: dart --packages=.dart_tool/package_config.json tool/design/lib/component_api.dart '
      '[--root <repo>] [--files <comma-separated paths>]',
    );
    return;
  }
  var root = Directory.current.path;
  List<String>? files;
  for (var i = 0; i < args.length; i++) {
    if (i + 1 >= args.length) throw ArgumentError('Missing value: ${args[i]}');
    switch (args[i]) {
      case '--root':
        root = Directory(args[++i]).absolute.path;
      case '--files':
        files = args[++i].split(',');
      default:
        throw ArgumentError('Unknown argument: ${args[i]}');
    }
  }
  final result = collectComponentApi(repoRoot: root, files: files);
  stdout.writeln(jsonEncode(result));
  if ((result['failures'] as List).isNotEmpty) exitCode = 1;
}
