import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';

import 'architecture_findings.dart';

const _reason =
    'Firestore stays in the data layer: only lib/contexts/*/data/ and '
    'packages/platform/lib/firebase/ may import cloud_firestore or hold its '
    'types (DocumentSnapshot cursors, Timestamp, FieldValue, Query, '
    'FirebaseFirestore). Return domain values or an opaque PageCursor instead.';

const _exceptionReason =
    'FirebaseException is translated where it is thrown: in the data layer, '
    'packages/platform/lib/firebase/ or packages/platform/lib/errors/. Other '
    'code reads AppException or a platform/errors helper.';

final _firestoreImport = RegExp(
  r'^package:cloud_firestore(?:_platform_interface|_web)?/',
);

final _firestorePackage = RegExp(
  r'^package:cloud_firestore(?:_platform_interface|_web)?/',
);

final _dataLayer = RegExp(r'^lib/contexts/[^/]+/data/');
const _platformFirebase = 'packages/platform/lib/firebase/';
const _platformErrors = 'packages/platform/lib/errors/';

/// Whether [relativePath] may use Firestore APIs and types.
bool isFirestoreDataLayer(String relativePath) =>
    _dataLayer.hasMatch(relativePath) ||
    relativePath.startsWith(_platformFirebase);

/// `catch_arch_firestore_outside_data`: Firestore imports, Firestore-typed
/// expressions and declarations, and `FirebaseException` outside the data
/// layer. The import and exception checks are syntactic; the type check reads
/// the resolved unit, so an inferred `final cursor = page.nextCursor` holding a
/// `DocumentSnapshot` is caught even without an import.
List<ArchitectureFinding> firestoreBoundaryFindings({
  required String relativePath,
  required CompilationUnit unit,
}) {
  if (isFirestoreDataLayer(relativePath)) return const [];
  final findings = <ArchitectureFinding>[];
  final reported = <int>{};
  void add(int offset, int length, String reason) {
    if (!reported.add(offset)) return;
    findings.add(
      ArchitectureFinding(
        ArchitectureCodes.firestoreOutsideData,
        offset,
        length,
        reason,
      ),
    );
  }

  for (final (:uri, :node) in importUris(unit)) {
    if (_firestoreImport.hasMatch(uri)) add(node.offset, node.length, _reason);
  }

  if (!relativePath.startsWith(_platformErrors)) {
    var token = unit.beginToken;
    while (!token.isEof) {
      if (token.lexeme == 'FirebaseException') {
        add(token.offset, token.length, _exceptionReason);
      }
      token = token.next!;
    }
  }

  final visitor = _FirestoreTypeVisitor();
  unit.accept(visitor);
  for (final node in visitor.sites) {
    add(node.offset, node.length, _reason);
  }
  findings.sort((a, b) => a.offset.compareTo(b.offset));
  return findings;
}

class _FirestoreTypeVisitor extends GeneralizingAstVisitor<void> {
  final sites = <AstNode>[];

  @override
  void visitImportDirective(ImportDirective node) {}

  @override
  void visitExportDirective(ExportDirective node) {}

  @override
  void visitNamedType(NamedType node) {
    if (mentionsFirestore(node.type)) {
      sites.add(node);
      return;
    }
    super.visitNamedType(node);
  }

  @override
  void visitExpression(Expression node) {
    if (mentionsFirestore(node.staticType)) {
      // Report the outermost Firestore-typed expression once.
      sites.add(node);
      return;
    }
    super.visitExpression(node);
  }
}

/// Whether [type] is, or is built from, a type declared by cloud_firestore.
bool mentionsFirestore(DartType? type, [int depth = 0]) {
  if (type == null || depth > 8) return false;
  final next = depth + 1;
  if (type is InterfaceType) {
    if (_firestorePackage.hasMatch(type.element.library.uri.toString())) {
      return true;
    }
    return type.typeArguments.any(
      (argument) => mentionsFirestore(argument, next),
    );
  }
  if (type is FunctionType) {
    return mentionsFirestore(type.returnType, next) ||
        type.formalParameters.any(
          (parameter) => mentionsFirestore(parameter.type, next),
        );
  }
  if (type is RecordType) {
    return type.positionalFields.any(
          (field) => mentionsFirestore(field.type, next),
        ) ||
        type.namedFields.any((field) => mentionsFirestore(field.type, next));
  }
  return false;
}
