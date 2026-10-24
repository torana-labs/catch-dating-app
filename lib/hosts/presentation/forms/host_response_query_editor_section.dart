import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'host_response_query_editor_parts_section.dart';

/// Copy is supplied by the Forms route's localization owner when the manager
/// callable is mounted. This widget does not introduce a second form model.
class HostResponseQueryEditorCopy {
  const HostResponseQueryEditorCopy({
    required this.title,
    required this.matchAll,
    required this.matchAny,
    required this.field,
    required this.condition,
    required this.value,
    required this.minimum,
    required this.maximum,
    required this.yes,
    required this.no,
    required this.addCondition,
    required this.addGroup,
    required this.remove,
    required this.apply,
    required this.reset,
    required this.invalidCondition,
    required this.operatorLabels,
  });

  final String title;
  final String matchAll;
  final String matchAny;
  final String field;
  final String condition;
  final String value;
  final String minimum;
  final String maximum;
  final String yes;
  final String no;
  final String addCondition;
  final String addGroup;
  final String remove;
  final String apply;
  final String reset;
  final String invalidCondition;
  final Map<HostResponseOperator, String> operatorLabels;
}

/// A bounded editor for one immutable published version's permitted fields.
/// The caller owns loading, page state and the actual manager callable.
class HostResponseQueryEditorSection extends StatefulWidget {
  const HostResponseQueryEditorSection({
    super.key,
    required this.fields,
    required this.copy,
    required this.onApply,
    this.initial,
  });

  final List<HostResponseQueryField> fields;
  final HostResponseQueryEditorCopy copy;
  final HostResponsePredicate? initial;
  final ValueChanged<HostResponsePredicate?> onApply;

  @override
  State<HostResponseQueryEditorSection> createState() =>
      _HostResponseQueryEditorSectionState();
}

class _HostResponseQueryEditorSectionState
    extends State<HostResponseQueryEditorSection> {
  late HostResponseGroup _root;

  @override
  void initState() {
    super.initState();
    _root = _initialRoot(widget.initial);
  }

  @override
  void didUpdateWidget(covariant HostResponseQueryEditorSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.initial, widget.initial) ||
        !identical(oldWidget.fields, widget.fields)) {
      _root = _initialRoot(widget.initial);
    }
  }

  HostResponseGroup _initialRoot(HostResponsePredicate? predicate) =>
      predicate is HostResponseGroup
      ? predicate
      : HostResponseGroup(
          match: HostResponseMatch.all,
          children: predicate == null ? const [] : [predicate],
        );

  HostResponseCondition _defaultCondition() {
    final field = widget.fields.first;
    return HostResponseCondition(
      questionId: field.questionId,
      operator: field.operators.contains(HostResponseOperator.present)
          ? HostResponseOperator.present
          : field.operators.first,
    );
  }

  HostResponseGroup _groupAt(List<int> path) {
    HostResponseGroup group = _root;
    for (final index in path) {
      group = group.children[index] as HostResponseGroup;
    }
    return group;
  }

  void _replace(List<int> path, HostResponsePredicate? replacement) {
    HostResponseGroup rewrite(HostResponseGroup group, int level) {
      final index = path[level];
      final children = [...group.children];
      if (level == path.length - 1) {
        if (replacement == null) {
          children.removeAt(index);
        } else {
          children[index] = replacement;
        }
      } else {
        children[index] = rewrite(
          children[index] as HostResponseGroup,
          level + 1,
        );
      }
      return HostResponseGroup(match: group.match, children: children);
    }

    setState(() => _root = rewrite(_root, 0));
  }

  void _append(List<int> path, HostResponsePredicate node) {
    final group = _groupAt(path);
    final next = HostResponseGroup(
      match: group.match,
      children: [...group.children, node],
    );
    if (path.isEmpty) {
      setState(() => _root = next);
    } else {
      _replace(path, next);
    }
  }

  void _setMatch(List<int> path, HostResponseMatch match) {
    final group = _groupAt(path);
    final next = HostResponseGroup(match: match, children: group.children);
    if (path.isEmpty) {
      setState(() => _root = next);
    } else {
      _replace(path, next);
    }
  }

  void _apply() {
    if (_root.children.isEmpty) {
      widget.onApply(null);
      return;
    }
    try {
      _root.validate({
        for (final field in widget.fields) field.questionId: field,
      });
      widget.onApply(_root);
    } on ArgumentError {
      showCatchNotice(context, widget.copy.invalidCondition);
    }
  }

  @override
  Widget build(BuildContext context) {
    final copy = widget.copy;
    return CatchSection.content(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(copy.title, variant: CatchTextVariant.sectionTitle),
          gapH16,
          if (widget.fields.isNotEmpty)
            HostResponseGroupSection(
              root: _root,
              group: _root,
              path: const [],
              fields: widget.fields,
              copy: copy,
              defaultCondition: _defaultCondition,
              onAppend: _append,
              onReplace: _replace,
              onSetMatch: _setMatch,
            ),
          if (widget.fields.isEmpty)
            CatchText(
              copy.invalidCondition,
              variant: CatchTextVariant.supporting,
            ),
          gapH16,
          Row(
            children: [
              Expanded(
                child: CatchButton(
                  label: copy.reset,
                  variant: CatchButtonVariant.secondary,
                  onPressed: () => setState(() => _root = _initialRoot(null)),
                ),
              ),
              gapW12,
              Expanded(
                child: CatchButton(
                  label: copy.apply,
                  onPressed: widget.fields.isEmpty ? null : _apply,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
