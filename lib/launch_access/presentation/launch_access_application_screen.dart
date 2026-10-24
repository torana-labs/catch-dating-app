import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/launch_access/data/launch_access_repository.dart';
import 'package:catch_dating_app/launch_access/domain/launch_access_application.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LaunchAccessApplicationScreen extends ConsumerWidget {
  const LaunchAccessApplicationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context
            .l10n
            .launchAccessLaunchAccessApplicationScreenTitleApplyForAccess,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standard(
        child: CatchAsyncBoundary<String?>(
          value: uidAsync,
          builder: (context, uid) {
            if (uid == null || uid.isEmpty) {
              return Center(
                child: CatchEmptyState(
                  icon: CatchIcons.phoneAndroidRounded,
                  title: context
                      .l10n
                      .launchAccessLaunchAccessApplicationScreenTitleVerifyYourPhone,
                  message: context
                      .l10n
                      .launchAccessLaunchAccessApplicationScreenMessagePhoneVerificationIsRequired,
                ),
              );
            }
            final applicationAsync = ref.watch(
              watchLaunchAccessApplicationProvider(uid),
            );
            return CatchAsyncBoundary<LaunchAccessApplication?>(
              value: applicationAsync,
              loadingBuilder: (_) => const LaunchAccessLoadingBody(),
              errorContext: AppErrorContext.auth,
              onRetry: () =>
                  ref.invalidate(watchLaunchAccessApplicationProvider(uid)),
              builder: (context, application) {
                if (application != null &&
                    !application.status.canEditApplication) {
                  return Center(
                    child: CatchEmptyState(
                      icon: application.status.unlocksProfileCreation
                          ? CatchIcons.checkCircleOutlineRounded
                          : CatchIcons.hourglassTopRounded,
                      title: application.status.label,
                      message: application.status.unlocksProfileCreation
                          ? context
                                .l10n
                                .launchAccessLaunchAccessApplicationScreenMessageAccessIsApprovedProfile
                          : context
                                .l10n
                                .launchAccessLaunchAccessApplicationScreenMessageYourApplicationIsSaved,
                    ),
                  );
                }
                return LaunchAccessApplicationForm(application: application);
              },
            );
          },
          onRetry: () => ref.invalidate(uidProvider),
        ),
      ),
    );
  }
}

class LaunchAccessLoadingBody extends StatelessWidget {
  const LaunchAccessLoadingBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
        gapH8,
        CatchSkeleton.textBlock(lines: 2),
        gapH24,
        CatchSkeleton.card(height: CatchLayout.controlMdMinHeight),
        gapH24,
        const LaunchAccessChoiceSkeleton(rows: 1),
        gapH24,
        const LaunchAccessChoiceSkeleton(rows: 2),
        gapH24,
        const LaunchAccessChoiceSkeleton(rows: 2),
        gapH24,
        Row(
          children: [
            Expanded(child: CatchSkeleton.textBlock(lines: 2)),
            gapW12,
            CatchSkeleton.box(
              width: CatchSpacing.s12,
              height: CatchSpacing.s8,
              radius: CatchRadius.pill,
            ),
          ],
        ),
        gapH24,
        for (var index = 0; index < 3; index++) ...[
          CatchSkeleton.card(height: CatchLayout.controlMdMinHeight),
          gapH16,
        ],
        CatchSkeleton.card(height: CatchSpacing.s16),
        gapH32,
        CatchSkeleton.card(height: CatchLayout.buttonLgHeight),
        gapH32,
      ],
    );
  }
}

class LaunchAccessChoiceSkeleton extends StatelessWidget {
  const LaunchAccessChoiceSkeleton({super.key, required this.rows});

  final int rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
        gapH10,
        for (var row = 0; row < rows; row++) ...[
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (var index = 0; index < 3; index++)
                CatchSkeleton.box(
                  width: index == 1
                      ? CatchLayout.skeletonTextTitleWidth
                      : CatchLayout.skeletonTextShortWidth,
                  height: CatchSpacing.s8,
                  radius: CatchRadius.pill,
                ),
            ],
          ),
          if (row < rows - 1) gapH8,
        ],
      ],
    );
  }
}

class LaunchAccessApplicationForm extends ConsumerStatefulWidget {
  const LaunchAccessApplicationForm({super.key, this.application});

  final LaunchAccessApplication? application;

  @override
  ConsumerState<LaunchAccessApplicationForm> createState() =>
      _LaunchAccessApplicationFormState();
}

class _LaunchAccessApplicationFormState
    extends ConsumerState<LaunchAccessApplicationForm> {
  final _formKey = GlobalKey<FormState>();
  final _inviteCodeController = TextEditingController();
  final _instagramController = TextEditingController();
  final _referralController = TextEditingController();
  final _whyController = TextEditingController();
  bool _seededFromApplication = false;

  @override
  void initState() {
    super.initState();
    _seedFromApplication();
  }

  @override
  void didUpdateWidget(covariant LaunchAccessApplicationForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.application?.uid != widget.application?.uid) {
      _seededFromApplication = false;
      _seedFromApplication();
    }
  }

  @override
  void dispose() {
    _inviteCodeController.dispose();
    _instagramController.dispose();
    _referralController.dispose();
    _whyController.dispose();
    super.dispose();
  }

  void _seedFromApplication() {
    final application = widget.application;
    if (_seededFromApplication || application == null) return;
    ref
        .read(launchAccessControllerProvider.notifier)
        .seedFromApplication(application);
    _inviteCodeController.text = application.inviteCode ?? '';
    _instagramController.text = application.instagramHandle ?? '';
    _referralController.text = application.referralSource ?? '';
    _whyController.text = application.whyCatch ?? '';
    _seededFromApplication = true;
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    LaunchAccessController.submitMutation.run(ref, (tx) async {
      await tx.get(launchAccessControllerProvider.notifier).submit();
    });
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(launchAccessControllerProvider);
    final mutation = ref.watch(LaunchAccessController.submitMutation);
    final t = CatchTokens.of(context);
    final selectableCities = defaultCityOptions
        .where((city) => city.profileSelectable)
        .toList(growable: false);
    final selectedCity = selectableCities
        .where((city) => city.effectiveMarketId == draft.city)
        .firstOrNull;

    return Form(
      key: _formKey,
      child: CatchFieldLanes.custom(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTextJoinTheNextCity,
              style: CatchTextStyles.headlineS(context, color: t.ink),
            ),
            gapH8,
            CatchText(
              context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTextTellUsWhereYou,
              variant: CatchTextVariant.bodyLead,
              color: t.ink2,
            ),
            gapH24,
            CatchField<CityOption>.select(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleCity,
              contract: CatchContractConstraints.accessApplicationDocumentCity,
              contractValueBuilder: (city) => city.effectiveMarketId,
              values: selectableCities,
              value: selectedCity,
              itemLabelBuilder: (city) => city.label,
              hintText: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenHinttextSelectCity,
              leading: Icon(CatchIcons.locationCityOutlined),
              onValidate: (_) => draft.city.trim().isEmpty
                  ? context.l10n.launchAccessValidationChooseCity
                  : null,
              onChanged: (city) {
                final next = city?.effectiveMarketId ?? '';
                LaunchAccessController.submitMutation.reset(ref);
                ref.read(launchAccessControllerProvider.notifier).setCity(next);
              },
            ),
            gapH24,
            CatchChoiceInput<LaunchAccessRole>.form(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenLabelJoiningAs,
              contract: CatchContractConstraints.accessApplicationDocumentRole,
              values: LaunchAccessRole.values,
              selected: {draft.role},
              onChanged: (next) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setRole(next.firstOrNull ?? LaunchAccessRole.member);
              },
              mode: CatchChipMode.single,
              itemLabelBuilder: (value) => value.label,
              contractValueBuilder: (value) => value.name,
            ),
            gapH24,
            CatchChoiceInput<LaunchAccessEventType>.form(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenLabelEventsYouWouldShow,
              contract:
                  CatchContractConstraints.accessApplicationDocumentEventTypes,
              values: LaunchAccessEventType.values,
              selected: draft.eventTypes,
              onValidate: (_) => draft.eventTypes.isEmpty
                  ? context.l10n.launchAccessValidationChooseEventType
                  : null,
              onChanged: (next) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setEventTypes(next);
              },
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              contractValueBuilder: (value) => value.name,
            ),
            gapH24,
            CatchChoiceInput<LaunchAccessAvailabilityWindow>.form(
              copy: catchFieldLabelTextCopy(context.l10n),
              label: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenLabelBestTimes,
              contract: CatchContractConstraints
                  .accessApplicationDocumentAvailabilityWindows,
              values: LaunchAccessAvailabilityWindow.values,
              selected: draft.availabilityWindows,
              onValidate: (_) => draft.availabilityWindows.isEmpty
                  ? context.l10n.launchAccessValidationChooseTime
                  : null,
              onChanged: (next) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setAvailabilityWindows(next);
              },
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              contractValueBuilder: (value) => value.name,
            ),
            gapH24,
            CatchField.toggle(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleIMightHost,
              contract:
                  CatchContractConstraints.accessApplicationDocumentWantsToHost,
              body: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenBodyUsefulIfYouAlready,
              value: draft.wantsToHost,
              onChanged: (value) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setWantsToHost(value);
              },
            ),
            gapH24,
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleInviteCode,
              contract:
                  CatchContractConstraints.accessApplicationDocumentInviteCode,
              labelMode: CatchFieldLabelTextMode.optional,
              controller: _inviteCodeController,
              textCapitalization: TextCapitalization.characters,
              leading: Icon(CatchIcons.confirmationNumberOutlined),
              onChanged: (value) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setInviteCode(value);
              },
            ),
            gapH16,
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleInstagram,
              contract: CatchContractConstraints
                  .accessApplicationDocumentInstagramHandle,
              labelMode: CatchFieldLabelTextMode.optional,
              controller: _instagramController,
              prefixText: '@',
              textInputAction: TextInputAction.next,
              onChanged: (value) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setInstagramHandle(value);
              },
            ),
            gapH16,
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleWhoReferredYou,
              contract: CatchContractConstraints
                  .accessApplicationDocumentReferralSource,
              labelMode: CatchFieldLabelTextMode.optional,
              controller: _referralController,
              textCapitalization: TextCapitalization.words,
              onChanged: (value) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setReferralSource(value);
              },
            ),
            gapH16,
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .launchAccessLaunchAccessApplicationScreenTitleWhyDoYouWant,
              contract:
                  CatchContractConstraints.accessApplicationDocumentWhyCatch,
              controller: _whyController,
              maxLines: 4,
              minLines: 3,
              textCapitalization: TextCapitalization.sentences,
              onValidate: (value) {
                final trimmed = value?.trim() ?? '';
                if (trimmed.length < 12) {
                  return context.l10n.launchAccessValidationTellUsMore;
                }
                return null;
              },
              onChanged: (value) {
                LaunchAccessController.submitMutation.reset(ref);
                ref
                    .read(launchAccessControllerProvider.notifier)
                    .setWhyCatch(value);
              },
            ),
            if (mutation.hasError) ...[
              gapH16,
              CatchBanner.error(
                message: mutationErrorMessage(mutation, l10n: context.l10n),
              ),
            ],
            gapH32,
            CatchButton(
              label: widget.application == null
                  ? context
                        .l10n
                        .launchAccessLaunchAccessApplicationScreenLabelSubmitApplication
                  : context
                        .l10n
                        .launchAccessLaunchAccessApplicationScreenLabelUpdateApplication,
              onPressed: mutation.isPending ? null : _submit,
              status: (mutation.isPending)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
              size: CatchButtonSize.lg,
            ),
            gapH32,
          ],
        ),
      ),
    );
  }
}
