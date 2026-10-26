import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_action_menu_item.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_menu.dart';
import 'package:catch_ui/src/components/catch_menu_item.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

class CatchActionMenu<T> extends StatefulWidget {
  const CatchActionMenu({
    super.key,
    required this.items,
    required this.tooltip,
    this.onSelected,
    this.enabled = true,
    this.icon,
    this.variant = CatchIconActionVariant.bordered,
  }) : assert(tooltip != '', 'CatchActionMenu requires an accessible tooltip.');

  final List<CatchActionMenuItem<T>> items;
  final ValueChanged<T>? onSelected;
  final String tooltip;
  final bool enabled;
  final IconData? icon;
  final CatchIconActionVariant variant;

  @override
  State<CatchActionMenu<T>> createState() => _CatchActionMenuState<T>();
}

class _CatchActionMenuState<T> extends State<CatchActionMenu<T>> {
  final _controller = MenuController();

  bool get _canOpen => widget.enabled && widget.items.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    assert(
      widget.items.length <= CatchLayout.actionMenuMaxItems,
      'CatchActionMenu is for at most five commands. Use a dedicated '
      'selection control or sheet for larger collections.',
    );
    assert(
      widget.items.every(
        (item) => item.enabled || (item.sublabel?.trim().isNotEmpty ?? false),
      ),
      'Disabled action-menu rows need a reason. Informational status does not '
      'belong in an action menu.',
    );
    final menuWidth = CatchLayout.menuWidthFor(
      preferredWidth: CatchLayout.actionMenuWidth,
      viewportWidth: MediaQuery.sizeOf(context).width,
    );

    return CatchMenu<T>.anchored(
      controller: _controller,
      width: menuWidth,
      alignmentOffset: Offset(
        CatchLayout.actionMenuAlignmentXFor(menuWidth),
        CatchSpacing.s1,
      ),
      items: [
        for (final item in widget.items)
          CatchMenuItem<T>(
            value: item.value,
            label: item.label,
            sublabel: item.sublabel,
            icon: item.icon,
            danger: item.isDestructive,
            enabled: item.enabled,
          ),
      ],
      onSelected: (value, _) {
        widget.onSelected?.call(value);
        _controller.close();
      },
      builder: (context, controller, child) {
        return CatchIconAction(
          tooltip: widget.tooltip,
          variant: widget.variant,
          status: widget.enabled
              ? CatchIconActionStatus.enabled
              : CatchIconActionStatus.disabled,
          onPressed: _canOpen
              ? () => controller.isOpen ? controller.close() : controller.open()
              : null,
          child: Icon(widget.icon ?? CatchIcons.more, size: CatchIconSize.md),
        );
      },
    );
  }
}
