part of 'catch_ui_rules.dart';

List<CatchUiMutationPendingFinding> catchUiMutationPendingWithoutErrorFindings(
  MethodDeclaration node,
) {
  if (node.name.lexeme != 'build') return const [];

  final mutationVariables = _MutationVariableVisitor();
  node.body.accept(mutationVariables);

  final errorSurfaces = _MutationErrorSurfaceVisitor(
    mutationVariables.expressions,
  );
  node.body.accept(errorSurfaces);

  final pendingReads = _MutationPendingReadVisitor(
    mutationVariables.expressions,
  );
  node.body.accept(pendingReads);

  return [
    for (final read in pendingReads.reads)
      if (!errorSurfaces.covers(read)) read,
  ];
}

class CatchUiMutationPendingFinding {
  const CatchUiMutationPendingFinding({
    required this.node,
    required this.label,
    required this.variableName,
    required this.mutationExpression,
  });

  final AstNode node;
  final String label;
  final String? variableName;
  final String? mutationExpression;
}

class _MutationVariableVisitor extends RecursiveAstVisitor<void> {
  final expressions = <String, String?>{};

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    final initializer = node.initializer;
    if (initializer == null) {
      super.visitVariableDeclaration(node);
      return;
    }

    final parent = node.parent;
    final declaredType = parent is VariableDeclarationList
        ? parent.type?.toSource() ?? ''
        : '';
    if (_isMutationWatchExpression(
      initializer,
      declaredType: declaredType,
      variableName: node.name.lexeme,
    )) {
      expressions[node.name.lexeme] = _watchedMutationExpression(initializer);
    }

    super.visitVariableDeclaration(node);
  }
}

class _MutationErrorSurfaceVisitor extends RecursiveAstVisitor<void> {
  _MutationErrorSurfaceVisitor(this.mutationVariables);

  final Map<String, String?> mutationVariables;
  final variableNames = <String>{};
  final mutationExpressions = <String>{};

  bool covers(CatchUiMutationPendingFinding finding) {
    final variableName = finding.variableName;
    if (variableName != null && variableNames.contains(variableName)) {
      return true;
    }
    final mutationExpression = finding.mutationExpression;
    return mutationExpression != null &&
        mutationExpressions.contains(mutationExpression);
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (node.identifier.name == 'hasError') {
      _addVariable(node.prefix.name);
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    if (node.propertyName.name == 'hasError') {
      final target = node.target;
      if (target is SimpleIdentifier) _addVariable(target.name);
    }
    super.visitPropertyAccess(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = _constructorTypeName(node);
    if ((typeName == 'CatchLocalizedErrorBanner' &&
            node.constructorName.name?.name == 'mutation') ||
        // Before resolution, explicit const named construction can be parsed
        // as a prefixed type with no separate constructor-name node.
        (node.constructorName.element == null &&
            node.constructorName.toSource() ==
                'CatchLocalizedErrorBanner.mutation')) {
      final mutation = _namedArgumentExpression(node, 'mutation');
      if (mutation != null) _addMutationExpression(mutation);
    }

    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    // Unresolved syntax represents implicit named construction as a method call.
    if (node.target?.toSource() == 'CatchLocalizedErrorBanner' &&
        node.methodName.name == 'mutation') {
      for (final argument in node.argumentList.arguments) {
        if (argument is NamedArgument && argument.name.lexeme == 'mutation') {
          _addMutationExpression(argument.argumentExpression);
        }
      }
    }

    if (node.methodName.name == 'mutationErrorMessage' &&
        node.argumentList.arguments.isNotEmpty) {
      final argument = node.argumentList.arguments.first;
      _addMutationExpression(argument.argumentExpression);
    }

    if (node.methodName.name == 'listenToCatchMutationErrors') {
      for (final argument in node.argumentList.arguments) {
        if (argument is NamedArgument && argument.name.lexeme == 'mutations') {
          _addMutationExpressionsFromArgument(argument);
        }
      }
    } else if (_isMutationErrorHelperName(node.methodName.name)) {
      for (final argument in node.argumentList.arguments) {
        _addMutationExpressionsFromArgument(argument);
      }
    }

    if (node.methodName.name == 'firstWhere' &&
        node.target is ListLiteral &&
        node.toSource().contains('.hasError')) {
      _addMutationExpressionsFromList(node.target as ListLiteral);
    }

    super.visitMethodInvocation(node);
  }

  void _addMutationExpressionsFromArgument(Argument argument) {
    final candidate = argument.argumentExpression;
    if (candidate is ListLiteral) {
      _addMutationExpressionsFromList(candidate);
    } else {
      _addMutationExpression(candidate);
    }
  }

  void _addMutationExpressionsFromList(ListLiteral list) {
    for (final element in list.elements) {
      if (element is Expression) _addMutationExpression(element);
    }
  }

  void _addMutationExpression(Expression expression) {
    if (expression is SimpleIdentifier) {
      _addVariable(expression.name);
      // A watched mutation state can be keyed by a local mutation handle:
      // `final handle = Controller.mutation(key); final state = ref.watch(handle)`.
      // The error listener receives that handle, while the state visitor stores
      // its canonical identifier as the watched expression.
      mutationExpressions.add(expression.name);
      return;
    }
    final watchedExpression = _watchedMutationExpression(expression);
    if (watchedExpression != null) {
      mutationExpressions.add(watchedExpression);
      return;
    }
    mutationExpressions.add(_canonicalMutationExpression(expression));
  }

  void _addVariable(String name) {
    variableNames.add(name);
    final expression = mutationVariables[name];
    if (expression != null) mutationExpressions.add(expression);
  }
}

class _MutationPendingReadVisitor extends RecursiveAstVisitor<void> {
  _MutationPendingReadVisitor(this.mutationVariables);

  final Map<String, String?> mutationVariables;
  final reads = <CatchUiMutationPendingFinding>[];

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (node.identifier.name == 'isPending' &&
        mutationVariables.containsKey(node.prefix.name)) {
      reads.add(
        CatchUiMutationPendingFinding(
          node: node.identifier,
          label: node.prefix.name,
          variableName: node.prefix.name,
          mutationExpression: mutationVariables[node.prefix.name],
        ),
      );
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    if (node.propertyName.name != 'isPending') {
      super.visitPropertyAccess(node);
      return;
    }

    final target = node.target;
    if (target is SimpleIdentifier &&
        mutationVariables.containsKey(target.name)) {
      reads.add(
        CatchUiMutationPendingFinding(
          node: node.propertyName,
          label: target.name,
          variableName: target.name,
          mutationExpression: mutationVariables[target.name],
        ),
      );
    } else if (target != null && _isDirectMutationWatchExpression(target)) {
      final mutationExpression = _watchedMutationExpression(target);
      reads.add(
        CatchUiMutationPendingFinding(
          node: node.propertyName,
          label: target.toSource(),
          variableName: null,
          mutationExpression: mutationExpression,
        ),
      );
    }

    super.visitPropertyAccess(node);
  }
}

bool _isMutationWatchExpression(
  Expression expression, {
  required String declaredType,
  required String variableName,
}) {
  final text = expression.toSource();
  if (!RegExp(r'\bref\.(?:watch|read)\s*\(').hasMatch(text)) return false;
  final lowerVariableName = variableName.toLowerCase();
  return declaredType.contains('Mutation') ||
      text.contains('Mutation') ||
      text.contains('mutation') ||
      lowerVariableName.contains('mutation');
}

bool _isDirectMutationWatchExpression(Expression expression) {
  final text = expression.toSource();
  return RegExp(r'\bref\.(?:watch|read)\s*\(').hasMatch(text) &&
      (text.contains('Mutation') || text.contains('mutation'));
}

bool _isMutationErrorHelperName(String name) {
  return name.contains('MutationError') || name.contains('ErrorMutation');
}

Expression? _namedArgumentExpression(
  InstanceCreationExpression node,
  String name,
) {
  for (final argument in node.argumentList.arguments) {
    if (argument is NamedArgument && argument.name.lexeme == name) {
      return argument.argumentExpression;
    }
  }
  return null;
}

String? _watchedMutationExpression(Expression expression) {
  if (expression is MethodInvocation &&
      expression.target?.toSource() == 'ref' &&
      (expression.methodName.name == 'watch' ||
          expression.methodName.name == 'read') &&
      expression.argumentList.arguments.length == 1) {
    return _canonicalMutationExpression(
      expression.argumentList.arguments.single.argumentExpression,
    );
  }
  return null;
}

String _canonicalMutationExpression(Expression expression) {
  return expression.toSource().replaceAll(RegExp(r'\s+'), '');
}
