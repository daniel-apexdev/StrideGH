// The reminder and alert emails, in the same style as the website's other emails.
import { brand, button, details, escape, layout, p, panel, plain } from "../../src/services/email/layout.ts";

const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const where = (r) => [r.venue, r.city].filter(Boolean).join(", ") || "Venue to be confirmed";
const time12 = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const distances = (r) => r.distances.map((d) => d.label).join(" · ");

function unsubscribeHtml(url, what) {
  return `<p style="margin:18px 0 0;font-size:13px;color:${brand.muted}">You asked for ${escape(what)} on Stride GH. <a href="${escape(url)}" style="color:${brand.muted}">Stop these emails</a>.</p>`;
}

/** One reminder email for one race. `kind` is from reminderDue(). */
export function reminderEmail({ kind, race, site, unsubscribeUrl }) {
  const page = `${site}/events/${race.slug}/`;
  const register = race.registration?.url ?? page;
  const facts = details([
    ["Date", longDate(race.date)],
    ["Start", time12(race.startTime) ?? "Check the organiser's page"],
    ["Where", where(race)],
    ["Distances", distances(race)],
  ]);
  const what = "race reminders";
  if (kind === "closing") {
    const subject = `Registration for ${race.name} closes ${shortDate(race.registration.closes)}`;
    return {
      subject,
      html: layout({
        preheader: "Last few days to register.",
        title: "Registration closes soon",
        body:
          p(`Registration for ${race.name} closes on ${longDate(race.registration.closes)}. If you haven't signed up yet, now's the time.`) +
          facts +
          button(race.registration?.url ? "Register on the official page" : "See how to register", register) +
          unsubscribeHtml(unsubscribeUrl, what),
      }),
      text: plain([subject, "", `Register: ${register}`, `Race page: ${page}`, "", `Stop these emails: ${unsubscribeUrl}`]),
    };
  }
  if (kind === "week") {
    const subject = `${race.name} is a week away`;
    return {
      subject,
      html: layout({
        preheader: "Race week: here's what to sort out.",
        title: "It's race week",
        body:
          p(`${race.name} is on ${longDate(race.date)}. A few things to sort out this week:`) +
          panel(
            p("• Check where and when to collect your race pack (bib and kit).\n• Plan how you'll get there for an early start.\n• Keep your runs short and easy, and drink plenty of water.", "margin:0"),
          ) +
          facts +
          button("Race details", page) +
          unsubscribeHtml(unsubscribeUrl, what),
      }),
      text: plain([subject, "", `Race details: ${page}`, "", `Stop these emails: ${unsubscribeUrl}`]),
    };
  }
  if (kind === "eve") {
    const subject = `Tomorrow: ${race.name}`;
    const start = time12(race.startTime);
    return {
      subject,
      html: layout({
        preheader: "Your race-day checklist.",
        title: "Race day is tomorrow",
        body:
          p(`Good luck tomorrow!${start ? ` ${race.name} starts at ${start}` : ""} at ${where(race)}.`) +
          panel(
            p(
              "• Bib pinned to the front of your top, and safety pins\n• Shoes and kit you've already run in (nothing new on race day)\n• Water, and something small to eat before the start\n• Phone, ID and a little cash\n• Aim to arrive 45 minutes early",
              "margin:0",
            ),
            "Race-day checklist",
          ) +
          p("Go to bed early, and drink water through the evening. It's hot and humid at the start, so take it easy for the first kilometre.") +
          button("Race details", page) +
          unsubscribeHtml(unsubscribeUrl, what),
      }),
      text: plain([subject, "", `Race details: ${page}`, "", `Stop these emails: ${unsubscribeUrl}`]),
    };
  }
  // after
  const recap = race.recap ?? {};
  const subject = `How did ${race.name} go?`;
  return {
    subject,
    html: layout({
      preheader: "Log your time and see the results.",
      title: "Well done!",
      body:
        p(`We hope ${race.name} went well. Log your finish time on Stride GH to keep your race history and build your Year in running.`) +
        button("Log my time", page) +
        (recap.resultsUrl ? p(`Official results are up: ${recap.resultsUrl}`) : p("We'll add the official results and photos to the race page as soon as the organiser publishes them.")) +
        (recap.photosUrl ? p(`Race photos: ${recap.photosUrl}`) : "") +
        p("Ran it? Leave a quick review on the race page to help other runners choose.") +
        unsubscribeHtml(unsubscribeUrl, what),
    }),
    text: plain([subject, "", `Log your time: ${page}`, recap.resultsUrl ? `Results: ${recap.resultsUrl}` : null, "", `Stop these emails: ${unsubscribeUrl}`]),
  };
}

/** New races that match someone's alert. */
export function alertEmail({ races, site, unsubscribeUrl, first }) {
  const subject = races.length === 1 ? `New race: ${races[0].name}` : `${races.length} new races for you on Stride GH`;
  const list = races
    .map(
      (r) =>
        `<tr><td style="padding:12px 0;border-top:1px solid ${brand.line}"><a href="${escape(`${site}/events/${r.slug}/`)}" style="font-size:17px;font-weight:800;color:${brand.night};text-decoration:none">${escape(r.name)}</a><br><span style="font-size:14px;color:${brand.muted}">${escape(
          `${shortDate(r.date)} · ${where(r)} · ${distances(r)}`,
        )}</span></td></tr>`,
    )
    .join("");
  return {
    subject,
    html: layout({
      preheader: races.map((r) => r.name).join(", "),
      title: first ? "Races that match your alert" : races.length === 1 ? "A new race for you" : "New races for you",
      body:
        p(first ? "Thanks for signing up. Here's what's coming up that matches your choices. We'll email you when new ones are listed." : "These races were just listed on Stride GH:") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${list}</table>` +
        button("See all races", `${site}/events/`) +
        unsubscribeHtml(unsubscribeUrl, "new-race alerts"),
    }),
    text: plain([subject, "", ...races.map((r) => `${r.name} — ${shortDate(r.date)}, ${where(r)}: ${site}/events/${r.slug}/`), "", `Stop these emails: ${unsubscribeUrl}`]),
  };
}
