enum HostFormWorkspaceView {
  overview,
  questions,
  responses,
  payments,
  settings,
}

HostFormWorkspaceView? hostFormViewFromQuery(String? value) =>
    HostFormWorkspaceView.values
        .where((view) => view.name == value)
        .firstOrNull;
