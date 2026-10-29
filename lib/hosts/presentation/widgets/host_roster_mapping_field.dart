import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostRosterMappingField extends StatelessWidget {
  const HostRosterMappingField({
    super.key,
    required this.field,
    required this.headers,
    required this.rows,
    required this.value,
    required this.onChanged,
  });

  final HostRosterField field;
  final List<String> headers;
  final List<List<String>> rows;
  final int? value;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final selectedValue = value ?? -1;
    final options = [-1, ...List.generate(headers.length, (index) => index)];
    final samples = selectedValue < 0
        ? const <String>[]
        : rows
              .map(
                (row) =>
                    selectedValue < row.length ? row[selectedValue].trim() : '',
              )
              .where((sample) => sample.isNotEmpty)
              .take(2)
              .toList(growable: false);
    return CatchMenu<int>.anchored(
      items: [
        for (final option in options)
          CatchMenuItem<int>(
            value: option,
            label: option == -1
                ? context.l10n.hostsOperationalRosterDoNotImport
                : headers[option],
            selected: option == selectedValue,
            variant: CatchMenuItemVariant.choice,
          ),
      ],
      onSelected: (option, _) => onChanged(option == -1 ? null : option),
      builder: (context, controller, _) => CatchFieldLanes.single(
        child: CatchField.nav(
          copy: catchFieldCopy(context.l10n),
          title: hostRosterFieldCopy(context, field),
          body: samples.isEmpty ? null : samples.join(' · '),
          valueText: selectedValue == -1
              ? context.l10n.hostsOperationalRosterDoNotImport
              : headers[selectedValue],
          onTap: controller.isOpen ? controller.close : controller.open,
        ),
      ),
    );
  }
}
