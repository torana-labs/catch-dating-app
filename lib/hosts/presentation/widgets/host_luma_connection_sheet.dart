import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/host_provider_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostLumaConnectionInput {
  const HostLumaConnectionInput({
    required this.externalEventId,
    required this.apiKey,
  });

  final String externalEventId;
  final String apiKey;
}

class HostLumaConnectionSheet extends StatefulWidget {
  const HostLumaConnectionSheet({
    super.key,
    required this.organizerId,
    required this.eventId,
    required this.controller,
  });

  final String organizerId;
  final String eventId;
  final HostOperationalRosterController controller;

  @override
  State<HostLumaConnectionSheet> createState() =>
      _HostLumaConnectionSheetState();
}

class _HostLumaConnectionSheetState extends State<HostLumaConnectionSheet> {
  final _apiKeyController = TextEditingController();
  var _showErrors = false;
  var _loading = false;
  Object? _error;

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final apiKey = _apiKeyController.text.trim();
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterProviderConnectTitle,
      subtitle: context.l10n.hostsOperationalRosterProviderConnectBody,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsOperationalRosterProviderChooseEvent,
        onPressed: _loading ? null : _verifyAndChoose,
        status: (_loading) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsOperationalRosterProviderApiKey,
              contract: CatchContractConstraints
                  .listOrganizerLumaEventsCallablePayloadApiKey,
              controller: _apiKeyController,
              inputVariant: CatchTextInputVariant.obscured,
              helperText: context.l10n.hostsOperationalRosterProviderApiKeyHelp,
              errorText: _showErrors && apiKey.length < 16
                  ? context.l10n.hostsOperationalRosterProviderFieldRequired
                  : null,
              onChanged: (_) => setState(() {}),
            ),
          ),
          if (_error case final error?) ...[
            gapH12,
            CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
          ],
        ],
      ),
    );
  }

  Future<void> _verifyAndChoose() async {
    final apiKey = _apiKeyController.text.trim();
    if (apiKey.length < 16) {
      setState(() => _showErrors = true);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final choices = await widget.controller.listLumaEvents(
        organizerId: widget.organizerId,
        eventId: widget.eventId,
        apiKey: apiKey,
      );
      if (!mounted) return;
      final choice = await showCatchBottomSheet<HostProviderEventChoice>(
        context: context,
        builder: (context) => HostLumaEventChoiceSheet(choices: choices),
      );
      if (choice != null && mounted) {
        Navigator.of(context).pop(
          HostLumaConnectionInput(
            externalEventId: choice.externalEventId,
            apiKey: apiKey,
          ),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class HostLumaEventChoiceSheet extends StatelessWidget {
  const HostLumaEventChoiceSheet({super.key, required this.choices});

  final HostProviderEventChoices choices;

  @override
  Widget build(BuildContext context) {
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterProviderChooseEventTitle,
      subtitle: context.l10n.hostsOperationalRosterProviderChooseEventBody(
        calendar: choices.calendarName,
      ),
      child: choices.events.isEmpty
          ? CatchEmptyState(
              variant: CatchEmptyStateVariant.inline,
              icon: CatchIcons.date,
              title: context.l10n.hostsOperationalRosterProviderNoEventsTitle,
              message: context.l10n.hostsOperationalRosterProviderNoEventsBody,
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (choices.truncated) ...[
                  CatchBanner.error(
                    message: context
                        .l10n
                        .hostsOperationalRosterProviderEventsTruncated,
                  ),
                  gapH12,
                ],
                CatchFieldLanes.single(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final indexed in choices.events.indexed) ...[
                        if (indexed.$1 > 0) const CatchDivider.fieldRow(),
                        CatchField.nav(
                          copy: catchFieldCopy(context.l10n),
                          title: indexed.$2.name,
                          body: AppTimeFormatters.dateTime(
                            indexed.$2.startAt.toLocal(),
                          ),
                          onTap: () => Navigator.of(context).pop(indexed.$2),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
