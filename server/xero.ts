import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import { xeroTokens } from "@shared/schema";

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || "";
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || "https://thorntechsolutionsltd.com/api/xero/callback";
const XERO_SCOPES = "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access";

const db = drizzle(process.env.DATABASE_URL!);

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: XERO_SCOPES,
    state: "xero-connect",
  });
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string) {
  const basicAuth = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: XERO_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

async function refreshAccessToken(refreshToken: string) {
  const basicAuth = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}

async function getTenants(accessToken: string) {
  const res = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to get Xero tenants");
  return res.json();
}

export async function handleCallback(callbackUrl: string): Promise<{ tenantId: string; tenantName: string }> {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("No authorization code received");

  const tokenData = await exchangeCodeForTokens(code);
  const tenants = await getTenants(tokenData.access_token);

  if (!tenants || tenants.length === 0) {
    throw new Error("No Xero organisation found");
  }

  const tenant = tenants[0];

  await db.delete(xeroTokens);

  await db.insert(xeroTokens).values({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName || null,
    expiresAt: new Date(Date.now() + (tokenData.expires_in || 1800) * 1000),
  });

  return { tenantId: tenant.tenantId, tenantName: tenant.tenantName || "" };
}

async function getValidTokens() {
  const [token] = await db.select().from(xeroTokens).orderBy(desc(xeroTokens.id)).limit(1);
  if (!token) return null;

  if (new Date() >= token.expiresAt) {
    try {
      const newTokenData = await refreshAccessToken(token.refreshToken);

      await db.update(xeroTokens).set({
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token,
        expiresAt: new Date(Date.now() + (newTokenData.expires_in || 1800) * 1000),
      }).where(eq(xeroTokens.id, token.id));

      return {
        ...token,
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token,
      };
    } catch (e) {
      console.error("[Xero] Token refresh failed:", e);
      return null;
    }
  }

  return token;
}

export async function isConnected(): Promise<{ connected: boolean; tenantName?: string }> {
  const token = await getValidTokens();
  if (!token) return { connected: false };
  return { connected: true, tenantName: token.tenantName || undefined };
}

export async function disconnect(): Promise<void> {
  await db.delete(xeroTokens);
}

async function xeroApiRequest(method: string, url: string, accessToken: string, tenantId: string, body?: any) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "xero-tenant-id": tenantId,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero API error ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function createInvoice(order: {
  id: number;
  email: string;
  name: string;
  total: number;
  items: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string | null;
}): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  const token = await getValidTokens();
  if (!token) {
    console.log("[Xero] Not connected, skipping invoice creation");
    return null;
  }

  try {
    let parsedItems: Array<{ name: string; price: number; quantity: number }> = [];
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      parsedItems = [{ name: "Order items", price: order.total, quantity: 1 }];
    }

    const contactsResult = await xeroApiRequest(
      "GET",
      `https://api.xero.com/api.xro/2.0/Contacts?where=EmailAddress=="${encodeURIComponent(order.email)}"`,
      token.accessToken,
      token.tenantId
    );

    let contactId: string;

    if (contactsResult.Contacts && contactsResult.Contacts.length > 0) {
      contactId = contactsResult.Contacts[0].ContactID;
    } else {
      const nameParts = order.name.split(" ");
      const newContact = await xeroApiRequest(
        "POST",
        "https://api.xero.com/api.xro/2.0/Contacts",
        token.accessToken,
        token.tenantId,
        {
          Name: order.name,
          FirstName: nameParts[0],
          LastName: nameParts.slice(1).join(" ") || undefined,
          EmailAddress: order.email,
          Phones: order.phone ? [{ PhoneType: "DEFAULT", PhoneNumber: order.phone }] : undefined,
          Addresses: [{
            AddressType: "POBOX",
            AddressLine1: order.address,
            City: order.city,
            PostalCode: order.postcode,
            Country: "United Kingdom",
          }],
        }
      );
      contactId = newContact.Contacts[0].ContactID;
    }

    const lineItems = parsedItems.map(item => ({
      Description: item.name,
      Quantity: item.quantity,
      UnitAmount: item.price,
      AccountCode: "200",
      TaxType: "OUTPUT2",
    }));

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const invoiceResult = await xeroApiRequest(
      "POST",
      "https://api.xero.com/api.xro/2.0/Invoices",
      token.accessToken,
      token.tenantId,
      {
        Type: "ACCREC",
        Contact: { ContactID: contactId },
        LineItems: lineItems,
        Date: today,
        DueDate: dueDate,
        Reference: `Order #${order.id}`,
        Status: "AUTHORISED",
        LineAmountTypes: "Inclusive",
        CurrencyCode: "GBP",
      }
    );

    const invoice = invoiceResult.Invoices[0];
    console.log(`[Xero] Invoice created: ${invoice.InvoiceNumber} for order #${order.id}`);

    return {
      invoiceId: invoice.InvoiceID,
      invoiceNumber: invoice.InvoiceNumber,
    };
  } catch (e: any) {
    console.error("[Xero] Invoice creation failed:", e.message || e);
    return null;
  }
}
