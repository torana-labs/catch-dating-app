part of 'host_customers_screen.dart';

class HostSaveAudienceSheet extends ConsumerStatefulWidget {
  const HostSaveAudienceSheet({
    super.key,
    required this.organizerId,
    required this.suggestedName,
    required this.definition,
  });

  final String organizerId;
  final String suggestedName;
  final HostSavedAudienceDefinition definition;

  @override
  ConsumerState<HostSaveAudienceSheet> createState() =>
      _HostSaveAudienceSheetState();
}

class _HostSaveAudienceSheetState extends ConsumerState<HostSaveAudienceSheet> {
  late final TextEditingController _nameController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.suggestedName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    footer: CatchButton.sheet(
      role: CatchButtonEmphasis.commit,

      key: const ValueKey('host-saved-audience-save-and-message'),
      label: context.l10n.hostSavedAudienceSaveAndMessage,
      status: (_saving) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: _saving ? null : _save,
    ),
    title: context.l10n.hostSavedAudienceSaveTitle,
    subtitle: context.l10n.hostSavedAudienceSaveBody,
    child: CatchFieldLanes.custom(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('host-saved-audience-name'),
            title: context.l10n.hostSavedAudienceName,
            contract: CatchContractConstraints
                .upsertOrganizerSavedAudienceCallablePayloadName,
            controller: _nameController,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => unawaited(_save()),
          ),
        ],
      ),
    ),
  );

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (_saving || name.isEmpty) return;
    setState(() => _saving = true);
    try {
      final controller = ref.read(hostAudienceControllerProvider);
      // provider-graph: ownership-widget-async:_HostSaveAudienceSheetState._save:await:hostAudienceControllerProvider.saveAudience watch CAT156 -- Existing bounded review signal at _HostSaveAudienceSheetState._save (await:hostAudienceControllerProvider.saveAudience). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final audience = await controller.saveAudience(
        organizerId: widget.organizerId,
        requestId: '${DateTime.now().microsecondsSinceEpoch}-customers',
        name: name,
        definition: widget.definition,
      );
      // provider-graph: ownership-widget-async:_HostSaveAudienceSheetState._save:await:hostAudienceControllerProvider.previewAudience watch CAT156 -- Existing bounded review signal at _HostSaveAudienceSheetState._save (await:hostAudienceControllerProvider.previewAudience). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final preview = await controller.previewAudience(
        organizerId: widget.organizerId,
        audience: audience,
      );
      ref.invalidate(hostSavedAudiencesProvider(widget.organizerId));
      if (mounted) Navigator.of(context).pop(preview.audience);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customers,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
