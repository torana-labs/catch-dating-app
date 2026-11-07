import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Setup step one. The board's "Is this you?" claims a page Catch found for
/// the number; the Host app has no read that finds one, so this step starts
/// a page instead: its name and where it runs.
class HostSetupFindBody extends StatelessWidget {
  const HostSetupFindBody({
    super.key,
    required this.state,
    required this.cities,
    required this.onNameChanged,
    required this.onCityChanged,
    required this.onAreaChanged,
  });

  final HostSetupState state;

  /// The cities a host can start a page in.
  final List<CityOption> cities;
  final ValueChanged<String> onNameChanged;
  final ValueChanged<String> onCityChanged;
  final ValueChanged<String> onAreaChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(l10n.hostOnboardingStartLead, tone: CatchTextTone.secondary),
        CatchField.input(
          key: const ValueKey<String>('host-setup-name'),
          copy: copy,
          title: l10n.hostOnboardingStartName,
          contract: CatchContractConstraints.createOrganizerCallablePayloadName,
          initialValue: state.name,
          placeholder: l10n.hostOnboardingStartNamePlaceholder,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          onChanged: onNameChanged,
        ),
        CatchStack(
          children: [
            CatchText(
              l10n.hostOnboardingStartWhere,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final city in cities)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-setup-city-${city.effectiveMarketId}',
                    ),
                    label: city.label,
                    selected: state.cityId == city.effectiveMarketId,
                    mode: CatchChipMode.single,
                    onPressed: () => onCityChanged(city.effectiveMarketId),
                  ),
              ],
            ),
            CatchField.input(
              key: const ValueKey<String>('host-setup-area'),
              copy: copy,
              title: l10n.hostOnboardingStartArea,
              contract:
                  CatchContractConstraints.createOrganizerCallablePayloadArea,
              initialValue: state.area,
              placeholder: l10n.hostOnboardingStartAreaPlaceholder,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              onChanged: onAreaChanged,
            ),
          ],
        ),
      ],
    );
  }
}
