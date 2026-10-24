import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Provider-free tracking configuration fields; activation remains policy blocked.
class HostTrackingSettingsInputSection extends StatefulWidget {
  const HostTrackingSettingsInputSection({
    super.key,
    required this.current,
    required this.pending,
    required this.onSave,
    required this.onReload,
    this.error,
  });
  final HostTrackingSettings current;
  final bool pending;
  final Object? error;
  final Future<void> Function({
    required String? metaPixelId,
    required String? googleMeasurementId,
    required bool enabled,
  })
  onSave;
  final VoidCallback onReload;

  @override
  State<HostTrackingSettingsInputSection> createState() =>
      _HostTrackingSettingsInputSectionState();
}

class _HostTrackingSettingsInputSectionState
    extends State<HostTrackingSettingsInputSection> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _meta;
  late final TextEditingController _google;

  @override
  void initState() {
    super.initState();
    _meta = TextEditingController(text: widget.current.metaPixelId ?? '');
    _google = TextEditingController(
      text: widget.current.googleMeasurementId ?? '',
    );
  }

  @override
  void dispose() {
    _meta.dispose();
    _google.dispose();
    super.dispose();
  }

  String? _optionalId(String? value, RegExp pattern) {
    final normalized = value?.trim() ?? '';
    if (normalized.isEmpty || pattern.hasMatch(normalized)) return null;
    return context.l10n.hostsTrackingSettingsInvalidId;
  }

  @override
  Widget build(BuildContext context) {
    final readOnly = widget.pending || !widget.current.canEdit;
    final l10n = context.l10n;
    return Form(
      key: _formKey,
      child: CatchSectionList(
        key: const ValueKey('host-tracking-settings-editor'),
        emptyStateOmitted: true,
        children: [
          CatchSection.content(
            title: l10n.hostsTrackingSettingsTitle,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  l10n.hostsTrackingSettingsPolicyBlocked,
                  key: const ValueKey('host-tracking-policy-blocked'),
                  variant: CatchTextVariant.supporting,
                ),
                if (!widget.current.canEdit) ...[
                  gapH12,
                  CatchText(
                    l10n.hostsTrackingSettingsUnclaimed,
                    key: const ValueKey('host-tracking-unclaimed'),
                    variant: CatchTextVariant.supporting,
                  ),
                ],
              ],
            ),
          ),
          CatchSection.rows(
            children: [
              CatchField.input(
                key: const ValueKey('host-tracking-meta-id'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostsTrackingSettingsMetaId,
                controller: _meta,
                contract: CatchContractConstraints
                    .setOrganizerTrackingSettingsCallablePayloadMetaPixelId,
                states: {if (readOnly) WidgetState.disabled},
                keyboardType: TextInputType.number,
                onValidate: (value) =>
                    _optionalId(value, RegExp(r'^[0-9]{5,20}$')),
              ),
              CatchField.input(
                key: const ValueKey('host-tracking-google-id'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostsTrackingSettingsGoogleId,
                controller: _google,
                contract: CatchContractConstraints
                    .setOrganizerTrackingSettingsCallablePayloadGoogleMeasurementId,
                states: {if (readOnly) WidgetState.disabled},
                onValidate: (value) =>
                    _optionalId(value, RegExp(r'^G-[A-Z0-9]{4,20}$')),
              ),
              CatchField.toggle(
                key: const ValueKey('host-tracking-enabled'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostsTrackingSettingsEnabled,
                contract: CatchContractConstraints
                    .setOrganizerTrackingSettingsCallablePayloadEnabled,
                value: false,
                onChanged: null,
              ),
            ],
          ),
          CatchSection.content(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  l10n.hostsTrackingSettingsPrivacy,
                  variant: CatchTextVariant.supporting,
                ),
                if (widget.error != null) ...[
                  gapH12,
                  CatchLocalizedErrorBanner(
                    widget.error!,
                    context: AppErrorContext.club,
                  ),
                  gapH6,
                  CatchText(
                    l10n.hostsTrackingSettingsReloadForConflict,
                    variant: CatchTextVariant.supporting,
                  ),
                ],
                gapH12,
                Wrap(
                  spacing: CatchSpacing.s3,
                  runSpacing: CatchSpacing.s3,
                  children: [
                    CatchButton(
                      key: const ValueKey('host-tracking-save'),
                      label: l10n.hostsTrackingSettingsSaveDisabled,
                      onPressed: readOnly
                          ? null
                          : () {
                              if (!_formKey.currentState!.validate()) return;
                              widget.onSave(
                                metaPixelId: _meta.text.trim().isEmpty
                                    ? null
                                    : _meta.text.trim(),
                                googleMeasurementId: _google.text.trim().isEmpty
                                    ? null
                                    : _google.text.trim(),
                                enabled: false,
                              );
                            },
                    ),
                    CatchButton(
                      label: l10n.hostsTrackingSettingsReload,
                      variant: CatchButtonVariant.secondary,
                      onPressed: widget.pending ? null : widget.onReload,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
