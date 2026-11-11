import { company } from "../config/company.js";

type EmailKind = "noreply" | "notifications" | "billing";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: EmailKind;
};

type ParsedSender = { name: string; email: string };

function parseSender(raw: string, fallbackEmail: string, fallbackName: string): ParsedSender {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, "").trim() || fallbackName,
      email: match[2].trim(),
    };
  }
  if (raw.includes("@")) {
    return { name: fallbackName, email: raw.trim() };
  }
  return { name: fallbackName, email: fallbackEmail };
}

function fromSender(kind: EmailKind): ParsedSender {
  if (kind === "billing") {
    return parseSender(
      process.env.EMAIL_FROM_BILLING?.trim() || "",
      company.emails.billing,
      "Evanio.ai Billing",
    );
  }
  if (kind === "notifications") {
    return parseSender(
      process.env.EMAIL_FROM_NOTIFICATIONS?.trim() || "",
      company.emails.notifications,
      "Evanio.ai",
    );
  }
  return parseSender(
    process.env.EMAIL_FROM_NOREPLY?.trim() || "",
    company.emails.noreply,
    "Evanio.ai",
  );
}

function replyTo(): ParsedSender {
  const email = process.env.EMAIL_REPLY_TO?.trim() || company.emails.hello;
  return { name: company.brand, email };
}

function wrapHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#F4F4F1;font-family:Inter,Segoe UI,sans-serif;color:#111318;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #E4E4E0;border-radius:16px;padding:28px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:13px;color:#6D4AFF;font-weight:600;">${company.brand}</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:#4A4E57;">${bodyHtml}</div>
                <p style="margin:24px 0 0;font-size:12px;color:#6B7280;">
                  ${company.legalName} · Reply to ${replyTo().email}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(input: SendEmailInput): Promise<{
  sent: boolean;
  skipped?: boolean;
  id?: string;
}> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      `[email] Skipped "${input.subject}" to ${input.to} (BREVO_API_KEY not set)`,
    );
    return { sent: false, skipped: true };
  }

  const kind = input.kind ?? "noreply";
  const sender = fromSender(kind);
  const reply = replyTo();

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: input.to }],
      replyTo: reply,
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text ? { textContent: input.text } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      `Failed to send email via Brevo: ${
        typeof payload.message === "string"
          ? payload.message
          : response.statusText
      }`,
    );
  }

  return { sent: true, id: payload.messageId };
}

export async function sendEmailSafe(input: SendEmailInput) {
  try {
    return await sendEmail(input);
  } catch (error) {
    console.error("[email] send failed", error);
    return { sent: false as const };
  }
}

async function getProfileEmail(userId: string): Promise<string | null> {
  const { getSupabaseAdmin } = await import("../lib/supabase.js");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.email) return null;
  return data.email;
}

export async function sendBillingPaymentFailedEmail(input: {
  userId: string;
  amountDue?: string | null;
  portalHint?: string;
}) {
  const to = await getProfileEmail(input.userId);
  if (!to) return { sent: false as const, skipped: true as const };

  const amountLine = input.amountDue
    ? `<p>Amount due: <strong>${input.amountDue}</strong></p>`
    : "";

  return sendEmailSafe({
    kind: "billing",
    to,
    subject: "Payment failed for your Evanio subscription",
    html: wrapHtml(
      "We could not process your payment",
      `${amountLine}
       <p>Please update your payment method to keep your plan and credits active.</p>
       <p>Billing questions: <a href="mailto:${company.emails.billing}">${company.emails.billing}</a></p>
       ${input.portalHint ? `<p>${input.portalHint}</p>` : ""}`,
    ),
    text: `We could not process your Evanio payment. Contact ${company.emails.billing}.`,
  });
}

export async function sendBillingInvoicePaidEmail(input: {
  userId: string;
  planLabel: string;
  credits: number;
}) {
  const to = await getProfileEmail(input.userId);
  if (!to) return { sent: false as const, skipped: true as const };

  return sendEmailSafe({
    kind: "billing",
    to,
    subject: "Your Evanio subscription renewed",
    html: wrapHtml(
      "Subscription renewed",
      `<p>Your <strong>${input.planLabel}</strong> plan renewed successfully.</p>
       <p>${input.credits.toLocaleString()} monthly credits were added to your account.</p>
       <p>Billing questions: <a href="mailto:${company.emails.billing}">${company.emails.billing}</a></p>`,
    ),
    text: `Your ${input.planLabel} plan renewed. ${input.credits} credits added.`,
  });
}

export async function sendCreditsPurchasedEmail(input: {
  userId: string;
  credits: number;
  packLabel?: string;
}) {
  const to = await getProfileEmail(input.userId);
  if (!to) return { sent: false as const, skipped: true as const };

  return sendEmailSafe({
    kind: "billing",
    to,
    subject: "Credit pack purchased",
    html: wrapHtml(
      "Credits added",
      `<p>${input.credits.toLocaleString()} credits were added${
        input.packLabel ? ` from the ${input.packLabel} pack` : ""
      }.</p>
       <p>Billing questions: <a href="mailto:${company.emails.billing}">${company.emails.billing}</a></p>`,
    ),
    text: `${input.credits} credits were added to your Evanio account.`,
  });
}

export async function sendSubscriptionCanceledEmail(input: {
  userId: string;
}) {
  const to = await getProfileEmail(input.userId);
  if (!to) return { sent: false as const, skipped: true as const };

  return sendEmailSafe({
    kind: "billing",
    to,
    subject: "Your Evanio subscription was canceled",
    html: wrapHtml(
      "Subscription canceled",
      `<p>Your paid plan has ended and monthly plan credits were cleared. Purchased credits remain until used.</p>
       <p>Questions: <a href="mailto:${company.emails.billing}">${company.emails.billing}</a></p>`,
    ),
    text: `Your Evanio subscription was canceled. Contact ${company.emails.billing} with questions.`,
  });
}

export async function sendLowCreditsEmail(input: {
  userId: string;
  total: number;
}) {
  const to = await getProfileEmail(input.userId);
  if (!to) return { sent: false as const, skipped: true as const };

  return sendEmailSafe({
    kind: "notifications",
    to,
    subject: "Your Evanio credits are running low",
    html: wrapHtml(
      "Credits running low",
      `<p>You have <strong>${input.total.toLocaleString()}</strong> credits left.</p>
       <p>Top up from Billing in your dashboard to keep generating without interruption.</p>`,
    ),
    text: `You have ${input.total} Evanio credits left. Top up from Billing.`,
  });
}
