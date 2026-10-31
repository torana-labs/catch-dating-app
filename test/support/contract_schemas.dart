import 'dart:convert';
import 'dart:io';

/// JSON Schema contracts read straight from `contracts/`, bundled the way
/// `tool/contracts/generate_schema_contracts.mjs` bundles them: local `$ref`s
/// are inlined, nested `$schema`/`$id` keys dropped, and profile photo policy
/// bounds applied. Tests validate against the source of truth without a
/// generated Dart copy of every schema.

const _contractRoot = 'contracts';

/// The bundled schema whose `title` is [title], such as
/// `'EventDocument'` or `'CreateEventCallablePayload'`.
Map<String, Object?> contractSchema(String title) {
  final source = _sourcesByTitle[title];
  if (source == null) {
    throw ArgumentError.value(
      title,
      'title',
      'No contract schema has this title',
    );
  }
  return contractSchemaAt(source);
}

/// The bundled schema at [source], relative to `contracts/`, such as
/// `'firestore/events.schema.json'`.
Map<String, Object?> contractSchemaAt(String source) =>
    _bundled.putIfAbsent(source, () {
      final file = File('$_contractRoot/$source').absolute.path;
      final schema = _resolveRefs(_readJson(file), file, keepSchemaMeta: true);
      _applyProfilePhotoPolicy(schema);
      return schema! as Map<String, Object?>;
    });

final _bundled = <String, Map<String, Object?>>{};
final _documents = <String, Object?>{};

final Map<String, String> _sourcesByTitle = () {
  final sources = <String, String>{};
  final root = Directory(_contractRoot);
  for (final entity in root.listSync(recursive: true)) {
    if (entity is! File || !entity.path.endsWith('.schema.json')) continue;
    final title = (_readJson(entity.absolute.path)! as Map)['title'];
    if (title is! String) continue;
    final source = entity.path.substring(root.path.length + 1);
    final existing = sources[title];
    if (existing != null) {
      throw StateError('Schema title $title is used by $existing and $source');
    }
    sources[title] = source.replaceAll(r'\', '/');
  }
  return sources;
}();

Object? _readJson(String file) => _documents.putIfAbsent(
  file,
  () => jsonDecode(File(file).readAsStringSync()),
);

Object? _resolveRefs(
  Object? node,
  String currentFile, {
  bool keepSchemaMeta = false,
}) {
  if (node is List) {
    return [for (final item in node) _resolveRefs(item, currentFile)];
  }
  if (node is! Map) return node;
  final ref = node[r'$ref'];
  if (ref is String) {
    final (file, target) = _resolveReference(ref, currentFile);
    final resolved = _resolveRefs(target, file);
    final merged = <String, Object?>{
      if (resolved is Map)
        for (final entry in resolved.entries)
          if (entry.key != r'$schema' && entry.key != r'$id')
            entry.key as String: entry.value,
      ...(_resolveRefs({
            for (final entry in node.entries)
              if (entry.key != r'$ref') entry.key: entry.value,
          }, currentFile)!
          as Map<String, Object?>),
    };
    return merged.isEmpty ? true : merged;
  }
  return <String, Object?>{
    for (final entry in node.entries)
      if (keepSchemaMeta || (entry.key != r'$schema' && entry.key != r'$id'))
        entry.key as String: _resolveRefs(entry.value, currentFile),
  };
}

(String, Object?) _resolveReference(String ref, String currentFile) {
  if (RegExp(r'^[a-z]+://', caseSensitive: false).hasMatch(ref)) {
    throw UnsupportedError('Remote schema refs are not supported: $ref');
  }
  final hash = ref.indexOf('#');
  final target = hash < 0 ? ref : ref.substring(0, hash);
  final pointer = hash < 0 ? '' : ref.substring(hash + 1);
  final file = target.isEmpty
      ? currentFile
      : File.fromUri(Uri.file(currentFile).resolve(target)).path;
  return (file, _resolvePointer(_readJson(file), pointer));
}

Object? _resolvePointer(Object? document, String pointer) {
  if (pointer.isEmpty || pointer == '/') return document;
  if (!pointer.startsWith('/')) {
    throw UnsupportedError('Unsupported JSON pointer: #$pointer');
  }
  var value = document;
  for (final token in pointer.substring(1).split('/')) {
    final key = token.replaceAll('~1', '/').replaceAll('~0', '~');
    final index = int.tryParse(key);
    if (value is Map && value.containsKey(key)) {
      value = value[key];
    } else if (value is List && index != null && index < value.length) {
      value = value[index];
    } else {
      throw StateError('JSON pointer segment not found: $key');
    }
  }
  return value;
}

void _applyProfilePhotoPolicy(Object? value) {
  if (value is List) {
    value.forEach(_applyProfilePhotoPolicy);
    return;
  }
  if (value is! Map<String, Object?>) return;
  if (value['x-catch-maximumFrom'] == 'profilePhotoPolicy.maxPhotosMinusOne') {
    value['maximum'] = _maxProfilePhotos - 1;
    value.remove('x-catch-maximumFrom');
  }
  value.values.forEach(_applyProfilePhotoPolicy);
}

final int _maxProfilePhotos =
    (_readJson(
              File(
                '$_contractRoot/catalogs/profile_photo_policy.json',
              ).absolute.path,
            )!
            as Map)['maxPhotos']
        as int;
