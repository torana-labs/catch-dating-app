import {useRef, useState} from "react";
import {ArrowRight, Check, CheckCircle2, MessageCircle, Users} from "lucide-react";
import {hostLandingCopy as copy, hostFormats} from "@content/hostLanding";
import {hostProductCopy} from "@content/hostProduct";
import {activeMarket} from "@content/markets";
import {ButtonLink, PlainLink, DataTable} from "../../../shared/ui/primitives";
import {MediaSlot, type CaptureSlots} from "../../../shared/media/MediaSlot";
import {
  HostLandingHero, HostLandingHeroCopy, HostLandingMedia,
  HostLandingSection, HostLandingHeading, HostLandingNote, HostLandingActions,
  HostLandingBenefits, HostLandingBenefit, HostLandingWorkflow, HostLandingPrompt,
  HostFormatTabs, HostFormatTab, HostFormatPanel, HostFormatStages, HostFormatStage,
  HostFormatStageCopy, HostFormatStageLabel, HostFormatPhone, HostFormatHighlight,
  HostFormatStatus, HostFormatConnection, HostInsightGrid, HostInsightExample,
  HostLandingSteps, HostLandingDetails, HostLandingCloseGrid, HostSectionNav,
  HostParticipationGrid, HostPrivacyCopy, HostAdoptionLayout, HostAdoptionCircles, HostAdoptionCircle, HostAdoptionDetail,
} from "../../../shared/ui/primitives/hostLanding";

const money = new Intl.NumberFormat(activeMarket.locale, {style: "currency", currency: activeMarket.currencyCode, maximumFractionDigits: 0});

export function renderHostSectionNav() {
  return <HostSectionNav aria-label={copy.navLabel}>{copy.nav.map(item => <PlainLink key={item.href} href={item.href}>{item.label}</PlainLink>)}<PlainLink href="/host/apply/">{copy.apply}<ArrowRight size={15} aria-hidden="true" /></PlainLink></HostSectionNav>;
}

export function renderHostLandingParticipation() {
  return <HostLandingSection variant="participation" aria-labelledby="host-participation-title">
    <HostLandingHeading><h2 id="host-participation-title">{copy.participation.title}</h2><p>{copy.participation.body}</p></HostLandingHeading>
    <HostParticipationGrid>{copy.participation.items.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</HostParticipationGrid>
  </HostLandingSection>;
}

export function renderHostLandingHero(captures: CaptureSlots) {
  return <HostLandingHero aria-labelledby="host-title">
    <HostLandingHeroCopy>
      <h1 id="host-title">{copy.hero.title}</h1>
      <p>{copy.hero.body}</p>
      <HostLandingNote>{copy.hero.audience}</HostLandingNote>
      <HostLandingActions><ButtonLink href="/host/apply/">{copy.apply}<ArrowRight size={18} aria-hidden="true" /></ButtonLink><PlainLink href="#how-it-works">{copy.seeHow}<ArrowRight size={17} aria-hidden="true" /></PlainLink></HostLandingActions>
      <HostLandingNote>{copy.hero.note}</HostLandingNote>
    </HostLandingHeroCopy>
    <HostLandingMedia variant="capture"><MediaSlot captures={captures} id="host-live-console" loading="eager" /></HostLandingMedia>
  </HostLandingHero>;
}

export function renderHostLandingBenefits() {
  return <HostLandingSection id="features" aria-labelledby="host-benefits-title">
    <HostLandingHeading><h2 id="host-benefits-title">{copy.benefits.title}</h2><p>{copy.benefits.body}</p></HostLandingHeading>
    <HostLandingBenefits>
      <HostLandingBenefit><h3>{copy.benefits.businessTitle}</h3><p>{copy.benefits.businessBody}</p>
        <HostLandingWorkflow><strong>{copy.benefits.workflowTitle}</strong><ol>{copy.benefits.workflow.map(step => <li key={step.title}><Check size={16} aria-hidden="true" /><div><strong>{step.title}</strong><span>{step.detail}</span></div></li>)}</ol><small>{copy.example}</small></HostLandingWorkflow>
      </HostLandingBenefit>
      <HostLandingBenefit><h3>{copy.benefits.guestTitle}</h3><p>{copy.benefits.guestBody}</p>
        <HostLandingMedia><img src="/assets/marketing/home-dinner.jpg" alt={copy.benefits.guestAlt} width={1536} height={1024} loading="lazy" /><HostLandingPrompt><MessageCircle size={20} aria-hidden="true" /><div><strong>{copy.benefits.promptLabel}</strong><p>{copy.benefits.prompt}</p></div></HostLandingPrompt></HostLandingMedia>
      </HostLandingBenefit>
    </HostLandingBenefits>
    <HostLandingNote>{copy.benefits.note}</HostLandingNote>
  </HostLandingSection>;
}

function HostFormatExplorer() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const format = hostFormats[selected];
  return <HostLandingSection variant="formats" id="how-it-works" aria-labelledby="host-formats-title" data-format={format.id}>
    <HostLandingHeading><h2 id="host-formats-title">{copy.explorer.title}</h2><p>{copy.explorer.body}</p></HostLandingHeading>
    <HostFormatTabs role="tablist" aria-label={copy.explorer.label}>
      {hostFormats.map((item, index) => <HostFormatTab key={item.id} ref={node => {tabs.current[index] = node;}} type="button" role="tab" id={`format-tab-${item.id}`} aria-controls="host-format-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1}
        onClick={() => setSelected(index)} onKeyDown={event => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % hostFormats.length;
          else if (event.key === "ArrowLeft") next = (index + hostFormats.length - 1) % hostFormats.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = hostFormats.length - 1;
          else return;
          event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
        }}>{item.label}</HostFormatTab>)}
    </HostFormatTabs>
    <HostFormatPanel role="tabpanel" id="host-format-panel" aria-labelledby={`format-tab-${format.id}`} tabIndex={0}>
      <h3>{format.title}</h3>
      <HostFormatStages>{format.stages.map((stage, index) => <HostFormatStage key={`${format.id}-${index}`}>
        <HostFormatStageCopy><HostFormatStageLabel>{copy.explorer.stages[index]}</HostFormatStageLabel><h4>{stage.title}</h4><p>{stage.body}</p></HostFormatStageCopy>
        <HostFormatPhone><header><strong>{stage.mock.title}</strong><span>{stage.mock.subtitle}</span></header>
          <dl>{stage.mock.rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          <HostFormatHighlight><span>{stage.mock.highlight.label}</span><strong>{stage.mock.highlight.text}</strong></HostFormatHighlight>
          <HostFormatStatus><CheckCircle2 size={15} aria-hidden="true" />{stage.mock.status}</HostFormatStatus>
        </HostFormatPhone>
        <HostLandingNote>{copy.explorer[stage.view]}</HostLandingNote>
      </HostFormatStage>)}</HostFormatStages>
      <HostFormatConnection>{format.connection}</HostFormatConnection>
    </HostFormatPanel>
    <HostLandingNote>{copy.explorer.note}</HostLandingNote>
  </HostLandingSection>;
}
export function renderHostFormatExplorer() { return <HostFormatExplorer />; }

export function renderHostLandingInsights() {
  return <HostLandingSection variant="insights" id="audience" aria-labelledby="host-insights-title">
    <HostLandingHeading><h2 id="host-insights-title">{copy.insights.title}</h2><p>{copy.insights.body}</p></HostLandingHeading>
    <HostInsightGrid>
      <article><h3>{copy.insights.guestTitle}</h3><p>{copy.insights.guestBody}</p><HostInsightExample>
        <header><Users size={22} aria-hidden="true" /><strong>{copy.insights.recordTitle}</strong></header>
        <p>{copy.insights.visits}</p><p>{copy.insights.preference}</p><p>{copy.insights.feedback}</p><HostFormatHighlight><strong>{copy.insights.invitation}</strong></HostFormatHighlight>
      </HostInsightExample></article>
      <article><h3>{copy.insights.campaignTitle}</h3><p>{copy.insights.campaignBody}</p><HostInsightExample>
        <DataTable ariaLabel={copy.insights.tableCaption}><caption>{copy.insights.tableCaption}</caption><thead><tr>{copy.insights.tableHeaders.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{copy.insights.campaigns.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.visits}</td><td>{row.bookings}</td><td>{money.format(row.revenue)}</td></tr>)}</tbody></DataTable>
      </HostInsightExample></article>
    </HostInsightGrid>
    <HostPrivacyCopy><h3>{copy.insights.privacyTitle}</h3><p>{copy.insights.privacyBody}</p></HostPrivacyCopy>
    <HostLandingNote>{copy.insights.note}</HostLandingNote>
  </HostLandingSection>;
}

function HostAdoptionExplorer() {
  const [selected, setSelected] = useState(0);
  const layer = copy.adoption.layers[selected];
  return <HostAdoptionLayout>
    <div><HostAdoptionCircles role="group" aria-label={copy.adoption.circlesLabel}>
      {copy.adoption.layers.map((item, index) => <HostAdoptionCircle key={item.id} layer={item.id} type="button" aria-pressed={selected === index} aria-controls="host-adoption-detail" onClick={() => setSelected(index)}><span>{item.label}</span></HostAdoptionCircle>)}
    </HostAdoptionCircles><HostLandingNote>{copy.adoption.circlesHint}</HostLandingNote></div>
    <HostAdoptionDetail id="host-adoption-detail" aria-live="polite" aria-atomic="true" aria-labelledby="host-layer-title">
      <p>{layer.kicker}</p><h3 id="host-layer-title">{layer.title}</h3><p>{layer.body}</p><ul>{layer.bullets.map(item => <li key={item}>{item}</li>)}</ul>
    </HostAdoptionDetail>
  </HostAdoptionLayout>;
}

export function renderHostLandingAdoption() {
  return <HostLandingSection variant="adoption" id="adoption" aria-labelledby="host-adoption-title">
    <HostLandingHeading><h2 id="host-adoption-title">{copy.adoption.title}</h2><p>{copy.adoption.body}</p></HostLandingHeading>
    <HostAdoptionExplorer />
    <HostLandingNote>{copy.adoption.layersNote}</HostLandingNote>
    <div id="existing-tools"><h3>{copy.adoption.toolsTitle}</h3><p>{copy.adoption.toolsBody}</p>
      <HostLandingDetails><summary>{copy.adoption.toolsSummary}</summary>{hostProductCopy.tools.items.map(item => <div key={item.question}><h4>{item.question}</h4><p>{item.answer}</p></div>)}</HostLandingDetails>
    </div>
    <div id="use-cases"><HostLandingDetails><summary>{copy.adoption.scopeSummary}</summary>{hostProductCopy.useCases.items.map(item => <div key={item.question}><h4>{item.question}</h4><p>{item.answer}</p></div>)}</HostLandingDetails></div>
    <HostLandingNote>{copy.adoption.reassurance}</HostLandingNote>
  </HostLandingSection>;
}

export function renderHostLandingFaq() {
  return <HostLandingSection variant="faq" aria-labelledby="host-faq-title"><h2 id="host-faq-title">{copy.faqTitle}</h2>
    {copy.faqs.map(item => <HostLandingDetails key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></HostLandingDetails>)}
  </HostLandingSection>;
}

export function renderHostLandingClose() {
  return <HostLandingSection variant="close" id="pricing" aria-labelledby="host-close-title">
    <HostLandingCloseGrid><div><h2 id="host-close-title">{copy.close.title}</h2><p>{copy.close.body}</p><ButtonLink href="/host/apply/">{copy.apply}<ArrowRight size={18} aria-hidden="true" /></ButtonLink></div>
      <div><h3>{copy.close.priceTitle}</h3><p>{copy.close.priceBody}</p><HostLandingNote>{copy.close.note}</HostLandingNote></div>
    </HostLandingCloseGrid>
    <HostLandingSteps>{copy.close.steps.map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.body}</p></li>)}</HostLandingSteps>
  </HostLandingSection>;
}
