import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ExploreClearButton extends StatelessWidget {
  const ExploreClearButton({
    super.key,
    required this.clearSearch,
    required this.clearFilters,
    this.onClearSearch,
    this.onClearFilters,
    this.icon,
  });

  final bool clearSearch;
  final bool clearFilters;
  final VoidCallback? onClearSearch;
  final VoidCallback? onClearFilters;

  /// Optional override for the action icon. Defaults to [CatchIcons.clear].
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final label = switch ((clearSearch, clearFilters)) {
      (true, true) =>
        context.l10n.exploreExploreScreenLabelClearSearchAndFilters,
      (true, false) => context.l10n.exploreExploreScreenLabelClearSearch,
      (false, true) => context.l10n.exploreExploreScreenLabelClearFilters,
      (false, false) => context.l10n.exploreExploreScreenLabelClear,
    };
    return CatchButton(
      label: label,
      onPressed: () {
        if (clearSearch) {
          onClearSearch?.call();
        }
        if (clearFilters) {
          onClearFilters?.call();
        }
      },
      variant: CatchButtonVariant.secondary,
      leading: Icon(icon ?? CatchIcons.clear),
    );
  }
}
