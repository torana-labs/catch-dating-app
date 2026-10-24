part of 'catch_ui_rules.dart';

extension _CatchUiTextRules on _CatchUiLayoutVisitor {
  bool _hasSanctionedAmbientTextAncestor(InstanceCreationExpression node) {
    var current = node.parent;
    while (current != null) {
      if (current is InstanceCreationExpression) {
        final typeName = _constructorTypeName(current);
        if (typeName == 'PopupMenuItem' ||
            typeName == 'Badge' ||
            typeName == 'AlertDialog' ||
            typeName == 'CupertinoAlertDialog' ||
            typeName == 'CupertinoDialogAction' ||
            typeName == 'InputDecoration') {
          return true;
        }
      }
      if (current is Statement ||
          current is FunctionBody ||
          current is ClassDeclaration) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  bool _textOwnsStyle(InstanceCreationExpression node) {
    if (_hasNamedArgument(node, 'style')) return true;
    if (_constructorMemberName(node) != 'rich' ||
        node.argumentList.arguments.isEmpty) {
      return false;
    }
    return node.argumentList.arguments.first.toSource().contains('style:');
  }
}
