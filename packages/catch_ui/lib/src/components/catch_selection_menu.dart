import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_menu.dart';
import 'package:catch_ui/src/components/catch_menu_item.dart';
import 'package:catch_ui/src/components/catch_selection_menu_item.dart';
import 'package:catch_ui/src/components/catch_selection_sheet.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_transitions.dart';
import 'package:flutter/material.dart';

/// Mutually-exclusive selection with anchored, adaptive and button-trigger recipes.
class CatchSelectionMenu<T> extends StatefulWidget {
  CatchSelectionMenu({
    super.key,
    required this.items,
    required this.value,
    required this.onSelected,
    required CatchSelectionMenuTriggerBuilder<T> this.builder,
    this.width = CatchLayout.selectionMenuWidth,
  }) : title = null,
       subtitle = null,
       tooltip = null,
       labelBuilder = null,
       icon = null,
       buttonKey = null,
       assert(items.isNotEmpty, 'CatchSelectionMenu needs at least one item.'),
       assert(
         items.any((item) => item.value == value),
         'CatchSelectionMenu value must match an item.',
       );

  /// Use a selection sheet on compact layouts and an anchor on wider layouts.
  const CatchSelectionMenu.adaptive({
    super.key,
    required String this.title,
    required this.items,
    required this.value,
    required this.onSelected,
    required CatchSelectionMenuTriggerBuilder<T> this.builder,
    this.subtitle,
    this.width = CatchLayout.selectionMenuWidth,
  }) : tooltip = null,
       labelBuilder = null,
       icon = null,
       buttonKey = null;

  /// Adaptive selection with the canonical labelled button trigger.
  const CatchSelectionMenu.control({
    super.key,
    required String this.title,
    required String this.tooltip,
    required this.items,
    required this.value,
    required String Function(CatchSelectionMenuItem<T> selectedItem)
    this.labelBuilder,
    required this.onSelected,
    this.subtitle,
    this.icon,
    this.buttonKey,
  }) : builder = null,
       width = CatchLayout.selectionMenuWidth;

  final String? title;
  final String? subtitle;
  final String? tooltip;
  final String Function(CatchSelectionMenuItem<T> selectedItem)? labelBuilder;
  final IconData? icon;
  final Key? buttonKey;
  final List<CatchSelectionMenuItem<T>> items;
  final T value;
  final ValueChanged<T> onSelected;
  final CatchSelectionMenuTriggerBuilder<T>? builder;
  final double width;

  @override
  State<CatchSelectionMenu<T>> createState() => _CatchSelectionMenuState<T>();
}

class _CatchSelectionMenuState<T> extends State<CatchSelectionMenu<T>> {
  final _controller = MenuController();

  CatchSelectionMenuItem<T> get _selectedItem =>
      widget.items.firstWhere((item) => item.value == widget.value);

  @override
  Widget build(BuildContext context) {
    assert(
      widget.items.isNotEmpty,
      'CatchSelectionMenu needs at least one item.',
    );
    assert(
      widget.items.any((item) => item.value == widget.value),
      'CatchSelectionMenu value must match an item.',
    );
    final triggerBuilder =
        widget.builder ??
        (
          BuildContext context,
          CatchSelectionMenuItem<T> selectedItem,
          bool open,
          VoidCallback toggle,
        ) => CatchButton(
          key: widget.buttonKey,
          label: widget.labelBuilder!(selectedItem),
          semanticsLabel: widget.tooltip,
          leading: Icon(widget.icon ?? CatchIcons.sort, size: CatchIcon.sm),
          variant: CatchButtonVariant.secondary,
          size: CatchButtonSize.md,
          onPressed: toggle,
        );
    if (widget.title != null &&
        CatchWindowSize.fromWidth(MediaQuery.sizeOf(context).width).isCompact) {
      return triggerBuilder(context, _selectedItem, false, () async {
        final selected = await showCatchSelectionSheet<T>(
          context: context,
          title: widget.title!,
          subtitle: widget.subtitle,
          items: widget.items,
          value: widget.value,
        );
        if (selected != null && context.mounted) widget.onSelected(selected);
      });
    }
    final menuWidth = CatchLayout.menuWidthFor(
      preferredWidth: widget.width,
      viewportWidth: MediaQuery.sizeOf(context).width,
    );
    return CatchMenu<T>.anchored(
      controller: _controller,
      width: menuWidth,
      alignmentOffset: const Offset(0, CatchSpacing.s1),
      items: [
        for (final item in widget.items)
          CatchMenuItem<T>(
            value: item.value,
            label: item.label,
            sublabel: item.sublabel,
            icon: item.icon,
            selected: item.value == widget.value,
            enabled: item.enabled,
            variant: CatchMenuItemVariant.choice,
          ),
      ],
      onSelected: (value, _) {
        if (value != widget.value) catchSelectionHaptic();
        widget.onSelected(value);
        _controller.close();
      },
      builder: (context, controller, child) => triggerBuilder(
        context,
        _selectedItem,
        controller.isOpen,
        () => controller.isOpen ? controller.close() : controller.open(),
      ),
    );
  }
}
