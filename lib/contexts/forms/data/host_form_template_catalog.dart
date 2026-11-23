import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_platform/schema_contracts/generated/organizer_form_template_summaries.g.dart';

/// The form template gallery, shipped in the app (#2306 retired the
/// `listOrganizerFormTemplates` read). It is generated from the catalog
/// `createOrganizerForm` materializes forms from, so a template the gallery
/// offers is always one the server can create.
final List<HostFormTemplateSummary> hostFormTemplateCatalog = List.unmodifiable(
  [
    for (final template in organizerFormTemplateSummaries)
      HostFormTemplateSummary.fromMap({
        'templateId': template.templateId,
        'version': template.version,
        'title': template.title,
        'description': template.description,
        'purpose': template.purpose,
        'identityPolicy': template.identityPolicy,
        'sectionCount': template.sectionCount,
        'questionCount': template.questionCount,
      }),
  ],
);
