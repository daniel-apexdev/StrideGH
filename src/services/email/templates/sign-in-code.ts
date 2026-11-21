import { brand, escape, firstName, layout, plain } from "../layout";

/** The 6-digit code to create an account (confirms the email) or to sign in on a new device. */
export function signInCodeEmail(opts: { code: string; name: string | null; purpose: "signup" | "signin"; minutes: number }) {
  const hello = firstName(opts.name) ? `Hi ${firstName(opts.name)},` : "Hi,";
  const why = opts.purpose === "signup" ? "to finish creating your Stride GH account" : "to sign in to Stride GH";
  const title = opts.purpose === "signup" ? "Confirm your email" : "Your sign-in code";
  const footnote = `If you didn't ask for this code, you can ignore this email — nobody can ${opts.purpose === "signup" ? "use your email" : "sign in"} without it.`;
  return {
    subject: `${opts.code} is your Stride GH code`,
    html: layout({
      preheader: `Your code is ${opts.code}. It expires in ${opts.minutes} minutes.`,
      title,
      body: `<p style="margin:0 0 12px;font-size:16px">${escape(hello)}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55">Enter this code in the app ${why}:</p>
<p style="margin:0 0 16px;font-size:36px;font-weight:800;letter-spacing:10px;background:${brand.paper};border-radius:12px;padding:16px;text-align:center;font-family:'Courier New',monospace">${escape(opts.code)}</p>
<p style="margin:0 0 14px;font-size:15px;color:${brand.muted}">It expires in ${opts.minutes} minutes and works once.</p>`,
      footnote,
    }),
    text: plain([hello, "", `Enter this code in the app ${why}:`, "", opts.code, "", `It expires in ${opts.minutes} minutes and works once.`, "", footnote]),
  };
}
