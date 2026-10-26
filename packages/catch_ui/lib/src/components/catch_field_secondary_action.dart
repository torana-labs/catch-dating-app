part of 'catch_field.dart';

/// A separate, labelled target owned by Field, never by its passive content.
@immutable
sealed class CatchFieldSecondaryAction {
  const CatchFieldSecondaryAction();

  static CatchFieldSecondaryAction menu<T>({
    required String label,
    required List<CatchActionMenuItem<T>> items,
    required ValueChanged<T> onSelected,
  }) => _CatchFieldMenuAction<T>(label, items, onSelected);

  static CatchFieldSecondaryAction selection<T>({
    required String label,
    required List<CatchMenuItem<T>> items,
    required ValueChanged<T> onSelected,
    bool enabled = true,
    bool loading = false,
  }) =>
      _CatchFieldSelectionAction<T>(label, items, onSelected, enabled, loading);

  static CatchFieldSecondaryAction command({
    required String label,
    required IconData icon,
    required VoidCallback onActivate,
  }) => _CatchFieldCommandAction(label, icon, onActivate);

  static CatchFieldSecondaryAction button({
    Key? key,
    required String label,
    required VoidCallback? onActivate,
    bool loading = false,
  }) => _CatchFieldButtonAction(key, label, onActivate, loading);

  static CatchFieldSecondaryAction group(
    List<CatchFieldSecondaryAction> actions,
  ) => _CatchFieldActionGroup(List.unmodifiable(actions));

  bool get _usesFooter => false;
  Widget _build(BuildContext context);
}

final class _CatchFieldMenuAction<T> extends CatchFieldSecondaryAction {
  const _CatchFieldMenuAction(this.label, this.items, this.onSelected);
  final String label;
  final List<CatchActionMenuItem<T>> items;
  final ValueChanged<T> onSelected;

  @override
  Widget _build(BuildContext context) => CatchActionMenu<T>(
    tooltip: label,
    items: items,
    onSelected: onSelected,
    variant: CatchIconActionVariant.plain,
  );
}

final class _CatchFieldCommandAction extends CatchFieldSecondaryAction {
  const _CatchFieldCommandAction(this.label, this.icon, this.onActivate);
  final String label;
  final IconData icon;
  final VoidCallback onActivate;

  @override
  Widget _build(BuildContext context) => CatchIconAction(
    tooltip: label,
    variant: CatchIconActionVariant.plain,
    onPressed: onActivate,
    child: Icon(icon),
  );
}

final class _CatchFieldButtonAction extends CatchFieldSecondaryAction {
  const _CatchFieldButtonAction(
    this.key,
    this.label,
    this.onActivate,
    this.loading,
  );
  final Key? key;
  final String label;
  final VoidCallback? onActivate;
  final bool loading;
  @override
  bool get _usesFooter => true;
  @override
  Widget _build(BuildContext context) => CatchButton(
    key: key,
    label: label,
    onPressed: loading ? null : onActivate,
    status: loading ? CatchButtonStatus.loading : CatchButtonStatus.idle,
    size: CatchButtonSize.md,
    variant: CatchButtonVariant.ghost,
  );
}

final class _CatchFieldActionGroup extends CatchFieldSecondaryAction {
  const _CatchFieldActionGroup(this.actions);
  final List<CatchFieldSecondaryAction> actions;
  @override
  bool get _usesFooter => true;
  @override
  Widget _build(BuildContext context) => Wrap(
    spacing: CatchSpacing.s1,
    runSpacing: CatchSpacing.s1,
    children: [for (final action in actions) action._build(context)],
  );
}

final class _CatchFieldSelectionAction<T> extends CatchFieldSecondaryAction {
  const _CatchFieldSelectionAction(
    this.label,
    this.items,
    this.onSelected,
    this.enabled,
    this.loading,
  );
  final String label;
  final List<CatchMenuItem<T>> items;
  final ValueChanged<T> onSelected;
  final bool enabled;
  final bool loading;
  @override
  bool get _usesFooter => true;
  @override
  Widget _build(BuildContext context) => CatchMenu<T>.anchored(
    items: items,
    onSelected: (value, _) => onSelected(value),
    builder: (context, controller, child) => CatchButton(
      label: label,
      onPressed: enabled && !loading && items.isNotEmpty
          ? controller.open
          : null,
      status: loading ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      variant: CatchButtonVariant.secondary,
      size: CatchButtonSize.md,
    ),
  );
}
