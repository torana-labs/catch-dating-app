import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormAvailabilityField extends StatelessWidget {
  const HostFormAvailabilityField({
    super.key,
    required this.title,
    required this.value,
    required this.onChanged,
    this.endOfDay = false,
  });

  final String title;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final bool endOfDay;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.action(
      copy: catchFieldCopy(context.l10n),
      title: title,
      body: value == null
          ? context.l10n.hostFormDateNotSet
          : MaterialLocalizations.of(
              context,
            ).formatMediumDate(value!.toLocal()),
      actions: value == null
          ? null
          : IconButton(
              tooltip: context.l10n.hostFormClearDate,
              icon: Icon(CatchIcons.close),
              onPressed: () => onChanged(null),
            ),
      onTap: () async {
        final now = DateTime.now();
        final selected = await showDatePicker(
          context: context,
          initialDate: value?.toLocal() ?? now,
          firstDate: DateTime(now.year - 1),
          lastDate: DateTime(now.year + 10, 12, 31),
        );
        if (selected != null) {
          final local = endOfDay
              ? DateTime(
                  selected.year,
                  selected.month,
                  selected.day,
                  23,
                  59,
                  59,
                  999,
                )
              : DateTime(selected.year, selected.month, selected.day);
          onChanged(local.toUtc());
        }
      },
    ),
  );
}
