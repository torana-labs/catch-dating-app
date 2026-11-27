/// The People tab's views on the audience route, named in links as `view`.
enum HostAudienceView { people, audiences, forms, responses, requests }

HostAudienceView hostAudienceViewFromName(String? name) =>
    HostAudienceView.values.firstWhere(
      (view) => view.name == name,
      orElse: () => HostAudienceView.people,
    );
