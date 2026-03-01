import { XeroClient } from "xero-node";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import { xeroTokens } from "@shared/schema";

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || "";
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || "https://thorntechsolutionsltd.com/api/xero/callback";
const XERO_SCOPES = "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access";

const db = drizzle(process.env.DATABASE_URL!);

let xeroClient: XeroClient | null = null;

function getXeroClient(): XeroClient {
  if (!xeroClient) {
    xeroClient = new XeroClient({
      clientId: XERO_CLIENT_ID,
      clientSecret: XERO_CLIENT_SECRET,
      redirectUris: [XERO_REDIRECT_URI],
      scopes: XERO_SCOPES.split(" "),
    });
  }
  return xeroClient;
}

export function getAuthUrl(): string {
  const client = getXeroClient();
  const consentUrl = client.buildConsentUrl();
  return consentUrl;
}

export async function handleCallback(url: string): Promise<{ tenantId: string; tenantName: string }> {
  const client = getXeroClient();
  const tokenSet = await client.apiCallback(url);
  await client.updateTenants();

  const activeTenant = client.tenants[0];
  if (!activeTenant) {
    throw new Error("No Xero organisation found");
  }

  await db.delete(xeroTokens);

  await db.insert(xeroTokens).values({
    accessToken: tokenSet.access_token!,
    refreshToken: tokenSet.refresh_token!,
    tenantId: activeTenant.tenantId,
    tenantName: activeTenant.tenantName || null,
    expiresAt: new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000),
  });

  return { tenantId: activeTenant.tenantId, tenantName: activeTenant.tenantName || "" };
}

async function getValidTokens() {
  const [token] = await db.select().from(xeroTokens).orderBy(desc(xeroTokens.id)).limit(1);
  if (!token) return null;

  const client = getXeroClient();

  if (new Date() >= token.expiresAt) {
    try {
      client.setTokenSet({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        token_type: "Bearer",
      });
      const newTokenSet = await client.refreshToken();

      await db.update(xeroTokens).set({
        accessToken: newTokenSet.access_token!,
        refreshToken: newTokenSet.refresh_token!,
        expiresAt: new Date(Date.now() + (newTokenSet.expires_in || 1800) * 1000),
      }).where(eq(xeroTokens.id, token.id));

      return {
        ...token,
        accessToken: newTokenSet.access_token!,
        refreshToken: newTokenSet.refresh_token!,
      };
    } catch (e) {
      console.error("[Xero] Token refresh failed:", e);
      return null;
    }
  }

  client.setTokenSet({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    token_type: "Bearer",
  });

  return token;
}

export async function isConnected(): Promise<{ connected: boolean; tenantName?: string }> {
  const token = await getValidTokens();
  if (!token) return { connected: false };
  return { connected: true, tenantName: token.tenantName || undefined };
}

export async function disconnect(): Promise<void> {
  await db.delete(xeroTokens);
  xeroClient = null;
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

  const client = getXeroClient();

  try {
    let parsedItems: Array<{ name: string; price: number; quantity: number }> = [];
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      parsedItems = [{ name: "Order items", price: order.total, quantity: 1 }];
    }

    const contactResponse = await client.accountingApi.getContacts(token.tenantId, undefined, `EmailAddress=="${order.email}"`);
    let contactId: string;

    if (contactResponse.body.contacts && contactResponse.body.contacts.length > 0) {
      contactId = contactResponse.body.contacts[0].contactID!;
    } else {
      const nameParts = order.name.split(" ");
      const newContact = await client.accountingApi.createContacts(token.tenantId, {
        contacts: [{
          name: order.name,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || undefined,
          emailAddress: order.email,
          phones: order.phone ? [{
            phoneType: 0,
            phoneNumber: order.phone,
          }] : undefined,
          addresses: [{
            addressType: 2,
            addressLine1: order.address,
            city: order.city,
            postalCode: order.postcode,
            country: "United Kingdom",
          }],
        }],
      });
      contactId = newContact.body.contacts![0].contactID!;
    }

    const lineItems = parsedItems.map(item => ({
      description: item.name,
      quantity: item.quantity,
      unitAmount: item.price,
      accountCode: "200",
      taxType: "OUTPUT2",
    }));

    const invoiceResponse = await client.accountingApi.createInvoices(token.tenantId, {
      invoices: [{
        type: 1,
        contact: { contactID: contactId },
        lineItems,
        date: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        reference: `Order #${order.id}`,
        status: 1,
        lineAmountTypes: 1,
        currencyCode: "GBP",
      }],
    });

    const invoice = invoiceResponse.body.invoices![0];
    console.log(`[Xero] Invoice created: ${invoice.invoiceNumber} for order #${order.id}`);

    return {
      invoiceId: invoice.invoiceID!,
      invoiceNumber: invoice.invoiceNumber!,
    };
  } catch (e: any) {
    console.error("[Xero] Invoice creation failed:", e.message || e);
    return null;
  }
}
