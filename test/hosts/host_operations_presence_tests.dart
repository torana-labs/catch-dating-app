part of 'host_operations_screen_test.dart';

void _registerHostOperationsPresenceTests() {
  for (final canEdit in [true, false]) {
    testWidgets('Host tracking policy gate and server eligibility $canEdit', (
      tester,
    ) async {
      var saves = 0;
      String? savedMeta;
      String? savedGoogle;
      bool? savedEnabled;
      await _pumpHostScreen(
        tester,
        RepaintBoundary(
          key: const ValueKey('presence-preview-boundary'),
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostTrackingSettingsInputSection(
                current: HostTrackingSettings(
                  organizerId: 'settings-owner',
                  revision: 4,
                  metaPixelId: null,
                  googleMeasurementId: null,
                  enabled: false,
                  publicationAllowed: false,
                  canEdit: canEdit,
                  editBlockedReason: canEdit ? 'none' : 'unclaimed',
                ),
                pending: false,
                onReload: () {},
                onSave:
                    ({
                      required metaPixelId,
                      required googleMeasurementId,
                      required enabled,
                    }) async {
                      saves++;
                      savedMeta = metaPixelId;
                      savedGoogle = googleMeasurementId;
                      savedEnabled = enabled;
                    },
              ),
            ),
          ),
        ),
      );
      final toggle = tester.widget<CatchField>(
        find.byKey(const ValueKey('host-tracking-enabled')),
      );
      expect(toggle.toggled, isFalse);
      expect(toggle.onToggle, isNull);
      expect(
        find.byKey(const ValueKey('host-tracking-policy-blocked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('host-tracking-unclaimed')),
        canEdit ? findsNothing : findsOneWidget,
      );
      final save = tester.widget<CatchButton>(
        find.byKey(const ValueKey('host-tracking-save')),
      );
      expect(save.onPressed == null, !canEdit);
      if (canEdit) {
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(savedMeta, isNull);
        expect(savedGoogle, isNull);
        expect(savedEnabled, isFalse);
        final meta = find.descendant(
          of: find.byKey(const ValueKey('host-tracking-meta-id')),
          matching: find.byType(EditableText),
        );
        await tester.enterText(meta, '<script>pixel()</script>');
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(
          find.text('Enter a valid provider ID or leave this field blank.'),
          findsOneWidget,
        );
        await tester.enterText(meta, '');
        tester.state<FormState>(find.byType(Form)).validate();
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
      await _captureHostPresencePreview(
        tester,
        canEdit ? 'settings-policy-blocked' : 'settings-unclaimed',
      );
    });
  }
}
