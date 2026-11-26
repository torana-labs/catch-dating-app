import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:flutter/foundation.dart';

/// Where the question builder is: reading the draft or editing it.
enum HostFormQuestionsStatus { loading, content }

/// How the draft stands against the server. A conflict means the form
/// changed elsewhere and must be reloaded before it can save.
enum HostFormQuestionsSave { saved, unsaved, saving, failed, conflict }

/// One section of the draft: its id and title, in form order.
@immutable
class HostFormQuestionsSection {
  const HostFormQuestionsSection({
    required this.sectionId,
    required this.title,
  });

  final String sectionId;
  final String title;
}

/// One question and where it sits in the draft.
@immutable
class HostFormQuestionSlot {
  const HostFormQuestionSlot({
    required this.sectionIndex,
    required this.questionIndex,
    required this.question,
  });

  final int sectionIndex;
  final int questionIndex;
  final HostFormQuestion question;
}

/// Everything the question builder shows, as plain values.
@immutable
class HostFormQuestionsState {
  const HostFormQuestionsState({
    required this.status,
    this.questions = const <HostFormQuestionSlot>[],
    this.sections = const <HostFormQuestionsSection>[],
    this.openQuestionId,
    this.issues = const <String>[],
    this.save = HostFormQuestionsSave.saved,
    this.blocked = false,
    this.busy = false,
  });

  const HostFormQuestionsState.loading()
    : this(status: HostFormQuestionsStatus.loading);

  final HostFormQuestionsStatus status;
  final List<HostFormQuestionSlot> questions;

  /// The draft's sections, in order; the questions group under them by
  /// [HostFormQuestionSlot.sectionIndex]. Empty lists the questions alone.
  final List<HostFormQuestionsSection> sections;

  /// The question whose wording and choices are open for editing.
  final String? openQuestionId;
  final HostFormQuestionsSave save;

  /// What stops or may stop the draft publishing, most important first.
  final List<String> issues;

  /// The draft has an error that stops it publishing.
  final bool blocked;

  /// A save or another draft command is running.
  final bool busy;

  /// Every question of [definition] in order, with its place.
  static List<HostFormQuestionSlot> slots(HostFormDefinition definition) => [
    for (final (sectionIndex, section) in definition.sections.indexed)
      for (final (questionIndex, question) in section.questions.indexed)
        HostFormQuestionSlot(
          sectionIndex: sectionIndex,
          questionIndex: questionIndex,
          question: question,
        ),
  ];

  /// Every section of [definition] in order.
  static List<HostFormQuestionsSection> sectionsOf(
    HostFormDefinition definition,
  ) => [
    for (final section in definition.sections)
      HostFormQuestionsSection(
        sectionId: section.sectionId,
        title: section.title,
      ),
  ];
}
